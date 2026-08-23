import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  sub: string;
}

const stats: Stat[] = [
  { value: 3, suffix: "", label: "Ediciones", sub: "de festival consolidado" },
  { value: 500, suffix: "+", label: "Participantes", sub: "estudiantes universitarios" },
  { value: 50, suffix: "+", label: "Marcas aliadas", sub: "empresas patrocinadoras" },
  { value: 35, suffix: "", label: "Equipos", sub: "compiten por el premio" },
];

function CountUp({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = (target / duration) * step;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative bg-purple py-24 md:py-32 overflow-hidden">
      {/* Decorative large text */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <span
          className="font-display font-black text-white/5 leading-none select-none"
          style={{ fontSize: "clamp(12rem, 35vw, 40rem)" }}
        >
          TVU
        </span>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 md:px-16 relative z-10">
        <motion.p
          className="font-body text-xs tracking-[0.4em] uppercase text-neon/80 mb-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          En números
        </motion.p>

        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="px-6 md:px-10 py-8 flex flex-col items-center text-center group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.7 }}
            >
              <p
                className="font-display font-black text-neon leading-none mb-2 group-hover:scale-105 transition-transform"
                style={{ fontSize: "clamp(3.5rem, 9vw, 8rem)" }}
              >
                <CountUp target={s.value} suffix={s.suffix} inView={inView} />
              </p>
              <p className="font-display font-bold text-white text-xl md:text-2xl uppercase tracking-wider mb-1">
                {s.label}
              </p>
              <p className="font-body text-white/50 text-xs tracking-wider">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
