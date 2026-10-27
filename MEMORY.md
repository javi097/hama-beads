# MEMORY.md — Hama Beads Studio

## Estado del Proyecto
- Inicializado proyecto con Vite + React + TypeScript + Tailwind CSS.
- Alias `@/*` configurado en `tsconfig.json`, `tsconfig.app.json` y `vite.config.ts`.
- Repositorio vinculado a GitHub y despliegue continuo activo en Vercel.
- **Spec 001 (`specs/001-core-and-2d-studio/spec.md`) aprobada.** Cubre núcleo de conversión y estudio 2D. Lista para pasar al plan.

## Decisiones Técnicas
- **Estructura modular:** Dominio principal en `src/hama/` desacoplando el motor matemático (`core/`) de la presentación (`components/`).
- **Tres tipos de perla soportados:** Mini (2,5 mm / placa 28×28), Midi (5,0 mm / placa 29×29), Maxi (10,0 mm / placa 15×15).
- **Cuantización:** Fórmula Redmean (distancia euclidiana RGB ponderada perceptualmente). Función pura, determinista.
- **Límites de cuadrícula:** Mínimo 8 perlas/lado, máximo 120 perlas/lado. Dimensiones físicas: 4–100 cm.
- **Eliminación de fondo (removeBg):** Activa por defecto. Solo se dispara cuando el fondo detectado es claro (R, G, B > 240); umbral de distancia euclidiana RGB = 20.
- **Paleta oficial:** 30 colores Hama Midi (series 01–30, 43–48, 70–71). Fuente de verdad: `prototype.html`.
- **Paleta mínima activa:** Siempre ≥ 1 color. Dos presets: "Todos" (30) y "Básicos" (6: #01, #03, #05, #08, #10, #18).
- **Zoom 2D:** 50–300% con pasos del 25%. Ctrl+scroll exclusivo en escritorio.
- **Exportación v1:** Solo PNG con cabecera de metadatos y reglas numéricas. PDF fuera de esta spec.
- **Zustand:** Estado global centralizado con persistencia en `localStorage` (clave `hama-storage`).

## Próximos Pasos
- Ejecutar `/sdd-implement 001-core-and-2d-studio T1` para iniciar la implementación por la tarea T1 (scaffolding base).
