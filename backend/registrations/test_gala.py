import json
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from . import gala
from .email import EmailDeliveryError, deliver
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
        self.assertIn("Citación: 5:00 p. m. (llegada de los invitados)", text)
        self.assertIn("Inicio de la gala: 6:00 p. m. (dura alrededor de 3 horas)", text)
        self.assertLess(text.index("Citación:"), text.index("Inicio de la gala:"))
        self.assertIn("5:00 p. m.", body)
        self.assertIn("6:00 p. m.", body)
        self.assertIn(f"/invitacion/{ticket.id}", text)
        self.assertIn(f"/invitacion/{ticket.id}", body)
        self.assertIn('src="https://api.example/qr.png"', body)
        self.assertNotIn("<b>Ana</b>", body)
        self.assertIn("&lt;b&gt;Ana&lt;/b&gt;", body)

    def test_email_offers_calendar_and_directions_links(self):
        from urllib.parse import parse_qs, urlparse

        ticket = make_ticket()
        _subject, text, body = gala.build_invitation_email(ticket, "https://api.example/qr.png")

        calendar = gala.calendar_url(gala.invitation_url(ticket))
        parsed = urlparse(calendar)
        self.assertEqual((parsed.netloc, parsed.path), ("calendar.google.com", "/calendar/render"))
        query = parse_qs(parsed.query)
        # 5:00 p. m. (call) to 9:00 p. m. (gala 6:00 + 3 h), Colombia time (UTC-5), in UTC
        self.assertEqual(query["dates"], ["20261114T220000Z/20261115T020000Z"])
        self.assertIn("Citación a las 5:00 p. m.", query["details"][0])
        self.assertIn("la gala empieza a las 6:00 p. m.", query["details"][0])
        self.assertIn("Auditorio Fundadores", query["location"][0])
        self.assertIn(str(ticket.id), query["details"][0])

        self.assertEqual(gala.maps_url(), "https://share.google/WJpJuNlOOdO65eAVk")

        for shown in (text, body):
            self.assertIn("calendar.google.com", shown)
            self.assertIn("https://share.google/WJpJuNlOOdO65eAVk", shown)
        self.assertIn("Añadir al calendario", body)
        self.assertIn("Cómo llegar", body)
        for shown in (text, body):
            self.assertNotIn("20/11", shown)
            self.assertNotIn("válida hasta", shown.lower())
            self.assertNotIn("vigente", shown.lower())

    @override_settings(GALA_TIME="7:00 p. m.")
    def test_time_appears_only_when_configured(self):
        ticket = make_ticket()
        self.assertIn("Inicio de la gala: 7:00 p. m.", gala.build_invitation_email(ticket, "u")[1])
        with override_settings(GALA_TIME=""):
            self.assertNotIn("Inicio de la gala:", gala.build_invitation_email(ticket, "u")[1])

    def test_the_call_time_row_can_be_hidden(self):
        ticket = make_ticket()
        with override_settings(GALA_CALL_LABEL=""):
            self.assertNotIn("Citación:", gala.build_invitation_email(ticket, "u")[1])

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
        response.read.return_value = b"Accepted"  # Make answers with plain text
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
        self.assertNotIn("expires_at", data)
        self.assertEqual(self.client.get(f"/api/gala/invitations/{uuid.uuid4()}/").status_code, 404)

    def test_confirm_with_plus_one(self):
        response = self.client.post(
            self.url,
            {
                "attending": True,
                "has_plus_one": True,
                "plus_one_name": " Jane Doe ",
                "plus_one_email": "jane@x.co",
                "plus_one_phone": " +57 300 123 4567 ",
                "plus_one_data_consent": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rsvp_status"], "CONFIRMED")
        self.ticket.refresh_from_db()
        self.assertEqual(
            (self.ticket.has_plus_one, self.ticket.plus_one_name, self.ticket.plus_one_email, self.ticket.plus_one_phone),
            (True, "Jane Doe", "jane@x.co", "+57 300 123 4567"),
        )
        guest_view = self.client.get(f"/api/gala/invitations/{self.ticket.id}/").json()
        self.assertEqual(guest_view["plus_one_phone"], "+57 300 123 4567")
        self.assertTrue(guest_view["plus_one_data_consent"])
        self.assertIsNotNone(self.ticket.plus_one_data_consent_at)
        self.assertIsNotNone(self.ticket.rsvp_updated_at)

    def test_plus_one_needs_name_email_and_phone_all_valid(self):
        full = {
            "attending": True, "has_plus_one": True, "plus_one_name": "J", "plus_one_email": "j@x.co",
            "plus_one_phone": "3001234567", "plus_one_data_consent": True,
        }
        cases = {
            "nombre": {**full, "plus_one_name": " "},
            "correo": {**full, "plus_one_email": ""},
            "celular": {**full, "plus_one_phone": ""},
            "correo no válido": {**full, "plus_one_email": "nope"},
            "celular con letras": {**full, "plus_one_phone": "abc1234567"},
            "celular muy corto": {**full, "plus_one_phone": "12345"},
            "celular muy largo": {**full, "plus_one_phone": "1" * 16},
        }
        for label, body in cases.items():
            response = self.client.post(self.url, body, format="json")
            self.assertEqual((response.status_code, response.json()["code"]), (400, "INVALID_RSVP"), label)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.rsvp_status, "PENDING")
        self.assertEqual(self.client.post(self.url, full, format="json").status_code, 200)

    def test_the_companion_must_accept_the_processing_of_their_data(self):
        full = {
            "attending": True, "has_plus_one": True, "plus_one_name": "J", "plus_one_email": "j@x.co",
            "plus_one_phone": "3001234567",
        }
        for label, extra in {"ausente": {}, "falso": {"plus_one_data_consent": False}, "texto": {"plus_one_data_consent": "true"}}.items():
            response = self.client.post(self.url, {**full, **extra}, format="json")
            self.assertEqual((response.status_code, response.json()["code"]), (400, "CONSENT_REQUIRED"), label)
        self.ticket.refresh_from_db()
        self.assertEqual((self.ticket.rsvp_status, self.ticket.plus_one_name, self.ticket.plus_one_data_consent_at), ("PENDING", "", None))

    def test_consent_is_recorded_with_a_timestamp_and_cleared_when_going_alone(self):
        plus = {"attending": True, "has_plus_one": True, "plus_one_name": "J", "plus_one_email": "j@x.co",
                "plus_one_phone": "3001234567", "plus_one_data_consent": True}
        self.client.post(self.url, plus, format="json")
        self.ticket.refresh_from_db()
        self.assertIsNotNone(self.ticket.plus_one_data_consent_at)

        self.client.post(self.url, {"attending": True, "has_plus_one": False}, format="json")
        self.ticket.refresh_from_db()
        self.assertEqual((self.ticket.has_plus_one, self.ticket.plus_one_name, self.ticket.plus_one_data_consent_at), (False, "", None))
        self.assertFalse(self.client.get(f"/api/gala/invitations/{self.ticket.id}/").json()["plus_one_data_consent"])

    def test_plus_one_data_is_not_required_when_going_alone(self):
        response = self.client.post(self.url, {"attending": True, "has_plus_one": False}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_declining_clears_plus_one_and_can_be_changed_later(self):
        plus = {
            "has_plus_one": True, "plus_one_name": "J", "plus_one_email": "j@x.co",
            "plus_one_phone": "3001234567", "plus_one_data_consent": True,
        }
        self.client.post(self.url, {"attending": True, **plus}, format="json")
        self.client.post(self.url, {"attending": False, **plus}, format="json")
        self.ticket.refresh_from_db()
        self.assertEqual(
            (self.ticket.rsvp_status, self.ticket.has_plus_one, self.ticket.plus_one_name, self.ticket.plus_one_phone),
            ("DECLINED", False, "", ""),
        )
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
        self.assertNotRegex(response.json()["message"], r"\d")
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
            {"attending": True, "has_plus_one": True, "plus_one_name": "Jane", "plus_one_email": "jane@x.co", "plus_one_phone": "3001234567", "plus_one_data_consent": True},
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
        gala.apply_rsvp(a, True, True, "Jane", "jane@x.co", "3001234567", True)  # 2 people
        gala.apply_rsvp(b, True, False, "", "", "", False)  # 1 person
        gala.apply_rsvp(c, False, False, "", "", "", False)
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
        (entry,) = data["plus_ones"]
        self.assertEqual(
            {k: v for k, v in entry.items() if k != "plus_one_data_consent_at"},
            {"guest_name": "Persona 1", "plus_one_name": "Jane", "plus_one_email": "jane@x.co", "plus_one_phone": "3001234567"},
        )
        self.assertIsNotNone(entry["plus_one_data_consent_at"])

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


class AppsScriptWebhookTests(TestCase):
    """Apps Script answers every POST with a 302 to a "echo" URL and always with
    HTTP 200, so failures arrive as {"ok": false}. Exercised against a real
    local server that behaves the same way."""

    def serve(self, reply: bytes, content_type: str = "application/json"):
        received = []

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                received.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
                self.send_response(302)
                self.send_header("Location", "/echo")
                self.end_headers()

            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.end_headers()
                self.wfile.write(reply)

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        self.addCleanup(server.server_close)
        return f"http://127.0.0.1:{server.server_address[1]}/exec", received

    def test_success_follows_the_redirect_and_sends_the_secret(self):
        url, received = self.serve(b'{"ok": true, "remaining": 99}')
        with override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL=url, EMAIL_WEBHOOK_SECRET="s3cret"):
            deliver("to@x.co", "Asunto", "texto", "<p>h</p>", {"qr_url": "u"})
        self.assertEqual(len(received), 1)
        self.assertEqual((received[0]["secret"], received[0]["to"], received[0]["qr_url"]), ("s3cret", "to@x.co", "u"))

    def test_no_secret_field_when_none_is_configured(self):
        url, received = self.serve(b'{"ok": true}')
        with override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL=url, EMAIL_WEBHOOK_SECRET=""):
            deliver("to@x.co", "s", "t")
        self.assertNotIn("secret", received[0])

    def test_ok_false_becomes_a_delivery_error_with_its_message_and_code(self):
        url, _ = self.serve('{"ok": false, "code": "quota", "error": "Se agotó el límite diario."}'.encode())
        with override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL=url):
            with self.assertRaises(EmailDeliveryError) as caught:
                deliver("to@x.co", "s", "t")
        self.assertEqual((str(caught.exception), caught.exception.code), ("Se agotó el límite diario.", "quota"))

    def test_a_web_page_reply_is_a_failure_not_a_silent_success(self):
        url, _ = self.serve(b"<html><body>Sign in</body></html>", "text/html; charset=utf-8")
        with override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL=url):
            with self.assertRaises(EmailDeliveryError) as caught:
                deliver("to@x.co", "s", "t")
        self.assertIn("Aplicación web", str(caught.exception))

    def test_plain_text_replies_count_as_success(self):
        url, _ = self.serve(b"Accepted", "text/plain")
        with override_settings(EMAIL_PROVIDER="webhook", EMAIL_WEBHOOK_URL=url):
            deliver("to@x.co", "s", "t")  # does not raise


class QuotaHandlingTests(TestCase):
    def setUp(self):
        self.client = admin_client()
        self.team = make_team()
        self.url = f"/api/admin/registrations/{self.team.id}/gala-invitations/"

    def test_a_batch_stops_at_the_daily_quota_and_leaves_the_rest_pending(self):
        calls = {"n": 0}

        def deliver_until_quota(*args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 3:
                raise EmailDeliveryError("Se agotó el límite diario.", "quota")

        with mock.patch("registrations.gala.deliver", side_effect=deliver_until_quota):
            data = self.client.post(self.url, {}, format="json").json()

        self.assertEqual((data["sent_count"], data["failed_count"], calls["n"]), (2, 1, 3))
        self.assertTrue(data["stopped_by_quota"])
        self.assertEqual(data["error"], "Se agotó el límite diario.")
        # the fourth member was never attempted, and is still sendable tomorrow
        self.assertEqual(GalaTicket.objects.filter(sent_at__isnull=False).count(), 2)
        with mock.patch("registrations.gala.deliver") as sender:
            retry = self.client.post(self.url, {}, format="json").json()
        self.assertEqual((retry["sent_count"], sender.call_count, retry["stopped_by_quota"]), (2, 2, False))

    def test_other_failures_do_not_stop_the_batch(self):
        outcomes = iter([EmailDeliveryError("rechazado"), None, None, None])

        def flaky(*args, **kwargs):
            outcome = next(outcomes)
            if outcome:
                raise outcome

        with mock.patch("registrations.gala.deliver", side_effect=flaky):
            data = self.client.post(self.url, {}, format="json").json()
        self.assertEqual((data["sent_count"], data["failed_count"], data["stopped_by_quota"]), (3, 1, False))
        self.assertEqual(data["error"], "rechazado")

    def test_the_test_endpoint_shows_the_scripts_message(self):
        with mock.patch("registrations.gala.deliver", side_effect=EmailDeliveryError("No autorizado.")):
            response = self.client.post("/api/admin/email/test/", {"to": "me@x.co"}, format="json")
        self.assertEqual((response.status_code, response.json()["detail"]), (502, "No autorizado."))
