export interface EventInfo {
  slug: string;
  title: string;
  speaker: string;
  description: string;
  date: string | null;
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

/** "2026-10-16" -> "16 de octubre de 2026" (parsed by hand so the date
 * never shifts with the viewer's timezone). */
export function formatEventDate(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
