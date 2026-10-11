import django.db.models.deletion
import django.db.models.functions.text
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("registrations", "0005_assign_existing_talk_signups"),
    ]

    operations = [
        migrations.AlterField(
            model_name="eventregistration",
            name="event",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="registrations",
                to="registrations.event",
            ),
        ),
        migrations.AddConstraint(
            model_name="eventregistration",
            constraint=models.UniqueConstraint(
                models.F("event"),
                django.db.models.functions.text.Lower("email"),
                name="unique_event_registration_email",
            ),
        ),
    ]
