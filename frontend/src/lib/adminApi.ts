const TOKEN_KEY = "35mm_admin_token";
const USERNAME_KEY = "35mm_admin_username";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USERNAME_KEY);
}

export function setSession(token: string, username: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");
  return `${base}${path}`;
}

/** Fetch wrapper for admin endpoints: attaches the token, and clears the
 * session on a 401 so the caller can redirect to /admin/login. */
export async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Token ${token}`);

  const res = await fetch(apiUrl(path), { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    clearSession();
  }
  return res;
}

export interface Participant {
  position: number;
  is_leader: boolean;
  full_name: string;
  document_id: string;
  institution: string;
  institutional_email: string;
  phone: string;
}

export interface RegistrationRecord {
  id: string;
  accepted_terms: boolean;
  confirmed_eligibility: boolean;
  created_at: string;
  confirmation_email_sent_at: string | null;
  film_submitted: boolean;
  film_title: string;
  participants: Participant[];
}

export interface DashboardData {
  total_teams: number;
  total_participants: number;
  recent_registrations: RegistrationRecord[];
}

export interface SendConfirmationsResult {
  sent_count: number;
  failed: { id: string; leader_name: string | null; leader_email: string | null }[];
}

export function leaderOf(registration: RegistrationRecord): Participant | undefined {
  return registration.participants.find((p) => p.is_leader);
}

/** Registrations that share a leader email are duplicates of one team. */
export function teamKey(registration: RegistrationRecord): string {
  const leader = leaderOf(registration);
  return leader ? leader.institutional_email.trim().toLowerCase() : registration.id;
}

export function filmStats(registrations: RegistrationRecord[]): { teams: number; submitted: number } {
  const teams = new Map<string, boolean>();
  for (const r of registrations) {
    const key = teamKey(r);
    teams.set(key, (teams.get(key) ?? false) || r.film_submitted);
  }
  return { teams: teams.size, submitted: [...teams.values()].filter(Boolean).length };
}
