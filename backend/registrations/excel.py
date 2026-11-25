from datetime import datetime

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from .models import MAX_PARTICIPANTS, GalaTicket

HEADERS = ["Fecha de inscripción", "Total integrantes", "Corto entregado", "Título del corto"]
for i in range(1, MAX_PARTICIPANTS + 1):
    HEADERS += [
        f"P{i} - Nombre" + (" (líder)" if i == 1 else ""),
        f"P{i} - Documento",
        f"P{i} - Institución",
        f"P{i} - Correo institucional",
        f"P{i} - Celular",
    ]

BAND_FILL = PatternFill("solid", fgColor="4820B7")
BAND_FONT = Font(bold=True, color="FFFFFF", size=12)
HEADER_FILL = PatternFill("solid", fgColor="E8E3F8")
YES, NO = "Sí", "No"

RSVP_TEXT = {
    GalaTicket.Rsvp.CONFIRMED: "Confirmó",
    GalaTicket.Rsvp.DECLINED: "No asiste",
    GalaTicket.Rsvp.PENDING: "Sin responder",
}


def _local(moment) -> str:
    return timezone.localtime(moment).strftime("%Y-%m-%d %H:%M") if moment else ""


def _ticket_of(participant):
    try:
        return participant.gala_ticket
    except ObjectDoesNotExist:
        return None


def attendance_text(ticket) -> str:
    """Whether the guest came to the gala, judged by the door scanner."""
    if ticket is not None and ticket.used_capacity > 0:
        return "Asistió"
    if ticket is not None and ticket.sent_at:
        return "No asistió"
    return "Sin invitación"


def _gala_cells(ticket):
    """[Invitación enviada, Respuesta, Asistencia a la gala, Personas que ingresaron, Hora de ingreso]"""
    if ticket is None or not ticket.sent_at:
        return ["No", "", attendance_text(ticket), ticket.used_capacity if ticket else 0, _local(ticket.checkin_at) if ticket else ""]
    return [
        f"Sí ({_local(ticket.sent_at)})",
        RSVP_TEXT[ticket.rsvp_status],
        attendance_text(ticket),
        ticket.used_capacity,
        _local(ticket.checkin_at),
    ]


def _companion_entered(ticket) -> str:
    # A ticket admits up to two people; the companion came in if both were admitted.
    return YES if ticket is not None and ticket.used_capacity >= 2 else NO


def _style_header(ws, widths):
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    for index, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(index)].width = width
    ws.freeze_panes = "A2"


def _team_sort_key(registration):
    leader = registration.leader
    title = (registration.film_title or "").strip().lower()
    # Teams with a film title first (A-Z), then the untitled ones by leader name.
    return (0, title, "") if title else (1, "", (leader.full_name.lower() if leader else ""))


TEAM_HEADERS = [
    "Rol", "Nombre", "Documento", "Institución", "Correo", "Celular",
    "Invitación a la gala enviada", "Respuesta", "Asistencia a la gala",
    "Personas que ingresaron", "Hora de ingreso", "Acompañante",
]
TEAM_WIDTHS = [14, 30, 16, 32, 34, 16, 28, 16, 20, 14, 18, 28]


def _build_teams_sheet(ws, registrations):
    ws.append(TEAM_HEADERS)
    _style_header(ws, TEAM_WIDTHS)

    for registration in sorted(registrations, key=_team_sort_key):
        members = sorted(registration.participants.all(), key=lambda p: p.position)
        title = registration.film_title.strip() or "(sin título de corto)"
        delivered = "corto entregado" if registration.film_submitted else "corto sin entregar"
        ws.append([f"{title}   ·   {delivered}   ·   {len(members)} integrantes"])
        band_row = ws.max_row
        ws.merge_cells(start_row=band_row, start_column=1, end_row=band_row, end_column=len(TEAM_HEADERS))
        band = ws.cell(row=band_row, column=1)
        band.fill, band.font = BAND_FILL, BAND_FONT
        band.alignment = Alignment(vertical="center")
        ws.row_dimensions[band_row].height = 22

        for p in members:
            ticket = _ticket_of(p)
            companion = ticket.plus_one_name if ticket is not None and ticket.has_plus_one else ""
            ws.append(
                ["Líder" if p.is_leader else "Integrante", p.full_name, p.document_id, p.institution,
                 p.institutional_email, p.phone, *_gala_cells(ticket), companion]
            )
        ws.append([])


COMPANION_HEADERS = [
    "Corto / grupo", "Invitado que lo trae", "Correo del invitado", "Nombre del acompañante",
    "Correo del acompañante", "Celular del acompañante", "Autorizó tratamiento de datos",
    "Ingresó a la gala",
]


def _build_companions_sheet(ws, registrations, extras):
    from .gala import team_label  # local import: gala imports email, which imports settings

    ws.append(COMPANION_HEADERS)
    _style_header(ws, [34, 30, 34, 30, 34, 18, 28, 16])

    rows = []
    for registration in registrations:
        for p in registration.participants.all():
            ticket = _ticket_of(p)
            if ticket is not None and ticket.has_plus_one:
                rows.append((registration.film_title.strip() or "(sin título)", p.full_name, ticket))
    for ticket in extras:
        if ticket.has_plus_one:
            rows.append((team_label(ticket), ticket.guest_name, ticket))

    for team, guest, ticket in sorted(rows, key=lambda r: (r[0].lower(), r[1].lower())):
        ws.append([
            team, guest, ticket.guest_email, ticket.plus_one_name, ticket.plus_one_email,
            ticket.plus_one_phone,
            _local(ticket.plus_one_data_consent_at) or "No registrada",
            _companion_entered(ticket),
        ])
    if ws.max_row == 1:
        ws.append(["Todavía no hay acompañantes registrados."])


EXTRA_HEADERS = [
    "Nombre", "Correo", "Grupo", "Corto que lo invita", "Invitación a la gala enviada",
    "Respuesta", "Asistencia a la gala", "Personas que ingresaron", "Hora de ingreso", "Acompañante",
]


def _build_extras_sheet(ws, extras):
    ws.append(EXTRA_HEADERS)
    _style_header(ws, [30, 34, 18, 30, 28, 16, 20, 14, 18, 28])
    for ticket in sorted(extras, key=lambda t: t.guest_name.lower()):
        sponsor = ticket.sponsor_registration
        invited, response, attendance, entered, entry_time = _gala_cells(ticket)
        ws.append([
            ticket.guest_name, ticket.guest_email, ticket.group,
            (sponsor.film_title.strip() or "(sin título)") if sponsor else "",
            invited, response, attendance, entered, entry_time,
            ticket.plus_one_name if ticket.has_plus_one else "",
        ])
    if ws.max_row == 1:
        ws.append(["No hay invitados extra."])


def _build_flat_sheet(ws, registrations):
    ws.append(HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for registration in sorted(registrations, key=lambda r: r.created_at):
        participants_by_position = {p.position: p for p in registration.participants.all()}
        row = [
            _local(registration.created_at),
            len(participants_by_position),
            YES if registration.film_submitted else NO,
            registration.film_title,
        ]
        for i in range(1, MAX_PARTICIPANTS + 1):
            p = participants_by_position.get(i)
            if p:
                row += [p.full_name, p.document_id, p.institution, p.institutional_email, p.phone]
            else:
                row += ["", "", "", "", ""]
        ws.append(row)

    for i, _ in enumerate(HEADERS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = 22


def build_registrations_workbook(registrations, extras=()) -> Workbook:
    """Sheets: Equipos (grouped by film), Acompañantes, Invitados extra and the
    original flat "Inscripciones" table. `registrations` should have
    participants__gala_ticket prefetched and `extras` be the pocket's tickets."""
    registrations, extras = list(registrations), list(extras)
    wb = Workbook()
    _build_teams_sheet(wb.active, registrations)
    wb.active.title = "Equipos"
    _build_companions_sheet(wb.create_sheet("Acompañantes"), registrations, extras)
    _build_extras_sheet(wb.create_sheet("Invitados extra"), extras)
    _build_flat_sheet(wb.create_sheet("Inscripciones"), registrations)
    return wb


def registrations_filename() -> str:
    return f"inscripciones_35mm_{datetime.now():%Y%m%d_%H%M}.xlsx"


EVENT_HEADERS = [
    "Fecha de inscripción",
    "Nombre",
    "Documento",
    "Institución",
    "Correo",
    "Celular",
    "Asistió",
    "Hora de asistencia",
]


def _local(dt) -> str:
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M")


def build_event_registrations_workbook(event, event_registrations) -> Workbook:
    wb = Workbook()
    ws = wb.active
    ws.title = (event.speaker or event.title)[:31]

    ws.append(EVENT_HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for r in event_registrations:
        ws.append(
            [
                _local(r.created_at),
                r.full_name,
                r.document_id,
                r.institution,
                r.email,
                r.phone,
                "Sí" if r.attended_at else "No",
                _local(r.attended_at) if r.attended_at else "",
            ]
        )

    for i, _ in enumerate(EVENT_HEADERS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = 26

    return wb


def event_registrations_filename(event) -> str:
    return f"inscritos_{event.slug}_{datetime.now():%Y%m%d_%H%M}.xlsx"
