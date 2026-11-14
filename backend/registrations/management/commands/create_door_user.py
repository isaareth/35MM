import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError

from registrations.permissions import DOOR_GROUP

# No look-alike characters (0/O, 1/l/I) so the password can be read aloud or typed from a phone.
ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class Command(BaseCommand):
    help = (
        'Creates (or resets) a door-staff account: it can sign in and use the gala scanner, '
        'and nothing else. Prints the password once.'
    )

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("--reset-password", action="store_true", help="Change the password of an existing door account.")

    def handle(self, *args, **options):
        username = options["username"].strip().lower()
        if not username:
            raise CommandError("Escribe un nombre de usuario.")

        User = get_user_model()
        group, _ = Group.objects.get_or_create(name=DOOR_GROUP)
        user = User.objects.filter(username=username).first()

        if user is not None:
            if user.is_staff or user.is_superuser:
                raise CommandError(f"'{username}' es un administrador; no se convierte en cuenta de puerta.")
            if not options["reset_password"]:
                raise CommandError(f"'{username}' ya existe. Usa --reset-password para darle una contraseña nueva.")
        else:
            user = User(username=username, is_staff=False, is_superuser=False)

        password = "".join(secrets.choice(ALPHABET) for _ in range(12))
        user.set_password(password)
        user.is_active = True
        user.save()
        user.groups.add(group)

        self.stdout.write(f"usuario: {username}")
        self.stdout.write(f"contraseña: {password}")
