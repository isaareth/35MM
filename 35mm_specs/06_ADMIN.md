# 35mm — Admin Specification

## Objetivo
Crear un panel administrativo sencillo para consultar y exportar las inscripciones.

## Acceso
Solo usuarios administradores autenticados.

No crear cuentas para participantes.

## Funcionalidades

### Dashboard
Mostrar como mínimo:
- total de inscritos/equipos, según la definición final,
- total de participantes si los datos permiten calcularlo,
- últimas inscripciones.

### Listado
Mostrar la información relevante de las inscripciones.

Debe permitir al menos:
- consultar,
- buscar si resulta necesario,
- ordenar o filtrar si el volumen lo justifica.

### Exportación
Botón:
`Descargar Excel`

Debe generar un archivo `.xlsx` con la información de inscritos.

La exportación debe realizarse desde el backend o mediante un mecanismo seguro equivalente.

El archivo debe tener:
- encabezados claros,
- una fila por registro según el modelo definido,
- formato legible,
- nombre de archivo identificable.

## No incluir
- gestión de jurados,
- evaluación,
- calificación,
- carga de cortometrajes,
- portal de participantes.

## Seguridad
El endpoint de exportación debe requerir autenticación y permisos administrativos.
