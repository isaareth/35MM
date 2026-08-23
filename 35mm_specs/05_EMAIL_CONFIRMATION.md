# 35mm — Email Confirmation Specification

## Objetivo
Enviar automáticamente una confirmación después de que una inscripción válida sea almacenada.

## Trigger
El correo se debe enviar solamente después de que el backend confirme que la inscripción fue guardada correctamente.

No enviar el correo antes de completar la transacción de registro.

## Destinatario
El correo del líder del equipo registrado en el formulario.

## Contenido mínimo
- Identidad de 35mm.
- Confirmación de recepción de la inscripción.
- Nombre del equipo, si ese campo existe en el formulario final.
- Próximos pasos.
- Fecha importante relevante, si corresponde.
- Enlace al Google Forms para entregar el cortometraje, cuando esté disponible.
- Información de contacto del festival.

## Proveedor
El backend debe abstraer el proveedor de correo.

Puede utilizarse un servicio transaccional como Resend, SMTP institucional u otro proveedor aprobado por el equipo.

No hardcodear:
- API keys,
- contraseñas,
- correos sensibles,
- URLs privadas.

## Fallo de correo
Un fallo del proveedor de correo no debe borrar una inscripción correctamente registrada.

Debe existir logging controlado del fallo para permitir reintento o revisión administrativa.

## Seguridad
No incluir información innecesaria o sensible en el correo.
