"use client";

import { motion } from "framer-motion";
import { GALA_INFO } from "@/lib/gala";

/** The invitation drawn as a cinema ticket: purple body with a film-strip edge,
 * a perforated line, and a stub holding the QR. Tap the QR to open it full screen. */
export default function Ticket({
  guestName,
  qrSrc,
  capacity,
  onOpenDoor,
}: {
  guestName: string;
  qrSrc: string;
  capacity: number;
  onOpenDoor: () => void;
}) {
  return (
    <motion.section
      aria-label="Tu invitación"
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md mx-auto"
    >
      <div className="overflow-hidden shadow-[0_30px_90px_-25px_rgba(132,70,243,0.6)]">
        {/* Body */}
        <div className="relative bg-gradient-to-br from-purple via-[#3a17a0] to-[#2a1070] px-7 pt-9 pb-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-3 opacity-40"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.65) 0 10px, transparent 10px 22px)",
            }}
          />
          <p className="font-body text-[11px] tracking-[0.4em] uppercase text-neon mb-3">
            35mm Festival de Cortos · 3ra edición
          </p>
          <h1
            className="font-display font-black uppercase text-white leading-[0.88]"
            style={{ fontSize: "clamp(3rem, 15vw, 4.8rem)" }}
          >
            Gala de
            <br />
            premiación
          </h1>

          <dl className="mt-7 grid grid-cols-2 gap-5">
            <div>
              <dt className="font-body text-[10px] tracking-widest uppercase text-white/45 mb-1">Fecha</dt>
              <dd className="font-body text-white text-sm leading-snug">{GALA_INFO.date}</dd>
            </div>
            <div>
              <dt className="font-body text-[10px] tracking-widest uppercase text-white/45 mb-1">Lugar</dt>
              <dd className="font-body text-white text-sm leading-snug">{GALA_INFO.place}</dd>
            </div>
          </dl>

          <p className="mt-8 font-editorial italic text-white/75 text-lg">Invitación personal para</p>
          <p className="font-display font-black uppercase text-white text-3xl md:text-4xl leading-none mt-1 break-words">
            {guestName}
          </p>
        </div>

        {/* Perforation */}
        <div className="relative h-0">
          <span aria-hidden className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-ink" />
          <span aria-hidden className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-ink" />
          <span aria-hidden className="absolute inset-x-7 top-0 border-t-2 border-dashed border-white/30" />
        </div>

        {/* Stub */}
        <div className="bg-[#f4f1ff] text-ink px-7 py-7 flex items-center gap-5">
          <motion.button
            type="button"
            onClick={onOpenDoor}
            aria-label="Ampliar el código QR a pantalla completa"
            initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.96 }}
            className="bg-white p-2 shadow-[0_8px_24px_-8px_rgba(72,32,183,0.45)] shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Código QR de tu invitación" width={128} height={128} className="block w-32 h-32" />
          </motion.button>

          <div className="min-w-0">
            <p className="font-display font-black uppercase text-2xl leading-none">Tu entrada</p>
            <p className="font-body text-sm text-ink/70 mt-2 leading-snug">
              Válida para hasta {capacity} personas: tú y un acompañante.
            </p>
            <button
              type="button"
              onClick={onOpenDoor}
              className="mt-3 font-body text-sm font-semibold text-purple underline underline-offset-4 hover:text-purple-bright"
            >
              Ver en pantalla completa
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
