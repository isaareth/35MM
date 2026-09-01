import { motion } from "framer-motion";

interface Brand {
  name: string;
  category: string;
  color: string;
  size: "lg" | "md" | "sm";
}

const brands: Brand[] = [
  { name: "Universidad EAFIT", category: "Institución organizadora", color: "#6023CD", size: "lg" },
  { name: "Producciones TVU", category: "Producción ejecutiva", color: "#8D3EF6", size: "lg" },
  { name: "Nacional de Chocolates", category: "Patrocinador", color: "#6EF9F4", size: "md" },
  { name: "TeleMedellín", category: "Aliado de medios", color: "#6023CD", size: "md" },
  { name: "Comfama", category: "Aliado institucional", color: "#8D3EF6", size: "md" },
  { name: "Cineprox", category: "Aliado cinematográfico", color: "#6EF9F4", size: "md" },
  { name: "Monterojo Gourmet", category: "Aliado gastronómico", color: "#6023CD", size: "sm" },
  { name: "Sushi Light", category: "Aliado gastronómico", color: "#8D3EF6", size: "sm" },
  { name: "Clandestino Restaurante", category: "Aliado gastronómico", color: "#6EF9F4", size: "sm" },
  { name: "Hatsu", category: "Aliado gastronómico", color: "#6023CD", size: "sm" },
  { name: "NODO EAFIT", category: "Aliado institucional", color: "#8D3EF6", size: "sm" },
  { name: "Tecnológico de Artes Débora Arango", category: "Aliado académico", color: "#6EF9F4", size: "sm" },
  { name: "D Dermatológica", category: "Patrocinador", color: "#6023CD", size: "sm" },
  { name: "Arde la Selva", category: "Aliado", color: "#8D3EF6", size: "sm" },
  { name: "Solución Adhesiva", category: "Aliado creativo", color: "#6EF9F4", size: "sm" },
];

const sizeStyles = {
  lg: "col-span-2 md:col-span-2 row-span-2",
  md: "col-span-2 md:col-span-1 row-span-1",
  sm: "col-span-1 row-span-1",
};

interface Props {
  onCursorChange: (s: "default" | "hover" | "cta" | "drag") => void;
}

export default function Brands({ onCursorChange }: Props) {
  return (
    <section id="marcas" className="bg-ink py-32 md:py-40 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 md:px-16">
        {/* Header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-body text-xs tracking-[0.4em] uppercase text-white/30 mb-4">Alianzas</p>
          <h2
            className="font-display font-black text-white uppercase leading-none"
            style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
          >
            Marcas &<br />
            <span className="text-purple-bright">aliados</span>
          </h2>
        </motion.div>

        {/* Collage grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-px bg-white/5 mb-16">
          {brands.map((brand, i) => (
            <motion.div
              key={brand.name}
              className={`${sizeStyles[brand.size]} bg-ink flex flex-col items-center justify-center p-6 md:p-8 group cursor-pointer min-h-[100px] md:min-h-[140px]`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04, duration: 0.5 }}
              whileHover={{ backgroundColor: brand.color + "18" }}
              onMouseEnter={() => onCursorChange("hover")}
              onMouseLeave={() => onCursorChange("default")}
            >
              {/* Logo placeholder — text mark */}
              <div className="text-center">
                <p
                  className={`font-display font-black uppercase leading-tight transition-colors duration-300 group-hover:text-white text-white/40 ${
                    brand.size === "lg" ? "text-3xl md:text-5xl" : brand.size === "md" ? "text-xl md:text-2xl" : "text-base md:text-lg"
                  }`}
                  style={{ color: undefined }}
                >
                  <span className="group-hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {brand.name}
                  </span>
                </p>
                <p className="font-body text-white/20 text-xs mt-1 tracking-wider group-hover:text-white/40 transition-colors hidden md:block">
                  {brand.category}
                </p>
              </div>

              {/* Dot accent */}
              <motion.div
                className="w-1.5 h-1.5 rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: brand.color }}
              />
            </motion.div>
          ))}
        </div>

        {/* Become a sponsor CTA */}
        <motion.div
          className="border border-white/10 p-10 flex flex-col md:flex-row items-center justify-between gap-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <p className="font-body text-white/40 text-xs tracking-widest uppercase mb-2">¿Tu marca en el festival?</p>
            <h3 className="font-display font-black text-white text-4xl md:text-5xl uppercase">
              Sé parte de <span className="text-neon">35mm</span>
            </h3>
            <p className="font-body text-white/50 text-sm mt-3 max-w-lg">
              Conecta con el talento creativo universitario y posiciona tu marca ante más de 500 jóvenes creativos.
            </p>
          </div>
          <motion.a
            href="/aliados"
            className="flex-shrink-0 font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 border border-neon text-neon hover:bg-neon hover:text-ink transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => onCursorChange("cta")}
            onMouseLeave={() => onCursorChange("default")}
          >
            Conviértete en aliado →
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
