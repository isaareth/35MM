# 35mm — Festival de Cortos

Plataforma web de 35mm Festival de Cortos (Producciones TVU · Universidad EAFIT): landing pública + inscripción de equipos + panel administrativo.

## Estructura del repositorio

```
35mm_specs/       Especificaciones oficiales del proyecto (leer primero).
                  Ver 11_AUDIT_GAP_ANALYSIS.md para el estado actual, decisiones
                  tomadas y lo que falta.

frontend/         App de producción: Next.js 16 (App Router) + TypeScript +
                  Tailwind v4 + Framer Motion + Lenis. Landing + /inscripcion.

backend/          API de producción: Django 5 + Django REST Framework.
                  Inscripciones, auth de admin, exportación a Excel, correo
                  de confirmación.

LandingPage35mm/  Sandbox original de Figma Make. Ya no es el frontend de
                  producción (frontend/ lo reemplaza) — se conserva por si el
                  equipo lo sigue usando para iterar visualmente ahí.
```

## Desarrollo local

**Frontend** (`http://localhost:3050`):
```bash
cd frontend
pnpm install
pnpm dev
```

**Backend** (`http://localhost:8010`):
```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py createsuperuser
.venv\Scripts\python manage.py runserver 0.0.0.0:8010
```

Ambos leen configuración desde `.env` / `.env.local` (ver `.env.example` en cada carpeta). Ninguno de los dos arranca solo con `pnpm install` / `pip install` — falta crear esos archivos localmente a partir del ejemplo.

## Estado del proyecto

Ver [`35mm_specs/11_AUDIT_GAP_ANALYSIS.md`](35mm_specs/11_AUDIT_GAP_ANALYSIS.md) para la auditoría completa, el gap analysis y las decisiones tomadas hasta ahora. Backlog de trabajo pendiente en [`BACKLOG.md`](BACKLOG.md).

## Deploy

- Frontend → Vercel (raíz de deploy: `frontend/`).
- Backend → Railway o Render (raíz de deploy: `backend/`).
- Base de datos → Supabase PostgreSQL.
