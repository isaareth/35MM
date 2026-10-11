"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import { adminFetch, getToken } from "@/lib/adminApi";
import {
  eventHeading,
  formatEventDate,
  formatEventTimes,
  type EventInfo,
  type EventRegistrationRecord,
} from "@/lib/events";

type Status = "loading" | "ready" | "error";
type Filter = "all" | "attended" | "pending";

export default function AdminEventAttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setStatus("loading");
    try {
      const res = await adminFetch(`/api/admin/events/${encodeURIComponent(slug)}/registrations/`);
      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setEvent(data.event);
      setRegistrations(data.registrations);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router, slug]);

  useEffect(() => {
    load();
  }, [load]);

  const setAttendance = async (registration: EventRegistrationRecord, attended: boolean) => {
    setBusyId(registration.id);
    setRowError(null);
    try {
      const res = await adminFetch(`/api/admin/event-registrations/${registration.id}/attendance/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended }),
      });
      if (!res.ok) throw new Error("update failed");
      const updated: EventRegistrationRecord = await res.json();
      setRegistrations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      setRowError(`No pudimos actualizar la asistencia de ${registration.full_name}. Intenta de nuevo.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await adminFetch(`/api/admin/events/${encodeURIComponent(slug)}/export/`);
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] || `inscritos_${slug}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError("No pudimos generar el Excel. Intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center">
        <p className="font-body text-white/40 text-sm tracking-widest uppercase">Cargando…</p>
      </div>
    );
  }

  if (status === "error" || !event) {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-body text-red-400 text-sm mb-4">No pudimos cargar este evento.</p>
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

  const attendedCount = registrations.filter((r) => r.attended_at).length;
  const q = search.trim().toLowerCase();
  const visible = registrations.filter((r) => {
    if (filter === "attended" && !r.attended_at) return false;
    if (filter === "pending" && r.attended_at) return false;
    if (!q) return true;
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.document_id.toLowerCase().includes(q) ||
      r.institution.toLowerCase().includes(q)
    );
  });

  const when = [formatEventDate(event.date), formatEventTimes(event.start_time, event.end_time)]
    .filter(Boolean)
    .join(" · ");

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `Todos (${registrations.length})` },
    { key: "pending", label: `Pendientes (${registrations.length - attendedCount})` },
    { key: "attended", label: `Asistieron (${attendedCount})` },
  ];

  return (
    <div className="bg-ink min-h-screen">
      <AdminHeader backHref="/admin/eventos" backLabel="← Eventos" />

      <main className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        <p className="font-body text-xs text-white/40 tracking-widest uppercase mb-2">
          {event.title}
        </p>
        <h1 className="font-display font-black text-white text-3xl uppercase mb-1">
          {eventHeading(event)}
        </h1>
        {(when || event.location) && (
          <p className="font-body text-white/50 text-sm mb-8">
            {[when, event.location].filter(Boolean).join(" — ")}
          </p>
        )}

        <div className="grid grid-cols-3 gap-px bg-white/10 mb-8">
          <div className="bg-ink p-5 md:p-8">
            <p className="font-display font-black text-neon text-4xl md:text-5xl leading-none mb-2">
              {registrations.length}
            </p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">Inscritos</p>
          </div>
          <div className="bg-ink p-5 md:p-8">
            <p className="font-display font-black text-neon text-4xl md:text-5xl leading-none mb-2">
              {attendedCount}
            </p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">Asistieron</p>
          </div>
          <div className="bg-purple p-5 md:p-8">
            <p className="font-body text-white/70 text-xs tracking-widest uppercase mb-3">Exportar</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="font-body font-semibold text-xs md:text-sm tracking-widest uppercase px-3 md:px-6 py-3 bg-neon text-ink hover:bg-white transition-all duration-300 disabled:opacity-50 w-full"
            >
              {exporting ? "Generando…" : "Descargar Excel"}
            </button>
            {exportError && <p className="font-body text-xs text-red-200 mt-2">{exportError}</p>}
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre, documento, correo o institución…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border border-white/20 font-body text-white text-sm px-4 py-3 outline-none focus:border-neon transition-colors w-full mb-4"
        />

        <div className="flex gap-2 flex-wrap mb-6">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`font-body text-xs tracking-widest uppercase px-4 py-2 border transition-colors ${
                filter === f.key
                  ? "border-neon text-neon"
                  : "border-white/20 text-white/50 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {rowError && (
          <p role="alert" className="font-body text-sm text-red-400 border border-red-400/30 bg-red-400/10 px-4 py-3 mb-4">
            {rowError}
          </p>
        )}

        <ul className="divide-y divide-white/8 border-y border-white/8">
          {visible.map((r) => {
            const attended = Boolean(r.attended_at);
            return (
              <li key={r.id} className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-body text-white text-sm truncate">{r.full_name}</p>
                  <p className="font-body text-white/40 text-xs truncate">
                    {[r.document_id, r.institution, r.email].filter(Boolean).join(" · ")}
                  </p>
                  {attended && r.attended_at && (
                    <p className="font-body text-neon text-xs mt-0.5">
                      Asistió ·{" "}
                      {new Date(r.attended_at).toLocaleTimeString("es-CO", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setAttendance(r, !attended)}
                  disabled={busyId === r.id}
                  className={`flex-shrink-0 font-body text-xs font-semibold tracking-widest uppercase px-4 py-3 transition-colors disabled:opacity-50 ${
                    attended
                      ? "border border-white/20 text-white/60 hover:text-white"
                      : "bg-neon text-ink hover:bg-white"
                  }`}
                >
                  {busyId === r.id ? "…" : attended ? "Deshacer" : "Marcar asistencia"}
                </button>
              </li>
            );
          })}
        </ul>
        {visible.length === 0 && (
          <p className="font-body text-white/40 text-sm py-8 text-center">Sin resultados.</p>
        )}
      </main>
    </div>
  );
}
