# 35mm — Registration Specification

## Estado
CAMPOS CONFIRMADOS (2026-08-23), a partir del formulario de Google Forms usado en ediciones anteriores (capturas de pantalla entregadas por el usuario). Implementado en `backend/registrations` y `frontend/src/app/inscripcion`.

## Campos del formulario

Por equipo (`Registration`):
- Aceptación de términos y condiciones (checkbox, obligatorio).
- Confirmación de elegibilidad: todos los integrantes cursan un programa en una institución de educación superior del Valle de Aburrá (checkbox, obligatorio).

Por integrante (`Participant`), entre 4 y 6 por equipo — el participante 1 es el representante del grupo:
- Nombre completo
- Documento de identidad
- Institución de educación superior
- Correo institucional
- Celular

No existe campo de "nombre de equipo" en el formulario real — el equipo se identifica únicamente por sus integrantes.

## Requisitos ya confirmados

- El formulario será propio de la página. Implementado en `/inscripcion`.
- El participante líder (posición 1, "representante del grupo") será quien envíe la inscripción.
- La inscripción se almacena en la base de datos (`Registration` + `Participant` 1:N).
- El sistema registra la información de entre 4 y 6 participantes.
- El sistema identifica al líder mediante `Participant.is_leader`.
- Al enviar correctamente el formulario se envía una confirmación al correo institucional del líder.
- El enlace de Google Forms para el cortometraje es configurable (`SHORTFILM_FORM_URL`); se muestra en el correo y puede mostrarse en la pantalla de éxito cuando esté definido.

## UX mínima

Estados:
1. Formulario vacío.
2. Usuario escribiendo.
3. Validación.
4. Error de campo.
5. Envío.
6. Cargando.
7. Inscripción exitosa.
8. Error inesperado.

## Validación

Debe existir validación:
- en frontend para feedback inmediato,
- en backend para seguridad e integridad.

No confiar únicamente en validación frontend.

## Protección
Implementar medidas contra:
- spam,
- solicitudes duplicadas,
- payloads inválidos,
- inyección,
- abuso del endpoint.

La estrategia concreta debe definirse durante la implementación.

## Confirmación
El correo de confirmación debe:
- dirigirse al líder,
- confirmar que la inscripción fue recibida,
- incluir información útil de la inscripción,
- incluir próximos pasos,
- incluir el enlace al formulario de cortometraje si corresponde,
- utilizar identidad visual básica de 35mm.

El proveedor de correo debe ser configurable mediante variables de entorno.
