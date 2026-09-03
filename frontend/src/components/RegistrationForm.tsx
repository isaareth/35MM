"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MIN_PARTICIPANTS = 4;
const MAX_PARTICIPANTS = 6;

interface ParticipantForm {
  full_name: string;
  document_id: string;
  institution: string;
  institutional_email: string;
  phone: string;
}

const emptyParticipant = (): ParticipantForm => ({
  full_name: "",
  document_id: "",
  institution: "",
  institutional_email: "",
  phone: "",
});

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistrationForm() {
  const [count, setCount] = useState(MIN_PARTICIPANTS);
  const [participants, setParticipants] = useState<ParticipantForm[]>(
    Array.from({ length: MAX_PARTICIPANTS }, emptyParticipant)
  );
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedEligibility, setConfirmedEligibility] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateParticipant = (index: number, field: keyof ParticipantForm, value: string) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const p = participants[i];
      const prefix = `p${i}`;
      if (!p.full_name.trim()) errors[`${prefix}.full_name`] = "Requerido";
      if (!p.document_id.trim()) errors[`${prefix}.document_id`] = "Requerido";
      if (!p.institution.trim()) errors[`${prefix}.institution`] = "Requerido";
      if (!p.institutional_email.trim()) {
        errors[`${prefix}.institutional_email`] = "Requerido";
      } else if (!EMAIL_RE.test(p.institutional_email.trim())) {
        errors[`${prefix}.institutional_email`] = "Correo inválido";
      }
      if (!p.phone.trim()) errors[`${prefix}.phone`] = "Requerido";
    }
    if (!acceptedTerms) errors.terms = "Debes aceptar los términos y condiciones";
    if (!confirmedEligibility) errors.eligibility = "Debes confirmar este requisito";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setStatus("submitting");

    const payload = {
      accepted_terms: acceptedTerms,
      confirmed_eligibility: confirmedEligibility,
      participants: participants.slice(0, count).map((p, i) => ({
        position: i + 1,
        is_leader: i === 0,
        full_name: p.full_name.trim(),
        document_id: p.document_id.trim(),
        institution: p.institution.trim(),
        institutional_email: p.institutional_email.trim(),
        phone: p.phone.trim(),
      })),
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");

      const res = await fetch(`${apiUrl}/api/registrations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.detail || Object.values(data).flat().join(" "))) ||
          "No pudimos procesar la inscripción. Intenta de nuevo.";
        setErrorMessage(String(message));
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-6">
        <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">
          Inscripción recibida
        </p>
        <h1
          className="font-display font-black text-white uppercase leading-none mb-6"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
        >
          Tu equipo
          <br />
          está inscrito
        </h1>
        <p className="font-body text-white/60 text-base leading-relaxed mb-2">
          Enviamos un correo de confirmación al representante del grupo con los próximos pasos.
        </p>
        <a
          href="/"
          className="inline-block mt-8 font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto py-20 px-6" noValidate>
      <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">3ra Edición · 2026</p>
      <h1
        className="font-display font-black text-white uppercase leading-none mb-4"
        style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
      >
        Inscribe
        <br />
        tu equipo
      </h1>
      <p className="font-body text-white/50 text-sm mb-12 max-w-xl">
        Entre {MIN_PARTICIPANTS} y {MAX_PARTICIPANTS} integrantes por equipo. El primer integrante
        es el representante del grupo — a su correo llegará la confirmación.
      </p>

      <div className="flex flex-col gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <fieldset
            key={i}
            className="border border-white/10 p-6 md:p-8"
          >
            <legend className="font-display font-bold text-white text-lg uppercase px-2">
              Participante {i + 1}
              {i === 0 && <span className="text-neon"> · Representante del grupo</span>}
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <Field
                label="Nombre completo"
                value={participants[i].full_name}
                onChange={(v) => updateParticipant(i, "full_name", v)}
                error={fieldErrors[`p${i}.full_name`]}
                autoComplete="name"
              />
              <Field
                label="Documento de identidad"
                value={participants[i].document_id}
                onChange={(v) => updateParticipant(i, "document_id", v)}
                error={fieldErrors[`p${i}.document_id`]}
              />
              <Field
                label="Institución de educación superior"
                value={participants[i].institution}
                onChange={(v) => updateParticipant(i, "institution", v)}
                error={fieldErrors[`p${i}.institution`]}
              />
              <Field
                label="Correo institucional"
                type="email"
                value={participants[i].institutional_email}
                onChange={(v) => updateParticipant(i, "institutional_email", v)}
                error={fieldErrors[`p${i}.institutional_email`]}
                autoComplete="email"
              />
              <Field
                label="Celular"
                type="tel"
                value={participants[i].phone}
                onChange={(v) => updateParticipant(i, "phone", v)}
                error={fieldErrors[`p${i}.phone`]}
                autoComplete="tel"
              />
            </div>
          </fieldset>
        ))}
      </div>

      <AnimatePresence>
        {count < MAX_PARTICIPANTS && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCount((c) => Math.min(c + 1, MAX_PARTICIPANTS))}
            className="mt-6 font-body text-sm tracking-widest uppercase px-6 py-3 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
          >
            + Agregar integrante {count + 1}
          </motion.button>
        )}
      </AnimatePresence>

      <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8">
        <Checkbox
          checked={acceptedTerms}
          onChange={setAcceptedTerms}
          error={fieldErrors.terms}
          label={
            <>
              He leído y acepto los{" "}
              <a
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-neon underline hover:text-white transition-colors"
              >
                términos y condiciones
              </a>{" "}
              de la inscripción.
            </>
          }
        />
        <Checkbox
          checked={confirmedEligibility}
          onChange={setConfirmedEligibility}
          error={fieldErrors.eligibility}
          label="Confirmo que todos los integrantes del equipo están cursando un programa en una institución de educación superior del Valle de Aburrá."
        />
      </div>

      {status === "error" && errorMessage && (
        <p role="alert" className="mt-6 font-body text-sm text-red-400 border border-red-400/30 bg-red-400/10 px-4 py-3">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-8 w-full md:w-auto font-body font-semibold text-sm tracking-widest uppercase px-10 py-5 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Enviando…" : "Enviar inscripción →"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
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
        aria-invalid={Boolean(error)}
        className={`bg-transparent border-b font-body text-white text-sm py-2 outline-none transition-colors focus:border-neon ${
          error ? "border-red-400" : "border-white/20"
        }`}
      />
      {error && <span className="font-body text-xs text-red-400">{error}</span>}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={Boolean(error)}
        className="mt-1 accent-purple w-4 h-4"
      />
      <span className="font-body text-sm text-white/70">
        {label}
        {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
      </span>
    </label>
  );
}
