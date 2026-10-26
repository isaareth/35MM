from datetime import date, time

from django.core.management.base import BaseCommand

from registrations.models import Event

# Create-only: an event that already exists (matched by slug) is left
# untouched, so edits made later (e.g. closing signups) survive redeploys.
EVENTS = [
    {
        "slug": "victor-gaviria",
        "title": "Podcast en vivo",
        "speaker": "Víctor Gaviria",
        "date": date(2026, 10, 16),
        "start_time": time(12, 0),
        "end_time": time(14, 0),
        "location": "Domo de visitantes · Universidad EAFIT",
        "open_to_public": True,
    },
    {
        "slug": "taller-diseno-produccion-direccion-arte",
        "title": "Taller Diseño de Producción y Dirección de Arte",
        "speaker": "Susana Osorio",
        "date": date(2026, 10, 21),
        "end_date": date(2026, 10, 22),
        "start_time": time(15, 0),
        "end_time": time(18, 0),
    },
    {
        "slug": "sony-3-de-noviembre",
        "title": "Charla",
        "speaker": "Sony",
        "date": date(2026, 11, 3),
        "start_time": time(9, 0),
    },
    {
        "slug": "sony-4-de-noviembre",
        "title": "Charla",
        "speaker": "Sony",
        "date": date(2026, 11, 4),
        "start_time": time(13, 0),
    },
    {
        "slug": "bicicine",
        "title": "Bicicine",
        "date": date(2026, 11, 9),
        "start_time": time(14, 0),
    },
]


class Command(BaseCommand):
    help = "Creates the festival's talk/workshop events that don't exist yet."

    def handle(self, *args, **options):
        for data in EVENTS:
            _, created = Event.objects.get_or_create(slug=data["slug"], defaults=data)
            self.stdout.write(f"{'created' if created else 'exists '} {data['slug']}")
