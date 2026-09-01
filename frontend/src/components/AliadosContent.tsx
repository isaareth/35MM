"use client";

import { motion } from "framer-motion";

const reasons = [
  {
    n: "01",
    title: "Evento con respaldo",
    text: "35mm es un festival desarrollado por el grupo estudiantil Producciones TVU, respaldado por la Universidad EAFIT y apoyado por entidades como Cineprox.",
  },
  {
    n: "02",
    title: "Público estratégico",
    text: "El festival atrae jóvenes creativos, líderes en formación, influenciadores culturales y emprendedores del Valle de Aburrá.",
  },
  {
    n: "03",
    title: "Alta visibilidad",
    text: "Tu marca está presente en piezas gráficas, redes, pantalla grande y video, en el mismo lugar del evento, entre otros espacios.",
  },
  {
    n: "04",
    title: "Tu marca con propósito",
    text: "Apoyar 35mm te asocia con el arte, la educación y la cultura joven. Mejora tu reputación y construye una conexión emocional con el público.",
  },
  {
    n: "05",
    title: "Alianza con proyección",
    text: "35mm crece cada edición en alcance, calidad y audiencia. Ser parte ahora te posiciona como aliado desde el inicio de un evento con potencial de convertirse en referente regional.",
  },
];

const stats = [
  { n: "2", label: "ediciones exitosas" },
  { n: "500+", label: "participantes por edición" },
  { n: "50+", label: "marcas aliadas" },
];

const brands = [
  "Nacional de Chocolates",
  "TeleMedellín",
  "Comfama",
  "Cineprox",
  "Monterojo Gourmet",
  "Sushi Light",
  "Clandestino Restaurante",
  "Hatsu",
  "NODO EAFIT",
  "Tecnológico de Artes Débora Arango",
  "D Dermatológica",
  "Arde la Selva",
  "Solución Adhesiva",
];

export default function AliadosContent() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 md:px-16 py-32 md:py-40">
      {/* Header */}
      <motion.div
        className="mb-20 md:mb-28"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">Aliados</p>
        <h1
          className="font-display font-black text-white uppercase leading-none mb-6"
          style={{ fontSize: "clamp(3rem, 9vw, 8rem)" }}
        >
          Sé parte de <span className="text-purple-bright">35mm</span>
        </h1>
        <p className="font-editorial italic text-white/60 text-xl md:text-2xl max-w-2xl">
          Conecta con el talento creativo universitario y posiciona tu marca ante los
          protagonistas del cine que viene.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-3 gap-0 divide-x divide-white/10 border-y border-white/10 mb-24 md:mb-32"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {stats.map((s) => (
          <div key={s.label} className="py-8 px-4 text-center">
            <p className="font-display font-black text-neon text-4xl md:text-6xl leading-none mb-2">
              {s.n}
            </p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Reasons */}
      <div className="mb-24 md:mb-32">
        <motion.h2
          className="font-display font-black text-white uppercase leading-none mb-12"
          style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          ¿Por qué participar<br />
          <span className="text-purple">en 35mm?</span>
        </motion.h2>

        <div className="flex flex-col divide-y divide-white/8 border-t border-b border-white/8">
          {reasons.map((r, i) => (
            <motion.div
              key={r.n}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
            >
              <p className="md:col-span-2 font-display font-black text-purple-bright text-4xl leading-none">
                {r.n}
              </p>
              <h3 className="md:col-span-3 font-display font-bold text-white text-xl uppercase">
                {r.title}
              </h3>
              <p className="md:col-span-7 font-body text-white/60 text-base leading-relaxed">
                {r.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Brands already in */}
      <motion.div
        className="mb-24 md:mb-32"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-4">
          Ya confían en nosotros
        </p>
        <h2 className="font-display font-black text-white text-2xl md:text-4xl uppercase mb-8">
          Marcas aliadas
        </h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {brands.map((b) => (
            <span key={b} className="font-body text-white/50 text-sm">
              {b}
            </span>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="border border-white/10 p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-purple/10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div>
          <p className="font-body text-white/40 text-xs tracking-widest uppercase mb-2">
            ¿Hablamos?
          </p>
          <h3 className="font-display font-black text-white text-3xl md:text-4xl uppercase mb-3">
            Hagamos que tu marca <span className="text-neon">sea parte</span>
          </h3>
          <p className="font-body text-white/50 text-sm max-w-lg">
            Escríbenos para conversar sobre alianzas, patrocinios o medios para esta edición.
          </p>
        </div>
        <a
          href="mailto:tvu@eafit.edu.co?subject=Quiero%20ser%20aliado%20de%2035mm"
          className="flex-shrink-0 font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-neon text-ink hover:bg-white transition-all duration-300"
        >
          Escríbenos →
        </a>
      </motion.div>
    </div>
  );
}
