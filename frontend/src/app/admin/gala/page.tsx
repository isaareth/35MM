"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import GalaTeamPanel from "@/components/admin/GalaTeamPanel";
import { Card, Kpi } from "@/components/admin/charts";
import { adminFetch, getToken, leaderOf, type RegistrationRecord } from "@/lib/adminApi";
import type { GalaSummary } from "@/lib/gala";

type Status = "loading" | "ready" | "error";

export default function AdminGalaPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [summary, setSummary] = useState<GalaSummary | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchAll = useCallback(async () => {
    const [listRes, summaryRes] = await Promise.all([
      adminFetch("/api/admin/registrations/"),
      adminFetch("/api/admin/gala/summary/"),
    ]);
    if (listRes.status === 401 || listRes.status === 403) return "unauthorized" as const;
    if (!listRes.ok || !summaryRes.ok) throw new Error("request failed");
    setRegistrations(await listRes.json());
    setSummary(await summaryRes.json());
    return "ok" as const;
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setStatus("loading");
    try {
      if ((await fetchAll()) === "unauthorized") {
        router.replace("/admin/login");
        return;
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [fetchAll, router]);

  useEffect(() => {
    load();
  }, [load]);

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminFetch("/api/admin/email/test/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json().catch(() => null);
      setTestResult(
        res.ok
          ? { ok: true, text: "Enviado. Revisa tu bandeja (y el correo no deseado)." }
          : { ok: false, text: data?.detail || "No se pudo enviar el correo de prueba." }
      );
    } catch {
      setTestResult({ ok: false, text: "No pudimos conectar con el servidor." });
    } finally {
      setTesting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center">
        <p className="font-body text-white/40 text-sm tracking-widest uppercase">Cargando…</p>
      </div>
    );
  }

  if (status === "error" || !summary) {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-body text-red-400 text-sm mb-4">No pudimos cargar la gala.</p>
          <button
            onClick={load}
            className="font-body text-sm tracking-widest uppercase px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const teams = registrations
    .map((r) => {
      const leader = leaderOf(r);
      const members = r.participants;
      return {
        r,
        name: r.film_title || leader?.full_name || "Equipo",
        leaderName: leader?.full_name ?? "",
        total: members.length,
        sent: members.filter((m) => m.gala?.sent_at).length,
        confirmed: members.filter((m) => m.gala?.rsvp_status === "CONFIRMED").length,
        entered: members.filter((m) => (m.gala?.used_capacity ?? 0) > 0).length,
      };
    })
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.leaderName.toLowerCase().includes(q));

  return (
    <div className="bg-ink min-h-screen">
      <AdminHeader backHref="/admin" backLabel="← Festival" />

      <main className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="font-body text-xs text-white/40 tracking-widest uppercase mb-2">14 de noviembre</p>
            <h1 className="font-display font-black text-white text-3xl uppercase">Gala · invitaciones QR</h1>
          </div>
          <a
            href="/admin/escaner"
            className="font-body font-semibold text-sm tracking-widest uppercase px-6 py-4 bg-neon text-ink hover:bg-white transition-colors"
          >
            Escanear en la puerta →
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-white/10 mb-10">
          <Kpi
            label="Invitaciones enviadas"
            value={`${summary.invitations_sent} / ${summary.eligible_people}`}
            hint="Integrantes de equipos"
          />
          <Kpi
            label="Confirmaron"
            value={summary.rsvp.confirmed}
            hint={`${summary.rsvp.confirmation_rate}% de las enviadas · ${summary.rsvp.declined} no asisten`}
          />
          <Kpi
            label="Asistentes esperados"
            value={summary.confirmed_attendees}
            hint="Con acompañantes confirmados"
          />
          <Kpi label="Ya ingresaron" value={summary.checked_in_people} hint="Personas en la puerta" />
          <Kpi
            label="Asistencia"
            value={`${summary.attendance_rate}%`}
            hint="De los asistentes confirmados"
          />
        </div>

        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="font-display font-bold text-white text-xl uppercase">
            Equipos ({teams.length})
          </h2>
          <input
            type="text"
            placeholder="Buscar por corto o líder…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border border-white/20 font-body text-white text-sm px-4 py-2 outline-none focus:border-neon transition-colors w-full md:w-80"
          />
        </div>

        <ul className="border-y border-white/10 divide-y divide-white/8 mb-12">
          {teams.map((t) => {
            const isOpen = open === t.r.id;
            return (
              <li key={t.r.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : t.r.id)}
                  className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors px-2 -mx-2"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0">
                    <p className="font-body text-white text-sm truncate">{t.name}</p>
                    <p className="font-body text-white/40 text-xs truncate">
                      {t.r.film_title ? `Líder: ${t.leaderName}` : `${t.total} integrantes`}
                    </p>
                  </div>
                  <div className="font-body text-xs text-right flex-shrink-0 flex flex-col sm:flex-row sm:gap-5 gap-0.5">
                    <span className={t.sent === t.total ? "text-neon" : "text-white/50"}>
                      Enviadas {t.sent}/{t.total}
                    </span>
                    <span className="text-white/50">Confirmaron {t.confirmed}</span>
                    <span className={t.entered ? "text-neon" : "text-white/30"}>Ingresaron {t.entered}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="pb-6 px-2">
                    <GalaTeamPanel
                      registration={t.r}
                      onChanged={async () => {
                        await fetchAll();
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {teams.length === 0 && (
          <p className="font-body text-white/40 text-sm py-6 text-center">Sin resultados.</p>
        )}

        <Card
          title="Acompañantes registrados"
          caption="Datos capturados en la confirmación, para futuros eventos"
        >
          {summary.plus_ones.length === 0 ? (
            <p className="font-body text-white/30 text-sm">Todavía nadie ha confirmado un acompañante.</p>
          ) : (
            <ul className="divide-y divide-white/8">
              {summary.plus_ones.map((p, i) => (
                <li key={i} className="py-2 flex justify-between gap-4 font-body text-sm">
                  <span className="text-white">{p.plus_one_name}</span>
                  <span className="text-white/40 text-xs truncate">
                    invitado por {p.guest_name}
                    {p.plus_one_email && ` · ${p.plus_one_email}`}
                    {p.plus_one_phone && ` · ${p.plus_one_phone}`}
                    {p.plus_one_data_consent_at &&
                      ` · autorizó datos el ${new Date(p.plus_one_data_consent_at).toLocaleDateString("es-CO")}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-6">
          <Card
            title="Probar el envío de correo"
            caption="Manda un mensaje de ejemplo solo a la dirección que escribas; sirve para configurar y revisar el correo antes de invitar a los equipos."
          >
            <form onSubmit={sendTest} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="flex-1 min-w-0 bg-transparent border border-white/20 font-body text-white text-sm px-4 py-3 outline-none focus:border-neon transition-colors"
              />
              <button
                type="submit"
                disabled={testing}
                className="font-body text-xs font-semibold tracking-widest uppercase px-6 py-3 bg-purple text-white hover:bg-neon hover:text-ink transition-colors disabled:opacity-50"
              >
                {testing ? "Enviando…" : "Enviar prueba"}
              </button>
            </form>
            {testResult && (
              <p className={`font-body text-sm mt-3 ${testResult.ok ? "text-neon" : "text-red-400"}`}>
                {testResult.text}
              </p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
