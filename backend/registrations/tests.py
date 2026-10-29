from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .analytics import build_analytics
from .models import Event, EventRegistration, Participant, Registration


def make_team(emails, institution="EAFIT", sent=False):
    registration = Registration.objects.create(
        accepted_terms=True,
        confirmed_eligibility=True,
        confirmation_email_sent_at=timezone.now() if sent else None,
    )
    for i, email in enumerate(emails, start=1):
        Participant.objects.create(
            registration=registration,
            position=i,
            is_leader=i == 1,
            full_name=f"P{i}",
            document_id=str(i),
            institution=institution,
            institutional_email=email,
            phone="3",
        )
    return registration


def make_signup(event, email, institution="", attended=False):
    return EventRegistration.objects.create(
        event=event,
        full_name="X",
        document_id="1",
        institution=institution,
        email=email,
        phone="3",
        accepted_terms=True,
        attended_at=timezone.now() if attended else None,
    )


class AnalyticsTests(TestCase):
    def test_empty_database_gives_zeros_not_errors(self):
        data = build_analytics()
        self.assertEqual(data["festival"]["teams"], 0)
        self.assertEqual(data["festival"]["avg_team_size"], 0)
        self.assertEqual(data["festival"]["daily"], [])
        self.assertEqual(data["events"]["signups"], 0)
        self.assertIsNone(data["events"]["attendance_rate"])
        self.assertEqual(data["overview"]["unique_people"], 0)

    def test_festival_metrics(self):
        make_team(["a@udea.edu.co", "b@udea.edu.co", "c@eafit.edu.co", "d@eafit.edu.co"], sent=True)
        make_team(
            ["e@x.co", "f@x.co", "g@x.co", "h@x.co", "i@x.co"], institution="  universidad EAFIT "
        )

        festival = build_analytics()["festival"]
        self.assertEqual(festival["teams"], 2)
        self.assertEqual(festival["participants"], 9)
        self.assertEqual(festival["avg_team_size"], 4.5)
        self.assertEqual(festival["team_size_distribution"], [{"size": 4, "teams": 1}, {"size": 5, "teams": 1}])
        self.assertEqual((festival["emails_sent"], festival["emails_pending"]), (1, 1))
        self.assertEqual(festival["daily"][-1]["cumulative"], 2)
        self.assertEqual(sum(festival["hourly"]), 2)
        domains = {d["name"]: d["count"] for d in festival["email_domains"]}
        self.assertEqual(domains["udea.edu.co"], 2)

    def test_institutions_are_grouped_ignoring_case_accents_and_spacing(self):
        event = Event.objects.create(slug="e", title="T")
        make_signup(event, "1@x.co", "Politécnico Jaime Isaza")
        make_signup(event, "2@x.co", "politecnico  jaime isaza")
        make_signup(event, "3@x.co", "")
        institutions = {i["name"]: i["count"] for i in build_analytics()["events"]["institutions"]}
        self.assertEqual(sum(v for k, v in institutions.items() if "olit" in k), 2)
        self.assertEqual(institutions["Sin institución"], 1)

    def test_institution_variants_with_universidad_prefix_are_merged(self):
        event = Event.objects.create(slug="e", title="T")
        for i, name in enumerate(["EAFIT", "Universidad EAFIT", "eafit", "Universidad de Antioquia"]):
            make_signup(event, f"{i}@x.co", name)
        institutions = {i["name"]: i["count"] for i in build_analytics()["events"]["institutions"]}
        self.assertEqual(institutions["Universidad de Antioquia"], 1)
        self.assertEqual(sorted(institutions.values()), [1, 3])

    def test_event_attendance_rate_ignores_events_where_attendance_was_never_taken(self):
        yesterday = date.today() - timedelta(days=1)
        taken = Event.objects.create(slug="taken", title="A", date=yesterday)
        untaken = Event.objects.create(slug="untaken", title="B", date=yesterday)
        make_signup(taken, "a@x.co", attended=True)
        make_signup(taken, "b@x.co")
        make_signup(untaken, "c@x.co")
        make_signup(untaken, "d@x.co")

        events = build_analytics()["events"]
        by_slug = {e["slug"]: e for e in events["per_event"]}
        self.assertEqual(by_slug["taken"]["attendance_rate"], 50)
        self.assertIsNone(by_slug["untaken"]["attendance_rate"])
        self.assertTrue(by_slug["untaken"]["past"])
        self.assertEqual(events["attendance_rate"], 50)
        self.assertEqual(events["events_with_attendance"], 1)

    def test_people_across_events_and_festival(self):
        make_team(["ana@x.co", "b@x.co", "c@x.co", "d@x.co"])
        one = Event.objects.create(slug="one", title="One")
        two = Event.objects.create(slug="two", title="Two")
        make_signup(one, "ANA@x.co")
        make_signup(two, "ana@x.co")
        make_signup(two, "zoe@x.co")

        data = build_analytics()
        self.assertEqual(data["events"]["signups"], 3)
        self.assertEqual(data["events"]["unique_people"], 2)
        self.assertEqual(data["events"]["repeat_people"], 1)
        self.assertEqual(data["overview"]["in_both"], 1)
        self.assertEqual(data["overview"]["unique_people"], 5)


class AnalyticsEndpointTests(TestCase):
    def test_requires_admin_token(self):
        self.assertEqual(APIClient().get("/api/admin/analytics/").status_code, 401)

    def test_non_staff_user_is_rejected(self):
        user = get_user_model().objects.create_user("u", password="x")
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=user).key}")
        self.assertEqual(client.get("/api/admin/analytics/").status_code, 403)

    def test_admin_gets_aggregates_only(self):
        make_team(["a@x.co", "b@x.co", "c@x.co", "d@x.co"])
        admin = get_user_model().objects.create_superuser("a", "a@x.co", "x")
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=admin).key}")

        response = client.get("/api/admin/analytics/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["festival"]["teams"], 1)
        body = response.content.decode()
        for email in ("a@x.co", "b@x.co", "c@x.co", "d@x.co"):
            self.assertNotIn(email, body)
