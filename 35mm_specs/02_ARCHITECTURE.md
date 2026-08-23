# 35mm — Architecture Specification

## Arquitectura objetivo

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS y/o CSS Modules
- Framer Motion
- GSAP cuando sea necesario

Frontend deployment:
- Vercel

Backend:
- Django
- Django REST Framework

Backend deployment:
- Railway o Render

Database:
- Supabase PostgreSQL

External services:
- Google Forms para recepción de cortometrajes.
- Google Drive para almacenamiento de cortometrajes.
- Proveedor SMTP/API para correos de confirmación.

## Flujo

Browser
  -> Next.js / Vercel
  -> Django REST API
  -> Supabase PostgreSQL

Formulario de cortometraje
  -> Google Forms
  -> Google Drive

Confirmación
  Django
  -> proveedor de correo
  -> correo del líder

## Decisión de despliegue

Vercel se utilizará para el frontend.

Django no se debe asumir como un backend que se despliega directamente junto al frontend en Vercel. Se recomienda desplegar Django en Railway o Render y consumirlo desde Next.js mediante HTTPS/REST.

Esto NO significa que Django y Vercel sean incompatibles. Significa que, para este proyecto, es más limpio separar el deployment del frontend y del backend.

## Requisito de integración

El frontend existente debe analizarse antes de modificar su arquitectura. La IA implementadora debe identificar:
- framework real utilizado por Figma Make,
- estructura de carpetas,
- dependencias,
- sistema de estilos,
- componentes,
- animaciones,
- assets,
- rutas existentes,
- puntos de integración.

No asumir una estructura que no exista.
