import json
import logging
import smtplib
import socket
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.conf import settings

logger = logging.getLogger("registrations.email")


def _build_confirmation_email(registration):
    leader = registration.leader
    subject = "¡Bienvenido a 35mm! Fechas importantes de esta edición"

    lines = [
        f"Hola {leader.full_name}:",
        "",
        "¡Estamos muy felices de darte la bienvenida a esta edición de 35mm! "
        "Gracias por inscribirte y por querer ser parte de este festival, donde "
        "el cine, la creatividad y las historias son los protagonistas.",
        "",
        "Nos emociona todo lo que viene y esperamos que disfrutes cada momento, "
        "desde las charlas hasta la gala de premiación. Para que puedas organizar "
        "tu proceso y no te pierdas ninguna fecha, te compartimos los momentos "
        "más importantes de esta edición:",
        "",
        "Fechas importantes",
        "",
        "26 de septiembre al 21 de octubre | Charlas",
        "Encuentros para aprender, compartir y conversar sobre cine y creación "
        "audiovisual.",
        "",
        "30 de septiembre | Cierre de inscripciones",
        "Último día para inscribirse a esta edición de 35mm.",
        "",
        "22 de octubre | Entrega del cortometraje, el tráiler y el póster",
        "Fecha límite para entregar los tres materiales de participación. "
        "Recuerda organizar tu proceso con anticipación.",
        "",
        "Importante: tu cortometraje debe ser creado bajo la temática propuesta "
        "para esta edición de 35mm. Tenla presente durante todo tu proceso "
        "creativo y asegúrate de que tu historia dialogue con ella.",
        "",
        "9 de noviembre | Revelación de los nominados",
        "Conoceremos las propuestas nominadas en las diferentes categorías "
        "premiadas.",
        "",
        "Proyecciones",
        "",
        "Tendremos diferentes espacios de proyección en la ciudad. Los lugares, "
        "las fechas y los horarios se anunciarán a través de nuestras redes "
        "sociales oficiales: @35mm_tvu.",
        "",
        "Te invitamos a estar pendiente de nuestras publicaciones para conocer "
        "todas las novedades.",
        "",
        "14 de noviembre | Cierre del evento y gala de premiación",
        "Una noche para celebrar el cine, disfrutar las historias creadas y "
        "compartir el cierre de esta edición.",
        "",
        "Estamos muy emocionados de comenzar esta edición contigo. Gracias por "
        "confiar en el festival y por atreverte a contar tu historia.",
        "",
        "¡Bienvenido a 35mm!",
        "",
        "Con mucho entusiasmo,",
        "",
        "Equipo 35mm – Producciones TVU",
    ]
    if settings.SHORTFILM_FORM_URL:
        lines += [
            "",
            f"Formulario para la entrega del cortometraje: {settings.SHORTFILM_FORM_URL}",
        ]
    lines += [
        "",
        f"Cualquier duda, escríbenos a {settings.FESTIVAL_CONTACT_EMAIL}.",
    ]
    return subject, "\n".join(lines)


def send_registration_confirmation(registration) -> bool:
    """Send the confirmation email to the team leader.

    Returns True/False instead of raising, so a provider failure never
    rolls back an already-saved registration (AC-013) — the caller is
    expected to log the failure for manual follow-up, which this function
    already does before returning False.
    """
    leader = registration.leader
    if leader is None:
        logger.error("Registration %s has no leader; cannot send confirmation email.", registration.id)
        return False

    subject, body = _build_confirmation_email(registration)

    try:
        deliver(leader.institutional_email, subject, body)
        return True
    except Exception:
        logger.exception(
            "Failed to send confirmation email for registration %s to %s",
            registration.id,
            leader.institutional_email,
        )
        return False


def deliver(to_email: str, subject: str, text: str, html: str | None = None, extra: dict | None = None) -> None:
    """Sends one email through the configured provider. Raises on failure.

    `extra` carries provider-specific fields that only the webhook transport
    forwards (e.g. the QR image) so an automation can attach them."""
    provider = settings.EMAIL_PROVIDER
    if provider == "resend":
        _send_via_resend(to_email, subject, text, html)
    elif provider == "gmail":
        _send_via_gmail(to_email, subject, text, html)
    elif provider == "webhook":
        _send_via_webhook(to_email, subject, text, html, extra)
    else:
        _send_via_console(to_email, subject, text, html)


def _send_via_console(to_email: str, subject: str, body: str, html: str | None = None) -> None:
    logger.info("[EMAIL:console] To=%s Subject=%s Html=%s\n%s", to_email, subject, bool(html), body)


def _send_via_webhook(to_email, subject, text, html=None, extra=None) -> None:
    """POSTs the message as JSON to an automation (Make, n8n...) that sends it
    from the festival's own mailbox. HTTPS only, so Railway's blocked SMTP
    ports are not involved."""
    if not settings.EMAIL_WEBHOOK_URL:
        raise RuntimeError("EMAIL_WEBHOOK_URL no está configurada.")
    payload = {
        "to": to_email,
        "from": settings.EMAIL_FROM_ADDRESS,
        "subject": subject,
        "text": text,
        "html": html or "",
        **(extra or {}),
    }
    request = urllib.request.Request(
        settings.EMAIL_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError(f"El webhook de correo respondió {response.status}.")


class _IPv4SMTP_SSL(smtplib.SMTP_SSL):
    """smtplib.SMTP_SSL, but forced to connect over IPv4.

    Railway's outbound networking has no usable IPv6 route (same class of
    issue as the Supabase direct-connection problem elsewhere in this
    project), so the default dual-stack getaddrinfo() picks an AAAA record
    for smtp.gmail.com and fails with "Network is unreachable"."""

    def _get_socket(self, host, port, timeout):
        addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        sock = socket.create_connection(addr_info[0][4], timeout)
        return self.context.wrap_socket(sock, server_hostname=self._host)


def _send_via_gmail(to_email: str, subject: str, body: str, html: str | None = None) -> None:
    """Sends through Gmail's SMTP server, authenticated with an App Password
    (requires 2-Step Verification enabled on the sending Gmail account —
    regular account passwords are rejected by Gmail's SMTP for this)."""
    if html:
        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(body, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))
    else:
        msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM_ADDRESS
    msg["To"] = to_email

    with _IPv4SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
        server.login(settings.EMAIL_FROM_ADDRESS, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM_ADDRESS, [to_email], msg.as_string())


def _send_via_resend(to_email: str, subject: str, body: str, html: str | None = None) -> None:
    import resend

    resend.api_key = settings.RESEND_API_KEY
    message = {
        "from": settings.EMAIL_FROM_ADDRESS,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    if html:
        message["html"] = html
    resend.Emails.send(message)
