import json
import uuid
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from . import gala
from .email import deliver
from .models import GalaTicket, Participant, Registration


def make_team(emails=("lead@x.co", "b@x.co", "c@x.co", "d@x.co"), film=""):
    registration = Registration.objects.create(
        accepted_terms=True, confirmed_eligibility=True, film_submitted=bool(film), film_title=film
    )
    for i, email in enumerate(emails, start=1):
        Participant.objects.create(
            registration=registration, position=i, is_leader=i == 1, full_name=f"Persona {i}",
            document_id=str(i), institution="EAFIT", institutional_email=email, phone="3",
        )
    return registration


def admin_client():
    admin = get_user_model().objects.create_superuser("adm", "adm@x.co", "x")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=admin).key}")
    return client


def make_ticket(email="guest@x.co", **overrides):
    team = make_team((email, "b@x.co", "c@x.co", "d@x.co"))
    ticket = gala.ensure_ticket(team.participants.get(position=1))
    for field, value in overrides.items():
        setattr(ticket, field, value)
    if overrides:
        ticket.save()
    return ticket


class TicketIssuingTests(TestCase):
    def test_one_ticket_per_participant_created_once_with_the_configured_expiry(self):
        participant = make_team().participants.first()
        first = gala.ensure_ticket(participant)
        self.assertEqual(gala.ensure_ticket(participant).id, first.id)
        self.assertEqual(GalaTicket.objects.count(), 1)
        self.assertEqual(first.total_capacity, 2)
        self.assertEqual(timezone.localtime(first.expires_at).strftime("%Y-%m-%d %H:%M:%S"), "2026-11-20 23:59:59")
        self.assertEqual(first.guest_email, participant.institutional_email)

    def test_qr_endpoint_serves_a_png_unique_per_ticket(self):
        a, b = make_ticket("a@x.co"), make_ticket("b2@x.co")
        client = APIClient()
        response = client.get(f"/api/gala/invitations/{a.id}/qr.png")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertTrue(response.content.startswith(b"\x89PNG"))
        self.assertNotEqual(response.content, client.get(f"/api/gala/invitations/{b.id}/qr.png").content)
        self.assertEqual(client.get(f"/api/gala/invitations/{uuid.uuid4()}/qr.png").status_code, 404)


class EmailTests(TestCase):
    def test_email_links_to_the_invitation_embeds_the_qr_and_escapes_the_name(self):
        ticket = make_ticket(guest_name="<b>Ana</b>")
        subject, text, body = gala.build_invitation_email(ticket, "https://api.example/qr.png")
        self.assertIn("gala", subject.lower())
        self.assertIn(f"/invitacion/{ticket.id}", text)
        self.assertIn(f"/invitacion/{ticket.id}", body)
        self.assertIn('src="https://api.example/qr.png"', body)
        self.assertNotIn("<b>Ana</b>", body)
        self.assertIn("&lt;b&gt;Ana&lt;/b&gt;", body)
        self.assertIn("20/11/2026", text)

    @override_settings(GALA_TIME="7:00 p. m.")
    def test_time_appears_only_when_configured(self):
        ticket = make_ticket()
        self.assertIn("Hora: 7:00 p. m.", gala.build_invitation_email(ticket, "u")[1])
        with override_settings(GALA_TIME=""):
            self.assertNotIn("Hora:", gala.build_invitation_email(ticket, "u")[1])

    def test_sent_at_is_set_only_when_delivery_succeeds(self):
        ticket = make_ticket()
        with mock.patch("registrations.gala.deliver", side_effect=RuntimeError("boom")):
            self.assertFalse(gala.send_invitation(ticket, "https://api.example/qr.png"))
        ticket.refresh_from_db()
        self.assertIsNone(ticket.sent_at)

        with mock.patch("registrations.gala.deliver") as sender:
            self.assertTrue(gala.send_invitation(ticket, "https://api.example/qr.png"))
        ticket.refresh_from_db()
        self.assertIsNotNone(ticket.sent_at)
        extra = sender.call_args.args[4]
        self.assertTrue(extra["qr_png_base64"].startswith("iVBOR"))  # base64 of a PNG
        self.assertEqual(extra["qr_url"], "https://api.example/qr.png")

    @override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL="https://hooks.example/abc")
    def test_webhook_transport_posts_json_and_fails_on_error_status(self):
        response = mock.MagicMock(status=200)
        response.__enter__.return_value = response
        with mock.patch("registrations.email.urllib.request.urlopen", return_value=response) as urlopen:
            deliver("to@x.co", "Asunto", "texto", "<p>html</p>", {"qr_url": "u"})
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://hooks.example/abc")
        payload = json.loads(request.data)
        self.assertEqual(
            (payload["to"], payload["subject"], payload["html"], payload["qr_url"]),
            ("to@x.co", "Asunto", "<p>html</p>", "u"),
        )

        response.status = 500
        with mock.patch("registrations.email.urllib.request.urlopen", return_value=response):
            with self.assertRaises(RuntimeError):
                deliver("to@x.co", "s", "t")

    @override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL="")
    def test_webhook_without_url_is_a_clear_error(self):
        with self.assertRaises(RuntimeError):
            deliver("to@x.co", "s", "t")


class AdminSendTests(TestCase):
    def setUp(self):
        self.client = admin_client()
        self.team = make_team()
        self.url = f"/api/admin/registrations/{self.team.id}/gala-invitations/"

    def test_requires_admin(self):
        self.assertEqual(APIClient().post(self.url, {}, format="json").status_code, 401)

    def test_sends_one_email_per_member_and_never_twice_to_the_same_member(self):
        with mock.patch("registrations.gala.deliver") as sender:
            first = self.client.post(self.url, {}, format="json").json()
            again = self.client.post(self.url, {}, format="json").json()

        self.assertEqual((first["sent_count"], first["failed_count"]), (4, 0))
        self.assertEqual(sorted(c.args[0] for c in sender.call_args_list), ["b@x.co", "c@x.co", "d@x.co", "lead@x.co"])
        self.assertEqual(again["results"], [])
        self.assertEqual(sender.call_count, 4)
        self.assertEqual(GalaTicket.objects.filter(sent_at__isnull=False).count(), 4)
        # every email carries an absolute QR url pointing at its own ticket
        for call in sender.call_args_list:
            ticket = GalaTicket.objects.get(guest_email=call.args[0])
            self.assertIn(f"/api/gala/invitations/{ticket.id}/qr.png", call.args[4]["qr_url"])

    def test_failures_stay_pending_and_are_retried_without_touching_the_others(self):
        outcomes = iter([None, RuntimeError("x"), None, None])

        def flaky(*args, **kwargs):
            outcome = next(outcomes)
            if outcome:
                raise outcome

        with mock.patch("registrations.gala.deliver", side_effect=flaky):
            first = self.client.post(self.url, {}, format="json").json()
        self.assertEqual((first["sent_count"], first["failed_count"]), (3, 1))

        with mock.patch("registrations.gala.deliver") as sender:
            retry = self.client.post(self.url, {}, format="json").json()
        self.assertEqual((retry["sent_count"], sender.call_count), (1, 1))

    def test_resend_to_one_member(self):
        with mock.patch("registrations.gala.deliver"):
            self.client.post(self.url, {}, format="json")
        member = self.team.participants.get(position=2)
        with mock.patch("registrations.gala.deliver") as sender:
            result = self.client.post(self.url, {"participant_id": member.id}, format="json").json()
        self.assertEqual(result["sent_count"], 1)
        self.assertEqual(sender.call_args.args[0], "b@x.co")

        other_team = make_team(("o1@x.co", "o2@x.co", "o3@x.co", "o4@x.co"))
        stranger = other_team.participants.first()
        self.assertEqual(
            self.client.post(self.url, {"participant_id": stranger.id}, format="json").status_code, 400
        )

    def test_registration_list_reports_each_members_gala_state(self):
        with mock.patch("registrations.gala.deliver"):
            self.client.post(self.url, {}, format="json")
        data = self.client.get("/api/admin/registrations/").json()
        members = data[0]["participants"]
        self.assertTrue(all(m["gala"]["sent_at"] for m in members))
        self.assertEqual({m["gala"]["rsvp_status"] for m in members}, {"PENDING"})

        fresh = make_team(("n1@x.co", "n2@x.co", "n3@x.co", "n4@x.co"))
        data = self.client.get("/api/admin/registrations/").json()
        untouched = next(r for r in data if r["id"] == str(fresh.id))
        self.assertTrue(all(m["gala"] is None for m in untouched["participants"]))


class RsvpTests(TestCase):
    def setUp(self):
        self.ticket = make_ticket()
        self.url = f"/api/gala/invitations/{self.ticket.id}/rsvp/"
        self.client = APIClient()

    def test_guest_sees_their_invitation(self):
        data = self.client.get(f"/api/gala/invitations/{self.ticket.id}/").json()
        self.assertEqual((data["guest_name"], data["rsvp_status"], data["expired"]), ("Persona 1", "PENDING", False))
        self.assertEqual(self.client.get(f"/api/gala/invitations/{uuid.uuid4()}/").status_code, 404)

    def test_confirm_with_plus_one(self):
        response = self.client.post(
            self.url,
            {"attending": True, "has_plus_one": True, "plus_one_name": " Jane Doe ", "plus_one_email": "jane@x.co"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rsvp_status"], "CONFIRMED")
        self.ticket.refresh_from_db()
        self.assertEqual((self.ticket.has_plus_one, self.ticket.plus_one_name, self.ticket.plus_one_email), (True, "Jane Doe", "jane@x.co"))
        self.assertIsNotNone(self.ticket.rsvp_updated_at)

    def test_plus_one_needs_a_name_and_a_valid_email(self):
        no_name = self.client.post(self.url, {"attending": True, "has_plus_one": True}, format="json")
        bad_email = self.client.post(
            self.url, {"attending": True, "has_plus_one": True, "plus_one_name": "J", "plus_one_email": "nope"}, format="json"
        )
        self.assertEqual((no_name.status_code, bad_email.status_code), (400, 400))
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.rsvp_status, "PENDING")

    def test_declining_clears_plus_one_and_can_be_changed_later(self):
        self.client.post(self.url, {"attending": True, "has_plus_one": True, "plus_one_name": "J"}, format="json")
        self.client.post(self.url, {"attending": False, "has_plus_one": True, "plus_one_name": "J"}, format="json")
        self.ticket.refresh_from_db()
        self.assertEqual((self.ticket.rsvp_status, self.ticket.has_plus_one, self.ticket.plus_one_name), ("DECLINED", False, ""))
        self.client.post(self.url, {"attending": True}, format="json")
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.rsvp_status, "CONFIRMED")

    def test_attending_must_be_a_boolean(self):
        self.assertEqual(self.client.post(self.url, {"attending": "si"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(self.url, {}, format="json").status_code, 400)

    def test_expired_invitations_cannot_change_rsvp(self):
        GalaTicket.objects.filter(pk=self.ticket.pk).update(expires_at=timezone.now() - timedelta(seconds=1))
        response = self.client.post(self.url, {"attending": True}, format="json")
        self.assertEqual((response.status_code, response.json()["code"]), (400, "TICKET_EXPIRED"))
        self.assertTrue(self.client.get(f"/api/gala/invitations/{self.ticket.id}/").json()["expired"])


class DoorCheckinTests(TestCase):
    def setUp(self):
        self.client = admin_client()
        self.ticket = make_ticket()
        self.url = "/api/admin/gala/validate/"

    def validate(self, token=None, count=1):
        token = self.ticket.id if token is None else token
        return self.client.post(self.url, {"token": str(token), "checkin_count": count}, format="json")

    def test_requires_admin(self):
        self.assertEqual(APIClient().post(self.url, {}, format="json").status_code, 401)
        self.assertEqual(APIClient().get(f"/api/admin/gala/tickets/{self.ticket.id}/").status_code, 401)

    def test_unknown_or_malformed_tokens_are_invalid_tickets(self):
        for token in (uuid.uuid4(), "not-a-uuid", ""):
            response = self.validate(token)
            self.assertEqual((response.status_code, response.json()["code"]), (404, "INVALID_TICKET"), token)

    def test_admits_two_people_in_one_go_and_then_nobody_else(self):
        ok = self.validate(count=2)
        self.assertEqual(ok.status_code, 200)
        body = ok.json()
        self.assertEqual((body["valid"], body["checked_in_now"], body["remaining_capacity"]), (True, 2, 0))
        self.assertIsNotNone(GalaTicket.objects.get(pk=self.ticket.pk).checkin_at)

        again = self.validate(count=1)
        self.assertEqual((again.status_code, again.json()["code"]), (409, "CAPACITY_EXHAUSTED"))

    def test_one_then_one_then_exhausted_and_overdraw_is_rejected(self):
        self.assertEqual(self.validate(count=1).json()["remaining_capacity"], 1)
        too_many = self.validate(count=2)
        self.assertEqual((too_many.status_code, too_many.json()["code"]), (400, "INSUFFICIENT_CAPACITY"))
        self.assertEqual(GalaTicket.objects.get(pk=self.ticket.pk).used_capacity, 1)
        self.assertEqual(self.validate(count=1).json()["remaining_capacity"], 0)
        self.assertEqual(self.validate(count=1).status_code, 409)

    def test_count_must_be_one_or_two(self):
        for count in (0, 3, "2", None, True):
            response = self.validate(count=count)
            self.assertEqual((response.status_code, response.json()["code"]), (400, "INVALID_COUNT"), count)
        self.assertEqual(GalaTicket.objects.get(pk=self.ticket.pk).used_capacity, 0)

    def test_expired_ticket_is_blocked_and_nothing_is_consumed(self):
        GalaTicket.objects.filter(pk=self.ticket.pk).update(expires_at=timezone.now() - timedelta(seconds=1))
        response = self.validate()
        self.assertEqual((response.status_code, response.json()["code"]), (400, "TICKET_EXPIRED"))
        self.assertEqual(GalaTicket.objects.get(pk=self.ticket.pk).used_capacity, 0)

    def test_the_scheduled_expiry_is_the_end_of_november_20_in_colombia(self):
        before = self.ticket.expires_at - timedelta(seconds=1)
        with mock.patch("registrations.gala.timezone.now", return_value=before):
            self.assertEqual(self.validate().status_code, 200)
        with mock.patch("registrations.gala.timezone.now", return_value=self.ticket.expires_at + timedelta(seconds=1)):
            self.assertEqual(self.validate().json()["code"], "TICKET_EXPIRED")

    def test_lookup_shows_guest_details_without_consuming_capacity(self):
        self.client.post(
            f"/api/gala/invitations/{self.ticket.id}/rsvp/",
            {"attending": True, "has_plus_one": True, "plus_one_name": "Jane"},
            format="json",
        )
        data = self.client.get(f"/api/admin/gala/tickets/{self.ticket.id}/").json()
        self.assertEqual(
            (data["guest_name"], data["rsvp_status"], data["plus_one_name"], data["remaining_capacity"], data["expired"]),
            ("Persona 1", "CONFIRMED", "Jane", 2, False),
        )
        self.assertEqual(GalaTicket.objects.get(pk=self.ticket.pk).used_capacity, 0)
        self.assertEqual(self.client.get(f"/api/admin/gala/tickets/{uuid.uuid4()}/").status_code, 404)
        self.assertEqual(self.client.get("/api/admin/gala/tickets/basura/").status_code, 404)


class SummaryTests(TestCase):
    def test_metrics(self):
        client = admin_client()
        team = make_team(("a@x.co", "b@x.co", "c@x.co", "d@x.co"))
        tickets = [gala.ensure_ticket(p) for p in team.participants.order_by("position")]
        now = timezone.now()
        GalaTicket.objects.all().update(sent_at=now)
        a, b, c, d = tickets
        gala.apply_rsvp(a, True, True, "Jane", "jane@x.co")  # 2 people
        gala.apply_rsvp(b, True, False, "", "")  # 1 person
        gala.apply_rsvp(c, False, False, "", "")
        # d never answered
        gala.validate_checkin(a.id, 2)
        gala.validate_checkin(d.id, 1)  # walk-in without RSVP

        data = client.get("/api/admin/gala/summary/").json()
        self.assertEqual(data["eligible_people"], 4)
        self.assertEqual(data["invitations_sent"], 4)
        self.assertEqual(data["rsvp"], {"confirmed": 2, "declined": 1, "pending": 1, "confirmation_rate": 50})
        self.assertEqual(data["confirmed_attendees"], 3)
        self.assertEqual((data["checked_in_people"], data["checked_in_tickets"]), (3, 2))
        self.assertEqual(data["attendance_rate"], 67)  # 2 of the 3 confirmed attendees came
        self.assertEqual(data["plus_ones"], [{"guest_name": "Persona 1", "plus_one_name": "Jane", "plus_one_email": "jane@x.co"}])

    def test_empty(self):
        data = admin_client().get("/api/admin/gala/summary/").json()
        self.assertEqual((data["invitations_sent"], data["confirmed_attendees"], data["attendance_rate"], data["plus_ones"]), (0, 0, 0, []))


class EmailTestEndpointTests(TestCase):
    def test_requires_admin(self):
        self.assertEqual(APIClient().post("/api/admin/email/test/", {"to": "a@x.co"}, format="json").status_code, 401)

    def test_sends_only_to_the_given_address_with_the_invitation_fields(self):
        with mock.patch("registrations.gala.deliver") as sender:
            response = admin_client().post("/api/admin/email/test/", {"to": "me@x.co"}, format="json")
        self.assertEqual((response.status_code, response.json()), (200, {"sent": True}))
        to, subject, _text, html_body, extra = sender.call_args.args
        self.assertEqual(to, "me@x.co")
        self.assertIn("Prueba", subject)
        self.assertTrue(extra["qr_png_base64"].startswith("iVBOR"))
        self.assertTrue({"qr_url", "invitation_url", "guest_name"} <= set(extra))
        self.assertEqual(GalaTicket.objects.count(), 0)  # nobody got a real ticket

    def test_rejects_bad_addresses_and_reports_provider_failures(self):
        client = admin_client()
        self.assertEqual(client.post("/api/admin/email/test/", {"to": "nope"}, format="json").status_code, 400)
        self.assertEqual(client.post("/api/admin/email/test/", {}, format="json").status_code, 400)
        with mock.patch("registrations.gala.deliver", side_effect=RuntimeError("secret-url")):
            response = client.post("/api/admin/email/test/", {"to": "me@x.co"}, format="json")
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("secret-url", response.content.decode())
