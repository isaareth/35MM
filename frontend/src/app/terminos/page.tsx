import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones — 35mm Festival de Cortos",
  description:
    "Términos y condiciones de participación del 35mm Festival de Cortos, Producciones TVU.",
};

export default function TerminosPage() {
  return (
    <div className="bg-ink min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-16 py-28 md:py-36">
        <p className="font-body text-xs tracking-[0.4em] uppercase text-neon mb-4">
          3ra Edición · 2026
        </p>
        <h1
          className="font-display font-black text-white uppercase leading-none mb-4"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          Términos y<br />condiciones
        </h1>
        <p className="font-body text-white/50 text-sm mb-16">
          Participación en el Festival de Cortos 35mm, organizado por Producciones TVU.
        </p>

        <article className="flex flex-col gap-14 font-body text-white/70 text-base leading-relaxed">
          <Section n="1" title="Generalidades">
            <P>
              1.1. El Festival de Cortos 35mm, organizado por Producciones TVU, se dirige a
              estudiantes universitarios del Valle de Aburrá para fomentar la creatividad y el
              talento en la producción audiovisual.
            </P>
          </Section>

          <Section n="2" title="Requisitos de participación">
            <P>
              2.1. Podrán participar estudiantes matriculados en instituciones de educación
              superior del Valle de Aburrá.
            </P>
            <P>2.2. Los equipos deberán conformarse por entre 4 y 6 personas.</P>
            <P>
              2.3. Cada participante debe cumplir con los requisitos de inscripción, entre los que
              se encuentran aceptar el presente documento.
            </P>
          </Section>

          <Section n="3" title="Formato de los cortos">
            <P>
              3.1. Los cortos deben tener una duración de 3 a 5 minutos y el tráiler debe tener
              una duración de entre 30 a 40 segundos. De igual forma, deben cumplir con las
              dimensiones establecidas por Producciones TVU, 1920 x 1080.
            </P>
            <P>
              3.2. La temática de esta tercera edición se anunciará antes de la apertura de
              inscripciones y los participantes deberán ceñirse a dicha categoría sin excepción.
            </P>
            <P>3.3. Los cortos deberán ser originales y producidos específicamente para el festival.</P>
            <p className="font-body text-white/40 text-sm italic">
              * Revisar anexo con aviso de privacidad y autorización para el tratamiento de datos
              (sección 10).
            </p>
          </Section>

          <Section n="4" title="Inscripción y entrega">
            <P>
              4.1. El proceso de inscripción se realizará <strong className="text-white">del 2 de septiembre al 20 de septiembre de 2026</strong>.
            </P>
            <P>
              4.2. Los cortos deberán ser entregados antes del <strong className="text-white">22 de octubre de 2026</strong> en
              el formato especificado por Producciones TVU, así como tráiler y opciones de poster
              correspondientes al mismo.
            </P>
            <P>4.3. No se aceptarán cortos entregados fuera del plazo establecido.</P>
          </Section>

          <Section n="5" title="Proyección en espacios aliados y premiación">
            <P>
              5.1. Un grupo de jurados seleccionados por Producciones TVU evaluará los cortos en
              función del guion y narrativa, cinematografía, actuación, montaje y ritmo, diseño de
              sonido, dirección de arte y dirección.
            </P>
            <P>
              5.2. La ceremonia de premiación será el <strong className="text-white">14 de noviembre de 2026</strong>, y
              los cortos ganadores de cada categoría se proyectarán en esta. Las categorías son:
              mejor corto, mejor dirección, mejor guion, mejor sonido, mejor imagen, mejor
              montaje, mejor dirección de arte y mejor actuación.
            </P>
            <P>
              5.3. Los cortos se proyectarán en espacios aliados del evento, con el fin de dar
              mayor visibilidad a los cortos recibidos.
            </P>
            <P>
              5.4. Para la reclamación de los premios, los ganadores deberán entregar un
              certificado de estudio que demuestre su vinculación a un programa en una institución
              de educación superior, so pena de no poder hacer efectiva la reclamación de dichos
              premios (ver anexo 10.1).
            </P>
          </Section>

          <Section n="6" title="Derechos">
            <P>
              6.1. Al participar, los equipos otorgan a Producciones TVU el derecho de
              reproducción y distribución de sus cortos conforme al consentimiento firmado. Dicho
              uso se limitará a muestras que visibilicen los cortos entregados o la publicidad del
              evento, a través de plataformas digitales, eventos públicos, actividades
              promocionales y medios de comunicación, siempre respetando la integridad de la obra.
            </P>
            <P>
              6.2. Con la participación se autoriza a Producciones TVU a usar el material
              entregado en exposiciones que den visibilidad a los cortos, en razón de la edición
              actual o de la publicidad de futuras ediciones.
            </P>
            <P>
              6.3. Los grupos participantes deberán encargarse de que sus cortos no contengan
              plagios de ningún tipo, y deben estar acordes a los derechos de autor y la normativa
              vigente en Colombia. Producciones TVU no se hará responsable de reclamaciones que
              surjan a raíz de estos.
            </P>
            <P>
              6.4. Producciones TVU se compromete a no hacer cambios que afecten los cortos
              entregados. Cualquier cambio necesario deberá ser autorizado previamente por el
              grupo creador.
            </P>
            <P>
              6.5. El consentimiento otorgado sobre los derechos del corto será válido desde el
              momento en que se acepten estos términos y tendrá una vigencia de cinco (5) años.
            </P>
            <P>6.6. El consentimiento aplica para cualquier territorio, sin limitación geográfica.</P>
            <P>
              6.7. El participante acepta que no recibirá compensación económica por el uso del
              corto bajo estas condiciones.
            </P>
            <P>
              6.8. Si Producciones TVU llega a un acuerdo con alguna marca, empresa o entidad para
              la distribución, exhibición o difusión de los cortometrajes, los autores y/o equipos
              aceptan que no recibirán compensación económica ni participación en los beneficios
              derivados.
            </P>
            <P>
              6.9. Los derechos morales pertenecen siempre a los autores del corto; Producciones
              TVU no tendrá ninguna injerencia sobre estos.
            </P>
            <P>
              6.10. Los participantes otorgan a Producciones TVU y a sus patrocinadores el derecho
              de usar su imagen y nombre en material audiovisual, fotográfico o promocional
              relacionado con el evento, durante y después de su realización, incluyendo medios
              digitales, redes sociales y sitios web.
            </P>
            <P>
              6.11. Al aceptar estos términos, los participantes confirman que, en caso de ser
              menores de edad, cuentan con el permiso de sus padres o tutores legales para
              participar y para que su imagen sea expuesta en el evento; lo mismo aplica para
              cualquier actor menor de edad que aparezca en el corto.
            </P>
          </Section>

          <Section n="7" title="Obligaciones">
            <P>
              7.1. Los participantes se comprometen a respetar las fechas y condiciones del
              festival, así como los requisitos técnicos y creativos establecidos por Producciones
              TVU.
            </P>
            <P>
              7.2. Los grupos participantes se comprometen a obtener los permisos debidos para el
              uso de la imagen de las personas que aparezcan en sus cortos.
            </P>
            <P>
              7.3. Los grupos se asegurarán de que su corto esté libre de plagios y asumirán la
              responsabilidad de cualquier reclamación derivada de estos.
            </P>
            <P>
              7.4. Producciones TVU no se hace responsable de la convivencia, gestión de
              conflictos internos ni la dinámica de trabajo dentro de los equipos participantes.
            </P>
            <P>
              7.5. Los participantes actuarán conforme a lo descrito en este documento a partir
              del momento de su aceptación.
            </P>
          </Section>

          <Section n="8" title="Descalificación">
            <P>
              8.1. Producciones TVU se reserva el derecho de descalificar a cualquier equipo que
              no cumpla con estos términos y condiciones.
            </P>
            <P>
              8.2. Queda prohibida la participación de integrantes de Producciones TVU en la
              creación de los cortos.
            </P>
            <P>
              8.3. No se permitirá la participación de personas que no estén vinculadas a un
              programa de educación superior en una institución del Valle de Aburrá.
            </P>
          </Section>

          <Section n="9" title="Aceptación de los términos">
            <P>
              9.1. La inscripción en el Festival de Cortos 35mm implica la aceptación total de
              estos términos y condiciones.
            </P>
            <P>
              9.2. Los equipos se regirán por estos términos y condiciones a partir del momento de
              la aceptación.
            </P>
          </Section>

          <Section n="10" title="Anexos">
            <p className="font-body font-semibold text-white text-sm uppercase tracking-wide mb-3">
              10.1. Aviso de privacidad y autorización para el tratamiento de datos personales
            </p>
            <P>
              Conforme a lo dispuesto en la Ley de Habeas Data sobre los datos de carácter
              personal incluidos en la(s) base(s) de datos y/o archivos cuyo Responsable del
              Tratamiento, en los términos de la Ley 1581 de 2012, el Decreto Reglamentario 1377
              de 2013, el Decreto 1074 de 2015 y la Política de protección de datos personales de
              la Universidad EAFIT, Producciones TVU —grupo estudiantil autorizado y supervisado
              por la Universidad EAFIT, identificado con NIT 890901389-5, domiciliado en
              Medellín, Carrera 49 #7 Sur 50— tratará de forma confiable, libre, segura, veraz y
              transparente, con acceso y circulación restringida, los datos personales
              suministrados en virtud de la participación en el Festival de Cortos 35mm.
            </P>
            <P>
              Ante cualquier duda sobre esta política de tratamiento de datos, escribir a{" "}
              <a href="mailto:tvu@eafit.edu.co" className="text-neon hover:underline">
                tvu@eafit.edu.co
              </a>
              .
            </P>
          </Section>
        </article>

        <div className="mt-20 pt-10 border-t border-white/10">
          <a
            href="/inscripcion"
            className="inline-block font-body font-semibold text-sm tracking-widest uppercase px-8 py-4 bg-purple text-white hover:bg-neon hover:text-ink transition-all duration-300"
          >
            Volver a inscripción →
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-black text-white uppercase leading-none mb-5 flex items-baseline gap-4"
        style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>
        <span className="text-purple-bright">{n}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-3 border-l-2 border-white/10 pl-6">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-white/70 text-[15px] leading-relaxed">{children}</p>;
}
