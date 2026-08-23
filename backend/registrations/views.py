from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .email import send_registration_confirmation
from .excel import build_registrations_workbook, registrations_filename
from .models import Registration
from .serializers import RegistrationCreateSerializer, RegistrationReadSerializer


class RegistrationCreateView(APIView):
    """POST /api/registrations/ — public, rate-limited by AnonRateThrottle
    (settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"])."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()

        # A failed email must never undo an already-persisted registration (AC-013).
        send_registration_confirmation(registration)

        return Response(
            RegistrationReadSerializer(registration).data, status=status.HTTP_201_CREATED
        )


class AdminRegistrationListView(APIView):
    """GET /api/admin/registrations/ — requires an authenticated admin session."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        registrations = Registration.objects.all().order_by("-created_at")
        return Response(RegistrationReadSerializer(registrations, many=True).data)


class AdminRegistrationCountView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        registrations = Registration.objects.all()
        total_teams = registrations.count()
        total_participants = sum(r.participants.count() for r in registrations)
        return Response({"total_teams": total_teams, "total_participants": total_participants})


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
