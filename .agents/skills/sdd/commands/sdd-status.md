---
description: Informa de la fase actual, progreso de tareas y siguiente acción recomendada para una spec
---

# /sdd-status

Actúa bajo el rol de **coordinator** siguiendo la metodología de la skill **sdd**.

## Parámetros
- **Especificación objetivo:** `specs/$1/`

## Restricción estricta
**NO modifiques ni crees ningún archivo en el disco: es un comando exclusivo de consulta y reporte.**

## Instrucciones de auditoría de estado
1. **Lectura de contexto:** Revisa en `specs/$1/` los archivos existentes (`spec.md`, `plan.md`, `tasks.md`), además de `MEMORY.md`.
2. **Generación del informe:** Presenta un resumen conciso estructurado exactamente en estos 3 puntos:
   - **Fase actual y estado:** Fase del ciclo SDD (Borrador, Clarificación, Planificación, Tareas, Implementación o Validación) y estado del documento.
   - **Progreso de tareas:** Balance de tareas completadas frente al total (`x de y completadas`), citando la última tarea realizada si existe.
   - **Siguiente paso:** La acción concreta que corresponde realizar ahora, indicando el comando exacto `/sdd-*` a ejecutar a continuación.

*Formato de salida:* Directo, breve y sin explicaciones innecesarias (máximo 6-8 líneas).