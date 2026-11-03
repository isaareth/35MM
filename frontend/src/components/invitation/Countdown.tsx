"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { GALA_INFO, daysUntilGala } from "@/lib/gala";

/** "N días para la gala", counting up from zero on first view. Hidden once the gala has passed. */
export default function Countdown() {
  const reduceMotion = useReducedMotion();
  const [days, setDays] = useState<number | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // Computed after mount so the server render never disagrees with the visitor's clock.
    setDays(daysUntilGala());
  }, []);

  useEffect(() => {
    if (days === null || days <= 1) {
      setShown(days ?? 0);
      return;
    }
    if (reduceMotion) {
      setShown(days);
      return;
    }
    const controls = animate(0, days, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (value) => setShown(Math.round(value)),
    });
    // Animations pause in background tabs; never leave the number stuck on 0.
    const settle = setTimeout(() => setShown(days), 1800);
    return () => {
      controls.stop();
      clearTimeout(settle);
    };
  }, [days, reduceMotion]);

  if (days === null || days < 0) return null;

  const message =
    days === 0 ? "¡Hoy es la gala!" : days === 1 ? "¡Mañana es la gala!" : null;

  return (
    <div
      role="timer"
      aria-label={message ?? `Faltan ${days} días para la gala`}
      className="border border-white/10 px-6 py-5 flex items-center justify-between gap-6"
    >
      {message ? (
        <p className="font-display font-black uppercase text-neon text-3xl leading-none">{message}</p>
      ) : (
        <p className="font-display font-black uppercase text-white leading-none flex items-center gap-3 shrink-0">
          <span className="text-neon text-6xl tabular-nums">{shown}</span>
          <span className="text-xl leading-tight whitespace-nowrap">
            {shown === 1 ? "día para" : "días para"}
            <br />
            la gala
          </span>
        </p>
      )}
      <p className="font-body text-xs text-white/40 text-right leading-snug">{GALA_INFO.date}</p>
    </div>
  );
}
