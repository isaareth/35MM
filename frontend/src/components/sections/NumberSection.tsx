import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function NumberSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const xLeft = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const xRight = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const y1 = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden bg-ink flex items-center justify-center py-32">
      {/* Horizontal rule */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple/30 to-transparent top-0" />

      {/* Big background "35" ghost */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ y: y1 }}
      >
        <span
          className="font-display font-black text-white/[0.025] leading-none"
          style={{ fontSize: "clamp(20rem, 60vw, 80rem)" }}
        >
          35
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-6"
        style={{ scale, opacity }}
      >
        {/* Sub-label */}
        <motion.p
          className="font-body text-xs tracking-[0.5em] uppercase text-purple mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          El número que nos define
        </motion.p>

        {/* Kinetic "35" */}
        <div className="overflow-hidden relative">
          <motion.div className="flex items-end justify-center gap-0 leading-none" style={{ x: xLeft }}>
            <motion.span
              className="font-display font-black text-purple-bright leading-none select-none"
              style={{ fontSize: "clamp(8rem, 28vw, 32rem)" }}
              initial={{ y: 200, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              3
            </motion.span>
            <motion.span
              className="font-display font-black text-neon leading-none select-none"
              style={{ fontSize: "clamp(8rem, 28vw, 32rem)", x: xRight }}
              initial={{ y: 200, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              5
            </motion.span>
          </motion.div>
        </div>

        {/* mm */}
        <motion.p
          className="font-display font-bold text-white/40 uppercase tracking-[0.5em] text-2xl md:text-4xl -mt-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          milímetros de pellícula
        </motion.p>

        {/* Editorial quote */}
        <motion.blockquote
          className="font-editorial italic text-white/50 text-xl md:text-3xl mt-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.9 }}
        >
          "35mm: la medida exacta en la que, durante más de un siglo, <br />
          el cine ha guardado lo que las palabras no alcanzan a decir."
        </motion.blockquote>

        {/* Facts row */}
        <motion.div
          className="flex flex-wrap justify-center gap-8 mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          {[
            { n: "35", label: "equipos compiten" },
            { n: "35mm", label: "formato del festival" },
            { n: "35+", label: "días de producción" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1 group">
              <span className="font-display font-black text-4xl text-purple-bright group-hover:text-neon transition-colors">
                {f.n}
              </span>
              <span className="font-body text-white/40 text-xs tracking-widest uppercase">{f.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Decorative lines */}
      <motion.div
        className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 flex flex-col gap-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-px bg-white/10" style={{ width: 24 + i * 8 }} />
        ))}
      </motion.div>
    </section>
  );
}
