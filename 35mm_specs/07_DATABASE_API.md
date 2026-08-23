# 35mm — Database & API Specification

## Estado
El modelo definitivo depende de los campos del formulario que todavía serán entregados.

## Principios de modelado

Separar conceptualmente:
- inscripción,
- equipo,
- participantes.

Evitar almacenar todos los integrantes como columnas repetitivas si el formulario final permite una relación uno-a-muchos.

## Posibles entidades

### Registration
Representa una inscripción.

Campos exactos: TBD.

### Team
Representa el equipo.

Campos exactos: TBD.

### Participant
Representa una persona inscrita.

Campos exactos: TBD.

### Admin/User
Gestionado mediante el sistema de autenticación de Django.

## API mínima esperada

La implementación puede ajustar los nombres, pero debe cubrir:

POST /api/registrations/
GET /api/public/event/
GET /api/public/dates/
GET /api/public/rules/
POST /api/auth/login/
GET /api/admin/registrations/
GET /api/admin/registrations/count/
GET /api/admin/registrations/export/

No crear endpoints que no sean necesarios.

## API pública
La información pública puede ser servida desde el frontend si es estática, o desde API si se requiere administración dinámica.

## API administrativa
Debe requerir autenticación y autorización.

## Excel
La exportación debe generarse en backend y no exponer una ruta pública descargable.

## CORS
Configurar explícitamente el dominio del frontend.

No utilizar `CORS_ALLOW_ALL_ORIGINS=True` en producción.
