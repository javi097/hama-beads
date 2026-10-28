# MEMORY.md — Hama Beads Studio

## Estado del Proyecto
- Inicializado proyecto con Vite + React + TypeScript + Tailwind CSS.
- Alias `@/*` configurado en `tsconfig.json`, `tsconfig.app.json` y `vite.config.ts`.
- Repositorio vinculado a GitHub y despliegue continuo activo en Vercel.
- **Spec 001 (`specs/001-core-and-2d-studio/`) 100% implementada:** 9/9 tareas, 41 tests en verde.
- **Spec 002 (`specs/002-3d-studio-and-assembly-guide/`) 100% implementada:** 9/9 tareas, 103 tests unitarios en verde, visor WebGL Three.js con InstancedMesh, despiece con vista explosionada, 3 modos volumétricos (Apilado Hueco, Interlocking 90° y Relieve), selector 2D/3D reactivo y exportador de manual de montaje PDF en cliente con jsPDF. Build de producción verificado.

## Decisiones Técnicas
- **Estructura modular:** Dominio principal en `src/hama/` desacoplando el motor matemático (`core/`) de la presentación (`components/`, `hooks/`, `layouts/`, `pages/`).
- **Tres tipos de perla soportados:** Mini (2,5 mm / placa 28×28), Midi (5,0 mm / placa 29×29), Maxi (10,0 mm / placa 15×15).
- **Cuantización:** Fórmula Redmean (distancia euclidiana RGB ponderada perceptualmente). Función pura determinista.
- **Límites de cuadrícula:** Mínimo 8 perlas/lado, máximo 120 perlas/lado. Dimensiones físicas: 4–100 cm.
- **Eliminación de fondo (removeBg):** Activa por defecto. Solo se activa cuando el fondo muestreado en esquinas es claro (R, G, B > 240); umbral de distancia euclidiana RGB = 20.
- **Paleta oficial:** 46 colores Hama Midi con anclas `#18` y `#01`.
- **Visor 2D:** Canvas con compensación DPR, scroll nativo, zoom 50–300% y resalte interactivo por color.
- **Visor 3D:** Three.js con `InstancedMesh` por color, OrbitControls, centrado geométrico, vista explosionada dinámica (0–50 mm) a 60 FPS y aislamiento por capa.
- **Manual PDF:** jsPDF generando documento A4 vectorial multi-página en cliente con portada isométrica, tabla BOM global y desglose secuencial con cuadrículas numeradas.
- **Zustand:** Estado global centralizado con persistencia en `localStorage` (`hama-storage`, excluyendo `imageSrc` y `gridData`).

## Próximos Pasos
- Todo el alcance de Spec 001 y Spec 002 completado con éxito (103/103 tests en verde, 0 errores de tipado, 0 warnings de linter, build de producción en verde). Listo para fase de validación (/sdd-validate).
