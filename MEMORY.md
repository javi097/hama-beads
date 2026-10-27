# MEMORY.md — Hama Beads Studio

## Estado del Proyecto
- Inicializado proyecto con Vite + React + TypeScript + Tailwind CSS.
- Alias `@/*` configurado en `tsconfig.json`, `tsconfig.app.json` y `vite.config.ts`.
- Repositorio vinculado a GitHub y despliegue continuo activo en Vercel.
- **Spec 001 (`specs/001-core-and-2d-studio/`) 100% implementada:** 9/9 tareas completadas, 41 tests unitarios en verde, build de producción y linter sin advertencias ni errores.

## Decisiones Técnicas
- **Estructura modular:** Dominio principal en `src/hama/` desacoplando el motor matemático (`core/`) de la presentación (`components/`, `hooks/`, `layouts/`, `pages/`).
- **Tres tipos de perla soportados:** Mini (2,5 mm / placa 28×28), Midi (5,0 mm / placa 29×29), Maxi (10,0 mm / placa 15×15).
- **Cuantización:** Fórmula Redmean (distancia euclidiana RGB ponderada perceptualmente). Función pura determinista.
- **Límites de cuadrícula:** Mínimo 8 perlas/lado, máximo 120 perlas/lado. Dimensiones físicas: 4–100 cm.
- **Eliminación de fondo (removeBg):** Activa por defecto. Solo se activa cuando el fondo muestreado en esquinas es claro (R, G, B > 240); umbral de distancia euclidiana RGB = 20.
- **Paleta oficial:** 30 colores Hama Midi precalculados en `HAMA_PALETTE`. Fuente de verdad: `prototype.html`.
- **Paleta mínima activa:** Siempre ≥ 1 color. Dos presets: "Todos" (30) y "Básicos" (6).
- **Visor 2D:** Canvas con compensación de Device Pixel Ratio (DPR), scroll nativo, zoom 50–300% (con soporte de Ctrl+rueda en escritorio) y resalte interactivo por color.
- **Exportación PNG:** Descarga directa de patrón a 32 px por celda, reglas numéricas, códigos de perla y metadatos con fondo blanco.
- **Zustand:** Estado global centralizado con persistencia en `localStorage` (clave `hama-storage`, excluyendo `imageSrc` y `gridData`).

## Próximos Pasos
- Ejecutar `/sdd-validate 001-core-and-2d-studio` para la validación final de todos los criterios de aceptación RF por RF.
