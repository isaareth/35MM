"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, leaderOf, type RegistrationRecord } from "@/lib/adminApi";
import {
  RSVP_LABEL,
  parseGuestLines,
  type AddExtrasResult,
  type ExtraTicket,
  type SendExtrasResult,
} from "@/lib/gala";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The extras pocket: guests who belong to no team's roster (actors, collaborators,
 * jury...), optionally tied to the film that invites them. */
export default function ExtrasPocket({
  registrations,
  onChanged,
}: {
  registrations: RegistrationRecord[];
  onChanged: () => void | Promise<void>;
}) {
  const [extras, setExtras] = useState<ExtraTicket[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState("");
  const [teamId, setTeamId] = useState("");
  const [group, setGroup] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<AddExtrasResult | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | "all" | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [sendResult, setSendResult] = useState<SendExtrasResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const teams = useMemo(
    () =>
      registrations
        .map((r) => ({ id: r.id, label: r.film_title || leaderOf(r)?.full_name || "Equipo sin título" }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [registrations]
  );

  const reload = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/gala/extras/");
      if (!res.ok) throw new Error("load failed");
      setExtras(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const parsed = useMemo(() => parseGuestLines(text), [text]);
  const pending = extras.filter((e) => !e.sent_at);

  const refreshAll = async () => {
    await reload();
    await onChanged();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.guests.length === 0) return;
    setAdding(true);
    setAddError(null);
    setAdded(null);
    try {
      const res = await adminFetch("/api/admin/gala/extras/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: parsed.guests, registration_id: teamId || null, group }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAddError(data?.detail || "No pudimos agregar a las personas. Intenta de nuevo.");
        return;
      }
      setAdded(data);
      // Keep only the lines that were not added, so the admin can fix and retry them.
      const notAdded = new Set<string>(data.skipped.map((s: { email: string }) => s.email.toLowerCase()));
      setText(
        text
          .split(/\r?\n/)
          .filter((line) => {
            if (!line.trim()) return false;
            const { guests } = parseGuestLines(line);
            return guests.length === 0 || notAdded.has(guests[0].email.toLowerCase());
          })
          .join("\n")
      );
      await refreshAll();
    } catch {
      setAddError("No pudimos conectar con el servidor.");
    } finally {
      setAdding(false);
    }
  };

  const send = async (target: string | "all") => {
    setBusy(target);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await adminFetch("/api/admin/gala/extras/send/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target === "all" ? {} : { ticket_id: target }),
      });
      if (!res.ok) throw new Error("send failed");
      setSendResult(await res.json());
      await refreshAll();
    } catch {
      setSendError("No pudimos enviar las invitaciones. Intenta de nuevo.");
    } finally {
      setBusy(null);
      setConfirmAll(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    setSendError(null);
    try {
      const res = await adminFetch(`/api/admin/gala/extras/${id}/`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSendError(data?.detail || "No pudimos eliminar a esta persona.");
      } else {
        await refreshAll();
      }
    } catch {
      setSendError("No pudimos conectar con el servidor.");
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  };

  return (
    <section className="border border-white/10 p-5 md:p-6 min-w-0">
      <p className="font-body text-xs tracking-widest uppercase text-white/40">Bolsillo de invitaciones extras</p>
      <p className="font-body text-xs text-white/30 mt-1">
        Personas que no son integrantes de ningún equipo (actores, colaboradores, jurado…). Reciben su propio QR,
        con cupo para un acompañante, y no cambian la lista de integrantes.
      </p>

      <form onSubmit={add} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-body text-xs text-white/50 tracking-widest uppercase">
            Una persona por línea: nombre y correo
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={"Ana Pérez, ana@correo.com\nLuis Gómez, luis@correo.com"}
            className="bg-transparent border border-white/20 font-body text-white text-sm px-4 py-3 outline-none focus:border-neon transition-colors resize-y"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-body text-xs text-white/50 tracking-widest uppercase">Invitados por el corto (opcional)</span>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="bg-ink border border-white/20 font-body text-white text-sm px-3 py-3 outline-none focus:border-neon"
            >
              <option value="">Ninguno</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-body text-xs text-white/50 tracking-widest uppercase">Grupo (opcional)</span>
            <input
              type="text"
              value={group}
              maxLength={60}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Actores, Jurado, Aliados…"
              className="bg-transparent border border-white/20 font-body text-white text-sm px-4 py-3 outline-none focus:border-neon transition-colors"
            />
          </label>
        </div>

        {text.trim() && (
          <p className="font-body text-xs text-white/50">
            {parsed.guests.length} persona{parsed.guests.length === 1 ? "" : "s"} lista
            {parsed.guests.length === 1 ? "" : "s"} para agregar.
            {parsed.bad.length > 0 && (
              <span className="text-yellow-300">
                {" "}
                {parsed.bad.length} línea{parsed.bad.length === 1 ? "" : "s"} sin nombre o sin correo
                {parsed.bad.length === 1 ? " se ignorará" : " se ignorarán"}: {parsed.bad.slice(0, 3).join(" | ")}
                {parsed.bad.length > 3 ? "…" : ""}
              </span>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={adding || parsed.guests.length === 0}
          className="self-start font-body text-xs font-semibold tracking-widest uppercase px-6 py-3 bg-purple text-white hover:bg-neon hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adding ? "Agregando…" : "Agregar al bolsillo"}
        </button>

        {addError && <p className="font-body text-sm text-red-400">{addError}</p>}
        {added && (
          <div className="font-body text-sm">
            {added.created_count > 0 && (
              <p className="text-neon">
                {added.created_count} {added.created_count === 1 ? "persona agregada" : "personas agregadas"} (aún sin enviar).
              </p>
            )}
            {added.skipped.length > 0 && (
              <ul className="mt-2 text-yellow-300 text-xs flex flex-col gap-1">
                {added.skipped.map((s) => (
                  <li key={`${s.row}-${s.email}`}>
                    {s.name || s.email || "(vacía)"}: {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <p className="font-body text-sm text-white">
            En el bolsillo: {extras.length} · sin enviar: {pending.length}
          </p>
          {pending.length > 0 &&
            (confirmAll ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-body text-xs text-white/70">
                  Se enviarán {pending.length} correo{pending.length === 1 ? "" : "s"}. ¿Continuar?
                </span>
                <button
                  onClick={() => send("all")}
                  disabled={busy !== null}
                  className="font-body text-xs font-semibold tracking-widest uppercase px-4 py-2.5 bg-neon text-ink hover:bg-white transition-colors disabled:opacity-50"
                >
                  {busy === "all" ? "Enviando…" : "Sí, enviar"}
                </button>
                <button
                  onClick={() => setConfirmAll(false)}
                  disabled={busy !== null}
                  className="font-body text-xs tracking-widest uppercase px-4 py-2.5 border border-white/20 text-white/60 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAll(true)}
                disabled={busy !== null}
                className="font-body text-xs font-semibold tracking-widest uppercase px-5 py-3 bg-purple text-white hover:bg-neon hover:text-ink transition-colors disabled:opacity-50"
              >
                Enviar a los que faltan ({pending.length})
              </button>
            ))}
        </div>

        {loadError && <p className="font-body text-xs text-red-400">No pudimos cargar el bolsillo.</p>}
        {sendError && <p className="font-body text-xs text-red-400 mb-2">{sendError}</p>}
        {sendResult && (
          <div className="font-body text-sm mb-3">
            <p className="text-neon">
              {sendResult.sent_count} {sendResult.sent_count === 1 ? "invitación enviada" : "invitaciones enviadas"}.
            </p>
            {sendResult.failed_count > 0 && (
              <p className="text-red-400 mt-1">
                No se pudo enviar a: {sendResult.results.filter((r) => !r.sent).map((r) => r.name).join(", ")}.
                {sendResult.error && ` ${sendResult.error}`} Quedan pendientes; puedes reintentar.
              </p>
            )}
            {sendResult.stopped_by_quota && (
              <p className="text-yellow-300 mt-1">
                Se detuvo el envío porque Gmail alcanzó su límite diario. Los que faltan siguen pendientes:
                envíalos mañana.
              </p>
            )}
          </div>
        )}

        {extras.length === 0 && !loadError ? (
          <p className="font-body text-white/30 text-sm py-4">Todavía no hay invitados extra.</p>
        ) : (
          <ul className="divide-y divide-white/8 border-y border-white/8">
            {extras.map((x) => {
              const sent = Boolean(x.sent_at);
              const entered = x.used_capacity > 0;
              return (
                <li key={x.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-body text-white text-sm truncate">{x.guest_name}</p>
                    <p className="font-body text-white/40 text-xs truncate">
                      {x.guest_email}
                      {x.team && x.team !== "Invitado extra" && ` · ${x.team}`}
                    </p>
                    <p className="font-body text-xs mt-1 flex flex-wrap gap-x-3">
                      {sent && x.sent_at ? (
                        <span className="text-neon">✓ Enviada {fmt(x.sent_at)}</span>
                      ) : (
                        <span className="text-white/30">Sin enviar</span>
                      )}
                      {sent && (
                        <span className={x.rsvp_status === "CONFIRMED" ? "text-white" : "text-white/40"}>
                          {RSVP_LABEL[x.rsvp_status]}
                          {x.has_plus_one && ` · con ${x.plus_one_name || "acompañante"}`}
                        </span>
                      )}
                      {entered && <span className="text-neon">Ingresó ({x.used_capacity})</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => send(x.id)}
                      disabled={busy !== null}
                      className={`font-body text-xs font-semibold tracking-widest uppercase px-3 py-2 transition-colors disabled:opacity-50 ${
                        sent ? "border border-white/20 text-white/60 hover:text-white" : "bg-neon text-ink hover:bg-white"
                      }`}
                    >
                      {busy === x.id ? "…" : sent ? "Reenviar" : "Enviar"}
                    </button>
                    {confirmDelete === x.id ? (
                      <>
                        <button
                          onClick={() => remove(x.id)}
                          disabled={busy !== null}
                          className="font-body text-xs font-semibold tracking-widest uppercase px-3 py-2 bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          Sí, quitar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="font-body text-xs uppercase px-2 py-2 text-white/50 hover:text-white"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      !entered && (
                        <button
                          onClick={() => setConfirmDelete(x.id)}
                          disabled={busy !== null}
                          aria-label={`Quitar a ${x.guest_name}`}
                          className="font-body text-xs uppercase px-2 py-2 text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
