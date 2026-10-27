---
description: Revisa una spec como QA profesional detectando ambigüedades, contradicciones y casos límite sin modificar archivos ni proponer soluciones
---

# /sdd-clarify

Actúa bajo el rol de **reviewer** siguiendo la metodología de la skill **sdd**.

## Objetivo
Auditar la especificación en `specs/$1/spec.md` (o la spec indicada en el argumento).

## Restricción estricta
**NO modifiques ningún archivo ni propongas soluciones o alternativas todavía: tu único rol es detectar y señalar incidencias.**

## Instrucciones de auditoría QA
Analiza a fondo `specs/$1/spec.md` confrontándolo con `docs/constitution.md` y `AGENTS.md`. Presenta una lista numerada con los hallazgos agrupados en estos 4 puntos:

1. **Ambigüedades:** Requisitos vagos, subjetivos o que no dispongan de un criterio de aceptación verificable y medible.
2. **Contradicciones:** Requisitos funcionales que choquen entre sí o generen inconsistencias en el flujo.
3. **Casos límite:** Escenarios extremos, errores de entrada, estados vacíos o situaciones excepcionales no cubiertas.
4. **Conflictos con la constitución:** Incumplimientos respecto a las directrices de `docs/constitution.md` o `AGENTS.md`.

## Parada obligatoria
Finaliza tu respuesta esperando la revisión del usuario y las decisiones técnicas pertinentes antes de que **planner** pase a corregir el borrador.