import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQ {
  q: string;
  a: string;
}

const faqs: FAQ[] = [
  {
    q: "¿Quiénes pueden participar?",
    a: "Estudiantes activos de instituciones de educación superior del Área Metropolitana del Valle de Aburrá. Cada equipo debe tener entre 4 y 6 integrantes, y uno de ellos es el representante del grupo.",
  },
  {
    q: "¿Cuánto tiempo tengo para producir el cortometraje?",
    a: "Desde la entrega del tema oficial hasta la fecha límite de entrega del cortometraje tendrás aproximadamente 30 días. El tema se revela en el evento de apertura del festival.",
  },
  {
    q: "¿Cuál es la duración máxima del cortometraje?",
    a: "Los cortometrajes deben tener una duración mínima de 3 minutos y máxima de 15 minutos, incluyendo créditos. El incumplimiento de este requisito descalifica automáticamente la pieza.",
  },
  {
    q: "¿Qué formatos de entrega se aceptan?",
    a: "Se acepta archivo de video en formato .MP4 o .MOV con resolución mínima de 1080p (Full HD). La entrega se realiza a través de la plataforma oficial del festival.",
  },
  {
    q: "¿Hay algún costo de inscripción?",
    a: "No. La participación en el 35mm Festival de Cortos es completamente gratuita para todos los equipos participantes. Producciones TVU y Universidad EAFIT asumen todos los costos del evento.",
  },
  {
    q: "¿Cómo se seleccionan los ganadores?",
    a: "Un jurado compuesto por profesionales de la industria audiovisual, académicos y representantes de marcas aliadas evalúa los cortometrajes según criterios de narrativa, dirección, fotografía, sonido y originalidad.",
  },
  {
    q: "¿El material debe ser inédito?",
    a: "Sí. Todos los cortometrajes presentados deben ser producciones originales e inéditas, creadas específicamente para esta edición del festival. No se aceptan piezas previamente publicadas o presentadas en otros festivales.",
  },
  {
    q: "¿Cuándo se abren las inscripciones?",
    a: "Las inscripciones para la 3ra edición abrirán el 1 de septiembre de 2026. Te recomendamos registrar tu equipo con anticipación. Cupos limitados.",
  },
];

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

export default function Registration({ onCursorChange }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="inscripcion" className="bg-ink py-32 md:py-40 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 md:px-16">
        {/* CTA block */}
        <motion.div
          className="relative mb-24 md:mb-32"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10">
            {/* Left: giant CTA */}
            <div className="bg-purple p-10 md:p-16 flex flex-col justify-between">
              <div>
                <p className="font-body text-neon text-xs tracking-[0.4em] uppercase mb-4">3ra Edición · 2026</p>
                <h2
                  className="font-display font-black text-white uppercase leading-none mb-6"
                  style={{ fontSize: "clamp(3.5rem, 10vw, 9rem)" }}
                >
                  Inscribe<br />tu equipo
                </h2>
                <p className="font-editorial italic text-white/70 text-xl md:text-2xl leading-snug">
                  "El cine no espera a los indecisos."
                </p>
              </div>
              <div className="mt-10">
                <motion.a
                  href="/inscripcion"
                  className="inline-block w-full md:w-auto text-center font-body font-semibold text-sm tracking-widest uppercase px-10 py-5 bg-neon text-ink hover:bg-white transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => onCursorChange("cta")}
                  onMouseLeave={() => onCursorChange("default")}
                >
                  Inscríbete ahora →
                </motion.a>
                <p className="font-body text-white/40 text-xs mt-4 tracking-wider">
                  * Inscripciones abren el 1 de septiembre de 2026
                </p>
              </div>
            </div>

            {/* Right: key info */}
            <div className="p-10 md:p-16 flex flex-col gap-8 border-t md:border-t-0 md:border-l border-white/10">
              {[
                { icon: "📅", label: "Fecha del evento", value: "14 de noviembre de 2026" },
                { icon: "📍", label: "Lugar", value: "Auditorio Fundadores · Universidad EAFIT" },
                { icon: "👥", label: "Tamaño del equipo", value: "4 a 6 integrantes" },
                { icon: "🎬", label: "Duración del corto", value: "3 – 15 minutos" },
                { icon: "💰", label: "Costo de inscripción", value: "Completamente gratuito" },
                { icon: "🏆", label: "Premio principal", value: "Reconocimiento + premio en especie" },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 items-start group">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-body text-white/30 text-xs tracking-widest uppercase mb-1">{item.label}</p>
                    <p className="font-body text-white text-sm leading-snug group-hover:text-neon transition-colors">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <div>
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-4">Preguntas frecuentes</p>
            <h3
              className="font-display font-black text-white uppercase"
              style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
            >
              Reglas &<br />
              <span className="text-purple">dudas</span>
            </h3>
          </motion.div>

          <div className="divide-y divide-white/8">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  className="w-full text-left py-6 flex items-start justify-between gap-6 group"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  onMouseEnter={() => onCursorChange("hover")}
                  onMouseLeave={() => onCursorChange("default")}
                >
                  <span className="font-body font-medium text-white/80 group-hover:text-white transition-colors text-base md:text-lg flex-1">
                    {faq.q}
                  </span>
                  <motion.span
                    className="text-neon text-2xl flex-shrink-0 leading-none mt-0.5"
                    animate={{ rotate: openIndex === i ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="font-body text-white/55 text-sm md:text-base leading-relaxed pb-6 max-w-3xl border-l-2 border-purple pl-6">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
