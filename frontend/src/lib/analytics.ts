export interface DailyPoint {
  date: string;
  count: number;
  cumulative: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface RateRow {
  name: string;
  teams: number;
  submitted: number;
  rate: number;
}

export interface SubmissionsAnalytics {
  unique_teams: number;
  duplicate_registrations: number;
  submitted_teams: number;
  rate: number;
  participants_in_submitting_teams: number;
  by_institution: RateRow[];
  by_team_size: (RateRow & { size: number })[];
  by_signup_week: (RateRow & { week_start: string })[];
  talk_engagement: { with_talks: RateRow; without_talks: RateRow };
  films: { title: string; institution: string; size: number }[];
}

export interface FestivalAnalytics {
  teams: number;
  participants: number;
  avg_team_size: number;
  team_size_distribution: { size: number; teams: number }[];
  emails_sent: number;
  emails_pending: number;
  daily: DailyPoint[];
  hourly: number[];
  institutions: NamedCount[];
  email_domains: NamedCount[];
  submissions: SubmissionsAnalytics;
}

export interface EventAnalytics {
  slug: string;
  title: string;
  speaker: string;
  date: string | null;
  end_date: string | null;
  past: boolean | null;
  is_open: boolean;
  registered: number;
  attended: number;
  attendance_tracked: boolean;
  attendance_rate: number | null;
}

export interface EventsAnalytics {
  activities: number;
  signups: number;
  unique_people: number;
  repeat_people: number;
  attended: number;
  attendance_rate: number | null;
  events_with_attendance: number;
  per_event: EventAnalytics[];
  daily: DailyPoint[];
  hourly: number[];
  institutions: NamedCount[];
}

export interface AnalyticsData {
  generated_at: string;
  overview: {
    unique_people: number;
    festival_people: number;
    event_people: number;
    in_both: number;
  };
  festival: FestivalAnalytics;
  events: EventsAnalytics;
}

/** "2026-09-18" -> "18 sep" (parsed by hand so it never shifts with timezone). */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour >= 12 ? "p. m." : "a. m."}`;
}

export function percent(part: number, whole: number): number {
  return whole ? Math.round((100 * part) / whole) : 0;
}
