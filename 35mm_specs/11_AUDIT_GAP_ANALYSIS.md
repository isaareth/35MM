# 35mm — Auditoría, Gap Analysis y Plan (Fase 1-3 SDD)

Generado siguiendo `10_SDD_WORKFLOW.md`.

## Addendum — decisiones resueltas (post-entrega)

Tras presentar este análisis, el usuario confirmó lo siguiente:

- **S.1 Next.js:** Aprobado migrar a Next.js si es necesario para escalabilidad, **con la condición estricta de que el diseño visual quede exactamente igual**. Cualquier cambio de framework debe verificarse componente por componente contra el baseline Vite antes de darse por bueno.
- **S.2 Numeración de edición:** Confirmado — el evento del 14 de noviembre de 2026 es la **3ra edición** (no la 4ta). **Ya corregido** en `Hero.tsx`, `Timeline.tsx`, `Stats.tsx`, `Winners.tsx`, `Registration.tsx` y `Footer.tsx` — ver commit "Correct edition numbering...". Verificado en navegador (dev server, sin errores de consola) tras el cambio.
- **S.5 `landing.html` huérfano:** Eliminado (commit "Remove orphan landing.html prototype").
- **S.9–S.13 (decisiones menores):** el usuario autorizó usar mi recomendación en cada una. Quedan así, documentadas como decisión tomada (ajustable si el equipo de 35mm objeta):
  - **Backend host:** Railway (S.10) — mejor developer experience para Django+Postgres en proyectos chicos-medianos; Render queda como alternativa si Railway no conviene por costo.
  - **Estructura de repos:** monorepo `frontend/` + `backend/` (S.11) — más simple de versionar y desplegar para un equipo pequeño, con Vercel apuntando a `frontend/` y Railway/Render a `backend/`.
  - **Panel admin:** Django Admin nativo como MVP inicial (S.9) — cubre login, listado y export en mucho menos tiempo que una UI custom; se reevalúa una UI en Next.js solo si el equipo de 35mm pide una experiencia de marca ahí también.
  - **Proveedor de correo:** Resend (S.12) — API simple, buen soporte de dominios propios y de plantillas; se abstrae detrás de `core/email.py` para poder cambiarlo sin tocar lógica de negocio.
  - **Git/GitHub (S.13):** repositorio git **ya inicializado** en `C:\Proyecticos\35mm` con un commit baseline previo a cualquier cambio, y un segundo commit por cada incremento aplicado desde entonces. Falta conectar un remoto en GitHub cuando el usuario lo indique (no se ha hecho — requiere URL/cuenta del usuario).

Lo que sigue del documento es el análisis original tal como se presentó; las secciones D.32/S.1/S.2/S.5 mencionadas arriba ya no están abiertas, se dejan intactas abajo para trazabilidad histórica de por qué se llegó a cada decisión.

---

## A. Resumen ejecutivo

`LandingPage35mm` es una SPA **Vite 8 + React 19 + TypeScript + Tailwind CSS v4** generada con Figma Make, de una sola página con 10 secciones ancladas (`#hero`, `#que-es`, `#timeline`, `#ganadores`, `#inscripcion`, `#marcas`, `#tvu`...). Visualmente es un trabajo editorial sólido y coherente con la identidad de marca: colores, tipografías y dirección visual coinciden con `03_FRONTEND.md`. Framer Motion + Lenis ya cubren scroll reveal, parallax, kinetic typography, stagger y microinteracciones.

Sin embargo, tiene tres brechas estructurales grandes:

1. **No es Next.js.** `02_ARCHITECTURE.md` pide Next.js como framework objetivo; el proyecto real es un SPA Vite sin router. Esta es la decisión arquitectónica #1 a resolver antes de tocar código (ver sección S).
2. **La sección "Inscripción" no tiene formulario.** Es un bloque de CTA + FAQ. No hay campos, no hay validación, no hay estados de envío, no hay ruta `/inscripcion` real.
3. **No existe nada de backend**: sin Django, sin base de datos, sin auth, sin correo, sin Excel. Es esperado en esta etapa, pero se documenta como base cero.

Además, gran parte del contenido (marcas aliadas, cifras de "3ra edición" como pasada, fotografía) es **contenido placeholder inventado por Figma Make**, no datos reales de 35mm/TVU. El portafolio PDF entregado contradice la numeración de ediciones que usa la landing (ver hallazgo D.1). Esto no se toca sin confirmación.

---

## B. Arquitectura actual detectada

```
LandingPage35mm/
├── .figma/make/          # tooling propio de Figma Make (dev server, deploy, site.json)
├── index.html            # shell Vite, monta #root
├── package.json          # ver dependencias abajo
├── vite.config.ts        # Vite + @tailwindcss/vite + plugins de Figma Make
├── tsconfig.json
├── src/
│   ├── main.tsx           # entrypoint React
│   ├── App.tsx            # composición de secciones, Lenis smooth-scroll, cursor state
│   ├── index.css          # @theme tokens Tailwind v4, fonts, keyframes globales
│   ├── components/
│   │   ├── Navbar.tsx      # nav fija, menú móvil full-screen
│   │   ├── CustomCursor.tsx# cursor custom con 4 estados (default/hover/cta/drag)
│   │   ├── GrainOverlay.tsx# textura de grano vía SVG feTurbulence
│   │   └── sections/
│   │       ├── Hero.tsx, About.tsx, NumberSection.tsx, Timeline.tsx,
│   │       ├── Stats.tsx, Winners.tsx, Registration.tsx, Brands.tsx,
│   │       └── TVU.tsx, Footer.tsx
│   └── imports/            # image.png, image-1.png — sin referenciar en el código (dead weight, ~1.3MB)
```

- **Framework:** React 19.0 + React DOM 19.0, Vite 8.0.5, TypeScript 5.7 (strict, ver `tsconfig.json`), `@vitejs/plugin-react`.
- **Estilos:** Tailwind CSS v4 vía `@tailwindcss/vite` (sin `tailwind.config.js`; tokens en `@theme` dentro de `index.css`). No hay CSS Modules.
- **Motion:** `framer-motion@13.1.1` (scroll-linked parallax, `whileInView`, `AnimatePresence`, `layoutId`), `lenis@1.3.26` (smooth scroll). GSAP no está instalado ni se usa — no hace falta, Framer Motion cubre el motion actual.
- **Routing:** ninguno. No hay `react-router-dom` ni Next.js App/Pages Router. Todo es scroll-to-anchor dentro de un único `<main>`.
- **Fuentes:** Google Fonts `@import` en `index.css` — Barlow Condensed (display), Inter (body), EB Garamond (editorial). **Intro Rust no está incluida**; Barlow Condensed la sustituye, lo cual es exactamente lo que permite `03_FRONTEND.md` si Intro Rust no tiene licencia web. Se documenta como decisión ya tomada, no como gap.
- **Colores:** `--color-purple #6023CD`, `--color-purple-bright #8D3EF6`, `--color-neon #6EF9F4`, `--color-ink #191718` — coinciden exactamente con la spec.
- **Assets/imágenes:** todas las fotos de las secciones son hotlinks a Unsplash (`images.unsplash.com/...`), no fotografía real de 35mm/TVU. Dos PNG en `src/imports/` no se usan en ningún componente.
- **Accesibilidad:** `html { cursor: none }` global (para el cursor custom); no se detectó manejo de `prefers-reduced-motion` en ningún componente ni en CSS; no hay `focus-visible` styles explícitos; el cursor custom se desactiva en `pointer: coarse` (móvil), lo cual es correcto.
- **Funcionalidades ya construidas:** Hero con parallax + ticker, About con grid editorial, "35" kinetic number section, Timeline de 3 ediciones con tabs, Stats con count-up, Winners con filtro + grid tipo film-strip, Registration (solo CTA+FAQ, **sin formulario real**), Brands (grid de 12 marcas placeholder), TVU (about de Producciones TVU), Footer.
- **Herramientas del entorno Figma Make:** `.figma/make/*` son scripts propios del sandbox de Figma Make (dev/build/deploy/format) — no forman parte del stack de producción y se ignoran en el análisis de arquitectura.
- **Archivo huérfano:** `landing.html` en la raíz del proyecto (fuera de `LandingPage35mm/`) es un prototipo estático distinto (Tailwind CDN, Material Design 3 tokens, tipografías Bricolage Grotesque/JetBrains Mono — nada que ver con la identidad de 35mm). No es el activo canónico según `03_FRONTEND.md` ("La carpeta `LandingPage35mm`... es la fuente visual prioritaria"). Se recomienda no usarlo como referencia; confirmar si se puede archivar/eliminar (ver S.5).

---

## C. Arquitectura objetivo recomendada

Manteniendo la landing visual intacta y resolviendo la decisión Next.js (S.1), la arquitectura objetivo:

```
Browser
  → Frontend (Next.js App Router, TS, Tailwind v4, Framer Motion) — Vercel
  → Django REST Framework API (HTTPS) — Railway/Render
  → Supabase PostgreSQL

Cortometraje: Google Forms → Google Drive (fuera del sistema)
Confirmación: Django → proveedor de email transaccional → correo del líder
Jurados: enlace de Drive entregado manualmente, fuera de la plataforma
```

Principio de integración: la landing actual se **migra**, no se **reescribe**. Cada componente de `src/components/sections` se traslada tal cual (mismo JSX/Tailwind/Framer Motion) dentro de la nueva estructura de rutas; solo cambian los puntos de entrada (`main.tsx`→ `app/layout.tsx`, anchors → posible ruta dedicada `/inscripcion`) y se añade el cliente API. Ver justificación de este cambio en D.1 y S.1.

---

## D. Gap Analysis

Leyenda: ✅ Implementado · 🟡 Parcial · ⛔ Faltante · ❓ TBD/requiere decisión

| # | Requisito | Estado | Notas |
|---|---|---|---|
| D.1 | Framework Next.js | ❓ | Landing real es Vite SPA. Requiere decisión de migración antes de cualquier cambio (S.1). |
| D.2 | Identidad visual (colores/tipografías/dirección) | ✅ | Coincide con `03_FRONTEND.md` casi 1:1. Intro Rust sustituida legítimamente por Barlow Condensed. |
| D.3 | Secciones públicas (Home, Qué es, Ediciones, Ganadores, Marcas, TVU, Footer) | ✅ | Todas presentes y con motion de calidad. |
| D.4 | Sección "Fechas importantes" independiente | 🟡 | La fecha (14 nov 2026) aparece repetida en Hero/About/Registration, pero no hay una sección/página dedicada de fechas clave (apertura inscripción, fecha límite corto, evento). |
| D.5 | Sección "Reglas" | 🟡 | Solo existe como FAQ dentro de Registration, con datos de reglas (tamaño de equipo, duración, formato) que **no están verificados contra fuente oficial** — parecen contenido inventado por Figma Make. No inventar más sobre esto; confirmar o corregir. |
| D.6 | Responsive (desktop/tablet/mobile) | ✅ (a validar en navegador) | Uso consistente de breakpoints `md:`; cursor custom se desactiva en touch. Falta validación visual real en los 3 tamaños (pendiente de Fase 4/5). |
| D.7 | Motion (scroll reveal, parallax, kinetic type, stagger, hover) | ✅ | Implementado con Framer Motion en casi todas las secciones. |
| D.8 | `prefers-reduced-motion` | ⛔ | No se encontró ninguna media query ni chequeo de `useReducedMotion` en el código. Requerido por AC-025. |
| D.9 | Accesibilidad (labels, focus states, teclado) | 🟡 | Falta estado de foco visible explícito y no hay formulario aún que auditar. Cursor custom global (`cursor:none`) debe revisarse para no perjudicar navegación por teclado. |
| D.10 | Formulario propio de inscripción | ⛔ | `Registration.tsx` es solo CTA + FAQ, no hay `<form>`, ni campos, ni estados (vacío/error/cargando/éxito). Bloqueado por campos TBD del formulario (por diseño, no inventar). |
| D.11 | Ruta `/inscripcion` | ⛔ | No existe routing; todo es ancla `#inscripcion` en la misma página. |
| D.12 | Validación frontend | ⛔ | No aplica todavía — depende de D.10. |
| D.13 | Validación backend | ⛔ | No hay backend. |
| D.14 | Almacenamiento de inscripción (DB) | ⛔ | No hay backend/DB. |
| D.15 | Identificación del líder de equipo | ⛔ | Depende del modelo de datos, que depende de los campos TBD. |
| D.16 | Confirmación por correo al líder | ⛔ | No hay backend ni proveedor de correo configurado. |
| D.17 | Pantalla de éxito / feedback claro | ⛔ | No implementada (no hay formulario aún). |
| D.18 | Enlace a Google Forms para el cortometraje | ⛔ | No aparece en ningún lugar de la landing actual (ni como botón, ni como texto). |
| D.19 | Protección del endpoint (spam, duplicados, payloads inválidos) | ⛔ | No hay backend. Estrategia a definir en implementación (rate limiting, honeypot/captcha, constraint de unicidad). |
| D.20 | Panel administrativo (login) | ⛔ | No existe. |
| D.21 | Dashboard: total inscritos/participantes, últimas inscripciones | ⛔ | No existe. |
| D.22 | Listado/consulta de inscripciones | ⛔ | No existe. |
| D.23 | Exportación a Excel | ⛔ | No existe. |
| D.24 | Backend Django + DRF | ⛔ | No existe ningún proyecto backend en el repo. |
| D.25 | Base de datos Supabase PostgreSQL | ⛔ | No provisionada. |
| D.26 | CORS restringido / seguridad producción | ⛔ | No aplica aún (no hay backend). |
| D.27 | Variables de entorno (`.env.example`, `NEXT_PUBLIC_API_URL`) | ⛔ | No existen en ningún proyecto. |
| D.28 | Deploy Vercel (frontend) | ⛔ | No configurado (sin `vercel.json` ni proyecto vinculado). |
| D.29 | Deploy Railway/Render (backend) | ⛔ | No aplica, no hay backend. |
| D.30 | No gestión de jurados / no carga de cortos / no dashboard de participantes | ✅ (por diseño) | Correctamente fuera de alcance; nada en el código actual lo implementa, consistente con la spec. |
| D.31 | Contenido de "Marcas aliadas" | ❓ | Los 12 nombres en `Brands.tsx` (Claro, Bancolombia, Cinépolis, Adobe, DJI, Sony Music, etc.) **no coinciden con los patrocinadores reales** listados en el portafolio PDF (Monterojo Gourmet, TeleMedellín, Sushi Light, Clandestino, Hatsu, Nacional de Chocolates, NODO/EAFIT, Débora Arango, D Dermatológica, Cineprox, Arde la Selva, Comfama, Solución Adhesiva). Contenido placeholder de Figma Make. No reemplazar sin confirmación (ver S.6). |
| D.32 | Numeración de ediciones / cifras de "en números" | ❓ | Contradicción entre landing y portafolio — ver hallazgo detallado abajo. |
| D.33 | Fotografía real del festival | 🟡 | Landing usa fotos stock de Unsplash; el portafolio PDF contiene fotografía real del evento (auditorio, jurados, bastidores) que podría reemplazarlas eventualmente. No se toca sin decisión (S.7). |
| D.34 | Archivo `landing.html` suelto en la raíz | ❓ | Prototipo no relacionado visualmente con la identidad 35mm. Aclarar si se conserva, archiva o elimina. |
| D.35 | Assets sin usar (`src/imports/image.png`, `image-1.png`) | 🟡 | ~1.3MB muertos, no referenciados por ningún componente. Candidatos a limpieza cuando se autorice tocar el repo. |
| D.36 | Tests (frontend/backend) | ⛔ | No existen. |
| D.37 | CI/CD | ⛔ | No existe. |

### Hallazgo D.32 en detalle — inconsistencia de edición

El portafolio (`Portafolio 35mm Producciones TVU.pdf`) muestra:
- "2 ediciones exitosas" ya realizadas (1ra "El último día" 2022, 2da "Lo que no se dice" 2023).
- La edición que se está promocionando activamente para patrocinadores/jurados, con fecha **14 de noviembre de 2026**, es la **"3RA EDICIÓN — El objeto de la satisfacción"**.

La landing actual (`Timeline.tsx`, `About.tsx`, `Hero.tsx`, `Registration.tsx`) trata **"El objeto de la satisfacción" (2024) como ya ocurrida**, la etiqueta "3ra edición activa" en el badge de `About.tsx`, y presenta el evento del 14 de noviembre de 2026 como la **"4ta edición"**.

Es decir: la landing parece adelantada una edición completa respecto al material oficial más reciente (el portafolio). Esto afecta Hero, About, Timeline, Stats y Registration simultáneamente. **No se corrige sin confirmación explícita** — ver S.2.

---

## E. Estructura de carpetas recomendada

Asumiendo migración a Next.js (pendiente de confirmación, S.1). Se muestra la estructura objetivo; **no se crea hasta aprobar la migración**.

### Frontend (`frontend/` o raíz si se reemplaza el repo actual)

```
frontend/
├── app/
│   ├── layout.tsx              # <- src/main.tsx + fonts + GrainOverlay + CustomCursor
│   ├── page.tsx                # <- src/App.tsx (Home: Hero..Footer, sin Registration form)
│   ├── inscripcion/
│   │   ├── page.tsx             # formulario dedicado (D.10/D.11)
│   │   └── exito/page.tsx       # pantalla de confirmación post-envío
│   └── globals.css              # <- src/index.css (tokens @theme, fonts, keyframes)
├── components/
│   ├── layout/ (Navbar, Footer, CustomCursor, GrainOverlay)   # movidos tal cual
│   └── sections/ (Hero, About, NumberSection, Timeline, Stats,
│                   Winners, Brands, TVU)                       # movidos tal cual
├── features/
│   └── registration/
│       ├── RegistrationForm.tsx      # nuevo, campos TBD
│       ├── useRegistrationForm.ts    # validación (zod/react-hook-form)
│       └── api.ts                    # POST /api/registrations/
├── lib/
│   ├── api-client.ts             # fetch wrapper, NEXT_PUBLIC_API_URL
│   └── constants.ts              # fechas, links Google Forms, etc.
├── public/                       # assets estáticos reales (reemplazan Unsplash)
├── .env.example
└── package.json
```

Cambios mínimos reales sobre el código existente: mover archivos de `src/` a `app/`/`components/`, sin tocar el JSX interno de las secciones salvo imports.

### Backend (nuevo, `backend/`)

```
backend/
├── config/                       # settings Django (base/dev/prod split)
│   ├── settings/
│   │   ├── base.py, dev.py, prod.py
│   ├── urls.py
│   └── wsgi.py / asgi.py
├── apps/
│   ├── registrations/
│   │   ├── models.py             # Registration, Team, Participant (TBD campos)
│   │   ├── serializers.py
│   │   ├── views.py              # POST /api/registrations/
│   │   ├── validators.py         # anti-spam, duplicados
│   │   └── admin.py
│   ├── content/                  # datos públicos: event info, dates, rules
│   │   ├── models.py
│   │   └── views.py
│   ├── accounts/                 # auth admin (Django auth + DRF token/session)
│   └── exports/
│       └── excel.py              # generación .xlsx (openpyxl)
├── core/
│   ├── email.py                  # abstracción del proveedor de correo
│   └── permissions.py            # IsAdminUser custom, etc.
├── requirements.txt / pyproject.toml
├── .env.example
└── manage.py
```

---

## F. Modelo de datos preliminar (campos TBD)

Separación conceptual pedida en `07_DATABASE_API.md`: **Registration → Team → Participant**, uno-a-muchos.

```
Registration
├── id (PK, UUID)
├── team              → FK a Team (o 1:1 si "equipo" = "inscripción")
├── status             (recibida / confirmada / ...)  — TBD si se necesita
├── created_at
└── updated_at

Team
├── id (PK)
├── registration       → FK/1:1 a Registration
├── name                TBD (¿tiene nombre el equipo?)
├── leader              → FK a Participant (participante marcado como líder)
└── [demás campos: TBD]

Participant
├── id (PK)
├── team                → FK a Team
├── full_name           TBD (nombre exacto de campo)
├── email                TBD (obligatorio al menos para el líder)
├── phone                TBD
├── role                 TBD (¿director/productor/actor libre?)
├── is_leader            boolean
└── [demás campos: TBD]

AdminUser  → modelo estándar de Django (auth_user + is_staff/is_superuser)
```

**No se agregan más campos, constraints de longitud, choices ni validaciones hasta recibir la lista definitiva.** Cuando lleguen, este archivo se actualiza (sección F) y se generan las migraciones reales.

---

## G. API REST propuesta

Basada en el mínimo de `07_DATABASE_API.md`, sin añadir endpoints no solicitados:

| Método | Ruta | Auth | Propósito |
|---|---|---|---|
| POST | `/api/registrations/` | Pública (con protección anti-abuso) | Crear inscripción (team + participants anidados) |
| GET | `/api/public/event/` | Pública | Info del festival (fecha, lugar, edición vigente) |
| GET | `/api/public/dates/` | Pública | Fechas importantes |
| GET | `/api/public/rules/` | Pública | Reglas de participación |
| POST | `/api/auth/login/` | Pública | Login de administrador |
| GET | `/api/admin/registrations/` | Admin | Listado/consulta de inscripciones |
| GET | `/api/admin/registrations/count/` | Admin | Totales (equipos/participantes) |
| GET | `/api/admin/registrations/export/` | Admin | Descarga `.xlsx` |

Notas:
- `/api/public/event|dates|rules/` pueden empezar como contenido estático servido desde el frontend (Next.js) si no hay necesidad real de administrarlos dinámicamente; se activa API real solo si el equipo de 35mm pide editar esos textos sin deploy. Confirmar (S.8).
- Export de Excel **no** expone URL pública descargable directa: requiere sesión/token admin en cada request (`07_DATABASE_API.md`).
- CORS: `CORS_ALLOWED_ORIGINS` limitado al dominio de Vercel, nunca `CORS_ALLOW_ALL_ORIGINS=True`.

---

## H. Flujo completo de inscripción

1. Usuario navega a `/inscripcion` (ruta dedicada, no solo ancla).
2. Completa el formulario propio (campos TBD) — estados: vacío → escribiendo → validando → error de campo → enviando → cargando → éxito/error inesperado (`04_REGISTRATION.md`).
3. Frontend valida (react-hook-form + zod o equivalente) antes de habilitar envío.
4. `POST /api/registrations/` → Django valida de nuevo (server-side, nunca confía solo en el cliente).
5. Si válido: se persiste `Registration` + `Team` + `Participant[]` en una transacción atómica.
6. Tras el commit exitoso (nunca antes), se dispara el envío de correo de confirmación al líder de forma asíncrona o con manejo de fallo aislado (un fallo de correo **no** revierte el registro — AC-013).
7. El frontend recibe `201 Created` y navega a la pantalla de éxito, mostrando (si corresponde) el enlace externo al Google Forms del cortometraje.
8. El cortometraje se entrega fuera de la plataforma vía Google Forms → Google Drive.

---

## I. Flujo de confirmación por correo

1. Trigger único: después de que el registro se confirma guardado en DB (nunca antes, nunca en paralelo especulativo).
2. Backend abstrae el proveedor detrás de una interfaz (`core/email.py`) para poder cambiar de Resend/SMTP institucional sin tocar la lógica de negocio.
3. Contenido mínimo (`05_EMAIL_CONFIRMATION.md`): identidad 35mm, confirmación de recepción, nombre del equipo (si el campo existe), próximos pasos, fecha relevante, enlace a Google Forms del corto (si ya está disponible), contacto del festival.
4. Si el envío falla: se registra el fallo (logging controlado, ej. tabla `EmailLog` o logs estructurados) para reintento/revisión manual — la inscripción ya guardada **no se borra ni se marca inválida**.
5. Sin hardcodear API keys/URLs — todo vía variables de entorno.

---

## J. Diseño del panel administrativo

- **Acceso:** login con Django auth (usuario/contraseña) — sin registro público de administradores, ver `06_ADMIN.md`. Session o token DRF, a decidir en implementación (no bloqueante).
- **Dashboard:** tarjetas con total de inscritos/equipos, total de participantes (si el modelo lo permite), últimas N inscripciones.
- **Listado:** tabla paginada de inscripciones, con búsqueda/orden básicos si el volumen lo justifica (probablemente sí, dado que se estiman ~35 equipos/500 participantes por edición).
- **Exportación:** botón "Descargar Excel" → `GET /api/admin/registrations/export/` con auth, genera `.xlsx` server-side (no ruta pública).
- **Fuera de alcance explícito:** jurados, evaluación/calificación, carga de cortos, portal de participantes (`06_ADMIN.md`).
- Puede vivir dentro del mismo Next.js frontend bajo una ruta protegida (`/admin`, gate por sesión/JWT del backend) o usar el Django Admin nativo como MVP rápido antes de construir UI custom — a decidir en fase de implementación según prioridad (ver S.9).

---

## K. Estrategia para exportar Excel

- Generación **server-side** en Django con `openpyxl` (o `xlsxwriter`), nunca cálculo/composición en el cliente.
- Endpoint protegido por autenticación + permisos de administrador (`IsAdminUser`).
- Encabezados legibles derivados del modelo final (una vez lleguen los campos TBD).
- Una fila por inscripción/participante según se defina la granularidad (equipo vs persona) — a resolver junto con el modelo de datos.
- Nombre de archivo identificable, ej. `inscripciones_35mm_YYYYMMDD.xlsx`.
- No exponer una URL de descarga pública cacheable; cada descarga pasa por el endpoint autenticado.

---

## L. Estrategia de integración con Google Forms y Google Drive

- El enlace del Google Forms de entrega de cortometraje se maneja como **variable de entorno/configuración** (`08_DEPLOYMENT_SECURITY.md`: "puede ser una variable configurable si cambia por edición"), no hardcodeado en múltiples archivos.
- Se expone en dos lugares: (1) pantalla de éxito post-inscripción, (2) correo de confirmación — ambos condicionados a que el enlace esté configurado (si aún no existe, no se muestra un botón roto).
- La carpeta de Google Drive con los cortometrajes/jurados se gestiona 100% fuera de la plataforma; el sistema **no** almacena ni referencia credenciales de Google en frontend ni backend.
- No se implementa ninguna integración programática con la API de Google Forms/Drive — es solo un enlace externo.

---

## M. Estrategia de despliegue

| Componente | Proveedor | Flujo |
|---|---|---|
| Frontend | Vercel | `git push` → build Next.js → deploy automático; preview deployments por PR |
| Backend | Railway o Render (decisión abierta, S.10) | Deploy desde el mismo repo (monorepo) o repo separado; `DEBUG=False`, `ALLOWED_HOSTS`, HTTPS forzado |
| Base de datos | Supabase PostgreSQL | Conexión vía `DATABASE_URL`; backups a definir antes de producción (`08_DEPLOYMENT_SECURITY.md`) |
| Repositorio | GitHub | Actualmente el proyecto **no es un repo git** (`Is a git repository: false`) — se necesita inicializar antes de cualquier flujo CI/CD |

Notas:
- Monorepo (`frontend/` + `backend/`) vs. dos repos separados es una decisión abierta (S.11); ambos son viables con Vercel+Railway/Render.
- CORS del backend debe apuntar exactamente al dominio de Vercel (preview + producción).

---

## N. Variables de entorno necesarias

**Frontend (`.env.example`):**
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SHORTFILM_FORM_URL=      # link de Google Forms (configurable por edición)
```

**Backend (`.env.example`):**
```
DJANGO_SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=
DATABASE_URL=                         # Supabase Postgres
CORS_ALLOWED_ORIGINS=
EMAIL_PROVIDER=                       # resend | smtp | ...
EMAIL_API_KEY=                        # o credenciales SMTP según proveedor
EMAIL_FROM_ADDRESS=
FESTIVAL_CONTACT_EMAIL=
SHORTFILM_FORM_URL=
```

Nunca se sube `.env` real al repo; solo `.env.example` con nombres, sin valores (`08_DEPLOYMENT_SECURITY.md`).

---

## O. Dependencias nuevas que realmente sean necesarias

**Frontend (si se migra a Next.js):**
- `next` — framework objetivo de la spec.
- `react-hook-form` + `zod` (o `@hookform/resolvers`) — validación de formulario robusta, evita reinventar manejo de estados de error.
- Nada de UI kit adicional (Tailwind ya cubre estilos; no se necesita shadcn/mui para mantener la estética editorial custom).

**Backend (nuevo):**
- `django`, `djangorestframework`
- `django-cors-headers`
- `psycopg[binary]` (o `psycopg2-binary`) — driver Postgres/Supabase
- `python-decouple` o `django-environ` — manejo de variables de entorno
- `openpyxl` — export Excel
- `django-ratelimit` o equivalente — protección básica anti-abuso del endpoint público (`04_REGISTRATION.md`)
- Cliente del proveedor de correo elegido (ej. `resend` SDK) o `django.core.mail` con backend SMTP

No se agregan librerías de gestión de jurados, storage de video, ni dashboards de participantes — están fuera de alcance.

---

## P. Plan de implementación por fases

1. **Fase 0 — Decisiones bloqueantes.** Resolver S.1 (Next.js sí/no), recibir campos del formulario, resolver S.2 (numeración de edición). Sin esto, cualquier código de inscripción/contenido sería inventado.
2. **Fase 1 — Migración de shell (si aplica Next.js).** Mover `LandingPage35mm` a Next.js App Router preservando 1:1 el JSX/estilos/motion existentes. Verificar visualmente que nada cambió.
3. **Fase 2 — Backend base.** Proyecto Django + DRF, conexión a Supabase, `/api/public/*` estáticos o mínimos, despliegue esqueleto en Railway/Render + CORS.
4. **Fase 3 — Modelo + formulario de inscripción real.** Una vez lleguen los campos: `Registration/Team/Participant`, migraciones, `RegistrationForm.tsx` con validación, `POST /api/registrations/`, pantalla de éxito, protección anti-abuso.
5. **Fase 4 — Correo de confirmación.** Proveedor configurado vía env vars, plantilla con identidad 35mm, logging de fallos.
6. **Fase 5 — Panel admin.** Login, dashboard, listado, export Excel, protegido por auth.
7. **Fase 6 — Contenido/QA visual.** Resolver S.2/S.6/S.7 (edición correcta, marcas reales, fotografía real), limpiar assets sin usar, validar responsive real en navegador, `prefers-reduced-motion`, accesibilidad de foco/teclado.
8. **Fase 7 — Endurecimiento de producción.** `DEBUG=False`, `ALLOWED_HOSTS`, HTTPS, CSRF, logging, estrategia de backup de Postgres, variables de entorno finales en Vercel/Railway/Render.

Cada incremento dentro de cada fase: modificar → probar → verificar → documentar, por `10_SDD_WORKFLOW.md`.

---

## Q. Pruebas necesarias

- **Frontend:** tests de componente para `RegistrationForm` (estados de validación/error/éxito) una vez existan los campos; smoke test de navegación (`/`, `/inscripcion`); verificación manual responsive en desktop/tablet/mobile; auditoría de accesibilidad (labels, foco, `prefers-reduced-motion`) — AC-025/026/027.
- **Backend:** tests unitarios de serializers/validators (incluyendo casos de payload inválido, duplicados, spam); test de integración del flujo completo de `POST /api/registrations/` → persistencia → intento de envío de correo (mockeado); test de que un fallo de correo no revierte el registro (AC-013); tests de permisos en endpoints `/api/admin/*` (AC-021).
- **Excel:** test de que el archivo generado tiene encabezados correctos y una fila por registro según el modelo final.
- **Seguridad:** verificación de que no hay secretos en el repo (AC-022), CORS restringido (AC-023), HTTPS en producción (AC-024).

---

## R. Riesgos técnicos

1. **Migración a Next.js puede introducir regresiones visuales** si no se replica con cuidado cada hook de scroll/parallax (`useScroll`, `useTransform` dependen de refs y del contenedor de scroll — Lenis + Next.js requieren integración cuidadosa, especialmente con App Router y RSC vs Client Components).
2. **Formulario bloqueado por campos TBD** — cualquier avance de Fase 3 antes de recibirlos implica trabajo desechable o, peor, contenido inventado que viola la regla explícita de la spec.
3. **Inconsistencia de edición (D.32)** puede propagarse a copy del formulario, correos y Excel si no se resuelve antes de escribir contenido nuevo.
4. **Contenido placeholder (marcas, reglas del FAQ, fotografía)** puede terminar en producción si no se marca claramente como "pendiente de reemplazo" antes del lanzamiento.
5. **Envío de correo y persistencia no atómicos** si se implementan mal — riesgo de perder la relación 1:1 entre "inscripción guardada" y "correo intentado" (mitigado por diseño en H/I, pero fácil de romper si el correo se envía de forma síncrona bloqueante sin manejo de excepción).
6. **Cursor custom (`cursor:none` global) y ausencia de `prefers-reduced-motion`** son riesgos de accesibilidad reales, no solo estéticos — deben resolverse antes de considerar el sitio "listo" (AC-025/026).
7. **Ausencia de repositorio git** — sin control de versiones no hay forma segura de iterar en incrementos pequeños ni de desplegar vía GitHub→Vercel/Railway. Bloquea M/P si no se resuelve primero.
8. **Volumen esperado (~35 equipos, ~500 participantes por edición)** es pequeño — no hay riesgo real de escala, pero sí de UX en el panel admin si el listado no pagina/filtra desde el día uno.

---

## S. Decisiones que todavía necesitan confirmación

1. **¿Next.js sí o no?** — La spec de arquitectura pide Next.js; la landing real es Vite SPA. Migrar implica riesgo de regresión visual pero alinea con el resto del stack (SSR de contenido público, rutas reales como `/inscripcion`, despliegue nativo en Vercel). Mantener Vite implica desviarse de `02_ARCHITECTURE.md` pero es más rápido y de menor riesgo para la landing ya construida. **Esta es la decisión más bloqueante de todo el plan.**
2. **Numeración de edición (D.32):** ¿el evento del 14 de noviembre de 2026 es la 3ra o la 4ta edición? El portafolio dice 3ra; la landing actual dice 4ta. Afecta Hero, About, Timeline, Stats, Registration y cualquier copy de correo/Excel.
3. **Campos definitivos del formulario de inscripción** — pendientes por diseño, según instrucción explícita del usuario ("los campos definitivos serán entregados posteriormente").
4. **Reglas de participación reales** (tamaño de equipo, duración del corto, formatos aceptados, costo, fechas de apertura/cierre) — el FAQ actual parece contenido inventado por Figma Make; confirmar si es correcto, corregirlo, o marcarlo como definitivo.
5. **Archivo `landing.html` suelto en la raíz** — ¿se conserva como referencia, se archiva o se elimina? No es parte de `LandingPage35mm` ni coincide con la identidad visual de la spec.
6. **Lista real de marcas/patrocinadores** — el portafolio trae una lista distinta a la que hoy aparece en `Brands.tsx`. ¿Se reemplaza por la del portafolio, se espera una lista más actualizada, o se deja como "diseño de ejemplo" hasta nueva instrucción?
7. **Fotografía real vs. stock de Unsplash** — ¿se reemplazan las imágenes de Hero/About/TVU/Winners por fotografía real de 35mm/TVU (parte de ella disponible en el portafolio) en algún momento del proyecto, y quién la provee en alta resolución?
8. **Contenido público (`/api/public/event|dates|rules`)** — ¿estático en el frontend o necesita administrarse dinámicamente desde el backend/admin? Afecta si esos endpoints se construyen en Fase 2 o se difieren.
9. **Panel admin: Django Admin nativo vs. UI custom en Next.js** — impacta tiempo de entrega; Django Admin es más rápido para un MVP, UI custom da mejor experiencia/consistencia visual con la marca.
10. **Railway vs. Render** para el backend — la spec deja la elección abierta; no hay preferencia detectada en el repo.
11. **Monorepo vs. repos separados** para frontend/backend.
12. **Proveedor de correo transaccional** — Resend, SMTP institucional de EAFIT, u otro — la spec lo deja abierto y configurable.
13. **Inicializar git/GitHub ahora o más adelante** — el directorio de trabajo actual no es un repositorio git; se necesita antes de poder aplicar el flujo de deploy de M.

---

## PRÓXIMO PASO

Para poder avanzar a la Fase 2 (scaffolding real, sin código descartable), necesito de ti, en este orden de prioridad:

1. **Next.js sí/no** (S.1) — es la decisión que determina si el siguiente paso es "migrar la landing a Next.js" o "mantenerla en Vite y construir el backend alrededor tal cual está".
2. **Confirmación de la numeración de edición** (S.2): ¿3ra o 4ta edición es la del 14 de noviembre de 2026? Esto define si corrijo contenido existente o lo dejo intacto.
3. **Los campos definitivos del formulario de inscripción**, cuando estén listos — con ellos diseño el modelo de datos final (F), el formulario real (H) y el endpoint (G) sin inventar nada.

Mientras tanto, si quieres, puedo dejar listas (sin tocar código) las decisiones menores (S.5–S.13: repo git, marcas reales, fotografía, admin nativo vs. custom, proveedor de correo, Railway vs. Render) con una recomendación puntual por cada una, para que solo tengas que aprobar o corregir.
