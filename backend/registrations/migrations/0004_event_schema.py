import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """Schema half of turning the single-talk signup into per-event signups.
    Split from the data step (0005) and the NOT NULL step (0006) because
    PostgreSQL refuses to ALTER a table that has pending trigger events from
    rows updated in the same transaction."""

    dependencies = [
        ("registrations", "0003_talkregistration"),
    ]

    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(unique=True)),
                ("title", models.CharField(help_text='Ej: "Podcast en vivo".', max_length=200, verbose_name="Título")),
                ("speaker", models.CharField(blank=True, max_length=200, verbose_name="Invitado")),
                ("description", models.TextField(blank=True, verbose_name="Descripción")),
                ("date", models.DateField(blank=True, null=True, verbose_name="Fecha")),
                ("start_time", models.TimeField(blank=True, null=True, verbose_name="Hora de inicio")),
                ("end_time", models.TimeField(blank=True, null=True, verbose_name="Hora de fin")),
                ("location", models.CharField(blank=True, max_length=200, verbose_name="Lugar")),
                ("open_to_public", models.BooleanField(default=False, verbose_name="Abierto al público")),
                (
                    "is_open",
                    models.BooleanField(
                        default=True,
                        help_text="Desmárcalo para cerrar las inscripciones de este evento.",
                        verbose_name="Inscripciones abiertas",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": [models.F("date").asc(nulls_last=True), "start_time", "created_at"],
            },
        ),
        migrations.RenameModel(old_name="TalkRegistration", new_name="EventRegistration"),
        migrations.RemoveConstraint(
            model_name="eventregistration", name="unique_talk_registration_email"
        ),
        migrations.AddField(
            model_name="eventregistration",
            name="event",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="registrations",
                to="registrations.event",
            ),
        ),
        migrations.AddField(
            model_name="eventregistration",
            name="attended_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Se llena cuando un administrador marca la asistencia el día del evento.",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="eventregistration",
            name="institution",
            field=models.CharField(blank=True, max_length=200, verbose_name="Institución"),
        ),
    ]
