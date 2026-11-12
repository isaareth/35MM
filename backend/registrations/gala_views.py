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

def _send_batch(request, tickets, describe, resend=False):
    """Emails each ticket not yet sent (or all of them when `resend`), stopping at
    Gmail's daily quota so the rest stay pending for tomorrow."""
    results, reason, stopped = [], "", False
    for ticket in tickets:
        if ticket.sent_at and not resend:
            continue
        qr_url = request.build_absolute_uri(f"/api/gala/invitations/{ticket.id}/qr.png")
        outcome = gala.send_invitation(ticket, qr_url)
        results.append({**describe(ticket), "sent": outcome.ok})
        reason = reason or outcome.reason
        if outcome.code == "quota":
            stopped = True
            break
    return {
        "sent_count": sum(1 for r in results if r["sent"]),
        "failed_count": sum(1 for r in results if not r["sent"]),
        "results": results,
        "error": reason,
        "stopped_by_quota": stopped,
    }


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

        by_member = {m.id: m for m in members}
        tickets = [gala.ensure_ticket(m) for m in members]
        return Response(
            _send_batch(
                request,
                tickets,
                lambda t: {"participant_id": t.participant_id, "name": by_member[t.participant_id].full_name},
                resend=resend,
            )
        )


def _extra_row(ticket: GalaTicket) -> dict:
    sponsor = ticket.sponsor_registration
    return {
        "id": str(ticket.id),
        "guest_name": ticket.guest_name,
        "guest_email": ticket.guest_email,
        "group": ticket.group,
        "sponsor_registration_id": str(sponsor.id) if sponsor else None,
        "team": gala.team_label(ticket),
        "sent_at": ticket.sent_at,
        "rsvp_status": ticket.rsvp_status,
        "has_plus_one": ticket.has_plus_one,
        "plus_one_name": ticket.plus_one_name,
        "used_capacity": ticket.used_capacity,
        "total_capacity": ticket.total_capacity,
        "checkin_at": ticket.checkin_at,
    }


def _extras_queryset():
    return (
        GalaTicket.objects.filter(participant__isnull=True)
        .select_related("sponsor_registration")
        .order_by("created_at")
    )


class AdminGalaExtrasView(APIView):
    """GET lists the extras pocket; POST adds people to it (unsent).

    POST body: {"guests": [{"name", "email"}...], "registration_id": uuid|null,
    "group": str}. Bad rows are reported in `skipped`; the rest are added."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response([_extra_row(t) for t in _extras_queryset()])

    def post(self, request):
        sponsor = None
        sponsor_id = request.data.get("registration_id")
        if sponsor_id:
            try:
                sponsor = Registration.objects.get(pk=sponsor_id)
            except (Registration.DoesNotExist, ValueError, ValidationError):
                return Response({"detail": "Ese equipo no existe."}, status=400)
        try:
            created, skipped = gala.add_extras(request.data.get("guests"), sponsor, request.data.get("group"))
        except gala.GalaError as error:
            return Response({"detail": error.message}, status=error.http_status)
        return Response(
            {"created_count": len(created), "skipped": skipped, "created": [_extra_row(t) for t in created]},
            status=201 if created else 200,
        )


class AdminGalaExtraDetailView(APIView):
    """DELETE /api/admin/gala/extras/<uuid>/ — removes an extra who has not
    entered yet (an invitation already used is a record of attendance)."""

    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        ticket = get_object_or_404(GalaTicket, pk=pk, participant__isnull=True)
        if ticket.used_capacity > 0:
            return Response({"detail": "Esta persona ya ingresó a la gala; no se puede eliminar."}, status=409)
        ticket.delete()
        return Response(status=204)


class AdminGalaExtrasSendView(APIView):
    """POST /api/admin/gala/extras/send/ — emails every extra not yet sent, or
    only {"ticket_id": uuid} (a resend, even if already sent)."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        tickets = list(_extras_queryset())
        ticket_id = request.data.get("ticket_id")
        resend = ticket_id is not None
        if resend:
            tickets = [t for t in tickets if str(t.id) == str(ticket_id)]
            if not tickets:
                return Response({"detail": "Esa invitación extra no existe."}, status=400)
        return Response(
            _send_batch(request, tickets, lambda t: {"ticket_id": str(t.id), "name": t.guest_name}, resend=resend)
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

        return Response(
            {
                "status": gala.SUCCESS_STATUS,
                "guest_name": ticket.guest_name,
                "team": gala.team_label(ticket),
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
