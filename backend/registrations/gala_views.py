from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from . import gala
from .email import EmailDeliveryError
from .models import GalaTicket, Registration


class RsvpThrottle(AnonRateThrottle):
    scope = "rsvp"


def _guest_view(ticket: GalaTicket) -> dict:
    """What the invitation's holder may see about their own ticket."""
    return {
        "guest_name": ticket.guest_name,
        "rsvp_status": ticket.rsvp_status,
        "has_plus_one": ticket.has_plus_one,
        "plus_one_name": ticket.plus_one_name,
        "plus_one_email": ticket.plus_one_email,
        "plus_one_phone": ticket.plus_one_phone,
        "plus_one_data_consent": ticket.plus_one_data_consent_at is not None,
        "total_capacity": ticket.total_capacity,
        "expired": gala.is_expired(ticket),
        "qr_path": f"/api/gala/invitations/{ticket.id}/qr.png",
    }


def _error(error: gala.GalaError) -> Response:
    return Response(error.payload(), status=error.http_status)


# ------------------------------------------------------------------- public

class GalaInvitationDetailView(APIView):
    """GET /api/gala/invitations/<token>/ — the guest's own invitation."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request, token):
        ticket = get_object_or_404(GalaTicket, pk=token)
        return Response(_guest_view(ticket))


class GalaInvitationRsvpView(APIView):
    """POST /api/gala/invitations/<token>/rsvp/"""

    permission_classes = [AllowAny]
    throttle_classes = [RsvpThrottle]

    def post(self, request, token):
        ticket = get_object_or_404(GalaTicket, pk=token)
        try:
            gala.apply_rsvp(
                ticket,
                request.data.get("attending"),
                request.data.get("has_plus_one"),
                request.data.get("plus_one_name"),
                request.data.get("plus_one_email"),
                request.data.get("plus_one_phone"),
                request.data.get("plus_one_data_consent"),
            )
        except gala.GalaError as error:
            return _error(error)

        return Response(
            {
                "status": gala.SUCCESS_STATUS,
                "message": "Tu respuesta quedó registrada.",
                "rsvp_status": ticket.rsvp_status,
                "has_plus_one": ticket.has_plus_one,
                "plus_one_name": ticket.plus_one_name,
            }
        )


class GalaInvitationQrView(APIView):
    """GET /api/gala/invitations/<token>/qr.png — the QR as an image, so it
    can be embedded in the email and shown on the invitation page."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request, token):
        ticket = get_object_or_404(GalaTicket, pk=token)
        response = HttpResponse(gala.qr_png(ticket), content_type="image/png")
        response["Cache-Control"] = "public, max-age=86400"
        return response


# -------------------------------------------------------------------- admin

class AdminGalaSendView(APIView):
    """POST /api/admin/registrations/<uuid>/gala-invitations/ — emails each
    member of a team their own QR invitation.

    Body (optional): {"participant_id": int} sends only to that member, even
    if they already got it (a resend). Without it, every member who has not
    received it yet gets it, so a retry never duplicates anyone's email."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        registration = get_object_or_404(Registration, pk=pk)
        members = list(registration.participants.order_by("position"))

        participant_id = request.data.get("participant_id")
        resend = participant_id is not None
        if resend:
            members = [m for m in members if m.id == participant_id]
            if not members:
                return Response({"detail": "Ese integrante no pertenece al equipo."}, status=400)

        results, reason, stopped = [], "", False
        for member in members:
            ticket = gala.ensure_ticket(member)
            if ticket.sent_at and not resend:
                continue
            qr_url = request.build_absolute_uri(f"/api/gala/invitations/{ticket.id}/qr.png")
            outcome = gala.send_invitation(ticket, qr_url)
            results.append({"participant_id": member.id, "name": member.full_name, "sent": outcome.ok})
            reason = reason or outcome.reason
            if outcome.code == "quota":
                # The mailbox is out of sends for today: stop instead of failing
                # every remaining member; they stay pending for tomorrow.
                stopped = True
                break

        return Response(
            {
                "sent_count": sum(1 for r in results if r["sent"]),
                "failed_count": sum(1 for r in results if not r["sent"]),
                "results": results,
                "error": reason,
                "stopped_by_quota": stopped,
            }
        )


class AdminGalaTicketLookupView(APIView):
    """GET /api/admin/gala/tickets/<token>/ — what the door staff sees after a
    scan, before deciding how many people to admit. Changes nothing."""

    permission_classes = [IsAdminUser]

    def get(self, request, token):
        try:
            ticket = gala.lookup_ticket(token)
        except gala.GalaError as error:
            return _error(error)

        registration = ticket.participant.registration
        leader = registration.leader
        return Response(
            {
                "status": gala.SUCCESS_STATUS,
                "guest_name": ticket.guest_name,
                "team": registration.film_title or (leader.full_name if leader else ""),
                "rsvp_status": ticket.rsvp_status,
                "has_plus_one": ticket.has_plus_one,
                "plus_one_name": ticket.plus_one_name,
                "total_capacity": ticket.total_capacity,
                "used_capacity": ticket.used_capacity,
                "remaining_capacity": ticket.remaining_capacity,
                "checkin_at": ticket.checkin_at,
                "expired": gala.is_expired(ticket),
            }
        )


class AdminGalaValidateView(APIView):
    """POST /api/admin/gala/validate/ {"token": str, "checkin_count": 1|2}"""

    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            result = gala.validate_checkin(request.data.get("token"), request.data.get("checkin_count"))
        except gala.GalaError as error:
            return _error(error)
        return Response(result)


class AdminGalaSummaryView(APIView):
    """GET /api/admin/gala/summary/ — gala invitation, RSVP and attendance metrics."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(gala.summary())


class AdminEmailTestView(APIView):
    """POST /api/admin/email/test/ {"to": "..."} — sends a sample message
    through the configured provider (nobody but the given address gets it)."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        to_email = str(request.data.get("to") or "").strip()
        try:
            validate_email(to_email)
        except ValidationError:
            return Response({"detail": "Escribe un correo válido."}, status=400)

        try:
            gala.send_test_email(to_email)
        except EmailDeliveryError as error:
            return Response({"detail": str(error)}, status=502)
        except Exception:
            gala.logger.exception("Falló el correo de prueba a %s", to_email)
            return Response(
                {"detail": "No se pudo enviar el correo de prueba. Revisa la configuración de correo."},
                status=502,
            )
        return Response({"sent": True})
