from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .analytics import build_analytics
from .models import Event, EventRegistration, Participant, Registration


def make_team(emails, institution="EAFIT", sent=False, film=""):
    registration = Registration.objects.create(
        accepted_terms=True,
        confirmed_eligibility=True,
        confirmation_email_sent_at=timezone.now() if sent else None,
        film_submitted=bool(film),
        film_title=film,
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


class SubmissionMetricsTests(TestCase):
    def test_duplicate_registrations_of_one_team_count_once(self):
        make_team(["lead@x.co", "b@x.co", "c@x.co", "d@x.co"], film="Corto A")
        make_team(["lead@x.co", "b@x.co", "c@x.co", "d@x.co"])  # same leader, re-registered
        make_team(["other@x.co", "e@x.co", "f@x.co", "g@x.co"])

        subs = build_analytics()["festival"]["submissions"]
        self.assertEqual(subs["unique_teams"], 2)
        self.assertEqual(subs["duplicate_registrations"], 1)
        self.assertEqual(subs["submitted_teams"], 1)
        self.assertEqual(subs["rate"], 50)
        self.assertEqual(subs["participants_in_submitting_teams"], 4)
        self.assertEqual([f["title"] for f in subs["films"]], ["Corto A"])

    def test_rates_by_institution_and_size(self):
        make_team(["a1@x.co", "a2@x.co", "a3@x.co", "a4@x.co"], institution="EAFIT", film="A")
        make_team(["b1@x.co", "b2@x.co", "b3@x.co", "b4@x.co", "b5@x.co"], institution="Universidad EAFIT")
        make_team(["c1@x.co", "c2@x.co", "c3@x.co", "c4@x.co"], institution="ITM")

        subs = build_analytics()["festival"]["submissions"]
        institutions = {i["name"]: (i["teams"], i["submitted"]) for i in subs["by_institution"]}
        self.assertEqual(sorted(institutions.values()), [(1, 0), (2, 1)])
        sizes = {s["size"]: (s["teams"], s["submitted"]) for s in subs["by_team_size"]}
        self.assertEqual(sizes, {4: (2, 1), 5: (1, 0)})

    def test_talk_engagement_compares_teams_with_and_without_members_at_talks(self):
        make_team(["a1@x.co", "a2@x.co", "a3@x.co", "a4@x.co"], film="A")
        make_team(["b1@x.co", "b2@x.co", "b3@x.co", "b4@x.co"])
        make_signup(Event.objects.create(slug="t", title="T"), "A2@x.co")

        engagement = build_analytics()["festival"]["submissions"]["talk_engagement"]
        self.assertEqual((engagement["with_talks"]["teams"], engagement["with_talks"]["submitted"]), (1, 1))
        self.assertEqual((engagement["without_talks"]["teams"], engagement["without_talks"]["submitted"]), (1, 0))

    def test_empty_database(self):
        subs = build_analytics()["festival"]["submissions"]
        self.assertEqual((subs["unique_teams"], subs["rate"], subs["films"]), (0, 0, []))


class SubmissionEndpointTests(TestCase):
    def setUp(self):
        self.team = make_team(["a@x.co", "b@x.co", "c@x.co", "d@x.co"])
        admin = get_user_model().objects.create_superuser("adm", "adm@x.co", "x")
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=admin).key}")
        self.url = f"/api/admin/registrations/{self.team.id}/submission/"

    def test_mark_and_unmark(self):
        response = self.client.patch(self.url, {"film_submitted": True, "film_title": "  Mi corto "}, format="json")
        self.assertEqual(response.status_code, 200)
        self.team.refresh_from_db()
        self.assertTrue(self.team.film_submitted)
        self.assertEqual(self.team.film_title, "Mi corto")

        self.client.patch(self.url, {"film_submitted": False}, format="json")
        self.team.refresh_from_db()
        self.assertFalse(self.team.film_submitted)
        self.assertEqual(self.team.film_title, "")

    def test_rejects_bad_input(self):
        self.assertEqual(self.client.patch(self.url, {"film_submitted": "si"}, format="json").status_code, 400)
        self.assertEqual(
            self.client.patch(self.url, {"film_submitted": True, "film_title": "x" * 201}, format="json").status_code,
            400,
        )

    def test_requires_admin(self):
        self.assertEqual(APIClient().patch(self.url, {"film_submitted": True}, format="json").status_code, 401)


class InstitutionGroupingTests(TestCase):
    def test_variants_of_the_same_institution_share_one_group_and_label(self):
        from .institutions import institution_group

        poli = [
            "Politécnico Colombiano Jaime Isaza Cadavid",
            "Politécnico Jaime Isaza Cadavid",
            "Politecnico Jaime Isaza Cadavid",
            "politécnico colombiano jaime isaza cadavid",
            "POLITECNICO JAIME ISAZA CADAVID",
            "Politécnico J.I.C",
            "Poli jic",
            "Politécnico Colombiano Jaime Isaías Cadavid",
            "Jime Isaza",
        ]
        self.assertEqual({institution_group(v) for v in poli}, {("Politécnico Colombiano Jaime Isaza Cadavid",) * 2})

        for variants, label in [
            (["EAFIT", "Eafit", "Universidad EAFIT", "Eafit, comunicación social"], "Universidad EAFIT"),
            (["Debora Arango", "Tecnologico de artes Débora Arango"], "Tecnológico de Artes Débora Arango"),
            (["Universidad de Medellin", "UdeMedellin", "Udem"], "Universidad de Medellín"),
            (["Universidad de antioquia", "Udea"], "Universidad de Antioquia"),
            (["Upb", "Universidad pontificia bolivariana"], "Universidad Pontificia Bolivariana"),
            (["ITM", "itm"], "ITM"),
        ]:
            self.assertEqual({institution_group(v) for v in variants}, {(label, label)}, variants)

    def test_unknown_institutions_group_case_insensitively_without_inventing_a_label(self):
        from .institutions import institution_group

        self.assertEqual(institution_group("Colmauj")[1], None)
        self.assertEqual(institution_group("Colmauj")[0], institution_group("  COLMAUJ ")[0])
        self.assertEqual(institution_group("…"), ("", None))
        self.assertEqual(institution_group(""), ("", None))

    def test_dashboard_merges_the_two_politecnico_spellings(self):
        event = Event.objects.create(slug="e", title="T")
        make_signup(event, "1@x.co", "Politécnico Colombiano Jaime Isaza Cadavid")
        make_signup(event, "2@x.co", "Politécnico Jaime Isaza Cadavid")
        make_signup(event, "3@x.co", "Poli JIC")
        institutions = build_analytics()["events"]["institutions"]
        self.assertEqual(institutions, [{"name": "Politécnico Colombiano Jaime Isaza Cadavid", "count": 3}])

    def test_normalize_command_dry_run_then_apply(self):
        from io import StringIO

        from django.core.management import call_command

        team = make_team(["a@x.co", "b@x.co", "c@x.co", "d@x.co"], institution="Politecnico Jaime  Isaza Cadavid")
        make_signup(Event.objects.create(slug="e", title="T"), "z@x.co", "Colmauj  ")

        call_command("normalize_institutions", stdout=StringIO())
        self.assertEqual(
            Participant.objects.filter(registration=team).first().institution, "Politecnico Jaime  Isaza Cadavid"
        )

        import os
        import tempfile
        from unittest import mock

        with tempfile.TemporaryDirectory() as home, mock.patch.dict(
            os.environ, {"USERPROFILE": home, "HOME": home}
        ):
            call_command("normalize_institutions", "--apply", stdout=StringIO())
        institutions = set(Participant.objects.values_list("institution", flat=True))
        self.assertEqual(institutions, {"Politécnico Colombiano Jaime Isaza Cadavid"})
        self.assertEqual(EventRegistration.objects.get().institution, "Colmauj")
