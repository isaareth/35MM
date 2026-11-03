"use client";

import { use, useEffect, useState } from "react";
import { GALA_INFO, RSVP_LABEL, type GuestInvitation } from "@/lib/gala";

type Load = "loading" | "notfound" | "error" | "ready";
type PlusErrors = Partial<Record<"name" | "email" | "phone", string>>;

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^[0-9 +\-()]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [load, setLoad] = useState<Load>("loading");
  const [invitation, setInvitation] = useState<GuestInvitation | null>(null);

  const [attending, setAttending] = useState<boolean | null>(null);
  const [plusOne, setPlusOne] = useState(false);
  const [plusName, setPlusName] = useState("");
  const [plusEmail, setPlusEmail] = useState("");
  const [plusPhone, setPlusPhone] = useState("");
  const [plusErrors, setPlusErrors] = useState<PlusErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const adopt = (data: GuestInvitation) => {
    setInvitation(data);
    setAttending(data.rsvp_status === "PENDING" ? null : data.rsvp_status === "CONFIRMED");
    setPlusOne(data.has_plus_one);
    setPlusName(data.plus_one_name);
    setPlusEmail(data.plus_one_email);
    setPlusPhone(data.plus_one_phone);
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

  const validatePlusOne = (): boolean => {
    const errors: PlusErrors = {};
    if (!plusName.trim()) errors.name = "Escribe el nombre de tu acompañante.";
    if (!plusEmail.trim()) errors.email = "Escribe el correo de tu acompañante.";
    else if (!EMAIL_RE.test(plusEmail.trim())) errors.email = "Revisa el correo: no parece válido.";
    if (!plusPhone.trim()) errors.phone = "Escribe el celular de tu acompañante.";
    else if (!validPhone(plusPhone.trim())) errors.phone = "Revisa el celular: usa solo números (7 a 15 dígitos).";
    setPlusErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (attending === null) {
      setMessage({ ok: false, text: "Indica si asistirás o no." });
      return;
    }
    if (attending && plusOne && !validatePlusOne()) {
      setMessage({ ok: false, text: "Completa los datos de tu acompañante para continuar." });
      return;
    }
    setPlusErrors({});

    setSaving(true);
    try {
      const withPlusOne = attending && plusOne;
      const res = await fetch(`${apiBase()}/api/gala/invitations/${encodeURIComponent(token)}/rsvp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attending,
          has_plus_one: withPlusOne,
          plus_one_name: plusName,
          plus_one_email: plusEmail,
          plus_one_phone: plusPhone,
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
              plus_one_email: withPlusOne ? plusEmail.trim() : "",
              plus_one_phone: withPlusOne ? plusPhone.trim() : "",
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
          Esta invitación ya no está vigente.
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
              acompañante.
            </p>
          </section>

          <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
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
                    className={`flex items-center gap-3 border px-5 py-5 cursor-pointer font-body text-base transition-colors ${
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
                      className="accent-purple w-5 h-5"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {attending && (
              <div className="flex flex-col gap-5">
                <label
                  className={`flex items-center gap-4 border px-5 py-5 cursor-pointer font-body text-base transition-colors ${
                    plusOne ? "border-neon text-white bg-neon/5" : "border-white/15 text-white/70 hover:border-white/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={plusOne}
                    onChange={(e) => setPlusOne(e.target.checked)}
                    className="accent-purple w-5 h-5"
                  />
                  Iré con un acompañante
                </label>

                {plusOne && (
                  <fieldset className="border border-neon/30 bg-white/[0.03] p-6 md:p-8 flex flex-col gap-7">
                    <legend className="font-display font-black text-white text-xl md:text-2xl uppercase px-2">
                      Datos de tu acompañante
                    </legend>
                    <BigField
                      label="Nombre completo"
                      value={plusName}
                      onChange={setPlusName}
                      error={plusErrors.name}
                      autoComplete="off"
                      placeholder="Nombre y apellido"
                    />
                    <BigField
                      label="Correo electrónico"
                      type="email"
                      value={plusEmail}
                      onChange={setPlusEmail}
                      error={plusErrors.email}
                      autoComplete="off"
                      placeholder="correo@ejemplo.com"
                    />
                    <BigField
                      label="Celular"
                      type="tel"
                      value={plusPhone}
                      onChange={setPlusPhone}
                      error={plusErrors.phone}
                      autoComplete="off"
                      placeholder="300 123 4567"
                    />
                  </fieldset>
                )}
              </div>
            )}

            {message && (
              <p
                role="status"
                className={`font-body text-base px-5 py-4 border ${
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
              className="self-start font-body font-semibold text-sm tracking-widest uppercase px-10 py-5 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300 disabled:opacity-50"
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

function BigField({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="font-body text-sm md:text-base text-white tracking-widest uppercase">
        {label} <span className="text-neon text-xs normal-case tracking-normal">· obligatorio</span>
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`w-full bg-white/5 border px-5 py-4 md:py-5 font-body text-lg md:text-xl text-white placeholder:text-white/25 outline-none transition-colors focus:border-neon ${
          error ? "border-red-400" : "border-white/25"
        }`}
      />
      {error && <span className="font-body text-sm md:text-base text-red-300">{error}</span>}
    </label>
  );
}
