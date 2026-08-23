# 35mm — Database & API Specification

## Estado
MODELO IMPLEMENTADO (2026-08-23) en `backend/registrations/models.py`, a partir de los campos confirmados en `04_REGISTRATION.md`.

## Principios de modelado

Separar conceptualmente inscripción y participantes en una relación uno-a-muchos (evita columnas repetitivas `Participante1_Nombre`, `Participante2_Nombre`, etc.).

No existe un modelo `Team` separado: el formulario real no tiene campo de "nombre de equipo", así que un `Registration` ya representa al equipo completo — añadir un modelo `Team` vacío habría sido una abstracción sin campos reales que sostener.

## Entidades implementadas

### Registration
Representa la inscripción de un equipo (equivale al "equipo").

- `id` (UUID, PK)
- `accepted_terms` (bool)
- `confirmed_eligibility` (bool)
- `created_at` (datetime)

### Participant
Representa una persona inscrita. Entre 4 y 6 por `Registration`.

- `registration` (FK → Registration)
- `position` (1-6; único por registration)
- `is_leader` (bool; exactamente uno por registration, siempre position=1)
- `full_name`
- `document_id`
- `institution`
- `institutional_email`
- `phone`

### Admin/User
Gestionado mediante el sistema de autenticación de Django (`is_staff`); sin cuentas para participantes.

## API implementada

POST /api/registrations/ — pública, con throttling (5/hora por IP) contra abuso.
POST /api/auth/login/ — login de administrador (sesión Django).
POST /api/auth/logout/
GET /api/admin/registrations/ — requiere sesión de staff.
GET /api/admin/registrations/count/
GET /api/admin/registrations/export/ — genera el `.xlsx` en el momento, sin ruta pública cacheable.

`GET /api/public/event|dates|rules/` **no se implementaron**: el contenido público (fecha, lugar, reglas) sigue siendo estático dentro de los componentes de `frontend/`, tal como permite esta misma spec ("puede ser servida desde el frontend si es estática"). Se construyen solo si el equipo de 35mm pide editar esos textos sin hacer deploy.

## API pública
La información pública se sirve desde el frontend (estática) por ahora; ver nota arriba.

## API administrativa
Debe requerir autenticación y autorización.

## Excel
La exportación debe generarse en backend y no exponer una ruta pública descargable.

## CORS
Configurar explícitamente el dominio del frontend.

No utilizar `CORS_ALLOW_ALL_ORIGINS=True` en producción.
