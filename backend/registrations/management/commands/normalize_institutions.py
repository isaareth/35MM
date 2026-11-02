import json
import os
from collections import Counter
from datetime import datetime

from django.core.management.base import BaseCommand

from registrations.institutions import institution_group
from registrations.models import EventRegistration, Participant


def _clean(raw):
    """The value a row should hold: the canonical name for known
    institutions, otherwise just the same text with spacing tidied."""
    text = " ".join((raw or "").split())
    _, label = institution_group(text)
    return label or text


class Command(BaseCommand):
    help = (
        "Rewrites institution answers to one canonical spelling for known "
        "institutions. Dry run unless --apply is given; with --apply the old "
        "values are saved to ~/35mm-respaldos first."
    )

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Write the changes.")

    def handle(self, *args, **options):
        changes, backup = Counter(), []
        pending = {}
        for model in (Participant, EventRegistration):
            rows = []
            for row in model.objects.all():
                new = _clean(row.institution)
                if new != row.institution:
                    changes[(row.institution, new)] += 1
                    backup.append({"model": model.__name__, "id": str(row.pk), "old": row.institution})
                    row.institution = new
                    rows.append(row)
            pending[model] = rows

        for (old, new), count in sorted(changes.items(), key=lambda x: (x[0][1].lower(), x[0][0])):
            self.stdout.write(f"{count:>3}  {old!r} -> {new!r}")
        total = sum(changes.values())
        self.stdout.write(f"\n{total} filas cambiarian en {len(changes)} variantes.")

        if not options["apply"]:
            self.stdout.write("Simulacion: no se escribio nada. Usa --apply para aplicar.")
            return

        folder = os.path.expanduser("~/35mm-respaldos")
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, f"instituciones_antes_{datetime.now():%Y%m%d_%H%M%S}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(backup, f, ensure_ascii=False, indent=2)

        for model, rows in pending.items():
            model.objects.bulk_update(rows, ["institution"])
        self.stdout.write(f"Aplicado. Valores anteriores guardados en {path}")
