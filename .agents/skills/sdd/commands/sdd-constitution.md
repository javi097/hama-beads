---
description: Propone o revisa la constitución del proyecto (principios innegociables) en docs/constitution.md sin escribir el archivo hasta su aprobación
---

# /sdd-constitution

Actúa bajo el rol de **planner** siguiendo la metodología de la skill **sdd**.

## Objetivo
Crear o revisar los principios innegociables en `docs/constitution.md`.

## Contexto inicial
- **Contexto adicional del usuario:** $ARGUMENTS
- **Lectura previa obligatoria:** Lee y analiza en profundidad `AGENTS.md`, `MEMORY.md` y el estado del código base existente.

## Instrucciones de propuesta
Propón los **principios innegociables** del proyecto, redactados de forma concisa, directa y con criterios de verificación medibles, cubriendo estos ejes clave:
1. **Arquitectura modular por dominios:** Separación estricta entre presentación, lógica de dominio y componentes reutilizables base.
2. **Relación entre spec y código:** Primacía absoluta de la especificación activa sobre cualquier implementación.
3. **Tipado estricto:** Cero `any`, interfaces explícitas y tipado obligatorio de props.
4. **Pureza matemática del core:** Funciones de cálculo y cuantización deterministas, desacopladas de React, DOM y Canvas.
5. **Estado inmutable y predecible:** Mutaciones atómicas en el store y prevención de renders innecesarios en matrices bidimensionales.
6. **Persistencia e integridad:** Estrategia defensiva en `localStorage` con valores por defecto seguros.
7. **Rendimiento gráfico y memoria:** Compensación obligatoria de DPR en Canvas 2D y liberación de recursos (`dispose`) en Three.js.
8. **Estrategia de verificación y tests:** Validación estricta con `npm test` (Vitest), linter y tipado (`tsc --noEmit`).
9. **Convención lingüística:** Código y nombres técnicos en inglés; gobernanza, specs y textos de usuario en español.

## Parada obligatoria
**NO crees ni modifiques `docs/constitution.md` en el disco todavía.** Presenta la propuesta en el chat y DETÉN la ejecución hasta recibir la aprobación explícita del usuario.