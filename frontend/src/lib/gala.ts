export type Rsvp = "PENDING" | "CONFIRMED" | "DECLINED";

export const RSVP_LABEL: Record<Rsvp, string> = {
  PENDING: "Sin responder",
  CONFIRMED: "Confirmó",
  DECLINED: "No asiste",
};

/** Shown on the guest page; keep in sync with GALA_* in backend settings. */
export const GALA_INFO = {
  date: "14 de noviembre de 2026",
  dateIso: "2026-11-14",
  place: "Auditorio Fundadores · Universidad EAFIT",
  title: "Gala de premiación · 35mm Festival de Cortos",
};

export const GALA_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Auditorio Fundadores Universidad EAFIT Medellín");

/** Whole days from today (local time) to the gala: 0 = today, negative = already happened. */
export function daysUntilGala(now: Date = new Date()): number {
  const [y, m, d] = GALA_INFO.dateIso.split("-").map(Number);
  const gala = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((gala - today) / 86_400_000);
}

const compactDate = (iso: string) => iso.replaceAll("-", "");

function dayAfter(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/** The time of the gala is not published yet, so the event is all-day. */
export function googleCalendarUrl(detailsUrl: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: GALA_INFO.title,
    dates: `${compactDate(GALA_INFO.dateIso)}/${compactDate(dayAfter(GALA_INFO.dateIso))}`,
    location: GALA_INFO.place,
    details: `Tu invitación personal (con tu código QR): ${detailsUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

/** RFC 5545 lines are limited to 75 octets; longer ones continue on the next line after a space. */
function icsFold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      parts.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n");
}

export function buildIcs(detailsUrl: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//35mm Festival de Cortos//Gala//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:gala-${compactDate(GALA_INFO.dateIso)}@35mm-festival`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(GALA_INFO.dateIso)}`,
    `DTEND;VALUE=DATE:${compactDate(dayAfter(GALA_INFO.dateIso))}`,
    `SUMMARY:${icsEscape(GALA_INFO.title)}`,
    `LOCATION:${icsEscape(GALA_INFO.place)}`,
    `DESCRIPTION:${icsEscape(`Tu invitación personal (con tu código QR): ${detailsUrl}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/** A member's invitation as the admin list reports it (null = never issued). */
export interface GalaInfo {
  sent_at: string | null;
  rsvp_status: Rsvp;
  has_plus_one: boolean;
  plus_one_name: string;
  used_capacity: number;
  total_capacity: number;
  checkin_at: string | null;
}

export interface SendGalaResult {
  sent_count: number;
  failed_count: number;
  results: { participant_id: number; name: string; sent: boolean }[];
  error: string;
  stopped_by_quota: boolean;
}

export interface GalaSummary {
  eligible_people: number;
  invitations_created: number;
  invitations_sent: number;
  rsvp: { confirmed: number; declined: number; pending: number; confirmation_rate: number };
  confirmed_attendees: number;
  checked_in_people: number;
  checked_in_tickets: number;
  attendance_rate: number;
  plus_ones: {
    guest_name: string;
    plus_one_name: string;
    plus_one_email: string;
    plus_one_phone: string;
  }[];
}

/** What the invitation's holder sees on /invitacion/<token>. */
export interface GuestInvitation {
  guest_name: string;
  rsvp_status: Rsvp;
  has_plus_one: boolean;
  plus_one_name: string;
  plus_one_email: string;
  plus_one_phone: string;
  total_capacity: number;
  expired: boolean;
  qr_path: string;
}

/** What door staff sees after scanning, before admitting anyone. */
export interface TicketLookup {
  guest_name: string;
  team: string;
  rsvp_status: Rsvp;
  has_plus_one: boolean;
  plus_one_name: string;
  total_capacity: number;
  used_capacity: number;
  remaining_capacity: number;
  checkin_at: string | null;
  expired: boolean;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The ticket token from a scanned QR (the invitation URL) or a pasted token. */
export function extractToken(text: string): string | null {
  return text.match(UUID_RE)?.[0].toLowerCase() ?? null;
}
