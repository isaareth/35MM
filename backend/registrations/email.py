import logging

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
        if settings.EMAIL_PROVIDER == "resend":
            _send_via_resend(leader.institutional_email, subject, body)
        elif settings.EMAIL_PROVIDER == "gmail":
            _send_via_gmail(leader.institutional_email, subject, body)
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


def _send_via_gmail(to_email: str, subject: str, body: str) -> None:
    """Sends through Gmail's SMTP server, authenticated with an App Password
    (requires 2-Step Verification enabled on the sending Gmail account —
    regular account passwords are rejected by Gmail's SMTP for this)."""
    import smtplib
    from email.mime.text import MIMEText

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM_ADDRESS
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
        server.login(settings.EMAIL_FROM_ADDRESS, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM_ADDRESS, [to_email], msg.as_string())


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
