import type { Metadata } from "next";
import RegistrationForm from "@/components/RegistrationForm";

export const metadata: Metadata = {
  title: "Inscripción — 35mm Festival de Cortos",
  description: "Inscribe a tu equipo para la 3ra edición del 35mm Festival de Cortos.",
};

export default function InscripcionPage() {
  return (
    <div className="bg-ink min-h-screen">
      <RegistrationForm />
    </div>
  );
}
