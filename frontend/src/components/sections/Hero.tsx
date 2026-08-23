import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
};

const item: Variants = {
  hidden: { y: 80, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function Hero({ onCursorChange }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} id="hero" className="relative h-screen overflow-hidden flex flex-col justify-end">
      {/* Parallax background */}
      <motion.div className="absolute inset-0 z-0 bg-ink" style={{ y: bgY }}>
        <img
          src="https://images.unsplash.com/photo-1485095329183-d0797cdc5676?w=1920&h=1080&fit=crop&auto=format"
          alt="Cinema audience"
          className="w-full h-[130%] object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/40 to-transparent" />
      </motion.div>

      {/* Kinetic top label */}
      <motion.div
        className="absolute top-0 left-0 right-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <div className="ticker-track flex whitespace-nowrap py-3 border-b border-white/10 mt-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="font-body text-white/20 text-xs tracking-[0.4em] uppercase mr-16">
              Festival de Cortos · Producciones TVU · Universidad EAFIT · 3ra Edición ·
            </span>
          ))}
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative z-10 px-6 md:px-16 pb-16 md:pb-20"
        variants={container}
        initial="hidden"
        animate="visible"
        style={{ y: textY }}
      >
        {/* Edition tag */}
        <motion.div variants={item} className="flex items-center gap-3 mb-3">
          <span className="w-8 h-px bg-neon" />
          <span className="font-body text-xs text-neon tracking-[0.35em] uppercase">3ra Edición</span>
        </motion.div>

        {/* Giant logo */}
        <motion.div variants={item} className="overflow-hidden -mx-1">
          <h1 className="font-display font-black leading-none text-purple tracking-tight"
            style={{ fontSize: "clamp(7rem, 22vw, 24rem)" }}>
            35mm
          </h1>
        </motion.div>

        {/* Festival title row */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mt-1">
          <div>
            <p
              className="font-display font-black text-white uppercase tracking-[0.15em] leading-none"
              style={{ fontSize: "clamp(1.8rem, 5vw, 4.5rem)" }}
            >
              Festival de Cortos
            </p>
            <p className="font-editorial italic text-white/50 text-lg mt-2">
              por estudiantes, para estudiantes
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5">
            <p className="font-display font-bold text-neon text-2xl tracking-wider uppercase">
              14 Nov 2026
            </p>
            <p className="font-body text-white/70 text-sm">Auditorio Fundadores</p>
            <p className="font-body text-white/40 text-xs tracking-wider">Universidad EAFIT · Medellín</p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={item} className="mt-10 flex items-center gap-6">
          <a
            href="/inscripcion"
            className="group inline-flex items-center gap-3 font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300"
            onMouseEnter={() => onCursorChange("cta")}
            onMouseLeave={() => onCursorChange("default")}
          >
            Inscríbete
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
          <a
            href="#que-es"
            className="font-body text-white/40 text-sm hover:text-white transition-colors tracking-wider"
            onMouseEnter={() => onCursorChange("hover")}
            onMouseLeave={() => onCursorChange("default")}
          >
            Conoce más ↓
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 right-8 md:right-16 z-10 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{ opacity }}
      >
        <motion.div
          className="w-px h-14 bg-white/25"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>

      {/* TVU corner mark */}
      <motion.div
        className="absolute bottom-8 right-8 md:right-16 z-10 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        <span className="font-display font-black text-white/30 text-sm tracking-widest">TVu</span>
      </motion.div>
    </section>
  );
}
