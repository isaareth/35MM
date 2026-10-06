import type { Metadata } from "next";
import TalkRegistrationForm from "@/components/TalkRegistrationForm";

export const metadata: Metadata = {
  title: "Charla con Yesenia Valencia — 35mm Festival de Cortos",
  description: "Inscríbete a la charla con Yesenia Valencia del 35mm Festival de Cortos.",
};

export default function CharlaPage() {
  return (
    <div className="bg-ink min-h-screen">
      <TalkRegistrationForm />
    </div>
  );
}
