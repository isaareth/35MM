"use client";

import { useState } from "react";
import { GALA_MAPS_URL, buildIcs, googleCalendarUrl } from "@/lib/gala";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const tile =
  "border border-white/15 px-4 py-4 text-left hover:border-neon hover:bg-white/[0.04] transition-colors flex flex-col gap-1";

/** Useful things to do with the invitation: put it in a calendar, get directions, keep the QR. */
export default function GalaActions({ qrSrc }: { qrSrc: string }) {
  const [qrState, setQrState] = useState<"idle" | "saving" | "error">("idle");

  const pageUrl = () => window.location.href.split("#")[0];

  const saveQr = async () => {
    setQrState("saving");
    try {
      const res = await fetch(qrSrc);
      if (!res.ok) throw new Error("download failed");
      saveBlob(await res.blob(), "invitacion-35mm-qr.png");
      setQrState("idle");
    } catch {
      setQrState("error");
      window.open(qrSrc, "_blank", "noopener");
    }
  };

  return (
    <section aria-label="Guarda tu invitación" className="grid grid-cols-2 gap-3">
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.open(googleCalendarUrl(pageUrl()), "_blank", "noopener");
        }}
        className={tile}
      >
        <span className="font-body text-sm font-semibold text-white">Google Calendar</span>
        <span className="font-body text-xs text-white/45">Añadir a mi calendario</span>
      </a>

      <button
        type="button"
        onClick={() =>
          saveBlob(new Blob([buildIcs(pageUrl())], { type: "text/calendar;charset=utf-8" }), "gala-35mm.ics")
        }
        className={tile}
      >
        <span className="font-body text-sm font-semibold text-white">Apple / Outlook</span>
        <span className="font-body text-xs text-white/45">Descargar archivo .ics</span>
      </button>

      <a href={GALA_MAPS_URL} target="_blank" rel="noopener noreferrer" className={tile}>
        <span className="font-body text-sm font-semibold text-white">Cómo llegar</span>
        <span className="font-body text-xs text-white/45">Abrir en Google Maps</span>
      </a>

      <button type="button" onClick={saveQr} disabled={qrState === "saving"} className={tile}>
        <span className="font-body text-sm font-semibold text-white">Guardar mi QR</span>
        <span className="font-body text-xs text-white/45">
          {qrState === "saving" ? "Descargando…" : qrState === "error" ? "Se abrió la imagen; mantén pulsado" : "Descargar imagen"}
        </span>
      </button>
    </section>
  );
}
