import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TVU() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={ref} id="tvu" className="relative bg-ink py-32 md:py-40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple/40 to-transparent" />

      {/* Background image with parallax */}
      <motion.div
        className="absolute inset-0 z-0 opacity-10"
        style={{ y: imgY }}
      >
        <img
          src="https://images.unsplash.com/photo-1650475958723-e8d850c26f67?w=1920&h=1080&fit=crop&auto=format"
          alt="Producción audiovisual"
          className="w-full h-[120%] object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/80 to-ink z-[1]" />

      <div className="relative z-10 max-w-screen-xl mx-auto px-6 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-center">
          {/* Left: TVU mark */}
          <motion.div
            className="md:col-span-4 flex flex-col"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8">
              <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-6">Organizado por</p>
              {/* TVU logo text mark */}
              <div className="flex items-baseline gap-0">
                <span
                  className="font-display font-black text-white leading-none"
                  style={{ fontSize: "clamp(5rem, 15vw, 14rem)" }}
                >
                  TV
                </span>
                <span
                  className="font-display font-black text-purple leading-none"
                  style={{ fontSize: "clamp(5rem, 15vw, 14rem)" }}
                >
                  u
                </span>
              </div>
              <p className="font-body text-white/50 text-sm tracking-widest uppercase mt-2">
                Producciones TVU
              </p>
            </div>

            <div className="flex gap-4 mt-4">
              <a
                href="https://instagram.com/35mm_tvu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs text-white/30 hover:text-neon tracking-widest uppercase transition-colors"
              >
                @35mm_tvu ↗
              </a>
            </div>
          </motion.div>

          {/* Right: content */}
          <motion.div
            className="md:col-span-8"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <h2
              className="font-display font-black text-white uppercase leading-none mb-8"
              style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)" }}
            >
              El equipo detrás<br />
              <span className="text-purple">del festival</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border-l-2 border-purple pl-6">
                <p className="font-body text-white/70 text-base leading-relaxed mb-4">
                  <strong className="text-white font-medium">Producciones TVU</strong> reúne a un grupo
                  de estudiantes que decidieron que la producción audiovisual, el entretenimiento y la
                  comunicación no eran solo materias de clase, sino un lugar donde quedarse a explorar.
                </p>
                <p className="font-body text-white/50 text-sm leading-relaxed">
                  No organizamos eventos para llenar un calendario. Los construimos porque creemos en
                  abrir espacios donde la creatividad no tiene techo.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <p className="font-body text-neon text-xs tracking-widest uppercase mb-2">Misión</p>
                  <p className="font-editorial italic text-white/60 text-lg leading-snug">
                    Conectar a la comunidad estudiantil con la industria audiovisual real, no como una
                    simulación, sino como una primera experiencia genuina.
                  </p>
                </div>
                <div>
                  <p className="font-body text-neon text-xs tracking-widest uppercase mb-2">Universidad</p>
                  <p className="font-body text-white/50 text-sm leading-relaxed">
                    Universidad EAFIT — Medellín, Colombia.<br />
                    Más de 12.000 estudiantes en pregrado.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
