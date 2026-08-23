# 35mm — Frontend & Design Specification

## Fuente visual prioritaria

La carpeta `LandingPage35mm` contiene una versión dinámica existente generada con Figma Make.

Esta versión debe conservarse y evolucionar.

La primera tarea del agente de desarrollo debe ser auditarla, no reemplazarla.

## Identidad

Colores de referencia:
- Background: #191718
- Purple: #6023CD
- Bright purple: #8D3EF6
- Cyan: #6EF9F4
- White: #FFFFFF
- Black: #000000

Tipografías:
- Intro Rust: display / branding / titulares.
- Inter: UI / información / formularios.
- EB Garamond: frases editoriales / contraste.

Si Intro Rust no está disponible legalmente para web, utilizar una alternativa adecuada o incorporar los archivos únicamente si cuentan con licencia.

## Dirección visual

Conservar:
- collage,
- fotografía,
- composición asimétrica,
- tipografía oversized,
- textura/grain,
- contraste,
- estética editorial,
- sensación audiovisual,
- movimiento,
- elementos superpuestos.

Evitar:
- apariencia SaaS,
- cards genéricas,
- hero corporativo,
- exceso de glassmorphism,
- gradients genéricos,
- animación sin propósito.

## Secciones públicas esperadas

- Home / Hero
- ¿Qué es 35mm?
- 35
- Ediciones anteriores
- Estadísticas
- Ganadores
- Inscripción
- Fechas importantes
- Reglas
- Marcas
- Producciones TVU
- Footer

La IA puede proponer una reorganización si la landing existente demuestra una arquitectura mejor, pero debe justificarla.

## Motion

Mantener y mejorar las animaciones existentes.

Tecnologías permitidas:
- Framer Motion
- GSAP / ScrollTrigger
- Lenis si realmente aporta valor

Aplicar:
- scroll reveal,
- kinetic typography,
- parallax,
- image reveal,
- stagger,
- hover interactions,
- microinteractions,
- transiciones.

Respetar `prefers-reduced-motion`.

## Responsive
La experiencia debe funcionar en:
- desktop,
- tablet,
- mobile.

Mobile no debe ser un simple desktop reducido.

## Accesibilidad
Implementar:
- HTML semántico,
- keyboard navigation,
- focus states,
- labels accesibles,
- contraste,
- reduced motion,
- estados de error claros.

## Formulario
El formulario de inscripción debe tener una UX clara aunque el resto de la web sea experimental.
