import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower

MIN_PARTICIPANTS = 4
MAX_PARTICIPANTS = 6


class Registration(models.Model):
    """One team's submission. There is no separate "team" concept in the
    real form (no team-name field) — a Registration *is* the team, and its
    Participants are the members. Kept as its own model (rather than folded
    into Participant) so consent flags and submission metadata live in one
    place, per the "separate inscripción / participantes" principle in
    07_DATABASE_API.md.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    accepted_terms = models.BooleanField(
        help_text="Términos y condiciones aceptados al enviar el formulario."
    )
    confirmed_eligibility = models.BooleanField(
        help_text="Confirmación de que todos los integrantes cursan un programa "
        "de educación superior en el Valle de Aburrá."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    confirmation_email_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Se llena solo cuando el envío del correo de confirmación tuvo éxito "
        "(nunca al momento de intentarlo) — permite reintentar envíos masivos sin "
        "duplicar correos a quien ya lo recibió.",
    )

    def __str__(self) -> str:
        leader = self.participants.filter(is_leader=True).first()
        return f"{leader.full_name if leader else 'Sin líder'} ({self.created_at:%Y-%m-%d})"

    @property
    def leader(self):
        return self.participants.filter(is_leader=True).first()


class Participant(models.Model):
    registration = models.ForeignKey(
        Registration, related_name="participants", on_delete=models.CASCADE
    )
    position = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(MAX_PARTICIPANTS)],
        help_text="Slot 1-6 tal como aparece en el formulario (1 = representante del grupo).",
    )
    is_leader = models.BooleanField(default=False)
    full_name = models.CharField("Nombre completo", max_length=200)
    document_id = models.CharField("Documento de identidad", max_length=50)
    institution = models.CharField("Institución de educación superior", max_length=200)
    institutional_email = models.EmailField("Correo institucional")
    phone = models.CharField("Celular", max_length=30)

    class Meta:
        ordering = ["registration_id", "position"]
        constraints = [
            models.UniqueConstraint(
                fields=["registration", "position"], name="unique_position_per_registration"
            )
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.institution})"


class Event(models.Model):
    """A talk, workshop or podcast session that people sign up for
    individually (as opposed to the festival's team Registration)."""

    slug = models.SlugField(unique=True)
    title = models.CharField("Título", max_length=200, help_text='Ej: "Podcast en vivo".')
    speaker = models.CharField("Invitado", max_length=200, blank=True)
    description = models.TextField("Descripción", blank=True)
    date = models.DateField("Fecha", null=True, blank=True)
    end_date = models.DateField(
        "Fecha de fin", null=True, blank=True, help_text="Solo para eventos de varios días."
    )
    start_time = models.TimeField("Hora de inicio", null=True, blank=True)
    end_time = models.TimeField("Hora de fin", null=True, blank=True)
    location = models.CharField("Lugar", max_length=200, blank=True)
    open_to_public = models.BooleanField("Abierto al público", default=False)
    is_open = models.BooleanField(
        "Inscripciones abiertas",
        default=True,
        help_text="Desmárcalo para cerrar las inscripciones de este evento.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = [models.F("date").asc(nulls_last=True), "start_time", "created_at"]

    def __str__(self) -> str:
        return f"{self.title} — {self.speaker}" if self.speaker else self.title


class EventRegistration(models.Model):
    """Individual signup for an Event."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, related_name="registrations", on_delete=models.CASCADE)
    full_name = models.CharField("Nombre completo", max_length=200)
    document_id = models.CharField("Documento de identidad", max_length=50)
    institution = models.CharField("Institución", max_length=200, blank=True)
    email = models.EmailField("Correo electrónico")
    phone = models.CharField("Celular", max_length=30)
    accepted_terms = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    attended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Se llena cuando un administrador marca la asistencia el día del evento.",
    )

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                "event", Lower("email"), name="unique_event_registration_email"
            )
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.email})"
