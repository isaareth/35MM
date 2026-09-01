import type { Metadata } from "next";
import AliadosContent from "@/components/AliadosContent";

export const metadata: Metadata = {
  title: "Sé aliado de 35mm — Festival de Cortos",
  description:
    "Conecta tu marca con el talento creativo universitario del Valle de Aburrá a través del 35mm Festival de Cortos.",
};

export default function AliadosPage() {
  return (
    <div className="bg-ink min-h-screen">
      <AliadosContent />
    </div>
  );
}
