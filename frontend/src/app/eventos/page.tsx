import type { Metadata } from "next";
import { eventHeading, fetchEvents, formatEventDate, formatEventTimes } from "@/lib/events";

export const metadata: Metadata = {
  title: "Charlas y talleres — 35mm Festival de Cortos",
  description: "Inscríbete a las charlas, talleres y podcasts del 35mm Festival de Cortos.",
};

export default async function EventosPage() {
  const events = await fetchEvents();

  return (
    <div className="bg-ink min-h-screen">
      <div className="max-w-3xl mx-auto py-20 px-6">
        <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">
          35mm Festival de Cortos
        </p>
        <h1
          className="font-display font-black text-white uppercase leading-none mb-12"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
        >
          Charlas y
          <br />
          talleres
        </h1>

        {events.length === 0 ? (
          <p className="font-body text-white/50 text-sm">Pronto publicaremos la programación.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10 border-y border-white/10">
            {events.map((e) => {
              const when = [formatEventDate(e.date), formatEventTimes(e.start_time, e.end_time)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={e.slug}>
                  <a
                    href={`/eventos/${e.slug}`}
                    className="flex items-center justify-between gap-6 py-6 group"
                  >
                    <div>
                      <p className="font-body text-xs tracking-widest uppercase text-white/40 mb-1">
                        {e.title}
                      </p>
                      <p className="font-display font-bold text-white text-2xl uppercase group-hover:text-neon transition-colors">
                        {eventHeading(e)}
                      </p>
                      {(when || e.location) && (
                        <p className="font-body text-white/50 text-sm mt-1">
                          {[when, e.location].filter(Boolean).join(" — ")}
                        </p>
                      )}
                    </div>
                    <span className="font-body text-xs tracking-widest uppercase text-neon flex-shrink-0">
                      {e.is_open ? "Inscribirme →" : "Cerrado"}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        <a
          href="/"
          className="inline-block mt-10 font-body text-xs tracking-widest uppercase text-white/50 hover:text-neon transition-colors"
        >
          ← Volver al inicio
        </a>
      </div>
    </div>
  );
}
