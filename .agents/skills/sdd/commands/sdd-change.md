---
description: Gestiona un nuevo requisito o cambio sobre una spec existente modificando primero la spec, sin tocar código
---

# /sdd-change

Actúa bajo el rol de **planner** siguiendo estrictamente la metodología de la skill **sdd**.

## Petición de cambio
- **Especificación objetivo:** `specs/$1/` (o la spec indicada en el argumento)
- **Modificación requerida:** $ARGUMENTS

## Regla crítica inicial
**NO toques código de la aplicación ni edites archivos fuera del directorio `specs/`.**

## Instrucciones de ejecución
1. **Actualizar la spec:** Edita `specs/$1/spec.md` incorporando el nuevo Requisito Funcional (RF) o adaptando el existente redactado estrictamente en formato **EARS**, junto con sus casos límite y las exclusiones que queden fuera de alcance.
2. **Impacto en arquitectura y tareas:** Analiza y redacta un resumen del impacto técnico:
   - Qué módulos o decisiones de `plan.md` requerirán actualización posterior.
   - Qué tareas nuevas o modificadas deberán agregarse a `tasks.md`.
3. **Presentación de cambios:** Muestra al usuario el `diff` exacto de las modificaciones introducidas en `specs/$1/spec.md`.

## Parada obligatoria
**DETÉN la ejecución y espera la aprobación explícita del usuario.** No edites `plan.md` ni `tasks.md`, ni implementes cambios en el código, hasta que el diff de la spec quede aprobado formalmente.