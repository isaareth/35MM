import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "Qué es", href: "#que-es" },
  { label: "Ediciones", href: "#timeline" },
  { label: "Inscripción", href: "#inscripcion" },
  { label: "Marcas", href: "#marcas" },
];

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

export default function Navbar({ onCursorChange }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-[500] px-6 md:px-12 py-5 flex items-center justify-between transition-all duration-500"
        style={{
          backgroundColor: scrolled ? "rgba(25,23,24,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      >
        <a
          href="#"
          className="font-display font-black text-2xl text-purple hover:text-purple-bright transition-colors"
          onMouseEnter={() => onCursorChange("hover")}
          onMouseLeave={() => onCursorChange("default")}
        >
          35mm
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-body text-sm text-white/60 hover:text-white tracking-widest uppercase transition-colors"
              onMouseEnter={() => onCursorChange("hover")}
              onMouseLeave={() => onCursorChange("default")}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#inscripcion"
            className="font-body text-sm font-semibold tracking-widest uppercase px-5 py-2.5 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300"
            onMouseEnter={() => onCursorChange("cta")}
            onMouseLeave={() => onCursorChange("default")}
          >
            Inscríbete
          </a>
        </div>

        <button
          className="md:hidden text-white flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <motion.span
            className="block w-6 h-px bg-white"
            animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
          />
          <motion.span
            className="block w-6 h-px bg-white"
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
          />
          <motion.span
            className="block w-6 h-px bg-white"
            animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
          />
        </button>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[400] bg-ink flex flex-col justify-center items-start px-10"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {links.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                className="font-display font-black text-6xl text-white hover:text-purple transition-colors my-3 uppercase"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </motion.a>
            ))}
            <motion.a
              href="#inscripcion"
              className="mt-8 font-body text-sm font-semibold tracking-widest uppercase px-8 py-4 bg-purple text-white"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: links.length * 0.07 + 0.1, duration: 0.5 }}
              onClick={() => setMenuOpen(false)}
            >
              Inscríbete →
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
