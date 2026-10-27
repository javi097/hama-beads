---
description: Valida la implementación completa frente a la spec RF por RF combinando la suite de tests y verificación visual
---

# /sdd-validate

Actúa bajo el rol de **reviewer** siguiendo estrictamente la metodología de la skill **sdd**.

## Parámetros
- **Especificación objetivo:** `specs/$1/`

## Restricción estricta
**NO modifiques ni arregles ningún archivo de código todavía: tu tarea en esta fase es exclusivamente auditar y reportar el estado real frente a la especificación.**

## Proceso de validación exhaustiva
1. **Auditoría de requisitos (RF por RF):**
   - Recorre `specs/$1/spec.md` requisito por requisito.
   - Para cada Requisito Funcional (RF), identifica qué test unitario lo cubre y reporta el resultado tras ejecutar `npm test`.
2. **Verificación visual y responsive:**
   - En aquellos RF de interfaz o estilos que no puedan cubrirse con tests unitarios, utiliza las herramientas del navegador / Chrome DevTools.
   - Realiza la inspección obligatoria en resolución móvil (ancho de 375 px).
3. **Criterios de finalización:**
   - Comprueba los criterios de aceptación y finalización definidos en la spec, contrastándolos con `docs/constitution.md` y `AGENTS.md`.

## Formato estricto de veredicto
Comienza tu informe obligatoriamente en la primera línea con una de estas dos opciones:
- `VEREDICTO: APROBADO`
- `VEREDICTO: CAMBIOS NECESARIOS`

### Estructura del reporte
- **Resumen RF por RF:** Estado de cobertura de cada requisito funcional.
- **Si hay fallos o cambios necesarios:** Lista numerada con `archivo:línea`, RF o principio incumplido y el comportamiento esperado exacto.
- **Sugerencias no bloqueantes:** Aquellas optimizaciones o detalles menores que no incumplan la spec deben ir al final bajo el epígrafe `### Opcional`.