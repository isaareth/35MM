from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

from . import gala
from .email import EmailDeliveryError
from .models import GalaTicket
from .test_gala import admin_client, make_team

EXTRAS = "/api/admin/gala/extras/"


def add(client, guests, **extra):
    return client.post(EXTRAS, {"guests": guests, **extra}, format="json")


class ExtrasPocketTests(TestCase):
    def setUp(self):
        self.client = admin_client()

    def test_requires_admin_everywhere(self):
        anon = APIClient()
        ticket = GalaTicket.objects.create(guest_name="A", guest_email="a@x.co", expires_at=gala.ticket_expiry())
        for method, url in [
            ("get", EXTRAS),
            ("post", EXTRAS),
            ("post", EXTRAS + "send/"),
            ("delete", f"{EXTRAS}{ticket.id}/"),
        ]:
            self.assertEqual(getattr(anon, method)(url).status_code, 401, (method, url))

    def test_adds_extras_without_touching_any_team(self):
        team = make_team(film="Contraste")
        before = team.participants.count()
        response = add(
            self.client,
            [{"name": "  Ana   Actriz ", "email": "ana@x.co"}, {"name": "Beto", "email": "BETO@x.co"}],
            registration_id=str(team.id),
            group="Actores",
        )
        self.assertEqual((response.status_code, response.json()["created_count"], response.json()["skipped"]), (201, 2, []))
        self.assertEqual(team.participants.count(), before)  # roster untouched
        rows = self.client.get(EXTRAS).json()
        self.assertEqual([r["guest_name"] for r in rows], ["Ana Actriz", "Beto"])
        self.assertEqual({r["team"] for r in rows}, {"Contraste · Actores"})
        self.assertEqual({r["sponsor_registration_id"] for r in rows}, {str(team.id)})
        ticket = GalaTicket.objects.get(guest_email="ana@x.co")
        self.assertIsNone(ticket.participant)
        self.assertEqual((ticket.total_capacity, ticket.sent_at), (2, None))

    def test_bad_rows_are_reported_and_the_rest_still_added(self):
        make_team(("lead@x.co", "b@x.co", "c@x.co", "d@x.co"))
        add(self.client, [{"name": "Ya", "email": "ya@x.co"}])
        response = add(
            self.client,
            [
                {"name": "", "email": "sin-nombre@x.co"},
                {"name": "Mal", "email": "no-es-correo"},
                {"name": "Repetido", "email": "YA@x.co"},
                {"name": "Del equipo", "email": "B@x.co"},
                {"name": "Bien", "email": "bien@x.co"},
                {"name": "Dup en la lista", "email": "bien@x.co"},
            ],
        )
        body = response.json()
        self.assertEqual(body["created_count"], 1)
        reasons = {s["row"]: s["reason"] for s in body["skipped"]}
        self.assertEqual(sorted(reasons), [1, 2, 3, 4, 6])
        self.assertIn("nombre", reasons[1])
        self.assertIn("válido", reasons[2])
        self.assertIn("bolsillo", reasons[3])
        self.assertIn("equipo", reasons[4])
        self.assertIn("bolsillo", reasons[6])
        self.assertEqual(GalaTicket.objects.filter(participant__isnull=True).count(), 2)

    def test_input_limits(self):
        for guests in ([], None, "x", [{"name": "A", "email": "a@x.co"}] * 101):
            self.assertEqual(add(self.client, guests).status_code, 400)
        self.assertEqual(add(self.client, [{"name": "A", "email": "a@x.co"}], group="x" * 61).status_code, 400)
        self.assertEqual(
            add(self.client, [{"name": "A", "email": "a@x.co"}], registration_id="no-es-uuid").status_code, 400
        )
        self.assertEqual(
            add(self.client, [{"name": "A", "email": "a@x.co"}], registration_id="11111111-2222-4333-8444-555555555555").status_code,
            400,
        )
        self.assertEqual(GalaTicket.objects.count(), 0)

    def test_send_goes_only_to_pending_extras_and_never_to_team_members(self):
        make_team()
        add(self.client, [{"name": "A", "email": "a@x.co"}, {"name": "B", "email": "b2@x.co"}])
        with mock.patch("registrations.gala.deliver") as sender:
            first = self.client.post(EXTRAS + "send/", {}, format="json").json()
            again = self.client.post(EXTRAS + "send/", {}, format="json").json()
        self.assertEqual((first["sent_count"], first["failed_count"], again["results"]), (2, 0, []))
        self.assertEqual(sorted(c.args[0] for c in sender.call_args_list), ["a@x.co", "b2@x.co"])
        # each email carries a QR url for its own ticket
        for call in sender.call_args_list:
            ticket = GalaTicket.objects.get(guest_email=call.args[0])
            self.assertIn(f"/api/gala/invitations/{ticket.id}/qr.png", call.args[4]["qr_url"])

    def test_resend_one_and_unknown_ticket(self):
        add(self.client, [{"name": "A", "email": "a@x.co"}, {"name": "B", "email": "b2@x.co"}])
        with mock.patch("registrations.gala.deliver"):
            self.client.post(EXTRAS + "send/", {}, format="json")
        target = GalaTicket.objects.get(guest_email="a@x.co")
        with mock.patch("registrations.gala.deliver") as sender:
            result = self.client.post(EXTRAS + "send/", {"ticket_id": str(target.id)}, format="json").json()
        self.assertEqual((result["sent_count"], sender.call_count, sender.call_args.args[0]), (1, 1, "a@x.co"))
        bad = self.client.post(EXTRAS + "send/", {"ticket_id": "11111111-2222-4333-8444-555555555555"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_quota_stops_the_batch_and_failures_stay_pending(self):
        add(self.client, [{"name": n, "email": f"{n.lower()}@x.co"} for n in ("A", "B", "C", "D")])
        calls = {"n": 0}

        def flaky(*args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 3:
                raise EmailDeliveryError("Se agotó el límite diario.", "quota")

        with mock.patch("registrations.gala.deliver", side_effect=flaky):
            data = self.client.post(EXTRAS + "send/", {}, format="json").json()
        self.assertEqual((data["sent_count"], data["failed_count"], data["stopped_by_quota"], calls["n"]), (2, 1, True, 3))
        self.assertEqual(GalaTicket.objects.filter(sent_at__isnull=False).count(), 2)
        with mock.patch("registrations.gala.deliver") as sender:
            retry = self.client.post(EXTRAS + "send/", {}, format="json").json()
        self.assertEqual((retry["sent_count"], sender.call_count), (2, 2))

    def test_delete_pending_extra_but_not_one_who_already_entered(self):
        add(self.client, [{"name": "A", "email": "a@x.co"}, {"name": "B", "email": "b2@x.co"}])
        a, b = GalaTicket.objects.get(guest_email="a@x.co"), GalaTicket.objects.get(guest_email="b2@x.co")
        self.assertEqual(self.client.delete(f"{EXTRAS}{a.id}/").status_code, 204)
        gala.validate_checkin(b.id, 1)
        self.assertEqual(self.client.delete(f"{EXTRAS}{b.id}/").status_code, 409)
        self.assertEqual(list(GalaTicket.objects.values_list("guest_email", flat=True)), ["b2@x.co"])

    def test_team_tickets_cannot_be_deleted_through_the_extras_endpoint(self):
        member = make_team().participants.first()
        ticket = gala.ensure_ticket(member)
        self.assertEqual(self.client.delete(f"{EXTRAS}{ticket.id}/").status_code, 404)
        self.assertTrue(GalaTicket.objects.filter(pk=ticket.pk).exists())

    def test_the_removed_email_can_be_added_again(self):
        add(self.client, [{"name": "A", "email": "a@x.co"}])
        self.client.delete(f"{EXTRAS}{GalaTicket.objects.get().id}/")
        self.assertEqual(add(self.client, [{"name": "A", "email": "a@x.co"}]).json()["created_count"], 1)

    def test_deleting_the_inviting_team_keeps_the_extra(self):
        team = make_team(film="Contraste")
        add(self.client, [{"name": "A", "email": "a@x.co"}], registration_id=str(team.id), group="Actores")
        team.delete()
        ticket = GalaTicket.objects.get()
        self.assertIsNone(ticket.sponsor_registration)
        self.assertEqual(gala.team_label(ticket), "Actores")

    def test_an_extra_goes_through_the_whole_guest_and_door_flow(self):
        team = make_team(film="Contraste")
        add(self.client, [{"name": "Ana Actriz", "email": "ana@x.co"}], registration_id=str(team.id), group="Actores")
        ticket = GalaTicket.objects.get()
        guest = APIClient()

        view = guest.get(f"/api/gala/invitations/{ticket.id}/").json()
        self.assertEqual(view["guest_name"], "Ana Actriz")
        self.assertEqual(guest.get(f"/api/gala/invitations/{ticket.id}/qr.png")["Content-Type"], "image/png")
        rsvp = guest.post(
            f"/api/gala/invitations/{ticket.id}/rsvp/",
            {"attending": True, "has_plus_one": True, "plus_one_name": "Luis", "plus_one_email": "luis@x.co",
             "plus_one_phone": "3001234567", "plus_one_data_consent": True},
            format="json",
        )
        self.assertEqual(rsvp.status_code, 200)

        lookup = self.client.get(f"/api/admin/gala/tickets/{ticket.id}/").json()
        self.assertEqual((lookup["team"], lookup["guest_name"], lookup["plus_one_name"]), ("Contraste · Actores", "Ana Actriz", "Luis"))
        door = self.client.post("/api/admin/gala/validate/", {"token": str(ticket.id), "checkin_count": 2}, format="json")
        self.assertEqual((door.status_code, door.json()["remaining_capacity"]), (200, 0))
        self.assertEqual(self.client.post("/api/admin/gala/validate/", {"token": str(ticket.id), "checkin_count": 1}, format="json").status_code, 409)

    def test_extras_without_team_or_group_show_a_generic_label(self):
        add(self.client, [{"name": "A", "email": "a@x.co"}])
        ticket = GalaTicket.objects.get()
        self.assertEqual(self.client.get(f"/api/admin/gala/tickets/{ticket.id}/").json()["team"], "Invitado extra")

    def test_summary_counts_extras_and_includes_them_in_attendance(self):
        make_team()
        add(self.client, [{"name": "A", "email": "a@x.co"}, {"name": "B", "email": "b2@x.co"}])
        with mock.patch("registrations.gala.deliver"):
            self.client.post(EXTRAS + "send/", {}, format="json")
        a = GalaTicket.objects.get(guest_email="a@x.co")
        gala.apply_rsvp(a, True, False, "", "", "", False)
        gala.validate_checkin(a.id, 1)

        data = self.client.get("/api/admin/gala/summary/").json()
        self.assertEqual(data["extras"], {"total": 2, "sent": 2})
        self.assertEqual(data["eligible_people"], 4)  # team roster only
        self.assertEqual((data["invitations_sent"], data["checked_in_people"], data["rsvp"]["confirmed"]), (2, 1, 1))

    def test_team_listing_is_unaffected_by_extras(self):
        team = make_team()
        add(self.client, [{"name": "A", "email": "a@x.co"}])
        data = self.client.get("/api/admin/registrations/").json()
        self.assertEqual([len(r["participants"]) for r in data], [len(team.participants.all())])
        self.assertTrue(all(m["gala"] is None for m in data[0]["participants"]))
