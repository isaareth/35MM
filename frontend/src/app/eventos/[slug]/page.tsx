import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventRegistrationForm from "@/components/EventRegistrationForm";
import { eventHeading, fetchEvent } from "@/lib/events";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) return { title: "Evento — 35mm Festival de Cortos" };
  return {
    title: `${event.title}: ${eventHeading(event)} — 35mm Festival de Cortos`,
    description: `Inscríbete a ${event.title.toLowerCase()} con ${event.speaker || "35mm"} en el 35mm Festival de Cortos.`,
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) notFound();

  return (
    <div className="bg-ink min-h-screen">
      <EventRegistrationForm event={event} />
    </div>
  );
}
