# 35mm — Backlog

Estado detallado y justificación de cada decisión en [`35mm_specs/11_AUDIT_GAP_ANALYSIS.md`](35mm_specs/11_AUDIT_GAP_ANALYSIS.md). Este archivo es la lista de trabajo accionable; cuando algo se termine, márcalo aquí.

**En producción:** frontend en Vercel (https://35mm-tvu.vercel.app), backend en Railway (https://35mm-production.up.railway.app), base de datos en Supabase.

## Bloqueadores para producción real

- [x] Provisionar Supabase PostgreSQL — conectado y migrado. Usa el **Session Pooler** (`aws-0-us-east-2.pooler.supabase.com:5432`), no la conexión directa (resuelve a IPv6, muchas redes no la alcanzan).
- [x] API key real de Resend — conectada y probada.
- [ ] **Verificar un dominio propio en Resend** (resend.com/domains). Hoy el envío funciona con `onboarding@resend.dev`, que en modo sandbox **solo puede mandar correos a la dirección dueña de la cuenta de Resend** — no le llega nada a un líder de equipo real. `eafit.edu.co` existe como remitente pero no está verificado (Resend lo rechazó al probarlo). Opciones: verificar un subdominio de `eafit.edu.co` (necesita DNS de la universidad) o comprar un dominio propio de 35mm (más rápido, control total).
- [x] Desplegar `frontend/` en Vercel.
- [x] Desplegar `backend/` en Railway.
- [x] `NEXT_PUBLIC_API_URL` en Vercel apuntando al backend real.
- [ ] `CORS_ALLOWED_ORIGINS` en Railway debe decir `https://35mm-tvu.vercel.app` (el dominio de Vercel cambió de `35mm-orpin` a `35mm-tvu` durante el deploy — confirmar que quedó actualizado).
- [ ] Crear el superusuario de admin **real** en producción — el `admin`/`devpassword123` usado para probar es solo de desarrollo, no debe quedar en la base real.
- [ ] Definir `SHORTFILM_FORM_URL` (enlace real de Google Forms del cortometraje) cuando exista.
- [ ] Definir estrategia de backup de Supabase antes de recibir inscripciones reales (`08_DEPLOYMENT_SECURITY.md`).

## Necesita confirmación del equipo de 35mm (no se inventó, se dejó como estaba)

- [ ] **Fechas de inscripción y entrega para 2026.** El brief oficial (`35mm_specs/Brief_35MM_Producciones_TVU.pdf`) trae fechas de **2025** ("23-29 de septiembre de 2025", entrega "30 de octubre de 2025") y la premiación con un año imposible ("20 de noviembre de 207890") — el documento mismo marca esa sección como "POR REVISAR". El sitio sigue mostrando el placeholder "1 de septiembre de 2026" hasta tener las fechas reales.
- [ ] **Marcas/aliados, ganadores y galería de ediciones anteriores.** El brief marca esas tres secciones como "FALTA" de su lado. Esto confirma que los nombres de ganadores que hoy aparecen en `Winners.tsx` (Equipo Cronos, Frame by Frame, etc.) nunca fueron reales — son contenido inventado por Figma Make. Pendiente decidir: ¿dejarlos como contenido de ejemplo, o cambiar la sección a un estado honesto tipo "Ganadores — próximamente" mientras llega la info real?

## Calidad / accesibilidad (AC-025, AC-026, AC-027)

- [ ] Implementar `prefers-reduced-motion` (hoy ninguna animación lo respeta).
- [ ] Auditar estados de foco visibles con teclado — el cursor custom (`cursor: none` global) puede estar ocultando el foco nativo.
- [ ] Revisar labels/aria en el formulario de `/inscripcion` con un lector de pantalla real.

## Contenido pendiente

- [ ] Reemplazar fotografía stock de Unsplash (Hero, About, TVU, Winners) por fotografía real de 35mm/TVU — hay material real en el portafolio PDF que se puede usar como fuente.

## Pruebas

- [ ] Tests del backend: serializers (validación 4-6 integrantes, líder único, email duplicado), permisos de endpoints admin, que un fallo de correo no revierta el registro. `backend/registrations/tests.py` existe pero está vacío.
- [ ] Tests del frontend: al menos smoke test de `/inscripcion` (validación, envío, estados de error/éxito).
- [ ] CI (GitHub Actions) que corra esos tests en cada push/PR.

## Mejoras futuras (no bloqueantes)

- [ ] Endpoints `/api/public/event|dates|rules` si el equipo de 35mm quiere editar esos textos sin hacer deploy (hoy son estáticos en el frontend, ver `07_DATABASE_API.md`).
- [ ] Decidir el destino final de `LandingPage35mm/` (sandbox de Figma Make) — conservarla indefinidamente, archivarla, o retirarla ahora que `frontend/` ya está en producción.

## Hecho

- [x] Auditoría completa del proyecto y gap analysis.
- [x] Migración de la landing a Next.js sin cambios visuales.
- [x] Corrección de numeración de edición (3ra, no 4ta) en todo el sitio.
- [x] Marcas aliadas reales (reemplazadas las inventadas por Figma Make).
- [x] Backend Django + DRF: modelo `Registration`/`Participant`, validación, throttling.
- [x] Formulario real de inscripción en `/inscripcion` (4-6 integrantes, campos confirmados).
- [x] Login de admin, listado, conteo y exportación a Excel.
- [x] Correo de confirmación (abstraído; probado con Resend real).
- [x] Repositorio Git conectado a GitHub (`https://github.com/isaareth/35MM`).
- [x] Frontend desplegado en Vercel, backend en Railway, base de datos en Supabase.
- [x] Contenido real del brief institucional aplicado (Sobre 35MM, temática, formato técnico, criterios de evaluación, contacto).
- [x] Panel de administrador propio en `/admin` (Next.js, identidad de 35mm): login por token, dashboard con totales y últimas inscripciones, listado buscable, descarga de Excel.
