---
description: Divide el plan técnico aprobado en tareas pequeñas, atómicas y verificables en tasks.md
---

# /sdd-tasks

Actúa bajo el rol de **planner** siguiendo estrictamente la metodología de la skill **sdd**.

## Parámetros
- **Especificación objetivo:** `specs/$1/`

## Contexto y comprobación previa
1. Lee y analiza en profundidad `specs/$1/spec.md` y `specs/$1/plan.md`.
2. Comprueba que el plan técnico esté aprobado formalmente antes de desglosar tareas.

## Restricción estricta
**NO escribas código de la aplicación ni edites archivos fuera del directorio `specs/`.**

## Instrucciones de generación
Genera o actualiza `specs/$1/tasks.md` cumpliendo con las siguientes reglas:
- **Granularidad atómica:** Tareas acotadas (estimadas en 20-30 minutos cada una).
- **Orden de dependencia:** Organizadas secuencialmente según su dependencia técnica lógica.
- **Límite de tareas:** Máximo 10 tareas en total. Si la funcionalidad requiere más de 10 tareas, **DETÉN la ejecución** y propón al usuario dividir la funcionalidad en specs independientes.
- **Trazabilidad:** Cada tarea debe referenciar explícitamente los Requisitos Funcionales (RF) que cubre.
- **Criterio de aceptación unívoco:** Cada elemento debe incluir una comprobación clara bajo el campo `Hecho cuando:`.

### Formato obligatorio de cada tarea
```markdown
- [ ] **Tn. <Descripción acción clara>.** RF-x, RF-y
  - Hecho cuando: <comprobación o test verificable>.
```
