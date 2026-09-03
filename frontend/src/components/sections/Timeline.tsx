import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Edition {
  number: string;
  ordinal: string;
  title: string;
  year: string;
  theme: string;
  description: string;
  winners: string[];
  categoriesLabel: string;
  color: string;
}

// Orden de exhibición: la edición vigente primero, luego hacia atrás en el
// tiempo (2026 → 2025 → 2024). `number` conserva el ordinal real de cada
// edición (01/02/03), independiente del orden en que se muestran aquí.
const editions: Edition[] = [
  {
    number: "03",
    ordinal: "3ra",
    title: "El objeto de la satisfacción",
    year: "2026",
    theme: "Aquello que nos mueve sin que sepamos del todo por qué",
    description:
      "No siempre sabemos qué nos mueve. Solo sentimos el impulso de volver ahí. 35mm invita a los equipos a filmar ese impulso: la costumbre que no se explica, el objeto que se vuelve ritual, la satisfacción que se persigue sin mapa.",
    winners: [
      "Mejor corto",
      "Mejor dirección",
      "Mejor guion",
      "Mejor sonido",
      "Mejor imagen",
      "Mejor montaje",
      "Mejor dirección de arte",
      "Mejor actuación",
    ],
    categoriesLabel: "Categorías a premiar",
    color: "#39E4FF",
  },
  {
    number: "02",
    ordinal: "2da",
    title: "Lo que no se dice",
    year: "2025",
    theme: "El silencio como lenguaje",
    description:
      "El silencio como protagonista. Los equipos encontraron en lo no dicho un territorio fértil para historias de amor, pérdida y conexión humana. El festival comenzó a consolidarse en la escena universitaria.",
    winners: ["Mejor cortometraje", "Mejor dirección", "Mejor fotografía", "Premio del público"],
    categoriesLabel: "Categorías premiadas",
    color: "#8446F3",
  },
  {
    number: "01",
    ordinal: "1ra",
    title: "El último día",
    year: "2024",
    theme: "El tiempo y la despedida",
    description:
      "La primera edición que abrió el telón para el festival. Los equipos exploraron la noción del tiempo, las despedidas y los finales inevitables. Una apuesta valiente por un cine íntimo y emotivo.",
    winners: ["Mejor cortometraje", "Mejor dirección", "Mejor guion", "Mejor actuación"],
    categoriesLabel: "Categorías premiadas",
    color: "#4820B7",
  },
];

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

export default function Timeline({ onCursorChange }: Props) {
  const [active, setActive] = useState(0);

  return (
    <section id="timeline" className="bg-ink py-32 md:py-40 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 md:px-16">
        {/* Section header */}
        <motion.div
          className="mb-16 md:mb-24"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-4">Historia</p>
          <h2
            className="font-display font-black text-white uppercase leading-none"
            style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
          >
            Nuestras<br />
            <span className="text-purple">ediciones</span>
          </h2>
        </motion.div>

        {/* Timeline tabs */}
        <div className="flex gap-0 mb-12 border-b border-white/10">
          {editions.map((ed, i) => (
            <button
              key={i}
              className={`relative px-6 md:px-10 py-4 font-body text-sm tracking-widest uppercase transition-colors duration-300 ${
                active === i ? "text-white" : "text-white/30 hover:text-white/60"
              }`}
              onClick={() => setActive(i)}
              onMouseEnter={() => onCursorChange("hover")}
              onMouseLeave={() => onCursorChange("default")}
            >
              <span className="font-display font-black text-2xl mr-2">{ed.ordinal}</span>
              <span className="hidden md:inline text-xs">{ed.title}</span>
              {active === i && (
                <motion.div
                  layoutId="tab-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon"
                />
              )}
            </button>
          ))}
        </div>

        {/* Edition content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12"
          >
            {/* Left: big edition number */}
            <div className="md:col-span-3 flex flex-col justify-center">
              <p
                className="font-display font-black leading-none"
                style={{ fontSize: "clamp(5rem, 15vw, 14rem)", color: editions[active].color }}
              >
                {editions[active].number}
              </p>
              <p className="font-body text-white/40 text-xs tracking-widest uppercase mt-2">
                Edición · {editions[active].year}
              </p>
              <div className="w-12 h-px bg-white/20 my-4" />
              <p className="font-editorial italic text-white/50 text-sm">{editions[active].theme}</p>
            </div>

            {/* Center: text */}
            <div className="md:col-span-5 flex flex-col justify-center">
              <h3
                className="font-display font-black text-white uppercase leading-none mb-6"
                style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
              >
                {editions[active].title}
              </h3>
              <p className="font-body text-white/60 text-base leading-relaxed">
                {editions[active].description}
              </p>
            </div>

            {/* Right: categories */}
            <div className="md:col-span-4">
              <p className="font-body text-xs tracking-[0.3em] uppercase text-white/30 mb-5">
                {editions[active].categoriesLabel}
              </p>
              <ul className="flex flex-col gap-3">
                {editions[active].winners.map((w, j) => (
                  <motion.li
                    key={w}
                    className="flex items-center gap-4 group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: j * 0.07, duration: 0.5 }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 group-hover:scale-150 transition-transform"
                      style={{ backgroundColor: editions[active].color }}
                    />
                    <span className="font-body text-white/70 text-sm group-hover:text-white transition-colors">
                      {w}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Timeline bar */}
        <div className="mt-20 relative">
          <div className="h-px bg-white/10 absolute top-3 left-0 right-0" />
          <div className="flex justify-between relative">
            {editions.map((ed, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-3 group"
                onClick={() => setActive(i)}
                onMouseEnter={() => onCursorChange("hover")}
                onMouseLeave={() => onCursorChange("default")}
              >
                <motion.div
                  className="w-6 h-6 rounded-full border-2 relative z-10 transition-all duration-300"
                  style={{
                    backgroundColor: active === i ? editions[i].color : "transparent",
                    borderColor: active === i ? editions[i].color : "rgba(255,255,255,0.2)",
                  }}
                  whileHover={{ scale: 1.3 }}
                />
                <div className="text-center">
                  <p className="font-display font-bold text-white/50 text-sm group-hover:text-white transition-colors">
                    {ed.year}
                  </p>
                  <p className="font-body text-white/30 text-xs mt-0.5 hidden md:block">{ed.ordinal}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
