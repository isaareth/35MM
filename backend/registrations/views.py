import time

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .email import send_registration_confirmation
from .excel import (
    build_registrations_workbook,
    build_talk_registrations_workbook,
    registrations_filename,
    talk_registrations_filename,
)
from .models import Participant, Registration, TalkRegistration
from .serializers import (
    RegistrationCreateSerializer,
    RegistrationReadSerializer,
    TalkRegistrationSerializer,
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


class TalkRegistrationCreateView(APIView):
    """POST /api/talk-registrations/ — public individual signup for the talk
    with Yesenia Valencia. Own, looser throttle than the festival form:
    attendees often share a campus IP."""

    permission_classes = [AllowAny]
    throttle_classes = [TalkAnonRateThrottle]

    def post(self, request):
        serializer = TalkRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminTalkRegistrationListView(APIView):
    """GET /api/admin/talk-registrations/"""

    permission_classes = [IsAdminUser]

    def get(self, request):
        registrations = TalkRegistration.objects.all().order_by("-created_at")
        return Response(TalkRegistrationSerializer(registrations, many=True).data)


class AdminTalkRegistrationExportView(APIView):
    """GET /api/admin/talk-registrations/export/ — .xlsx generated server-side."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        workbook = build_talk_registrations_workbook(TalkRegistration.objects.all())
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = f'attachment; filename="{talk_registrations_filename()}"'
        workbook.save(response)
        return response
