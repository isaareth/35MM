import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp: Variants = {
  hidden: { y: 60, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function About({ onCursorChange }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} id="que-es" className="relative bg-ink py-32 md:py-40 overflow-hidden">
      {/* Top label */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple/40 to-transparent" />

      <div className="max-w-screen-xl mx-auto px-6 md:px-16">
        {/* Oversize label */}
        <motion.div
          className="overflow-hidden mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-4">¿Qué es?</p>
          <h2
            className="font-display font-black text-white/10 leading-none uppercase"
            style={{ fontSize: "clamp(4rem, 14vw, 14rem)" }}
          >
            ESTO ES
          </h2>
        </motion.div>

        {/* Main content grid — echoes portfolio layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8">
          {/* Left: editorial text block */}
          <motion.div
            className="md:col-span-5 flex flex-col justify-center"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp}>
              <h3
                className="font-display font-black text-neon uppercase leading-none mb-6"
                style={{ fontSize: "clamp(3rem, 7vw, 7rem)" }}
              >
                35mm
                <br />
                <span className="text-white/80 text-2xl tracking-widest font-body font-light normal-case">festival de cortos</span>
              </h3>
            </motion.div>

            <motion.div variants={fadeUp} className="mb-2">
              <p className="font-editorial italic text-neon text-lg">"El objeto de la satisfacción"</p>
            </motion.div>

            <motion.div variants={fadeUp} className="border-l-2 border-purple pl-6 mb-8">
              <p className="font-body text-white/70 text-base md:text-lg leading-relaxed">
                El festival de cortometrajes hecho <em className="font-editorial italic text-neon not-italic">por estudiantes, para estudiantes</em> del
                área metropolitana. Un espacio construido para que quienes crean y quienes aman mirar se encuentren
                en el mismo lugar: en las salas, en los conversatorios, en las conversaciones que empiezan cuando
                las luces se encienden de nuevo.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p className="font-body text-white/50 text-sm leading-loose">
                A través de muestras, conversatorios, actividades de formación y proyecciones abiertas al
                público, 35mm defiende que una historia bien contada, aunque dure apenas unos minutos,
                puede quedarse mucho más tiempo del que dura en pantalla.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <span className="w-8 h-px bg-neon/60" />
                <span className="font-body text-xs text-white/40 tracking-widest uppercase">Público objetivo</span>
              </div>
              <p className="font-editorial italic text-white/60 text-xl pl-12">
                Estudiantes de educación superior del Área Metropolitana del Valle de Aburrá
              </p>
            </motion.div>
          </motion.div>

          {/* Center: photo collage */}
          <div className="md:col-span-4 relative my-10 md:my-0">
            <motion.div
              className="relative z-10 overflow-hidden"
              style={{ y: imgY }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=800&fit=crop&auto=format"
                alt="Producción de cortometraje con claqueta"
                className="w-full aspect-[3/4] object-cover"
                onMouseEnter={() => onCursorChange("hover")}
                onMouseLeave={() => onCursorChange("default")}
              />
              {/* Cyan tint overlay */}
              <div className="absolute inset-0 mix-blend-color" style={{ backgroundColor: "#6EF9F4", opacity: 0.08 }} />
            </motion.div>
            {/* Floating badge */}
            <motion.div
              className="absolute -bottom-4 -right-4 md:-right-8 z-20 bg-purple px-5 py-4"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              <p className="font-display font-black text-neon text-4xl leading-none">3ra</p>
              <p className="font-body text-white/70 text-xs tracking-widest uppercase mt-1">Edición activa</p>
            </motion.div>
          </div>

          {/* Right: info panel — echoes portfolio purple panel */}
          <motion.div
            className="md:col-span-3 bg-purple/90 p-8 flex flex-col justify-between"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <p className="font-body text-neon text-xs tracking-[0.3em] uppercase mb-2">Fecha & Lugar</p>
              <p className="font-editorial italic text-white text-2xl leading-snug mb-6">
                14 de noviembre de 2026
              </p>
              <p className="font-display font-bold text-neon text-4xl leading-none mb-2 uppercase">
                FE<br />CHA<br />&<br />LU<br />GAR
              </p>
            </div>
            <div>
              <p className="font-body text-white/80 text-sm leading-relaxed mb-4">
                Auditorio Fundadores, el auditorio principal de la Universidad EAFIT con capacidad
                para 650 personas.
              </p>
              <p className="font-body text-white/60 text-xs leading-relaxed">
                La Universidad EAFIT cuenta con más de 12.000 estudiantes en pregrado.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
