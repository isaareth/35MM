# 35mm — SDD Workflow

## Regla
No comenzar generando código indiscriminadamente.

El agente debe trabajar siguiendo especificaciones.

## Fase 1 — Auditoría
1. Leer todos los archivos `/specs`.
2. Inspeccionar completamente `LandingPage35mm`.
3. Identificar framework, dependencias y estructura.
4. Identificar qué funcionalidades ya existen.
5. Identificar qué debe conservarse.
6. Identificar inconsistencias o riesgos.

## Fase 2 — Gap analysis
Comparar:
- estado actual,
- especificaciones,
- requisitos pendientes.

Clasificar:
- ya implementado,
- parcialmente implementado,
- faltante,
- requiere decisión.

## Fase 3 — Plan
Proponer:
- arquitectura final,
- estructura de carpetas,
- cambios mínimos al frontend,
- backend Django,
- modelos,
- endpoints,
- integración de correo,
- integración Google Forms,
- autenticación admin,
- exportación Excel,
- deployment.

## Fase 4 — Implementación
Implementar por incrementos pequeños.

Cada incremento debe:
1. modificar,
2. probar,
3. verificar,
4. documentar.

## Fase 5 — Validación
Ejecutar criterios de aceptación.

## Regla de conservación
No reemplazar la landing existente solo porque una implementación nueva sea más fácil.

Si se propone reemplazar un componente, justificar:
- problema actual,
- beneficio,
- impacto visual,
- impacto funcional.

## Preguntas
Si faltan los campos definitivos del formulario, no inventarlos.
Marcar el punto como `TBD` y pedir la información necesaria antes de implementar esa parte.

## Entregables que debe producir el agente
Antes de modificar código:
- auditoría del proyecto,
- diagnóstico,
- arquitectura propuesta,
- plan por fases,
- dependencias necesarias,
- riesgos,
- decisiones pendientes.
