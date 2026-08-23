import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Winner {
  edition: string;
  film: string;
  category: string;
  team: string;
  year: string;
  description: string;
  img: string;
}

const winners: Winner[] = [
  {
    edition: "1ra",
    film: "El último día",
    category: "Mejor Cortometraje",
    team: "Equipo Cronos",
    year: "2022",
    description:
      "Una historia sobre el tiempo que se acaba y las palabras que nunca se dicen. Un viaje emocional que capturó la esencia del festival en su primera edición.",
    img: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=600&h=400&fit=crop&auto=format",
  },
  {
    edition: "1ra",
    film: "Adiós sin palabras",
    category: "Premio del Público",
    team: "Frame by Frame",
    year: "2022",
    description:
      "Un cortometraje de despedidas que resonó profundamente con el público universitario, ganándose el aplauso de todos los presentes.",
    img: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&h=400&fit=crop&auto=format",
  },
  {
    edition: "2da",
    film: "Lo que no se dice",
    category: "Mejor Cortometraje",
    team: "Silencio Colectivo",
    year: "2023",
    description:
      "El silencio como lenguaje protagonista. Una pieza de una madurez cinematográfica sorprendente, construida sobre miradas, pausas y espacios vacíos.",
    img: "https://images.unsplash.com/photo-1485095329183-d0797cdc5676?w=600&h=400&fit=crop&auto=format",
  },
  {
    edition: "2da",
    film: "Ruido de fondo",
    category: "Mejor Fotografía",
    team: "Lente Abierto",
    year: "2023",
    description:
      "Una fotografía que convirtió los espacios urbanos de Medellín en un personaje más, ganando el premio a la mejor imagen del festival.",
    img: "https://images.unsplash.com/photo-1470338229081-eb5980be28c9?w=600&h=400&fit=crop&auto=format",
  },
];

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

export default function Winners({ onCursorChange }: Props) {
  const [selected, setSelected] = useState<Winner | null>(null);
  const [filter, setFilter] = useState<string>("todos");

  const filtered = filter === "todos" ? winners : winners.filter((w) => w.edition === filter);

  return (
    <section id="ganadores" className="bg-ink py-32 md:py-40 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 md:px-16">
        {/* Header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-4">Palmarés</p>
          <h2
            className="font-display font-black text-white uppercase leading-none"
            style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
          >
            Ganadores
          </h2>
        </motion.div>

        {/* Filter */}
        <div className="flex gap-4 mb-12 flex-wrap">
          {["todos", "1ra", "2da"].map((f) => (
            <button
              key={f}
              className={`font-body text-xs tracking-widest uppercase px-5 py-2.5 transition-all duration-200 border ${
                filter === f
                  ? "bg-purple border-purple text-white"
                  : "border-white/20 text-white/40 hover:text-white hover:border-white/40"
              }`}
              onClick={() => setFilter(f)}
              onMouseEnter={() => onCursorChange("hover")}
              onMouseLeave={() => onCursorChange("default")}
            >
              {f === "todos" ? "Todas" : `${f} Edición`}
            </button>
          ))}
        </div>

        {/* Film strip grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5">
          <AnimatePresence mode="popLayout">
            {filtered.map((w, i) => (
              <motion.div
                key={`${w.film}-${w.edition}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-ink cursor-pointer group overflow-hidden relative"
                onClick={() => setSelected(selected?.film === w.film ? null : w)}
                onMouseEnter={() => onCursorChange("cta")}
                onMouseLeave={() => onCursorChange("default")}
              >
                {/* Image */}
                <div className="relative overflow-hidden h-52">
                  <motion.img
                    src={w.img}
                    alt={w.film}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.6 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                  {/* Film perf holes */}
                  <div className="absolute top-2 left-0 right-0 flex justify-between px-3">
                    {[...Array(8)].map((_, j) => (
                      <div key={j} className="w-3 h-3 rounded-sm bg-ink/80" />
                    ))}
                  </div>
                  {/* Edition badge */}
                  <span className="absolute top-6 right-4 font-display font-black text-neon text-xl">
                    {w.edition}
                  </span>
                </div>

                {/* Info */}
                <div className="p-5 border-t border-white/5">
                  <p className="font-body text-purple-bright text-xs tracking-widest uppercase mb-2">{w.category}</p>
                  <h3 className="font-display font-black text-white text-2xl uppercase group-hover:text-neon transition-colors">
                    {w.film}
                  </h3>
                  <p className="font-body text-white/40 text-xs mt-1">{w.team} · {w.year}</p>

                  <AnimatePresence>
                    {selected?.film === w.film && (
                      <motion.p
                        className="font-body text-white/60 text-sm mt-4 leading-relaxed"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {w.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
