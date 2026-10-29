# MEMORY.md — Hama Beads Studio

## Estado del Proyecto
- Inicializado proyecto con Vite + React + TypeScript + Tailwind CSS con alias `@/*`.
- **136/136 tests en verde (`npm test`), compilación estricta (`npx tsc --noEmit`), linter limpio (`npm run lint`) y build verificado.**
- Visor WebGL Three.js con InstancedMesh, despiece con vista explosionada, 3 modos volumétricos, selector 2D/3D reactivo y exportador PDF.
- **Rediseño Motor 3D — Fases 1 y 2 Completadas:**
  1. *Fase 1:* Infraestructura canónica `VoxelGrid3D` en `src/hama/core/voxel-grid.ts` y contratos en `src/interfaces/hama-3d.interface.ts`.
  2. *Fase 2:* Rediseño de `generateHollowLayers` en `src/hama/core/voxelizer.ts` con tapas sólidas al 100% (RF-2.2), soporte para cavidades selectivas (cuerpo macizo vs. cavidad hueca) y garantía de soporte vertical anti-perlas flotantes (`ensureVerticalSupport`).

## Decisiones Técnicas y Arquitectura 3D
- **Representación Canónica Única:** `VoxelGrid3D` desacopla la generación de volumen del slicing de fabricación.
- **Apilado Hueco Inteligente:**
  - Perfil `'prismatic'` por defecto (reproduce fielmente la silueta 2D) y `'rounded'` morfológico opcional.
  - Base ($Z=1$) y tapa ($Z=N$) sólidas completas (RF-2.2).
  - Vaciado selectivo por IDs de color o componente conexa; o vaciado estándar con muro perimetral continuo de 1 o 2 perlas.
  - `ensureVerticalSupport` previene islas flotantes proyectando soporte vertical hacia abajo.
- **Interlocking (Fase 3 prevista):** Paso de machihembrado de 2 perlas (10 mm) para tolerancia térmica de planchado y resistencia física; selector Caja 3D (6 placas) y Costillas Silueteadas con peana.

## Errores a Evitar
- No deformar modelos planos/mecánicos con elipsoides forzados: perfil prismático por defecto.
- No vaciar indiscriminadamente todo el objeto cuando se requieran cavidades selectivas.
- No dejar perlas superiores flotando en el aire sin soporte inferior o planar.

## Próximos Pasos
- **Fase 3:** Rediseñar el motor de Interlocking en `voxelizer.ts` implementando la Caja 3D real de 6 placas machihembradas (paso 2 perlas) y las Costillas Silueteadas con peana sin fractura de piezas.
