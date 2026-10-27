---
description: Diseña el plan técnico y de arquitectura (plan.md) a partir de una spec aprobada, sin tocar código
---

# /sdd-plan

Actúa bajo el rol de **planner** siguiendo estrictamente la metodología de la skill **sdd**.

## Parámetros
- **Especificación objetivo:** `specs/$1/`

## Contexto y comprobación previa
Antes de redactar:
1. Lee `docs/constitution.md`, `AGENTS.md` y `specs/$1/spec.md`.
2. **Condición de guardia:** Si `specs/$1/spec.md` no tiene el estado "aprobada" o contiene dudas abiertas marcadas con `[NECESITA ACLARACIÓN]`, **DETÉN la ejecución inmediatamente** y avisa al usuario.

## Restricción estricta
**NO escribas código de la aplicación ni edites archivos fuera del directorio `specs/`.**

## Instrucciones de generación
Genera o actualiza `specs/$1/plan.md` incluyendo las siguientes secciones:
- **Archivos y responsabilidades:** Lista detallada de archivos a crear o modificar, especificando el propósito de cada uno.
- **Funciones puras de lógica:** Firma y diseño de funciones puras desacopladas (inyección de paleta de colores y dimensiones sin depender de estado global ni contexto DOM de Canvas).
- **Algoritmo y flujo de datos:** Pseudocódigo o descripción secuencial del flujo de datos.
- **Integración de interfaz:** Cómo se conectará con los componentes visuales o UI.
- **Decisiones técnicas justificadas:** Razonamiento detrás de cada decisión relevante, mencionando explícitamente la alternativa descartada.
- **Estrategia de tests:** Casos de prueba a implementar con la suite `npm test`.
- **Trazabilidad:** Indica de forma explícita qué Requisito Funcional (RF) cubre cada archivo, función y prueba.

Todo el diseño debe cumplir rigurosamente los principios de `docs/constitution.md`.

## Parada obligatoria
Al terminar de redactar `specs/$1/plan.md`, presenta un resumen técnico conciso en el chat y espera la revisión y aprobación del usuario antes de proceder a la creación de tareas.