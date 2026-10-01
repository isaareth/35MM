import type { Metadata } from "next";
import RegistrationForm from "@/components/RegistrationForm";

export const metadata: Metadata = {
  title: "Inscripción — 35mm Festival de Cortos",
  description: "Inscribe a tu equipo para la 3ra edición del 35mm Festival de Cortos.",
};

async function registrationsAreOpen(): Promise<boolean> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return true;
  try {
    const res = await fetch(`${apiUrl}/api/registrations/status/`, { cache: "no-store" });
    if (!res.ok) return true;
    const data = await res.json();
    return Boolean(data.open);
  } catch {
    return true;
  }
}

export default async function InscripcionPage() {
  const open = await registrationsAreOpen();

  return (
    <div className="bg-ink min-h-screen">
      {open ? <RegistrationForm /> : <RegistrationsClosed />}
    </div>
  );
}

function RegistrationsClosed() {
  return (
    <div className="max-w-2xl mx-auto text-center py-28 px-6">
      <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">
        3ra Edición · 2026
      </p>
      <h1
        className="font-display font-black text-white uppercase leading-none mb-6"
        style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
      >
        Inscripciones
        <br />
        cerradas
      </h1>
      <p className="font-body text-white/60 text-base leading-relaxed mb-2 max-w-md mx-auto">
        Ya cerramos el período de inscripción para esta edición de 35mm. Gracias a todos los
        equipos que se inscribieron — ¡nos vemos en la gala de premiación!
      </p>
      <p className="font-body text-white/60 text-base leading-relaxed mt-4 max-w-md mx-auto">
        Te esperamos en la próxima edición del festival.
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
