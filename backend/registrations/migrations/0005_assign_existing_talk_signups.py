from django.db import migrations


def assign_to_yesenia(apps, schema_editor):
    Event = apps.get_model("registrations", "Event")
    EventRegistration = apps.get_model("registrations", "EventRegistration")

    event, _ = Event.objects.get_or_create(
        slug="yesenia-valencia",
        defaults={"title": "Charla", "speaker": "Yesenia Valencia"},
    )
    EventRegistration.objects.filter(event__isnull=True).update(event=event)


class Migration(migrations.Migration):
    dependencies = [
        ("registrations", "0004_event_schema"),
    ]

    operations = [
        migrations.RunPython(assign_to_yesenia, migrations.RunPython.noop),
    ]
