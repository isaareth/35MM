export type Rsvp = "PENDING" | "CONFIRMED" | "DECLINED";

export const RSVP_LABEL: Record<Rsvp, string> = {
  PENDING: "Sin responder",
  CONFIRMED: "Confirmó",
  DECLINED: "No asiste",
};

/** Shown on the guest page; keep in sync with GALA_* in backend settings. */
export const GALA_INFO = {
  date: "14 de noviembre de 2026",
  place: "Auditorio Fundadores · Universidad EAFIT",
};

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
  plus_ones: { guest_name: string; plus_one_name: string; plus_one_email: string }[];
}

/** What the invitation's holder sees on /invitacion/<token>. */
export interface GuestInvitation {
  guest_name: string;
  rsvp_status: Rsvp;
  has_plus_one: boolean;
  plus_one_name: string;
  plus_one_email: string;
  total_capacity: number;
  expires_at: string;
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
