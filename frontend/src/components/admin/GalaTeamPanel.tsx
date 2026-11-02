"use client";

import { useState } from "react";
import { adminFetch, type Participant, type RegistrationRecord } from "@/lib/adminApi";
import { RSVP_LABEL, type SendGalaResult } from "@/lib/gala";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** Sends each member of a team their own QR invitation and shows where each one stands. */
export default function GalaTeamPanel({
  registration,
  onChanged,
}: {
  registration: RegistrationRecord;
  onChanged: () => void | Promise<void>;
}) {
  const members = registration.participants.slice().sort((a, b) => a.position - b.position);
  const pending = members.filter((m) => !m.gala?.sent_at);

  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [result, setResult] = useState<SendGalaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (target: number | "all") => {
    setBusy(target);
    setError(null);
    setResult(null);
    try {
      const res = await adminFetch(`/api/admin/registrations/${registration.id}/gala-invitations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target === "all" ? {} : { participant_id: target }),
      });
      if (!res.ok) throw new Error("send failed");
      setResult(await res.json());
      await onChanged();
    } catch {
      setError("No pudimos enviar las invitaciones. Intenta de nuevo.");
    } finally {
      setBusy(null);
      setConfirmAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-white/8 border-y border-white/8">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} busy={busy === m.id || busy === "all"} onSend={() => send(m.id)} />
        ))}
      </ul>

      {pending.length > 0 &&
        (confirmAll ? (
          <div className="border border-neon/30 bg-neon/5 p-4 flex flex-col gap-3">
            <p className="font-body text-sm text-white">
              Se enviará un correo con su QR personal a {pending.length} integrante
              {pending.length === 1 ? "" : "s"}. ¿Continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => send("all")}
                disabled={busy !== null}
                className="font-body text-xs font-semibold tracking-widest uppercase px-5 py-2.5 bg-neon text-ink hover:bg-white transition-colors disabled:opacity-50"
              >
                {busy === "all" ? "Enviando…" : "Sí, enviar"}
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                disabled={busy !== null}
                className="font-body text-xs tracking-widest uppercase px-5 py-2.5 border border-white/20 text-white/60 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmAll(true)}
            disabled={busy !== null}
            className="self-start font-body text-xs font-semibold tracking-widest uppercase px-5 py-3 bg-purple text-white hover:bg-neon hover:text-ink transition-colors disabled:opacity-50"
          >
            Enviar a los que faltan ({pending.length})
          </button>
        ))}

      {error && <p className="font-body text-xs text-red-400">{error}</p>}
      {result && (
        <div className="font-body text-sm">
          <p className="text-neon">
            {result.sent_count} {result.sent_count === 1 ? "invitación enviada" : "invitaciones enviadas"}.
          </p>
          {result.failed_count > 0 && (
            <p className="text-red-400 mt-1">
              No se pudo enviar a: {result.results.filter((r) => !r.sent).map((r) => r.name).join(", ")}.
              Quedan pendientes; puedes reintentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  busy,
  onSend,
}: {
  member: Participant;
  busy: boolean;
  onSend: () => void;
}) {
  const gala = member.gala;
  const sent = Boolean(gala?.sent_at);
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-body text-white text-sm truncate">
          {member.full_name}
          {member.is_leader && <span className="text-neon text-xs"> · líder</span>}
        </p>
        <p className="font-body text-white/40 text-xs truncate">{member.institutional_email}</p>
        <p className="font-body text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {sent && gala?.sent_at ? (
            <span className="text-neon">✓ Enviada {formatDate(gala.sent_at)}</span>
          ) : (
            <span className="text-white/30">Sin enviar</span>
          )}
          {sent && gala && (
            <span className={gala.rsvp_status === "CONFIRMED" ? "text-white" : "text-white/40"}>
              {RSVP_LABEL[gala.rsvp_status]}
              {gala.has_plus_one && ` · con ${gala.plus_one_name || "acompañante"}`}
            </span>
          )}
          {gala && gala.used_capacity > 0 && (
            <span className="text-neon">Ingresó ({gala.used_capacity})</span>
          )}
        </p>
      </div>
      <button
        onClick={onSend}
        disabled={busy}
        className={`flex-shrink-0 font-body text-xs font-semibold tracking-widest uppercase px-4 py-2.5 transition-colors disabled:opacity-50 ${
          sent
            ? "border border-white/20 text-white/60 hover:text-white"
            : "bg-neon text-ink hover:bg-white"
        }`}
      >
        {busy ? "…" : sent ? "Reenviar" : "Enviar"}
      </button>
    </li>
  );
}
