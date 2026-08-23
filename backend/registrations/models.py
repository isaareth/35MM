import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

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
