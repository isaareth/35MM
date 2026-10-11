"use client";

import { useState } from "react";
import {
  eventHeading,
  formatEventDate,
  formatEventTimes,
  type EventInfo,
} from "@/lib/events";

interface FormState {
  full_name: string;
  document_id: string;
  institution: string;
  email: string;
  phone: string;
}

const EMPTY: FormState = { full_name: "", document_id: "", institution: "", email: "", phone: "" };
const REQUIRED: (keyof FormState)[] = ["full_name", "document_id", "email", "phone"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "success" | "error";

export default function EventRegistrationForm({ event }: { event: EventInfo }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const date = formatEventDate(event.date);
  const times = formatEventTimes(event.start_time, event.end_time);
  const details = [
    date && { label: "Fecha", value: date },
    times && { label: "Hora", value: times },
    event.location && { label: "Lugar", value: event.location },
  ].filter(Boolean) as { label: string; value: string }[];

  const header = (
    <>
      <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">
        35mm Festival de Cortos · {event.speaker ? event.title : "Inscripción"}
      </p>
      <h1
        className="font-display font-black text-white uppercase leading-none mb-6"
        style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
      >
        {eventHeading(event)}
      </h1>
      {event.open_to_public && (
        <p className="inline-block font-body text-xs tracking-widest uppercase px-3 py-1.5 border border-neon/40 text-neon mb-6">
          Abierto al público
        </p>
      )}
      {details.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 border-y border-white/10 py-6">
          {details.map((d) => (
            <div key={d.label}>
              <dt className="font-body text-[10px] tracking-widest uppercase text-white/30 mb-1">
                {d.label}
              </dt>
              <dd className="font-body text-white text-sm">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {event.description && (
        <p className="font-body text-white/60 text-sm leading-relaxed mb-10 max-w-xl">
          {event.description}
        </p>
      )}
    </>
  );

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    REQUIRED.forEach((k) => {
      if (!form[k].trim()) errors[k] = "Requerido";
    });
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = "Correo inválido";
    if (!acceptedTerms) errors.terms = "Debes aceptar el tratamiento de datos personales";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!validate()) return;

    setStatus("submitting");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");

      const res = await fetch(
        `${apiUrl}/api/events/${encodeURIComponent(event.slug)}/registrations/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            document_id: form.document_id.trim(),
            institution: form.institution.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            accepted_terms: acceptedTerms,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.detail || Object.values(data).flat().join(" "))) ||
          "No pudimos procesar tu inscripción. Intenta de nuevo.";
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
          Quedaste
          <br />
          inscrito
        </h1>
        <p className="font-body text-white/60 text-base leading-relaxed">
          Te esperamos en «{event.speaker ? `${event.title} con ${event.speaker}` : event.title}».
        </p>
        {details.length > 0 && (
          <p className="font-body text-white/40 text-sm mt-2">
            {details.map((d) => d.value).join(" · ")}
          </p>
        )}
        <a
          href="/"
          className="inline-block mt-8 font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  if (!event.is_open) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6">
        {header}
        <p className="font-body text-sm text-white/70 border border-white/15 px-4 py-4">
          Las inscripciones para este evento ya cerraron.
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

  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto py-20 px-6" noValidate>
      {header}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Nombre completo" value={form.full_name} onChange={set("full_name")} error={fieldErrors.full_name} autoComplete="name" />
        <Field label="Documento de identidad" value={form.document_id} onChange={set("document_id")} error={fieldErrors.document_id} />
        <Field label="Institución o empresa (opcional)" value={form.institution} onChange={set("institution")} error={fieldErrors.institution} />
        <Field label="Correo electrónico" type="email" value={form.email} onChange={set("email")} error={fieldErrors.email} autoComplete="email" />
        <Field label="Celular" type="tel" value={form.phone} onChange={set("phone")} error={fieldErrors.phone} autoComplete="tel" />
      </div>

      <label className="flex items-start gap-3 cursor-pointer mt-10 border-t border-white/10 pt-8">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          aria-invalid={Boolean(fieldErrors.terms)}
          className="mt-1 accent-purple w-4 h-4"
        />
        <span className="font-body text-sm text-white/70">
          He leído y acepto la{" "}
          <a
            href="/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon underline hover:text-white transition-colors"
          >
            política de tratamiento de datos personales
          </a>
          .
          {fieldErrors.terms && (
            <span className="block text-xs text-red-400 mt-1">{fieldErrors.terms}</span>
          )}
        </span>
      </label>

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
        {status === "submitting" ? "Enviando…" : "Inscribirme →"}
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
