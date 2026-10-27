---
description: Implementa UNA sola tarea de una spec aprobada con tests primero (uso: /sdd-implement 002-nombre T3)
---

# /sdd-implement

Actúa bajo el rol de **implementer** siguiendo estrictamente la metodología de la skill **sdd**.

## Parámetros de ejecución
- **Especificación objetivo:** `specs/$1/`
- **Identificador de tarea:** `$2` (ej. T1, T2, T3...)

## Contexto previo
Lee y analiza en profundidad antes de escribir nada:
- La tarea `$2` en `specs/$1/tasks.md`
- La arquitectura técnica en `specs/$1/plan.md`
- Los principios innegociables en `docs/constitution.md`
- Las directrices de `AGENTS.md`

## Pasos de ejecución estricta
1. **Tests primero (Fase Roja):** Escribe los tests unitarios correspondientes a la tarea `$2` y ejecuta `npm test` para confirmar que fallan.
2. **Implementación (Fase Verde):** Escribe el código mínimo necesario para satisfacer los requisitos de la tarea hasta que todos los tests pasen.
3. **Verificación:** Ejecuta de nuevo `npm test` y comprueba que la suite completa quede en verde.
4. **Verificación visual (si aplica):** Si la tarea altera componentes de la interfaz de usuario, valida el resultado con las herramientas de inspección del navegador / DevTools.
5. **Actualización de estado:** Marca la tarea como completada `[x]` en `specs/$1/tasks.md`.
6. **Memoria (si aplica):** Si `$2` es la última tarea de la spec, actualiza `MEMORY.md`.

## Formato de respuesta al finalizar
Presenta:
1. Tarea completada y Requisitos Funcionales (RF) cubiertos.
2. Lista de archivos modificados o creados.
3. Salida de la consola con el resultado de `npm test`.
4. Decisiones puntuales adoptadas fuera del plan inicial (si las hubo).

## Parada obligatoria
**PÁRATE inmediatamente tras completar esta tarea.** Queda estrictamente prohibido comenzar la tarea siguiente sin una nueva orden explícita.