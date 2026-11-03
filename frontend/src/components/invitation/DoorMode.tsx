"use client";

import { useEffect } from "react";

/** Full-screen QR for the door: pure white, as large as the screen allows, and the
 * screen is kept awake so it does not dim while the guest waits in line. */
export default function DoorMode({
  guestName,
  qrSrc,
  capacity,
  onClose,
}: {
  guestName: string;
  qrSrc: string;
  capacity: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let lock: WakeLockSentinel | null = null;
    const keepAwake = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Not supported or denied: the QR still works, the screen may just dim.
      }
    };
    const onVisible = () => document.visibilityState === "visible" && keepAwake();
    keepAwake();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisible);
      document.body.style.overflow = previousOverflow;
      lock?.release().catch(() => {});
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tu código QR en pantalla completa"
      className="fixed inset-0 z-50 bg-white text-ink flex flex-col items-center justify-center px-6 py-10 gap-6"
    >
      <button
        onClick={onClose}
        aria-label="Cerrar pantalla completa"
        className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center text-3xl leading-none text-ink/70 hover:text-ink"
      >
        ×
      </button>

      <p className="font-body text-xs tracking-[0.4em] uppercase text-purple font-semibold">
        35mm · Gala de premiación
      </p>
      <h2 className="font-display font-black uppercase text-3xl md:text-4xl leading-none text-center">
        {guestName}
      </h2>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="Código QR de tu invitación"
        className="block aspect-square"
        style={{ width: "min(82vw, 52dvh, 440px)" }}
      />

      <p className="font-body text-sm text-ink/70 text-center max-w-xs">
        Muestra este código en la entrada. Es válido para hasta {capacity} personas (tú y un acompañante).
        Sube el brillo de tu pantalla para que se lea mejor.
      </p>
    </div>
  );
}
