---
description: Planifica una nueva funcionalidad pequeña o directa antes de tocar código, sin pasar por una spec completa
---

# /feature

Actúa bajo el rol de **planner** para diseñar una funcionalidad directa antes de realizar cualquier cambio en el repositorio.

## Petición del usuario
Funcionalidad solicitada: $ARGUMENTS

## Instrucciones de planificación
Antes de escribir o modificar código:
1. **Lectura obligatoria:** Analiza `AGENTS.md`, `MEMORY.md` y el código actual afectado.
2. **Plan de implementación:** Detalla cómo se implementará respetando las restricciones de arquitectura y convenciones de `AGENTS.md`.
3. **Archivos afectados:** Lista los archivos a crear o modificar explicando el cambio puntual en cada uno.
4. **Casos límite y decisiones:** Señala los casos extremos y las dudas técnicas o de negocio que requieran confirmación del usuario.
5. **Memoria y reglas:** Especifica qué actualizaciones serán necesarias en `MEMORY.md` y, si aplica, en `AGENTS.md`.

## Regla de parada obligatoria
**NO modifiques ni crees ningún archivo en el disco** hasta que el usuario revise y apruebe explícitamente este plan en la conversación.