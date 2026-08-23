from django.db import transaction
from rest_framework import serializers

from .models import MAX_PARTICIPANTS, MIN_PARTICIPANTS, Participant, Registration


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = [
            "position",
            "is_leader",
            "full_name",
            "document_id",
            "institution",
            "institutional_email",
            "phone",
        ]


class RegistrationCreateSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True)

    class Meta:
        model = Registration
        fields = ["id", "accepted_terms", "confirmed_eligibility", "created_at", "participants"]
        read_only_fields = ["id", "created_at"]

    def validate_accepted_terms(self, value):
        if not value:
            raise serializers.ValidationError("Debes aceptar los términos y condiciones.")
        return value

    def validate_confirmed_eligibility(self, value):
        if not value:
            raise serializers.ValidationError(
                "Debes confirmar que todos los integrantes cumplen el requisito de inscripción."
            )
        return value

    def validate_participants(self, participants):
        if not (MIN_PARTICIPANTS <= len(participants) <= MAX_PARTICIPANTS):
            raise serializers.ValidationError(
                f"El equipo debe tener entre {MIN_PARTICIPANTS} y {MAX_PARTICIPANTS} integrantes."
            )

        positions = [p["position"] for p in participants]
        if len(set(positions)) != len(positions):
            raise serializers.ValidationError("Cada integrante debe tener una posición única.")
        if sorted(positions) != list(range(1, len(participants) + 1)):
            raise serializers.ValidationError(
                "Las posiciones de los integrantes deben ser consecutivas empezando en 1."
            )

        leaders = [p for p in participants if p.get("is_leader")]
        if len(leaders) != 1:
            raise serializers.ValidationError("Debe haber exactamente un representante del grupo.")
        if leaders[0]["position"] != 1:
            raise serializers.ValidationError("El representante del grupo debe ser el participante 1.")

        emails = [p["institutional_email"].lower() for p in participants]
        if len(set(emails)) != len(emails):
            raise serializers.ValidationError(
                "No se puede repetir el mismo correo institucional entre integrantes."
            )

        return participants

    @transaction.atomic
    def create(self, validated_data):
        participants_data = validated_data.pop("participants")
        registration = Registration.objects.create(**validated_data)
        Participant.objects.bulk_create(
            [Participant(registration=registration, **p) for p in participants_data]
        )
        return registration


class ParticipantReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = [
            "position",
            "is_leader",
            "full_name",
            "document_id",
            "institution",
            "institutional_email",
            "phone",
        ]


class RegistrationReadSerializer(serializers.ModelSerializer):
    participants = ParticipantReadSerializer(many=True, read_only=True)

    class Meta:
        model = Registration
        fields = [
            "id",
            "accepted_terms",
            "confirmed_eligibility",
            "created_at",
            "participants",
        ]
