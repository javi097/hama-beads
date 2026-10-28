# Tareas de Implementación — Spec 002: Estudio 3D y Guía de Montaje Multicapa

---

- [ ] **T1. Contratos de datos TypeScript 3D y configuración de dependencias.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6
  - Instalar `jspdf` como dependencia de producción para la exportación documental en cliente.
  - Crear `src/interfaces/hama-3d.interface.ts` con todos los contratos tipados estrictamente: `Mode3DType`, `VoxelPosition`, `VoxelBead`, `VoxelLayer`, `InterlockingPlate`, `AssemblyStep`, `Model3DResult` y `PdfExportOptions`.
  - Hecho cuando: `npx tsc --noEmit` compila sin errores y los tipos se exportan limpiamente sin ningún uso de `any`.

- [ ] **T2. Motor matemático de Apilado Multicapa Hueco (Slicing Inteligente).** RF-2
  - Implementar en `src/hama/core/voxelizer.ts` la función pura `identifyInteriorCells(cells, wallThickness)` mediante erosión morfológica 4-conectada (grosor 1 o 2 perlas).
  - Implementar `generateHollowLayers(baseGrid, totalLayers, wallThickness, diameterMm)` garantizando que las capas 1 y N sean 100% sólidas y las intermedias vaciadas morfológicamente.
  - Crear suite de pruebas unitarias en `src/hama/core/__tests__/voxelizer.test.ts`.
  - Hecho cuando: los tests unitarios verifican el vaciado exacto de celdas internas en capas intermedias, la preservación de capas sólidas base/tapa y la protección de piezas delgadas (< 3 perlas).

- [ ] **T3. Motor matemático de Ensamblado Interlocking (Ranurado y Juntas a 90°).** RF-3
  - Implementar en `src/hama/core/voxelizer.ts` la función pura `generateInterlockingPlates(baseGrid, structureType, depthBeads, diameterMm)` con soporte para *Caja 3D (6 placas)* y *Figura con costillas ortogonales*.
  - Generar pestañas y ranuras (Tabs & Slots) alternadas con paso exacto de 1 perla en aristas adyacentes a 90°.
  - Añadir casos de prueba de encastre en `src/hama/core/__tests__/voxelizer.test.ts`.
  - Hecho cuando: los tests unitarios comprueban que las pestañas de una placa coinciden con las ranuras de la placa perpendicular sin colisiones en aristas.

- [ ] **T4. Motor de Relieve por Luminancia y Descomposición de Guía de Montaje.** RF-4, RF-6
  - Implementar `generateReliefLayers(baseGrid, levels, diameterMm)` en `src/hama/core/voxelizer.ts` con relleno sólido inferior acumulativo (2 a 6 niveles).
  - Implementar `deriveAssemblySteps(model: Model3DResult)` en `src/hama/core/assembly-guide.ts` generando la secuencia cronológica de pasos con recuentos parciales BOM y coordenadas.
  - Crear suite de pruebas en `src/hama/core/__tests__/assembly-guide.test.ts`.
  - Hecho cuando: los tests unitarios validan la elevación acumulativa de relieve y que la suma de perlas de todos los pasos coincide exactamente con el inventario total 3D.

- [ ] **T5. Estado global reactivo para el Estudio 3D en Zustand.** RF-1, RF-2, RF-3, RF-4, RF-5
  - Extender `HamaStoreState` y `hama.store.ts` con las propiedades: `activeView ('2d' | '3d')`, `mode3d ('hollow' | 'interlocking' | 'relief')`, `hollowLayersCount`, `hollowWallThickness`, `interlockingType`, `reliefLevels`, `explodedGapMm` y `activeLayerIndex`.
  - Implementar las acciones atómicas e inmutables correspondientes y actualizar `hama-storage` en `localStorage`.
  - Añadir pruebas unitarias en `src/hama/store/__tests__/hama.store.test.ts`.
  - Hecho cuando: `npm test` pasa en verde confirmando la inmutabilidad de las mutaciones de configuración 3D y su persistencia.

- [ ] **T6. Hook de renderizado WebGL con Three.js e InstancedMesh.** RF-5
  - Crear `src/hama/hooks/useThreeScene.ts` para instanciar `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `OrbitControls` y mallas instanciadas (`InstancedMesh`) agrupadas por color Hama para alto rendimiento (60 FPS con $10.000$ perlas).
  - Implementar la traslación de la vista explosionada (0 a 50 mm) mediante actualización dinámica de matrices de instancia (`setMatrixAt`).
  - Implementar el filtrado de capa/placa activa para aislamiento visual y el ciclo de vida defensivo con liberación de GPU (`dispose()`).
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` validan sin errores y se verifica la liberación de geometrías y materiales al desmontar.

- [ ] **T7. Componentes de UI del Visor 3D y Selector de Modos.** RF-1, RF-2, RF-3, RF-4, RF-5
  - Crear `src/hama/components/Scene3D/VoxelScene3D.tsx` como lienzo de renderizado WebGL con reencuadre automático.
  - Crear `src/hama/components/Scene3D/LayerStackControls.tsx` con slider de vista explosionada, selector de capa activa y toggle de aislamiento.
  - Crear `src/hama/components/Controls/Mode3DSelector.tsx` con selector de los 3 modos 3D y sus parámetros específicos.
  - Hecho cuando: los componentes renderizan reactivamente en pantalla con estilos de Tailwind CSS y conectan sus controles con el store de Zustand.

- [ ] **T8. Generador y Exportador de Manual de Montaje en PDF.** RF-6
  - Implementar `src/hama/core/pdf-exporter.ts` con `exportAssemblyManualPdf` usando `jspdf` para componer: portada con vista isométrica, metadatos y tabla BOM global; y páginas secuenciales con diagramas de cuadrícula numerada, coordenadas métricas, códigos de color Hama legibles y mini-inventario por paso.
  - Crear `src/hama/components/Guide/ExportPdfButton.tsx` con spinner de carga y feedback de progreso.
  - Crear tests unitarios en `src/hama/core/__tests__/pdf-exporter.test.ts`.
  - Hecho cuando: los tests unitarios verifican la generación del documento y al accionar el botón se descarga un PDF legible en menos de 4 segundos.

- [ ] **T9. Integración global del Estudio 3D y Pestañas en la página principal.** RF-1, RF-5, RF-6
  - Incorporar selector de vista "Estudio 2D" / "Estudio 3D" en `src/hama/pages/StudioPage.tsx` y adaptar `src/hama/layouts/StudioLayout.tsx` para alternar fluidamente entre `Grid2DCanvas` y `VoxelScene3D` preservando el estado de la cuadrícula.
  - Verificar que la exportación PDF y los paneles de inventario se sincronicen con el modelo 3D activo.
  - Hecho cuando: el usuario puede alternar entre 2D y 3D, configurar y explorar los 3 modos volumétricos con vista explosionada, exportar el manual en PDF y todos los tests (`npm test`), linter (`npm run lint`) y build de producción (`npm run build`) quedan en verde.
