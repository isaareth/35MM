import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="bg-ink border-t border-white/8 py-16 md:py-20 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 md:px-16">
        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 pb-16 border-b border-white/8">
          {/* Brand */}
          <div>
            <p className="font-display font-black text-7xl text-purple leading-none mb-2">35mm</p>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase">Festival de Cortos</p>
            <p className="font-body text-white/30 text-xs mt-4">3ra Edición · Noviembre 2026</p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <p className="font-body text-white/20 text-xs tracking-widest uppercase mb-2">Navegación</p>
            {[
              ["¿Qué es 35mm?", "#que-es"],
              ["Ediciones anteriores", "#timeline"],
              ["Ganadores", "#ganadores"],
              ["Inscripción", "#inscripcion"],
              ["Marcas & aliados", "#marcas"],
              ["Producciones TVU", "#tvu"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="font-body text-white/50 text-sm hover:text-white transition-colors w-fit"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div>
            <p className="font-body text-white/20 text-xs tracking-widest uppercase mb-4">Contacto</p>
            <p className="font-body text-white/50 text-sm mb-2">tvu@eafit.edu.co</p>
            <p className="font-body text-white/30 text-xs mb-6">Carrera 49 #7 Sur 50 — Universidad EAFIT<br />Medellín, Colombia</p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/35mm_tvu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs text-white/30 hover:text-neon tracking-wider transition-colors uppercase"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        {/* Giant footer type */}
        <motion.div
          className="overflow-hidden -mx-6 md:-mx-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <p
            className="font-display font-black text-white/5 leading-none text-center select-none"
            style={{ fontSize: "clamp(5rem, 20vw, 22rem)" }}
          >
            35mm
          </p>
        </motion.div>

        {/* Bottom */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-white/25 text-xs">
            © 2026 35mm Festival de Cortos · Producciones TVU · Universidad EAFIT
          </p>
          <p className="font-body text-white/20 text-xs">
            Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
