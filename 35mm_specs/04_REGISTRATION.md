# 35mm — Registration Specification

## Estado
PENDIENTE DE LOS CAMPOS DEFINITIVOS DEL FORMULARIO.

No inventar campos.

El equipo de 35mm proporcionará posteriormente la lista exacta de información que debe recolectarse.

## Requisitos ya confirmados

- El formulario será propio de la página.
- El participante líder será quien envíe la inscripción.
- La inscripción se almacenará en la base de datos.
- El sistema debe registrar la información de todos los participantes solicitados.
- El sistema debe identificar los datos del líder.
- Al enviar correctamente el formulario se debe enviar una confirmación al correo del líder.
- Después de la inscripción se debe proporcionar acceso al enlace de Google Forms para subir el cortometraje, si el flujo final del festival así lo define.

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
