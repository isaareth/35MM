"use client";

import { use, useEffect, useState } from "react";
import { GALA_INFO, RSVP_LABEL, type GuestInvitation } from "@/lib/gala";

type Load = "loading" | "notfound" | "error" | "ready";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? "";

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [load, setLoad] = useState<Load>("loading");
  const [invitation, setInvitation] = useState<GuestInvitation | null>(null);

  const [attending, setAttending] = useState<boolean | null>(null);
  const [plusOne, setPlusOne] = useState(false);
  const [plusName, setPlusName] = useState("");
  const [plusEmail, setPlusEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const adopt = (data: GuestInvitation) => {
    setInvitation(data);
    setAttending(data.rsvp_status === "PENDING" ? null : data.rsvp_status === "CONFIRMED");
    setPlusOne(data.has_plus_one);
    setPlusName(data.plus_one_name);
    setPlusEmail(data.plus_one_email);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase()}/api/gala/invitations/${encodeURIComponent(token)}/`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setLoad("notfound");
        if (!res.ok) return setLoad("error");
        adopt(await res.json());
        setLoad("ready");
      })
      .catch(() => !cancelled && setLoad("error"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attending === null) {
      setMessage({ ok: false, text: "Indica si asistirás o no." });
      return;
    }
    if (attending && plusOne && !plusName.trim()) {
      setMessage({ ok: false, text: "Escribe el nombre de tu acompañante." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase()}/api/gala/invitations/${encodeURIComponent(token)}/rsvp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attending,
          has_plus_one: attending && plusOne,
          plus_one_name: plusName,
          plus_one_email: plusEmail,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.message || "No pudimos guardar tu respuesta. Intenta de nuevo." });
        return;
      }
      setInvitation((prev) =>
        prev
          ? {
              ...prev,
              rsvp_status: data.rsvp_status,
              has_plus_one: data.has_plus_one,
              plus_one_name: data.plus_one_name,
              plus_one_email: plusOne && attending ? plusEmail : "",
            }
          : prev
      );
      setMessage({ ok: true, text: attending ? "¡Listo! Confirmamos tu asistencia." : "Gracias por avisarnos." });
    } catch {
      setMessage({ ok: false, text: "No pudimos conectar con el servidor. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  if (load === "loading") {
    return (
      <Shell>
        <p className="font-body text-white/40 text-sm tracking-widest uppercase text-center py-24">Cargando…</p>
      </Shell>
    );
  }

  if (load !== "ready" || !invitation) {
    return (
      <Shell>
        <div className="text-center py-24">
          <h1 className="font-display font-black text-white text-3xl uppercase mb-4">
            {load === "notfound" ? "Invitación no encontrada" : "No pudimos cargar tu invitación"}
          </h1>
          <p className="font-body text-white/50 text-sm">
            {load === "notfound"
              ? "Revisa que estés usando el enlace o el QR que te enviamos por correo."
              : "Intenta de nuevo en unos minutos."}
          </p>
        </div>
      </Shell>
    );
  }

  const until = new Date(invitation.expires_at).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Shell>
      <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-3">35mm Festival de Cortos</p>
      <h1
        className="font-display font-black text-white uppercase leading-none mb-2"
        style={{ fontSize: "clamp(2.2rem, 8vw, 4rem)" }}
      >
        Gala de premiación
      </h1>
      <p className="font-body text-white/70 text-base mb-6">Hola, {invitation.guest_name}.</p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-white/10 py-5 mb-8">
        <div>
          <dt className="font-body text-[10px] tracking-widest uppercase text-white/30 mb-1">Fecha</dt>
          <dd className="font-body text-white text-sm">{GALA_INFO.date}</dd>
        </div>
        <div>
          <dt className="font-body text-[10px] tracking-widest uppercase text-white/30 mb-1">Lugar</dt>
          <dd className="font-body text-white text-sm">{GALA_INFO.place}</dd>
        </div>
      </dl>

      {invitation.expired ? (
        <p className="font-body text-sm text-red-300 border border-red-400/30 bg-red-400/10 px-4 py-4">
          Esta invitación venció el {until}.
        </p>
      ) : (
        <>
          <section className="mb-10">
            <p className="font-body text-xs tracking-widest uppercase text-white/40 mb-3">Tu entrada</p>
            <div className="bg-white p-4 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${apiBase()}${invitation.qr_path}`}
                alt="Código QR de tu invitación"
                width={240}
                height={240}
                className="block w-60 h-60"
              />
            </div>
            <p className="font-body text-white/50 text-sm mt-3 max-w-sm">
              Muéstralo en la puerta desde el celular o impreso. Sirve para ingresar tú y, si quieres, un
              acompañante. Válido hasta el {until}.
            </p>
          </section>

          <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
            <div>
              <p className="font-body text-xs tracking-widest uppercase text-white/40 mb-3">
                ¿Asistirás?
                {invitation.rsvp_status !== "PENDING" && (
                  <span className="text-neon normal-case tracking-normal">
                    {" "}
                    · Tu respuesta actual: {RSVP_LABEL[invitation.rsvp_status]}
                  </span>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {(
                  [
                    [true, "Sí, asistiré"],
                    [false, "No podré asistir"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={label}
                    className={`flex items-center gap-3 border px-4 py-4 cursor-pointer font-body text-sm transition-colors ${
                      attending === value
                        ? "border-neon text-white bg-neon/5"
                        : "border-white/15 text-white/60 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="attending"
                      checked={attending === value}
                      onChange={() => setAttending(value)}
                      className="accent-purple w-4 h-4"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {attending && (
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plusOne}
                    onChange={(e) => setPlusOne(e.target.checked)}
                    className="accent-purple w-4 h-4"
                  />
                  <span className="font-body text-sm text-white/80">Iré con un acompañante</span>
                </label>
                {plusOne && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Nombre de tu acompañante" value={plusName} onChange={setPlusName} autoComplete="off" />
                    <Field
                      label="Correo de tu acompañante (opcional)"
                      type="email"
                      value={plusEmail}
                      onChange={setPlusEmail}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>
            )}

            {message && (
              <p
                role="status"
                className={`font-body text-sm px-4 py-3 border ${
                  message.ok
                    ? "text-neon border-neon/30 bg-neon/5"
                    : "text-red-300 border-red-400/30 bg-red-400/10"
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="self-start font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300 disabled:opacity-50"
            >
              {saving ? "Guardando…" : invitation.rsvp_status === "PENDING" ? "Enviar respuesta" : "Actualizar respuesta"}
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ink min-h-screen">
      <div className="max-w-2xl mx-auto py-14 px-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-xs text-white/40 tracking-widest uppercase">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-b border-white/20 font-body text-white text-sm py-2 outline-none transition-colors focus:border-neon"
      />
    </label>
  );
}
