from io import StringIO

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import CommandError, call_command
from django.test import TestCase
from rest_framework.test import APIClient

from . import gala
from .test_gala import admin_client, make_team, make_ticket


class ThrottleReset:
    def setUp(self):
        super().setUp()
        cache.clear()


def make_door_user(username="sara"):
    out = StringIO()
    call_command("create_door_user", username, stdout=out)
    password = next(l for l in out.getvalue().splitlines() if l.startswith("contraseña:")).split(": ", 1)[1]
    return username, password


def door_client(username="sara"):
    username, password = make_door_user(username)
    response = APIClient().post("/api/auth/login/", {"username": username, "password": password}, format="json")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {response.json()['token']}")
    return client


class DoorAccountTests(ThrottleReset, TestCase):
    def test_command_creates_a_non_staff_user_in_the_door_group_with_a_usable_password(self):
        username, password = make_door_user("Alejandra")
        user = get_user_model().objects.get(username="alejandra")
        self.assertEqual((username, len(password)), ("Alejandra", 12))
        self.assertFalse(user.is_staff or user.is_superuser)
        self.assertEqual(list(user.groups.values_list("name", flat=True)), ["puerta"])
        self.assertTrue(user.check_password(password))

    def test_each_account_gets_a_different_password(self):
        self.assertNotEqual(make_door_user("alejandra")[1], make_door_user("sara")[1])

    def test_existing_accounts_are_protected(self):
        make_door_user("sara")
        with self.assertRaises(CommandError):
            call_command("create_door_user", "sara", stdout=StringIO())
        out = StringIO()
        call_command("create_door_user", "sara", "--reset-password", stdout=out)
        self.assertIn("contraseña:", out.getvalue())

        get_user_model().objects.create_superuser("admin", "a@x.co", "pw")
        for flags in ((), ("--reset-password",)):
            with self.assertRaises(CommandError):
                call_command("create_door_user", "admin", *flags, stdout=StringIO())
        self.assertTrue(get_user_model().objects.get(username="admin").check_password("pw"))

    def test_login_tells_the_role_and_rejects_outsiders(self):
        username, password = make_door_user("sara")
        door = APIClient().post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.assertEqual((door.status_code, door.json()["role"]), (200, "door"))

        get_user_model().objects.create_superuser("adm", "a@x.co", "pw12345-x")
        admin = APIClient().post("/api/auth/login/", {"username": "adm", "password": "pw12345-x"}, format="json")
        self.assertEqual((admin.status_code, admin.json()["role"]), (200, "admin"))

        get_user_model().objects.create_user("random", password="pw12345-x")  # no group, not staff
        self.assertEqual(
            APIClient().post("/api/auth/login/", {"username": "random", "password": "pw12345-x"}, format="json").status_code,
            401,
        )
        self.assertEqual(
            APIClient().post("/api/auth/login/", {"username": "sara", "password": "mala"}, format="json").status_code, 401
        )

    def test_a_deactivated_door_account_cannot_sign_in_or_use_an_old_token(self):
        client = door_client("sara")
        ticket = make_ticket()
        self.assertEqual(client.get(f"/api/admin/gala/tickets/{ticket.id}/").status_code, 200)
        get_user_model().objects.filter(username="sara").update(is_active=False)
        self.assertIn(client.get(f"/api/admin/gala/tickets/{ticket.id}/").status_code, (401, 403))


class DoorPermissionTests(ThrottleReset, TestCase):
    def test_door_staff_can_scan_and_admit(self):
        client = door_client()
        ticket = make_ticket()
        lookup = client.get(f"/api/admin/gala/tickets/{ticket.id}/")
        self.assertEqual((lookup.status_code, lookup.json()["guest_name"]), (200, "Persona 1"))
        door = client.post("/api/admin/gala/validate/", {"token": str(ticket.id), "checkin_count": 2}, format="json")
        self.assertEqual((door.status_code, door.json()["remaining_capacity"]), (200, 0))
        self.assertEqual(
            client.post("/api/admin/gala/validate/", {"token": str(ticket.id), "checkin_count": 1}, format="json").status_code,
            409,
        )

    def test_door_staff_cannot_reach_anything_else(self):
        client = door_client()
        team = make_team()
        ticket = make_ticket("g@x.co")
        forbidden = [
            ("get", "/api/admin/dashboard/"),
            ("get", "/api/admin/registrations/"),
            ("get", "/api/admin/registrations/export/"),
            ("post", "/api/admin/registrations/send-confirmations/"),
            ("delete", f"/api/admin/registrations/{team.id}/"),
            ("patch", f"/api/admin/registrations/{team.id}/submission/"),
            ("post", f"/api/admin/registrations/{team.id}/gala-invitations/"),
            ("get", "/api/admin/gala/summary/"),
            ("get", "/api/admin/gala/extras/"),
            ("post", "/api/admin/gala/extras/"),
            ("post", "/api/admin/gala/extras/send/"),
            ("delete", f"/api/admin/gala/extras/{ticket.id}/"),
            ("post", "/api/admin/email/test/"),
            ("get", "/api/admin/analytics/"),
            ("get", "/api/admin/events/"),
            ("get", "/api/admin/events/algo/export/"),
        ]
        for method, url in forbidden:
            self.assertEqual(getattr(client, method)(url).status_code, 403, (method, url))
        # nothing was changed by the forbidden attempts
        self.assertTrue(type(team).objects.filter(pk=team.pk).exists())

    def test_admins_keep_full_access_and_anonymous_users_none(self):
        admin = admin_client()
        ticket = make_ticket()
        self.assertEqual(admin.get(f"/api/admin/gala/tickets/{ticket.id}/").status_code, 200)
        self.assertEqual(admin.get("/api/admin/gala/summary/").status_code, 200)
        anon = APIClient()
        self.assertEqual(anon.get(f"/api/admin/gala/tickets/{ticket.id}/").status_code, 401)
        self.assertEqual(anon.post("/api/admin/gala/validate/", {}, format="json").status_code, 401)

    def test_a_logged_in_user_without_the_group_cannot_scan(self):
        user = get_user_model().objects.create_user("plain", password="pw12345-x")
        from rest_framework.authtoken.models import Token

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=user).key}")
        ticket = make_ticket()
        self.assertEqual(client.get(f"/api/admin/gala/tickets/{ticket.id}/").status_code, 403)
        self.assertEqual(
            client.post("/api/admin/gala/validate/", {"token": str(ticket.id), "checkin_count": 1}, format="json").status_code,
            403,
        )
        self.assertEqual(gala.lookup_ticket(ticket.id).used_capacity, 0)


class LoginThrottleTests(ThrottleReset, TestCase):
    def test_several_staff_can_sign_in_from_the_same_connection_but_guessing_is_still_limited(self):
        username, password = make_door_user("sara")
        client = APIClient()
        for _ in range(10):  # well over the old 5/hour limit
            self.assertEqual(client.post("/api/auth/login/", {"username": username, "password": password}, format="json").status_code, 200)
        # an attacker has no session, so every guess comes from a fresh client
        statuses = [
            APIClient().post("/api/auth/login/", {"username": username, "password": "mala"}, format="json").status_code
            for _ in range(35)
        ]
        self.assertEqual(statuses[0], 401)
        self.assertEqual(statuses[-1], 429)
