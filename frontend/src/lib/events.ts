export interface EventInfo {
  slug: string;
  title: string;
  speaker: string;
  description: string;
  date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  open_to_public: boolean;
  is_open: boolean;
}

export interface AdminEventInfo extends EventInfo {
  registered_count: number;
  attended_count: number;
}

export interface EventRegistrationRecord {
  id: string;
  full_name: string;
  document_id: string;
  institution: string;
  email: string;
  phone: string;
  created_at: string;
  attended_at: string | null;
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10-16" -> "16 de octubre de 2026"; with an end date in the same
 * month -> "21 y 22 de octubre de 2026". Parsed by hand so the date never
 * shifts with the viewer's timezone. */
export function formatEventDate(event: Pick<EventInfo, "date" | "end_date">): string | null {
  if (!event.date) return null;
  const start = parseDate(event.date);
  const full = { day: "numeric", month: "long", year: "numeric" } as const;

  if (!event.end_date || event.end_date === event.date) {
    return start.toLocaleDateString("es-CO", full);
  }

  const end = parseDate(event.end_date);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const month = end.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    return `${start.getDate()} y ${end.getDate()} de ${month}`;
  }
  return `${start.toLocaleDateString("es-CO", { day: "numeric", month: "long" })} al ${end.toLocaleDateString("es-CO", full)}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "p. m." : "a. m.";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatEventTimes(start: string | null, end: string | null): string | null {
  if (!start) return null;
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

export function eventHeading(event: Pick<EventInfo, "title" | "speaker">): string {
  return event.speaker || event.title;
}

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL;

/** Server-side fetch helpers: null means "couldn't load / not found". */
export async function fetchEvent(slug: string): Promise<EventInfo | null> {
  const base = apiUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/events/${encodeURIComponent(slug)}/`, {
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as EventInfo) : null;
  } catch {
    return null;
  }
}

export async function fetchEvents(): Promise<EventInfo[]> {
  const base = apiUrl();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/events/`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as EventInfo[]) : [];
  } catch {
    return [];
  }
}
