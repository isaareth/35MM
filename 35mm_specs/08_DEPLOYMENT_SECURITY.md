# 35mm — Deployment & Security Specification

## Frontend
Deploy:
Vercel

Repositorio:
GitHub

Flujo:
Git push -> Vercel build -> deployment

## Backend
Deploy:
Railway o Render

Framework:
Django + Django REST Framework

## Database
Supabase PostgreSQL.

## Variables de entorno

Nunca subir al repositorio:
- database credentials,
- Django secret key,
- email credentials,
- API keys,
- private Google URLs,
- tokens.

Utilizar `.env` local y variables de entorno del proveedor.

Crear `.env.example` con nombres de variables, sin valores secretos.

## Producción
Django debe utilizar:
- DEBUG=False
- SECRET_KEY segura
- ALLOWED_HOSTS configurado
- CORS restringido
- HTTPS
- CSRF correctamente configurado
- logging apropiado

## Frontend
Configurar la URL del backend mediante variable de entorno.

Ejemplo conceptual:
NEXT_PUBLIC_API_URL

No hardcodear URLs de producción en múltiples archivos.

## Google Forms
El enlace público del formulario de cortometrajes puede ser una variable configurable si cambia por edición.

## Google Drive
La carpeta de jurados puede mantenerse fuera de la plataforma.
No almacenar credenciales de Google en el frontend.

## Backups
Definir una estrategia de respaldo de PostgreSQL antes de producción.

## Observabilidad
Agregar logging útil para:
- errores de API,
- inscripciones,
- fallos de correo,
- exportaciones administrativas.

No registrar datos sensibles innecesariamente.
