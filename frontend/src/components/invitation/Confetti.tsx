"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#39E4FF", "#8446F3", "#ffffff", "#4820B7"];

/** A one-shot burst of confetti in the festival's colours. Renders nothing for
 * people who asked their device for reduced motion. */
export default function Confetti({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 520,
      peak: -(140 + Math.random() * 280),
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 0.18,
      size: 6 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      round: i % 3 === 0,
    }))
  );

  useEffect(() => {
    const timer = setTimeout(onDone, reduceMotion ? 0 : 2800);
    return () => clearTimeout(timer);
  }, [onDone, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.peak, p.peak + 560], rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: 2.4, delay: p.delay, ease: "easeOut", times: [0, 0.35, 1] }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            borderRadius: p.round ? "9999px" : 1,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}
