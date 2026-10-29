"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import { Card, Columns, DailyChart, Empty, HBars, HourColumns, Kpi, Section } from "@/components/admin/charts";
import { adminFetch, getToken } from "@/lib/adminApi";
import { percent, shortDate, type AnalyticsData, type EventAnalytics } from "@/lib/analytics";

type Status = "loading" | "ready" | "error";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AnalyticsData | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setStatus("loading");
    try {
      const res = await adminFetch("/api/admin/analytics/");
      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("request failed");
      setData(await res.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center">
        <p className="font-body text-white/40 text-sm tracking-widest uppercase">Cargando…</p>
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-body text-red-400 text-sm mb-4">No pudimos cargar las analíticas.</p>
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

  const { overview, festival, events } = data;
  const overlapPct = percent(overview.in_both, overview.festival_people);

  return (
    <div className="bg-ink min-h-screen">
      <AdminHeader backHref="/admin" backLabel="← Festival" />

      <main className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        <p className="font-body text-xs text-white/40 tracking-widest uppercase mb-2">
          Métricas generales
        </p>
        <h1 className="font-display font-black text-white text-3xl uppercase mb-1">Analíticas</h1>
        <p className="font-body text-white/30 text-xs mb-8">
          Actualizado{" "}
          {new Date(data.generated_at).toLocaleString("es-CO", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" · "}
          <button onClick={load} className="text-neon hover:text-white transition-colors">
            Actualizar
          </button>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-white/10 mb-14">
          <Kpi
            label="Personas alcanzadas"
            value={overview.unique_people}
            hint="Únicas, festival + charlas"
          />
          <Kpi label="Equipos" value={festival.teams} hint="Inscritos al festival" />
          <Kpi
            label="Participantes"
            value={festival.participants}
            hint={`${festival.avg_team_size} por equipo`}
          />
          <Kpi label="Inscripciones a charlas" value={events.signups} hint={`${events.activities} actividades`} />
          <Kpi label="Personas en charlas" value={events.unique_people} hint="Únicas" />
          <Kpi
            label="Asistencia a charlas"
            value={events.attendance_rate === null ? "—" : `${events.attendance_rate}%`}
            hint={
              events.attendance_rate === null
                ? "Aún sin asistencia marcada"
                : `${events.events_with_attendance} evento${events.events_with_attendance === 1 ? "" : "s"} con asistencia marcada`
            }
          />
        </div>

        <Section title="Festival · inscripción de equipos">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Inscripciones por día" caption="Equipos inscritos desde la apertura">
              <DailyChart series={festival.daily} barLabel="Equipos por día" lineLabel="Total acumulado" />
            </Card>
            <Card title="Hora de inscripción" caption="Cuándo se inscribe la gente">
              <HourColumns hourly={festival.hourly} />
            </Card>
            <Card title="Tamaño de los equipos" caption="Integrantes por equipo">
              {festival.team_size_distribution.length === 0 ? (
                <Empty />
              ) : (
                <Columns
                  items={festival.team_size_distribution.map((d) => ({
                    label: `${d.size} int.`,
                    value: d.teams,
                  }))}
                />
              )}
            </Card>
            <Card
              title="Correos de confirmación"
              caption="Equipos cuyo líder ya recibió la confirmación"
            >
              <HBars
                items={[
                  { name: "Enviados", count: festival.emails_sent },
                  { name: "Pendientes", count: festival.emails_pending },
                ]}
              />
            </Card>
            <Card title="Instituciones" caption="Participantes por institución (según lo que escribieron)">
              <HBars items={festival.institutions} />
            </Card>
            <Card title="Dominio del correo" caption="Participantes por dominio de correo institucional">
              <HBars items={festival.email_domains} />
            </Card>
          </div>
        </Section>

        <Section title="Charlas y talleres">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <Card
                title="Inscritos y asistencia por actividad"
                caption="La asistencia solo cuenta en actividades donde se marcó al menos una persona"
              >
                <EventTable events={events.per_event} />
              </Card>
            </div>
            <Card title="Inscripciones por día" caption="Todas las charlas y talleres">
              <DailyChart series={events.daily} barLabel="Inscripciones por día" lineLabel="Total acumulado" />
            </Card>
            <Card title="Hora de inscripción">
              <HourColumns hourly={events.hourly} />
            </Card>
            <Card title="Instituciones" caption="Inscripciones por institución">
              <HBars items={events.institutions} />
            </Card>
            <Card title="Fidelidad" caption="Personas que se inscribieron a más de una actividad">
              <div className="flex items-end gap-6">
                <div>
                  <p className="font-display font-black text-neon text-4xl leading-none">
                    {events.repeat_people}
                  </p>
                  <p className="font-body text-xs text-white/40 tracking-widest uppercase mt-2">
                    Repiten
                  </p>
                </div>
                <div>
                  <p className="font-display font-black text-white text-4xl leading-none">
                    {percent(events.repeat_people, events.unique_people)}%
                  </p>
                  <p className="font-body text-xs text-white/40 tracking-widest uppercase mt-2">
                    De {events.unique_people} personas
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Festival y charlas">
          <Card
            title="Cruce de audiencias"
            caption="Coincidencia por correo electrónico; si alguien usó correos distintos cuenta como dos personas"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="font-display font-black text-neon text-4xl leading-none">
                  {overview.in_both}
                </p>
                <p className="font-body text-xs text-white/40 tracking-widest uppercase mt-2">
                  En ambos
                </p>
              </div>
              <div>
                <p className="font-display font-black text-white text-4xl leading-none">
                  {overlapPct}%
                </p>
                <p className="font-body text-xs text-white/40 tracking-widest uppercase mt-2">
                  De los participantes del festival se inscribió a alguna charla
                </p>
              </div>
              <div>
                <p className="font-display font-black text-white text-4xl leading-none">
                  {overview.event_people - overview.in_both}
                </p>
                <p className="font-body text-xs text-white/40 tracking-widest uppercase mt-2">
                  Solo charlas (no están en el festival)
                </p>
              </div>
            </div>
          </Card>
        </Section>
      </main>
    </div>
  );
}

function EventTable({ events }: { events: EventAnalytics[] }) {
  if (events.length === 0) return <Empty />;
  const max = Math.max(...events.map((e) => e.registered), 1);

  return (
    <ul className="flex flex-col divide-y divide-white/8">
      {events.map((e) => {
        const when = e.date
          ? e.end_date && e.end_date !== e.date
            ? `${shortDate(e.date)} – ${shortDate(e.end_date)}`
            : shortDate(e.date)
          : "Sin fecha";
        return (
          <li key={e.slug} className="py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_90px] gap-3 md:gap-6 md:items-center">
            <div className="min-w-0">
              <p className="font-body text-white text-sm truncate">
                {e.speaker ? `${e.title} · ${e.speaker}` : e.title}
              </p>
              <p className="font-body text-white/40 text-xs">
                {when}
                {!e.is_open && <span className="text-red-400"> · cerrada</span>}
              </p>
            </div>
            <div>
              <div className="h-2 bg-white/10 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-purple-bright/60"
                  style={{ width: `${(100 * e.registered) / max}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-neon"
                  style={{ width: `${(100 * e.attended) / max}%` }}
                />
              </div>
              <p className="font-body text-xs text-white/50 mt-1">
                <span className="text-white tabular-nums">{e.registered}</span> inscritos ·{" "}
                <span className="text-neon tabular-nums">{e.attended}</span> asistieron
              </p>
            </div>
            <p className="font-display font-black text-white text-xl md:text-right">
              {e.attendance_rate === null ? (
                <span className="font-body font-normal text-xs text-white/30">
                  {e.past ? "sin asistencia" : "pendiente"}
                </span>
              ) : (
                `${e.attendance_rate}%`
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
