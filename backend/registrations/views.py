import time

from django.conf import settings
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .analytics import build_analytics
from .email import send_registration_confirmation
from .excel import (
    build_event_registrations_workbook,
    build_registrations_workbook,
    event_registrations_filename,
    registrations_filename,
)
from .models import Event, EventRegistration, Participant, Registration
from .serializers import (
    EventRegistrationCreateSerializer,
    EventRegistrationReadSerializer,
    EventSerializer,
    RegistrationCreateSerializer,
    RegistrationReadSerializer,
)


class RegistrationStatusView(APIView):
    """GET /api/registrations/status/ — public; lets the frontend know
    whether to show the registration form or a "closed" message.
    Unthrottled: it's a cheap read fetched by several sections on every
    page load, and the global anon rate (5/hour) is sized for the
    registration-submission endpoint, not this one."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return Response({"open": settings.REGISTRATIONS_OPEN})


class RegistrationCreateView(APIView):
    """POST /api/registrations/ — public, rate-limited by AnonRateThrottle
    (settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"])."""

    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.REGISTRATIONS_OPEN:
            return Response(
                {"detail": "Las inscripciones para esta edición ya cerraron. ¡Te esperamos en la próxima edición de 35mm!"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RegistrationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()

        # A failed email must never undo an already-persisted registration (AC-013).
        if send_registration_confirmation(registration):
            registration.confirmation_email_sent_at = timezone.now()
            registration.save(update_fields=["confirmation_email_sent_at"])

        return Response(
            RegistrationReadSerializer(registration).data, status=status.HTTP_201_CREATED
        )


class AdminRegistrationListView(APIView):
    """GET /api/admin/registrations/ — requires an authenticated admin session."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        registrations = Registration.objects.all().order_by("-created_at")
        return Response(RegistrationReadSerializer(registrations, many=True).data)


class AdminDashboardView(APIView):
    """GET /api/admin/dashboard/ — totals + last 5 registrations, per 06_ADMIN.md."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        recent = Registration.objects.order_by("-created_at").prefetch_related("participants")[:5]
        return Response(
            {
                "total_teams": Registration.objects.count(),
                "total_participants": Participant.objects.count(),
                "recent_registrations": RegistrationReadSerializer(recent, many=True).data,
            }
        )


class AdminRegistrationDeleteView(APIView):
    """DELETE /api/admin/registrations/<uuid:pk>/ — lets an admin remove a
    registration (e.g. a duplicate entry) at their discretion. Deleting a
    Registration cascades to its Participant rows (models.py FK on_delete=
    CASCADE); this is a hard delete, there is no undo."""

    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        registration = get_object_or_404(Registration, pk=pk)
        registration.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRegistrationBulkDeleteView(APIView):
    """POST /api/admin/registrations/bulk-delete/ — deletes several
    registrations at once (e.g. clearing out test entries), same
    cascade/no-undo semantics as AdminRegistrationDeleteView."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "ids must be a non-empty list."}, status=400)

        deleted_count, _ = Registration.objects.filter(id__in=ids).delete()
        return Response({"deleted_count": deleted_count})


class AdminSendConfirmationsView(APIView):
    """POST /api/admin/registrations/send-confirmations/ — sends the
    confirmation email to every registration that doesn't have one marked
    as sent yet (confirmation_email_sent_at is null). Safe to call
    repeatedly: a team whose email already succeeded is skipped, so this
    can be used both to catch up everyone registered before email was
    working and, going forward, to retry just the ones that failed.

    Runs synchronously in the request/response cycle (no task queue in
    this project) — fine at this scale (tens of teams), but a small delay
    between sends keeps it under Resend's rate limit and a real deploy
    timeout could still cut off an unusually large batch mid-way; that's
    safe too, since already-sent ones are already marked and won't be
    resent on a retry.
    """

    permission_classes = [IsAdminUser]

    def post(self, request):
        pending = Registration.objects.filter(
            confirmation_email_sent_at__isnull=True
        ).prefetch_related("participants")

        sent = []
        failed = []
        for registration in pending:
            if send_registration_confirmation(registration):
                registration.confirmation_email_sent_at = timezone.now()
                registration.save(update_fields=["confirmation_email_sent_at"])
                sent.append(str(registration.id))
            else:
                leader = registration.leader
                failed.append(
                    {
                        "id": str(registration.id),
                        "leader_name": leader.full_name if leader else None,
                        "leader_email": leader.institutional_email if leader else None,
                    }
                )
            time.sleep(0.15)

        return Response({"sent_count": len(sent), "failed": failed})


class AdminRegistrationExportView(APIView):
    """GET /api/admin/registrations/export/ — generates the .xlsx server-side,
    never exposed as a public/cacheable URL (07_DATABASE_API.md)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        registrations = Registration.objects.all().order_by("created_at").prefetch_related(
            "participants"
        )
        workbook = build_registrations_workbook(registrations)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = f'attachment; filename="{registrations_filename()}"'
        workbook.save(response)
        return response


class TalkAnonRateThrottle(AnonRateThrottle):
    scope = "talk"




class EventListView(APIView):
    """GET /api/events/ — public listing of talks/workshops."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return Response(EventSerializer(Event.objects.all(), many=True).data)


class EventDetailView(APIView):
    """GET /api/events/<slug>/ — public."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        return Response(EventSerializer(event).data)


class EventRegistrationCreateView(APIView):
    """POST /api/events/<slug>/registrations/ — public individual signup.
    Own, looser throttle than the festival form: attendees often share a
    campus IP."""

    permission_classes = [AllowAny]
    throttle_classes = [TalkAnonRateThrottle]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        if not event.is_open:
            return Response(
                {"detail": "Las inscripciones para este evento ya cerraron."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EventRegistrationCreateSerializer(
            data=request.data, context={"event": event}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminEventListView(APIView):
    """GET /api/admin/events/ — events with signup / attendance counts."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        events = Event.objects.annotate(
            registered_count=Count("registrations"),
            attended_count=Count(
                "registrations", filter=Q(registrations__attended_at__isnull=False)
            ),
        )
        data = []
        for event in events:
            item = EventSerializer(event).data
            item["registered_count"] = event.registered_count
            item["attended_count"] = event.attended_count
            data.append(item)
        return Response(data)


class AdminEventRegistrationListView(APIView):
    """GET /api/admin/events/<slug>/registrations/"""

    permission_classes = [IsAdminUser]

    def get(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        registrations = event.registrations.order_by("full_name")
        return Response(
            {
                "event": EventSerializer(event).data,
                "registrations": EventRegistrationReadSerializer(registrations, many=True).data,
            }
        )


class AdminEventExportView(APIView):
    """GET /api/admin/events/<slug>/export/ — .xlsx generated server-side."""

    permission_classes = [IsAdminUser]

    def get(self, request, slug):
        event = get_object_or_404(Event, slug=slug)
        workbook = build_event_registrations_workbook(
            event, event.registrations.order_by("created_at")
        )
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{event_registrations_filename(event)}"'
        )
        workbook.save(response)
        return response


class AdminEventAttendanceView(APIView):
    """PATCH /api/admin/event-registrations/<uuid>/attendance/ with
    {"attended": true|false} — marks (or unmarks) a signup as having
    attended, recording when."""

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        registration = get_object_or_404(EventRegistration, pk=pk)
        attended = request.data.get("attended")
        if not isinstance(attended, bool):
            return Response({"detail": "attended must be true or false."}, status=400)

        registration.attended_at = timezone.now() if attended else None
        registration.save(update_fields=["attended_at"])
        return Response(EventRegistrationReadSerializer(registration).data)


class AdminAnalyticsView(APIView):
    """GET /api/admin/analytics/ — aggregate counts only (no personal data)
    for the festival registrations and the talks/workshops."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(build_analytics())
