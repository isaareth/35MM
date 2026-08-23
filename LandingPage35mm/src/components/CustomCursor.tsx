import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export type CursorState = "default" | "hover" | "cta" | "drag";

interface Props {
  state: CursorState;
}

export default function CustomCursor({ state }: Props) {
  const [visible, setVisible] = useState(false);
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const sx = useSpring(mx, { stiffness: 400, damping: 35, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 400, damping: 35, mass: 0.5 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      if (!visible) setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [visible]);

  const variants = {
    default: { width: 12, height: 12, backgroundColor: "#ffffff", border: "none", borderRadius: "50%" },
    hover: { width: 44, height: 44, backgroundColor: "transparent", border: "1.5px solid #6EF9F4", borderRadius: "50%" },
    cta: { width: 72, height: 72, backgroundColor: "#6023CD", border: "none", borderRadius: "50%" },
    drag: { width: 56, height: 56, backgroundColor: "#8D3EF6", border: "none", borderRadius: "4px" },
  };

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000]"
        style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%", opacity: visible ? 1 : 0 }}
        animate={variants[state]}
        transition={{ duration: 0.15, ease: "easeOut" }}
      />
      {state === "cta" && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[10000] flex items-center justify-center"
          style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%", opacity: visible ? 1 : 0 }}
        >
          <span className="text-neon text-[10px] font-body font-semibold tracking-widest uppercase">
            ver
          </span>
        </motion.div>
      )}
    </>
  );
}
