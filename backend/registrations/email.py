import logging

from django.conf import settings

logger = logging.getLogger("registrations.email")


def _build_confirmation_email(registration):
    leader = registration.leader
    subject = "35mm Festival de Cortos — Inscripción recibida"

    lines = [
        f"Hola {leader.full_name},",
        "",
        "Recibimos la inscripción de tu equipo para el 35mm Festival de Cortos "
        "(Producciones TVU · Universidad EAFIT).",
        f"Integrantes registrados: {registration.participants.count()}.",
        "",
        "Próximos pasos: te contactaremos con la información oficial del tema y "
        "las fechas de entrega del cortometraje.",
    ]
    if settings.SHORTFILM_FORM_URL:
        lines += [
            "",
            f"Formulario para la entrega del cortometraje: {settings.SHORTFILM_FORM_URL}",
        ]
    lines += [
        "",
        f"Cualquier duda, escríbenos a {settings.FESTIVAL_CONTACT_EMAIL}.",
        "",
        "— Equipo 35mm / Producciones TVU",
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
        if settings.EMAIL_PROVIDER == "resend":
            _send_via_resend(leader.institutional_email, subject, body)
        else:
            _send_via_console(leader.institutional_email, subject, body)
        return True
    except Exception:
        logger.exception(
            "Failed to send confirmation email for registration %s to %s",
            registration.id,
            leader.institutional_email,
        )
        return False


def _send_via_console(to_email: str, subject: str, body: str) -> None:
    logger.info("[EMAIL:console] To=%s Subject=%s\n%s", to_email, subject, body)


def _send_via_resend(to_email: str, subject: str, body: str) -> None:
    import resend

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(
        {
            "from": settings.EMAIL_FROM_ADDRESS,
            "to": [to_email],
            "subject": subject,
            "text": body,
        }
    )
