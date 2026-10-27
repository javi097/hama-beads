---
description: Realiza la entrevista de clarificación y redacta la spec (uso: /sdd-spec 002-nombre idea inicial)
---

# /sdd-spec

Actúa bajo el rol de **planner** siguiendo estrictamente la metodología de la skill **sdd**.

## Parámetros iniciales
- **Carpeta de la spec:** `specs/$1/`
- **Idea o propuesta inicial:** $ARGUMENTS

## Restricciones estrictas
- **NO escribas código en ningún momento ni toques archivos fuera del directorio `specs/`.**
- Describe exclusivamente el **QUÉ** y el **POR QUÉ**: queda terminantemente prohibido incluir nombres de librerías, detalles de arquitectura técnica o nombres de archivos de código en este documento.

## Proceso de ejecución
1. **Lectura previa:** Lee y analiza `docs/constitution.md`, `AGENTS.md` y `MEMORY.md`.
2. **Entrevista de clarificación:**
   - Si la idea contiene ambigüedades, casos límite sin definir, gestión de errores o límites difusos, hazme preguntas de **UNA en UNA**.
   - No lances bloques masivos de dudas: espera mi respuesta a cada pregunta antes de formular la siguiente (máximo 5 preguntas en total).
3. **Generación del borrador:**
   - Una vez resueltas las dudas críticas, crea el archivo `specs/$1/spec.md`.
   - Aplica la plantilla de la skill `sdd`.
   - Redacta todos los Requisitos Funcionales bajo el estándar de sintaxis **EARS**.
   - Establece la cabecera del documento como `Estado: borrador`.

## Parada obligatoria
Una vez generado el archivo `specs/$1/spec.md`, presenta un resumen de sus puntos clave en el chat y **DETÉN la ejecución** a la espera de la fase de revisión/clarificación por parte de QA.