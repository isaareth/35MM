# 35mm — Backlog

Estado detallado y justificación de cada decisión en [`35mm_specs/11_AUDIT_GAP_ANALYSIS.md`](35mm_specs/11_AUDIT_GAP_ANALYSIS.md). Este archivo es la lista de trabajo accionable; cuando algo se termine, márcalo aquí.

## Bloqueadores para producción real

- [x] **Provisionar Supabase PostgreSQL** — conectado y migrado (2026-08-23). Importante: usar la cadena del **Session Pooler** (`aws-0-us-east-2.pooler.supabase.com:5432`), no la conexión directa — esta última resuelve a una IP IPv6 que muchas redes no alcanzan.
- [x] **API key real de Resend** — conectada y probada.
- [ ] **Verificar un dominio propio en Resend** (resend.com/domains). Hoy el envío funciona con `onboarding@resend.dev`, que en modo sandbox **solo puede mandar correos a la dirección dueña de la cuenta de Resend** (`sifloress@eafit.edu.co`) — no puede mandarle nada a un líder de equipo real. `eafit.edu.co` existe como remitente pero **no está verificado** (se probó y Resend lo rechaza); hay que verificar `eafit.edu.co` (requiere acceso DNS de EAFIT) o un subdominio/dominio propio de 35mm antes de poder enviar confirmaciones a inscritos reales.
- [ ] **Desplegar `frontend/` en Vercel** (root directory: `frontend/`).
- [ ] **Desplegar `backend/` en Railway o Render** (root directory: `backend/`), con `DEBUG=False`, `DJANGO_ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` apuntando al dominio real de Vercel.
- [ ] Setear `NEXT_PUBLIC_API_URL` en Vercel apuntando al backend ya desplegado.
- [ ] Crear el superusuario de admin real en producción (el `admin` / `devpassword123` es solo de desarrollo local, no debe existir en prod).
- [ ] Definir `SHORTFILM_FORM_URL` (enlace real de Google Forms del cortometraje) cuando exista.
- [ ] Definir estrategia de backup de Supabase antes de considerar el sistema listo para recibir inscripciones reales (`08_DEPLOYMENT_SECURITY.md`).

## Calidad / accesibilidad (AC-025, AC-026, AC-027)

- [ ] Implementar `prefers-reduced-motion` (hoy ninguna animación lo respeta).
- [ ] Auditar estados de foco visibles con teclado — el cursor custom (`cursor: none` global) puede estar ocultando el foco nativo.
- [ ] Revisar labels/aria en el formulario de `/inscripcion` con un lector de pantalla real.

## Contenido pendiente de verificar (no inventar, confirmar con el equipo de 35mm)

- [ ] Duración del cortometraje ("3–15 minutos") — texto heredado de Figma Make, sin confirmar.
- [ ] Formatos de entrega ("MP4/MOV, 1080p") — sin confirmar.
- [ ] Fecha de apertura de inscripciones ("1 de septiembre de 2026") — sin confirmar.
- [ ] Reemplazar fotografía stock de Unsplash (Hero, About, TVU, Winners) por fotografía real de 35mm/TVU — hay material real en el portafolio PDF que se puede usar como fuente.

## Pruebas

- [ ] Tests del backend: serializers (validación 4-6 integrantes, líder único, email duplicado), permisos de endpoints admin, que un fallo de correo no revierta el registro. `backend/registrations/tests.py` existe pero está vacío.
- [ ] Tests del frontend: al menos smoke test de `/inscripcion` (validación, envío, estados de error/éxito).
- [ ] CI (GitHub Actions) que corra esos tests en cada push/PR.

## Mejoras futuras (no bloqueantes)

- [ ] Panel de administrador con la identidad visual de 35mm en Next.js, en vez del Django Admin genérico (hoy es funcionalmente completo, solo visualmente genérico).
- [ ] Endpoints `/api/public/event|dates|rules` si el equipo de 35mm quiere editar esos textos sin hacer deploy (hoy son estáticos en el frontend, ver `07_DATABASE_API.md`).
- [ ] Decidir el destino final de `LandingPage35mm/` (sandbox de Figma Make) — conservarla indefinidamente, archivarla, o retirarla una vez que `frontend/` esté validado en producción.

## Hecho

- [x] Auditoría completa del proyecto y gap analysis (`35mm_specs/11_AUDIT_GAP_ANALYSIS.md`).
- [x] Migración de la landing a Next.js sin cambios visuales.
- [x] Corrección de numeración de edición (3ra, no 4ta) en todo el sitio.
- [x] Marcas aliadas reales (reemplazadas las inventadas por Figma Make).
- [x] Backend Django + DRF: modelo `Registration`/`Participant`, validación, throttling.
- [x] Formulario real de inscripción en `/inscripcion` (4-6 integrantes, campos confirmados).
- [x] Login de admin, listado, conteo y exportación a Excel.
- [x] Correo de confirmación (abstraído, funcional en modo consola).
- [x] Repositorio Git conectado a GitHub (`https://github.com/isaareth/35MM`).
