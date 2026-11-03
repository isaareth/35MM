"""Gala QR invitations: issuing, emailing, RSVP, door check-in and metrics."""

import base64
import html
import io
import logging
import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from urllib.parse import urlencode

import segno
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .email import EmailDeliveryError, deliver
from .models import GalaTicket, Participant

logger = logging.getLogger("registrations.gala")

SUCCESS_STATUS = "success"
ERROR_STATUS = "error"


class GalaError(Exception):
    """A rule violation that maps to a specific HTTP response."""

    def __init__(self, code: str, message: str, http_status: int):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status

    def payload(self) -> dict:
        return {"status": ERROR_STATUS, "valid": False, "code": self.code, "message": self.message}


def ticket_expiry():
    expires = parse_datetime(settings.GALA_TICKET_EXPIRES_AT)
    if expires is None:
        raise ValueError("GALA_TICKET_EXPIRES_AT debe ser una fecha ISO 8601 con zona horaria.")
    return expires if timezone.is_aware(expires) else timezone.make_aware(expires)


def is_expired(ticket: GalaTicket) -> bool:
    return timezone.now() > ticket.expires_at


def ensure_ticket(participant: Participant) -> GalaTicket:
    """The participant's invitation, created on first use. Name and email are
    copied at creation so the QR keeps working if the registration is edited."""
    ticket, _ = GalaTicket.objects.get_or_create(
        participant=participant,
        defaults={
            "guest_name": participant.full_name,
            "guest_email": participant.institutional_email,
            "expires_at": ticket_expiry(),
        },
    )
    return ticket


# ---------------------------------------------------------------- QR / email

def invitation_url(ticket: GalaTicket) -> str:
    return f"{settings.FRONTEND_URL}/invitacion/{ticket.id}"


def qr_png(ticket: GalaTicket) -> bytes:
    """Black-on-white PNG of the invitation link, generated locally."""
    buffer = io.BytesIO()
    segno.make(invitation_url(ticket), error="m").save(buffer, kind="png", scale=10, border=2)
    return buffer.getvalue()


def calendar_url(link: str) -> str:
    """Google Calendar "add event" link. The gala's time is not published, so
    it is an all-day event on the gala's date."""
    start = date.fromisoformat(settings.GALA_DATE)
    params = {
        "action": "TEMPLATE",
        "text": "Gala de premiación · 35mm Festival de Cortos",
        "dates": f"{start:%Y%m%d}/{start + timedelta(days=1):%Y%m%d}",
        "location": settings.GALA_PLACE,
        "details": f"Tu invitación personal (con tu código QR): {link}",
    }
    return "https://calendar.google.com/calendar/render?" + urlencode(params)


def maps_url() -> str:
    place = settings.GALA_PLACE.replace("·", " ")
    return "https://www.google.com/maps/search/?" + urlencode({"api": 1, "query": f"{place} Medellín"})


def build_invitation_email(ticket: GalaTicket, qr_url: str):
    name = ticket.guest_name
    link = invitation_url(ticket)
    add_to_calendar = calendar_url(link)
    directions = maps_url()
    when = [("Fecha", settings.GALA_DATE_LABEL), ("Lugar", settings.GALA_PLACE)]
    if settings.GALA_TIME:
        when.insert(1, ("Hora", settings.GALA_TIME))

    subject = f"Tu invitación a la gala de 35mm · {settings.GALA_DATE_LABEL.rsplit(' de ', 1)[0]}"

    text_lines = [
        f"Hola {name}:",
        "",
        "Te invitamos a la gala de premiación del 35mm Festival de Cortos.",
        "",
        *[f"{label}: {value}" for label, value in when],
        "",
        "Tu código QR personal es tu entrada: preséntalo en la puerta, desde el celular o impreso. "
        "Con él pueden ingresar tú y, si quieres, un acompañante.",
        "",
        "Confirma tu asistencia (y si vendrás con acompañante) en este enlace, donde también "
        f"puedes ver tu código QR:\n{link}",
        "",
        f"Añadir a tu calendario: {add_to_calendar}",
        f"Cómo llegar: {directions}",
        "",
        "Es personal: no la compartas.",
        "",
        "Equipo 35mm – Producciones TVU",
    ]

    rows = "".join(
        f'<tr><td style="padding:4px 16px 4px 0;color:#8a8a8a;font-size:13px">{html.escape(label)}</td>'
        f'<td style="padding:4px 0;color:#191818;font-size:15px;font-weight:600">{html.escape(value)}</td></tr>'
        for label, value in when
    )
    html_body = f"""<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f1fa;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1fa;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff">
<tr><td style="background:#4820B7;padding:24px;color:#ffffff">
<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#39E4FF">35mm Festival de Cortos</div>
<div style="font-size:26px;font-weight:800;margin-top:6px">Gala de premiación</div>
</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 16px;font-size:16px;color:#191818">Hola {html.escape(name)}:</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#333">Te invitamos a la gala de premiación del 35mm Festival de Cortos.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px">{rows}</table>
<div style="text-align:center;margin:8px 0 8px">
<img src="{html.escape(qr_url)}" width="240" height="240" alt="Código QR de tu invitación" style="display:block;margin:0 auto;border:0">
</div>
<p style="margin:0 0 24px;text-align:center;font-size:13px;color:#666">Preséntalo en la puerta, desde el celular o impreso.<br>Sirve para ingresar tú y, si quieres, un acompañante.</p>
<p style="text-align:center;margin:0 0 24px"><a href="{html.escape(link)}" style="display:inline-block;background:#4820B7;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px">Confirmar asistencia</a></p>
<p style="text-align:center;margin:0 0 24px;font-size:13px"><a href="{html.escape(add_to_calendar)}" style="color:#4820B7;font-weight:600">Añadir al calendario</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="{html.escape(directions)}" style="color:#4820B7;font-weight:600">Cómo llegar</a></p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a">Es personal: no la compartas. Si el código no se ve, abre el botón de arriba para verlo en línea.</p>
</td></tr>
<tr><td style="padding:16px 24px;background:#f3f1fa;font-size:12px;color:#8a8a8a">Equipo 35mm – Producciones TVU</td></tr>
</table></td></tr></table></body></html>"""

    return subject, "\n".join(text_lines), html_body


@dataclass(frozen=True)
class SendOutcome:
    """Result of one send. Truthy when the email went out; `reason` is a
    message safe to show admins, `code` is "quota" when the mailbox hit its
    daily limit (so a batch should stop instead of failing one by one)."""

    ok: bool
    reason: str = ""
    code: str = ""

    def __bool__(self) -> bool:
        return self.ok


def send_invitation(ticket: GalaTicket, qr_url: str) -> SendOutcome:
    """Emails the invitation. Marks `sent_at` only when delivery succeeded, so
    a failure can be retried without duplicating anyone else's email."""
    subject, text, body_html = build_invitation_email(ticket, qr_url)
    extra = {
        "invitation_url": invitation_url(ticket),
        "qr_url": qr_url,
        "qr_png_base64": base64.b64encode(qr_png(ticket)).decode("ascii"),
        "guest_name": ticket.guest_name,
    }
    try:
        deliver(ticket.guest_email, subject, text, body_html, extra)
    except EmailDeliveryError as error:
        logger.warning("La invitación %s no salió: %s", ticket.id, error)
        return SendOutcome(False, str(error), error.code)
    except Exception:
        logger.exception("No se pudo enviar la invitación %s a %s", ticket.id, ticket.guest_email)
        return SendOutcome(False)
    ticket.sent_at = timezone.now()
    ticket.save(update_fields=["sent_at"])
    return SendOutcome(True)


def send_test_email(to_email: str) -> None:
    """Sends a sample message through the configured provider, carrying the
    same fields as a real invitation, so the mail automation can be set up
    and checked without emailing a real participant. Raises on failure."""
    image = io.BytesIO()
    segno.make(settings.FRONTEND_URL, error="m").save(image, kind="png", scale=6, border=2)
    sample_qr = f"{settings.FRONTEND_URL}/icon.png"
    text = (
        "Este es un correo de prueba del sistema de invitaciones de 35mm.\n"
        "Si lo recibiste, el envío de correos está funcionando."
    )
    body_html = (
        '<p style="font-family:Arial,sans-serif;font-size:15px">Este es un correo de prueba del sistema '
        "de invitaciones de 35mm.</p>"
        f'<p style="font-family:Arial,sans-serif;font-size:15px">Imagen de ejemplo: <br><img src="{html.escape(sample_qr)}" width="96" height="96" alt="Logo 35mm"></p>'
        '<p style="font-family:Arial,sans-serif;font-size:13px;color:#666">Si lo recibiste, el envío de correos está funcionando.</p>'
    )
    deliver(
        to_email,
        "Prueba de correo · 35mm",
        text,
        body_html,
        {
            "invitation_url": settings.FRONTEND_URL,
            "qr_url": sample_qr,
            "qr_png_base64": base64.b64encode(image.getvalue()).decode("ascii"),
            "guest_name": "Prueba",
        },
    )


# ---------------------------------------------------------------------- RSVP

def _valid_phone(value: str) -> bool:
    digits = [c for c in value if c.isdigit()]
    return all(c.isdigit() or c in " +-()" for c in value) and 7 <= len(digits) <= 15


def apply_rsvp(
    ticket: GalaTicket, attending, has_plus_one, plus_one_name, plus_one_email, plus_one_phone
) -> GalaTicket:
    if is_expired(ticket):
        raise GalaError("TICKET_EXPIRED", "Esta invitación ya no está vigente.", 400)
    if not isinstance(attending, bool):
        raise GalaError("INVALID_RSVP", "Indica si asistirás o no.", 400)

    has_plus_one = bool(has_plus_one) if attending else False
    plus_one_name = (plus_one_name or "").strip() if has_plus_one else ""
    plus_one_email = (plus_one_email or "").strip() if has_plus_one else ""
    plus_one_phone = (plus_one_phone or "").strip() if has_plus_one else ""
    if has_plus_one:
        if not plus_one_name:
            raise GalaError("INVALID_RSVP", "Escribe el nombre de tu acompañante.", 400)
        if not plus_one_email:
            raise GalaError("INVALID_RSVP", "Escribe el correo de tu acompañante.", 400)
        if not plus_one_phone:
            raise GalaError("INVALID_RSVP", "Escribe el celular de tu acompañante.", 400)
    if len(plus_one_name) > 200 or len(plus_one_email) > 254 or len(plus_one_phone) > 30:
        raise GalaError("INVALID_RSVP", "Los datos del acompañante son demasiado largos.", 400)
    if plus_one_email:
        try:
            validate_email(plus_one_email)
        except ValidationError:
            raise GalaError("INVALID_RSVP", "El correo del acompañante no es válido.", 400)
    if plus_one_phone and not _valid_phone(plus_one_phone):
        raise GalaError("INVALID_RSVP", "El celular del acompañante no es válido.", 400)

    ticket.rsvp_status = GalaTicket.Rsvp.CONFIRMED if attending else GalaTicket.Rsvp.DECLINED
    ticket.has_plus_one = has_plus_one
    ticket.plus_one_name = plus_one_name
    ticket.plus_one_email = plus_one_email
    ticket.plus_one_phone = plus_one_phone
    ticket.rsvp_updated_at = timezone.now()
    ticket.save(
        update_fields=[
            "rsvp_status", "has_plus_one", "plus_one_name", "plus_one_email", "plus_one_phone",
            "rsvp_updated_at",
        ]
    )
    return ticket


# ------------------------------------------------------------ door check-in

def _parse_token(token) -> uuid.UUID:
    try:
        return token if isinstance(token, uuid.UUID) else uuid.UUID(str(token).strip())
    except (ValueError, AttributeError, TypeError):
        raise GalaError("INVALID_TICKET", "Invitación no válida o falsa.", 404)


def lookup_ticket(token) -> GalaTicket:
    try:
        return GalaTicket.objects.select_related("participant__registration").get(pk=_parse_token(token))
    except GalaTicket.DoesNotExist:
        raise GalaError("INVALID_TICKET", "Invitación no válida o falsa.", 404)


def validate_checkin(token, checkin_count) -> dict:
    """Admits `checkin_count` people against the ticket's remaining capacity."""
    if isinstance(checkin_count, bool) or checkin_count not in (1, 2):
        raise GalaError("INVALID_COUNT", "La cantidad de ingresos debe ser 1 o 2.", 400)
    token = _parse_token(token)

    with transaction.atomic():
        try:
            ticket = GalaTicket.objects.select_for_update().get(pk=token)
        except GalaTicket.DoesNotExist:
            raise GalaError("INVALID_TICKET", "Invitación no válida o falsa.", 404)

        if is_expired(ticket):
            until = timezone.localtime(ticket.expires_at).strftime("%d/%m/%Y")
            raise GalaError("TICKET_EXPIRED", f"Esta invitación venció el {until}.", 400)

        remaining = ticket.remaining_capacity
        if remaining <= 0:
            raise GalaError(
                "CAPACITY_EXHAUSTED", "Ya se usaron todos los cupos de esta invitación.", 409
            )
        if checkin_count > remaining:
            raise GalaError(
                "INSUFFICIENT_CAPACITY",
                f"Solo queda{'n' if remaining != 1 else ''} {remaining} cupo{'s' if remaining != 1 else ''} en esta invitación.",
                400,
            )

        ticket.used_capacity += checkin_count
        ticket.checkin_at = timezone.now()
        ticket.save(update_fields=["used_capacity", "checkin_at"])

    return {
        "status": SUCCESS_STATUS,
        "valid": True,
        "guest_name": ticket.guest_name,
        "checked_in_now": checkin_count,
        "remaining_capacity": ticket.remaining_capacity,
        "message": f"Acceso permitido para {checkin_count} persona{'s' if checkin_count != 1 else ''}.",
    }


# ------------------------------------------------------------------- metrics

def summary() -> dict:
    tickets = GalaTicket.objects.all()
    totals = tickets.aggregate(
        created=Count("id"),
        sent=Count("id", filter=Q(sent_at__isnull=False)),
        confirmed=Count("id", filter=Q(rsvp_status=GalaTicket.Rsvp.CONFIRMED)),
        declined=Count("id", filter=Q(rsvp_status=GalaTicket.Rsvp.DECLINED)),
        plus_ones=Count("id", filter=Q(rsvp_status=GalaTicket.Rsvp.CONFIRMED, has_plus_one=True)),
        checked_in_tickets=Count("id", filter=Q(checkin_at__isnull=False)),
        checked_in_people=Sum("used_capacity"),
        checked_in_confirmed=Sum("used_capacity", filter=Q(rsvp_status=GalaTicket.Rsvp.CONFIRMED)),
    )
    sent = totals["sent"] or 0
    confirmed = totals["confirmed"] or 0
    confirmed_attendees = confirmed + (totals["plus_ones"] or 0)
    checked_in_confirmed = totals["checked_in_confirmed"] or 0

    def percent(part, whole):
        return round(100 * part / whole) if whole else 0

    return {
        "eligible_people": Participant.objects.count(),
        "invitations_created": totals["created"] or 0,
        "invitations_sent": sent,
        "rsvp": {
            "confirmed": confirmed,
            "declined": totals["declined"] or 0,
            "pending": max(sent - confirmed - (totals["declined"] or 0), 0),
            "confirmation_rate": percent(confirmed, sent),
        },
        "confirmed_attendees": confirmed_attendees,
        "checked_in_people": totals["checked_in_people"] or 0,
        "checked_in_tickets": totals["checked_in_tickets"] or 0,
        "attendance_rate": percent(checked_in_confirmed, confirmed_attendees),
        "plus_ones": [
            {
                "guest_name": t.guest_name,
                "plus_one_name": t.plus_one_name,
                "plus_one_email": t.plus_one_email,
                "plus_one_phone": t.plus_one_phone,
            }
            for t in tickets.filter(has_plus_one=True).order_by("guest_name")
        ],
    }
