"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import { adminFetch, getToken } from "@/lib/adminApi";
import {
  eventHeading,
  formatEventDate,
  formatEventTimes,
  type AdminEventInfo,
} from "@/lib/events";

type Status = "loading" | "ready" | "error";

export default function AdminEventsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [events, setEvents] = useState<AdminEventInfo[]>([]);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setStatus("loading");
    try {
      const res = await adminFetch("/api/admin/events/");
      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("request failed");
      setEvents(await res.json());
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

  if (status === "error") {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-body text-red-400 text-sm mb-4">No pudimos cargar los eventos.</p>
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

  return (
    <div className="bg-ink min-h-screen">
      <AdminHeader backHref="/admin" backLabel="← Festival" />

      <main className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        <p className="font-body text-xs text-white/40 tracking-widest uppercase mb-2">
          Charlas y talleres
        </p>
        <h1 className="font-display font-black text-white text-3xl uppercase mb-8">Eventos</h1>

        {events.length === 0 ? (
          <p className="font-body text-white/40 text-sm">Todavía no hay eventos.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10">
            {events.map((e) => {
              const when = [formatEventDate(e.date), formatEventTimes(e.start_time, e.end_time)]
                .filter(Boolean)
                .join(" · ");
              return (
                <a
                  key={e.slug}
                  href={`/admin/eventos/${e.slug}`}
                  className="bg-ink p-6 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-4"
                >
                  <div>
                    <p className="font-body text-xs tracking-widest uppercase text-white/40 mb-1">
                      {e.title}
                      {!e.is_open && <span className="text-red-400"> · inscripciones cerradas</span>}
                    </p>
                    <p className="font-display font-black text-white text-2xl uppercase leading-tight">
                      {eventHeading(e)}
                    </p>
                    {(when || e.location) && (
                      <p className="font-body text-white/50 text-sm mt-1">
                        {[when, e.location].filter(Boolean).join(" — ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="font-display font-black text-neon text-3xl leading-none">
                        {e.registered_count}
                      </p>
                      <p className="font-body text-white/40 text-xs tracking-widest uppercase mt-1">
                        Inscritos
                      </p>
                    </div>
                    <div>
                      <p className="font-display font-black text-neon text-3xl leading-none">
                        {e.attended_count}
                      </p>
                      <p className="font-body text-white/40 text-xs tracking-widest uppercase mt-1">
                        Asistieron
                      </p>
                    </div>
                  </div>
                  <p className="font-body text-xs text-white/30">
                    Link de inscripción: /eventos/{e.slug}
                  </p>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
