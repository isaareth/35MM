from io import BytesIO
from unittest import mock

from django.core.cache import cache
from openpyxl import load_workbook
from rest_framework.test import APIClient

from . import gala
from .models import GalaTicket
from .test_door_staff import door_client
from .test_gala import GalaTestCase, admin_client, make_team

EXPORT = "/api/admin/registrations/export/"


def sheet_rows(workbook, name):
    return [[c for c in row] for row in workbook[name].iter_rows(values_only=True)]


def download(client):
    response = client.get(EXPORT)
    assert response.status_code == 200, response.status_code
    return load_workbook(BytesIO(response.content))


def send(ticket):
    with mock.patch("registrations.gala.deliver"):
        assert gala.send_invitation(ticket, "https://x/qr.png")


class TeamExportTests(GalaTestCase):
    def setUp(self):
        self.client = admin_client()

    def build_case(self):
        """Contraste: leader attended with a +1 (both entered), member 2 invited but absent,
        member 3 never invited. Anhelo: nobody invited yet. One extra who came alone."""
        contraste = make_team(("c1@x.co", "c2@x.co", "c3@x.co"), film="Contraste")
        anhelo = make_team(("a1@x.co", "a2@x.co", "a3@x.co", "a4@x.co"), film="Anhelo")
        m1, m2, m3 = contraste.participants.order_by("position")

        t1 = gala.ensure_ticket(m1)
        send(t1)
        gala.apply_rsvp(t1, True, True, "Jane Doe", "jane@x.co", "3001234567", True)
        gala.validate_checkin(t1.id, 2)

        t2 = gala.ensure_ticket(m2)
        send(t2)
        gala.apply_rsvp(t2, False, False, "", "", "", False)
        gala.ensure_ticket(m3)  # created but never sent

        extra, _skipped = gala.add_extras([{"name": "Ana Actriz", "email": "ana@x.co"}], anhelo, "Actores")
        send(extra[0])
        gala.apply_rsvp(extra[0], True, False, "", "", "", False)
        gala.validate_checkin(extra[0].id, 1)
        return contraste, anhelo

    def test_sheets_and_order(self):
        self.build_case()
        wb = download(self.client)
        self.assertEqual(wb.sheetnames, ["Equipos", "Acompañantes", "Invitados extra", "Inscripciones"])

    def test_teams_are_grouped_under_a_band_with_the_film_title(self):
        self.build_case()
        rows = sheet_rows(download(self.client), "Equipos")
        header = rows[0]
        self.assertEqual(header[0], "Rol")
        self.assertIn("Asistencia a la gala", header)

        bands = [r[0] for r in rows if r[0] and r[1] is None and r[0] not in ("Rol",)]
        self.assertEqual(len(bands), 2)
        self.assertTrue(bands[0].startswith("Anhelo"))  # A-Z by title
        self.assertTrue(bands[1].startswith("Contraste"))
        self.assertIn("4 integrantes", bands[0])
        self.assertIn("3 integrantes", bands[1])
        self.assertIn("corto entregado", bands[1])

        # members sit directly under their own band
        index = {r[0]: i for i, r in enumerate(rows) if r[0] in bands}
        contraste_members = rows[index[bands[1]] + 1 : index[bands[1]] + 4]
        self.assertEqual([m[1] for m in contraste_members], ["Persona 1", "Persona 2", "Persona 3"])
        self.assertEqual([m[0] for m in contraste_members], ["Líder", "Integrante", "Integrante"])

    def test_attendance_labels_per_member(self):
        self.build_case()
        rows = sheet_rows(download(self.client), "Equipos")
        col = {name: i for i, name in enumerate(rows[0])}
        by_email = {r[col["Correo"]]: r for r in rows if r[col["Correo"]]}

        came = by_email["c1@x.co"]
        self.assertEqual((came[col["Asistencia a la gala"]], came[col["Respuesta"]], came[col["Personas que ingresaron"]]), ("Asistió", "Confirmó", 2))
        self.assertTrue(came[col["Invitación a la gala enviada"]].startswith("Sí ("))
        self.assertEqual(came[col["Acompañante"]], "Jane Doe")
        self.assertTrue(came[col["Hora de ingreso"]])

        absent = by_email["c2@x.co"]
        self.assertEqual((absent[col["Asistencia a la gala"]], absent[col["Respuesta"]]), ("No asistió", "No asiste"))

        never_sent = by_email["c3@x.co"]
        self.assertEqual((never_sent[col["Invitación a la gala enviada"]], never_sent[col["Asistencia a la gala"]]), ("No", "Sin invitación"))

        untouched = by_email["a1@x.co"]  # no ticket at all
        self.assertEqual((untouched[col["Invitación a la gala enviada"]], untouched[col["Asistencia a la gala"]], untouched[col["Personas que ingresaron"]]), ("No", "Sin invitación", 0))

    def test_companions_sheet(self):
        self.build_case()
        rows = sheet_rows(download(self.client), "Acompañantes")
        self.assertEqual(rows[0][3], "Nombre del acompañante")
        self.assertEqual(len(rows), 2)  # header + the only companion
        team, guest, guest_email, name, email, phone, consent, entered = rows[1]
        self.assertEqual((team, guest, guest_email, name, email, phone, entered), ("Contraste", "Persona 1", "c1@x.co", "Jane Doe", "jane@x.co", "3001234567", "Sí"))
        self.assertRegex(consent, r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")

    def test_companion_who_did_not_come_in_is_not_marked_as_attended(self):
        team = make_team(("c1@x.co", "c2@x.co", "c3@x.co", "c4@x.co"), film="Contraste")
        ticket = gala.ensure_ticket(team.participants.first())
        send(ticket)
        gala.apply_rsvp(ticket, True, True, "Jane", "jane@x.co", "3001234567", True)
        gala.validate_checkin(ticket.id, 1)  # the guest came in alone
        rows = sheet_rows(download(self.client), "Acompañantes")
        self.assertEqual(rows[1][-1], "No")

    def test_extras_sheet_and_companions_of_extras(self):
        self.build_case()
        extra = GalaTicket.objects.get(guest_email="ana@x.co")
        gala.apply_rsvp(extra, True, True, "Luis", "luis@x.co", "3007654321", True)
        gala.validate_checkin(extra.id, 1)  # build_case already admitted 1; now the +1 came in too

        wb = download(self.client)
        extras = sheet_rows(wb, "Invitados extra")
        self.assertEqual(len(extras), 2)
        name, email, group, film, invited, response, attendance, entered, _when, companion = extras[1]
        self.assertEqual((name, email, group, film, response, attendance, entered, companion), ("Ana Actriz", "ana@x.co", "Actores", "Anhelo", "Confirmó", "Asistió", 2, "Luis"))

        companions = sheet_rows(wb, "Acompañantes")
        teams = [r[0] for r in companions[1:]]
        self.assertIn("Anhelo · Actores", teams)
        self.assertEqual(companions[1][-1], "Sí")  # both admitted

    def test_empty_database_still_produces_a_valid_workbook(self):
        wb = download(self.client)
        self.assertEqual(len(sheet_rows(wb, "Equipos")), 1)
        self.assertEqual(sheet_rows(wb, "Acompañantes")[1][0], "Todavía no hay acompañantes registrados.")
        self.assertEqual(sheet_rows(wb, "Invitados extra")[1][0], "No hay invitados extra.")

    def test_flat_sheet_keeps_its_original_columns_and_uses_local_time(self):
        contraste, _ = self.build_case()
        rows = sheet_rows(download(self.client), "Inscripciones")
        self.assertEqual(rows[0][:4], ["Fecha de inscripción", "Total integrantes", "Corto entregado", "Título del corto"])
        self.assertEqual(len(rows), 3)  # header + two teams
        first = [r for r in rows[1:] if r[3] == "Contraste"][0]
        self.assertEqual((first[1], first[2]), (3, "Sí"))
        from django.utils import timezone

        self.assertEqual(first[0], timezone.localtime(contraste.created_at).strftime("%Y-%m-%d %H:%M"))

    def test_untitled_teams_come_after_titled_ones(self):
        make_team(("z1@x.co", "z2@x.co", "z3@x.co", "z4@x.co"), film="Zeta")
        make_team(("n1@x.co", "n2@x.co", "n3@x.co", "n4@x.co"), film="")
        rows = sheet_rows(download(self.client), "Equipos")
        bands = [r[0] for r in rows if r[0] and r[1] is None and r[0] != "Rol"]
        self.assertTrue(bands[0].startswith("Zeta"))
        self.assertTrue(bands[1].startswith("(sin título de corto)"))
        self.assertIn("corto sin entregar", bands[1])

    def test_only_admins_can_download_it(self):
        cache.clear()  # the door login below must not hit the login throttle
        self.assertEqual(APIClient().get(EXPORT).status_code, 401)
        self.assertEqual(door_client("alejandra").get(EXPORT).status_code, 403)

    def test_query_count_does_not_grow_with_the_number_of_teams(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        for i in range(3):
            make_team((f"s{i}a@x.co", f"s{i}b@x.co", f"s{i}c@x.co", f"s{i}d@x.co"), film=f"Corto {i}")
        with CaptureQueriesContext(connection) as small:
            download(self.client)
        for i in range(3, 12):
            make_team((f"s{i}a@x.co", f"s{i}b@x.co", f"s{i}c@x.co", f"s{i}d@x.co"), film=f"Corto {i}")
        with CaptureQueriesContext(connection) as large:
            download(self.client)
        # the leader lookup runs once per team; everything else must be prefetched
        self.assertLessEqual(len(large) - len(small), 9 + 1)
