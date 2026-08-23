# 35mm — Product Specification

## Objetivo
Crear una experiencia web oficial para 35mm que conserve la identidad visual y dinámica del portafolio y de la landing existente, y que además permita gestionar las inscripciones de manera estructurada.

## Usuarios

### Visitante / participante
Puede:
1. Conocer 35mm.
2. Consultar información del festival.
3. Consultar ediciones anteriores.
4. Consultar ganadores anteriores.
5. Consultar marcas.
6. Consultar Producciones TVU.
7. Consultar reglas.
8. Visualizar fechas importantes.
9. Inscribirse mediante un formulario propio.
10. Recibir confirmación de inscripción si es el líder que envió el formulario.
11. Acceder al enlace externo para enviar el cortometraje mediante Google Forms.

### Administrador
Puede:
1. Iniciar sesión.
2. Ver el total de inscritos.
3. Consultar la información de inscritos.
4. Descargar la información en formato Excel.

### Jurados
No tendrán cuenta ni panel dentro de la plataforma.
El equipo organizador les proporcionará externamente el enlace de la carpeta de Google Drive donde estarán los cortometrajes.

## Flujo principal de inscripción

1. El participante entra a `/inscripcion`.
2. Completa el formulario propio de 35mm.
3. El frontend valida los datos.
4. El backend valida nuevamente los datos.
5. Django registra la inscripción.
6. El sistema identifica al líder del equipo.
7. Se envía una confirmación al correo del líder.
8. Se muestra una pantalla de inscripción exitosa.
9. La pantalla puede mostrar el enlace al Google Forms para el cortometraje.
10. El cortometraje se entrega por Google Forms y Google Drive, fuera de la plataforma.

## Principios
- La experiencia visual es importante, pero nunca debe impedir la claridad del formulario.
- La información administrativa debe estar protegida.
- La landing debe seguir siendo rápida.
- El sistema debe ser escalable sin implementar funcionalidades innecesarias.
