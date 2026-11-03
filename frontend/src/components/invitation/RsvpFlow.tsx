"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "@/components/invitation/Confetti";
import type { GuestInvitation } from "@/lib/gala";

type Step = "attend" | "companion" | "details" | "done";
type PlusErrors = Partial<Record<"name" | "email" | "phone", string>>;

const STEP_NUMBER: Record<Exclude<Step, "done">, number> = { attend: 1, companion: 2, details: 3 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^[0-9 +\-()]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

/** Guided RSVP: one question per screen, then a summary the guest can change. */
export default function RsvpFlow({
  token,
  apiBase,
  invitation,
  onSaved,
}: {
  token: string;
  apiBase: string;
  invitation: GuestInvitation;
  onSaved: (next: GuestInvitation) => void;
}) {
  const [step, setStep] = useState<Step>(invitation.rsvp_status === "PENDING" ? "attend" : "done");
  const [plusName, setPlusName] = useState(invitation.plus_one_name);
  const [plusEmail, setPlusEmail] = useState(invitation.plus_one_email);
  const [plusPhone, setPlusPhone] = useState(invitation.plus_one_phone);
  const [errors, setErrors] = useState<PlusErrors>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  // Each step's heading takes focus when it appears (so screen readers announce
  // the new question), but not on first load, which would scroll the page.
  // AnimatePresence keeps the old step mounted while it fades out, so the
  // focus has to happen when the new heading mounts, not when `step` changes.
  const interacted = useRef(false);
  const focusHeading = useCallback((el: HTMLHeadingElement | null) => {
    if (el && interacted.current) el.focus();
  }, []);
  const go = (next: Step) => {
    interacted.current = true;
    setStep(next);
  };

  const save = async (attending: boolean, withPlusOne: boolean) => {
    setSaving(true);
    setProblem(null);
    try {
      const res = await fetch(`${apiBase}/api/gala/invitations/${encodeURIComponent(token)}/rsvp/`, {
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
        setProblem(data?.message || "No pudimos guardar tu respuesta. Intenta de nuevo.");
        return;
      }
      onSaved({
        ...invitation,
        rsvp_status: data.rsvp_status,
        has_plus_one: data.has_plus_one,
        plus_one_name: data.plus_one_name,
        plus_one_email: withPlusOne ? plusEmail.trim() : "",
        plus_one_phone: withPlusOne ? plusPhone.trim() : "",
      });
      setCelebrate(attending);
      go("done");
    } catch {
      setProblem("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const confirmWithPlusOne = () => {
    const next: PlusErrors = {};
    if (!plusName.trim()) next.name = "Escribe el nombre de tu acompañante.";
    if (!plusEmail.trim()) next.email = "Escribe el correo de tu acompañante.";
    else if (!EMAIL_RE.test(plusEmail.trim())) next.email = "Revisa el correo: no parece válido.";
    if (!plusPhone.trim()) next.phone = "Escribe el celular de tu acompañante.";
    else if (!validPhone(plusPhone.trim())) next.phone = "Revisa el celular: usa solo números (7 a 15 dígitos).";
    setErrors(next);
    if (Object.keys(next).length === 0) save(true, true);
  };

  const confirmed = invitation.rsvp_status === "CONFIRMED";
  const firstName = invitation.guest_name.split(" ")[0];

  return (
    <section aria-label="Confirma tu asistencia" className="border border-white/10 p-6 md:p-8">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      {step !== "done" && (
        <div className="flex items-center gap-3 mb-6" aria-label={`Paso ${STEP_NUMBER[step]} de 3`}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              aria-hidden
              className={`h-1 flex-1 transition-colors duration-500 ${
                n <= STEP_NUMBER[step] ? "bg-neon" : "bg-white/15"
              }`}
            />
          ))}
          <span className="font-body text-xs tracking-widest uppercase text-white/40 whitespace-nowrap">
            Paso {STEP_NUMBER[step]} de 3
          </span>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {step === "attend" && (
            <>
              <Heading ref={focusHeading}>¿Nos acompañas en la gala?</Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <Choice
                  title="Sí, ahí estaré"
                  hint="Confirmo mi asistencia"
                  onClick={() => go("companion")}
                  disabled={saving}
                  accent
                />
                <Choice
                  title="No podré asistir"
                  hint="Avisar que no iré"
                  onClick={() => save(false, false)}
                  disabled={saving}
                />
              </div>
            </>
          )}

          {step === "companion" && (
            <>
              <Heading ref={focusHeading}>¿Vienes con alguien?</Heading>
              <p className="font-body text-white/50 text-sm mt-2">Tu invitación sirve para ti y un acompañante.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <Choice
                  title="Voy solo/a"
                  hint="Confirmar sin acompañante"
                  onClick={() => save(true, false)}
                  disabled={saving}
                />
                <Choice
                  title="Voy con acompañante"
                  hint="Te pediremos sus datos"
                  onClick={() => go("details")}
                  disabled={saving}
                  accent
                />
              </div>
              <BackButton onClick={() => go("attend")} />
            </>
          )}

          {step === "details" && (
            <>
              <Heading ref={focusHeading}>Datos de tu acompañante</Heading>
              <div className="flex flex-col gap-7 mt-6">
                <BigField
                  label="Nombre completo"
                  value={plusName}
                  onChange={setPlusName}
                  error={errors.name}
                  placeholder="Nombre y apellido"
                />
                <BigField
                  label="Correo electrónico"
                  type="email"
                  value={plusEmail}
                  onChange={setPlusEmail}
                  error={errors.email}
                  placeholder="correo@ejemplo.com"
                />
                <BigField
                  label="Celular"
                  type="tel"
                  value={plusPhone}
                  onChange={setPlusPhone}
                  error={errors.phone}
                  placeholder="300 123 4567"
                />
              </div>
              <button
                type="button"
                onClick={confirmWithPlusOne}
                disabled={saving}
                className="mt-8 w-full sm:w-auto font-body font-semibold text-sm tracking-widest uppercase px-10 py-5 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Confirmar asistencia"}
              </button>
              <BackButton onClick={() => go("companion")} />
            </>
          )}

          {step === "done" && (
            <div>
              <Heading ref={focusHeading}>
                {confirmed ? `¡Nos vemos en la gala, ${firstName}!` : "Gracias por avisarnos"}
              </Heading>
              <p className="font-body text-white/60 text-base mt-3">
                {confirmed
                  ? "Tu asistencia quedó confirmada."
                  : "Registramos que no podrás asistir. Si cambias de opinión, puedes actualizar tu respuesta cuando quieras."}
              </p>

              {confirmed && (
                <dl className="mt-6 border-y border-white/10 divide-y divide-white/10">
                  <Row label="Asistes" value="Sí" />
                  <Row
                    label="Acompañante"
                    value={
                      invitation.has_plus_one
                        ? [invitation.plus_one_name, invitation.plus_one_email, invitation.plus_one_phone]
                            .filter(Boolean)
                            .join(" · ")
                        : "Voy solo/a"
                    }
                  />
                </dl>
              )}

              <button
                type="button"
                onClick={() => {
                  setProblem(null);
                  go("attend");
                }}
                className="mt-6 font-body text-xs tracking-widest uppercase text-white/55 hover:text-neon underline underline-offset-4 transition-colors"
              >
                Cambiar mi respuesta
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite">
        {problem && (
          <p className="font-body text-base text-red-300 border border-red-400/30 bg-red-400/10 px-5 py-4 mt-6">
            {problem}
          </p>
        )}
      </div>
    </section>
  );
}

function Heading({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLHeadingElement> }) {
  return (
    <h2
      ref={ref}
      tabIndex={-1}
      className="font-display font-black text-white text-2xl md:text-3xl uppercase leading-tight outline-none"
    >
      {children}
    </h2>
  );
}

function Choice({
  title,
  hint,
  onClick,
  disabled,
  accent,
}: {
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group text-left border px-6 py-6 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] ${
        accent
          ? "border-neon/50 bg-neon/5 hover:bg-neon hover:text-ink"
          : "border-white/20 hover:border-white/50 hover:bg-white/5"
      }`}
    >
      <span className="block font-display font-black uppercase text-xl md:text-2xl leading-none">{title}</span>
      <span
        className={`block font-body text-sm mt-2 ${
          accent ? "text-white/60 group-hover:text-ink/70" : "text-white/45"
        }`}
      >
        {hint}
      </span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block mt-6 font-body text-xs tracking-widest uppercase text-white/45 hover:text-white transition-colors"
    >
      ← Atrás
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 flex justify-between gap-6">
      <dt className="font-body text-xs tracking-widest uppercase text-white/40 flex-shrink-0">{label}</dt>
      <dd className="font-body text-white text-sm text-right break-words min-w-0">{value}</dd>
    </div>
  );
}

function BigField({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
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
        autoComplete="off"
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
