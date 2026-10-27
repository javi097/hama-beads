# Tasks 001 — Core y Estudio 2D

Plan de referencia: `specs/001-core-and-2d-studio/plan.md` (aprobado)

Estado de avance: 9 / 9 tareas completadas

---

> Las tareas están ordenadas por dependencia técnica. No implementes una tarea si la anterior no está completada y verificada (`npx tsc --noEmit` + `npm run lint` en verde).

---

- [x] **T1. Scaffolding base: utilidades, contratos de datos y constante de paleta.** RF-7, RF-8
  - Crear `src/lib/utils.ts` con el helper `cn()` (clsx + tailwind-merge).
  - Crear `src/interfaces/hama.interface.ts` con los contratos `HamaColor`, `BeadType`, `BeadCell`, `GridData`, `ColorCount`, `BoardsLayout` y `HamaStoreState` según el plan.
  - Crear `src/hama/core/palette.const.ts` exportando `HAMA_PALETTE: HamaColor[]` y `BEAD_TYPES: Record<'mini'|'midi'|'maxi', BeadType>` con los 30 colores oficiales Hama Midi (fuente: `prototype.html`) y los tres tipos de perla, incluyendo los campos `r`, `g`, `b` y `luminance` precalculados.
  - Limpiar `src/App.css` (vaciar contenido) y eliminar los assets de plantilla Vite (`react.svg`, `vite.svg`, `hero.png`) del directorio `src/assets/`.
  - Hecho cuando: `npx tsc --noEmit` sin errores; los 30 colores de `HAMA_PALETTE` son accesibles con tipo `HamaColor` y `BEAD_TYPES` contiene las tres variantes tipadas.

---

- [x] **T2. Core matemático puro: calculadora de cuadrícula y cuantizador de color.** RF-3, RF-4, RF-5, RF-6, RF-7
  - Crear `src/hama/core/grid-calculator.ts` con las funciones puras: `calcBeadCount`, `clampCm`, `calcLockedDimension` y `calcBoardsLayout`, con sus firmas y lógica exactas según el plan.
  - Crear `src/hama/core/quantizer.ts` con las funciones puras: `redmeanDistance`, `findClosestColor`, `detectBackgroundColor`, `isBackgroundPixel` y `processPixel`, con sus firmas y lógica exactas según el plan.
  - Ninguna función puede importar módulos de React, acceder al DOM ni leer variables globales de estado.
  - Hecho cuando: `npx tsc --noEmit` sin errores; todas las funciones son importables desde otros módulos con sus tipos correctos.

---

- [x] **T3. Core de procesamiento de imagen y exportación PNG.** RF-1, RF-5, RF-6, RF-7, RF-14
  - Crear `src/hama/core/image-processor.ts` con la función asíncrona `processImage(imageSrc, cols, rows, activePalette, removeBg): Promise<GridData>` siguiendo el flujo del plan: crear canvas offscreen → escalar imagen → detectar fondo → iterar píxeles con `processPixel` → devolver `GridData`.
  - Usar `OffscreenCanvas` cuando esté disponible en el entorno, con fallback a `HTMLCanvasElement` para compatibilidad con Safari.
  - Crear `src/hama/core/png-exporter.ts` con la función `exportPatternPng(gridData, beadType, widthCm, heightCm): void` siguiendo el flujo del plan: canvas offscreen de fondo blanco → cabecera de metadatos → reglas numéricas → perlas con código → descarga via `<a>` temporal.
  - El tamaño de celda en el PNG exportado es fijo a 32 px, independiente del zoom del visor.
  - Hecho cuando: `npx tsc --noEmit` sin errores; `processImage` y `exportPatternPng` son exportables con sus tipos correctos; `image-processor.ts` no importa nada de React ni del store.

---

- [x] **T4. Store global Zustand con persistencia.** RF-1, RF-2, RF-3, RF-4, RF-6, RF-8, RF-9, RF-10, RF-11, RNF-4
  - Crear `src/hama/store/hama.store.ts` con el store Zustand tipado con `HamaStoreState` y todas las acciones descritas en el plan.
  - Configurar el middleware `persist` de Zustand apuntando a `localStorage` con clave `hama-storage`.
  - Los campos `imageSrc` y `gridData` deben quedar **excluidos** de la persistencia (usando la opción `partialize` del middleware persist).
  - La acción `setEnabledColorIds` debe ignorar el valor si el array resultante tendría 0 elementos (garantía de mínimo 1 color activo, RF-8.3).
  - La acción `setZoom` debe clampear el valor al rango [0.5, 3.0].
  - Los valores por defecto deben coincidir exactamente con los listados en el plan.
  - Hecho cuando: `npx tsc --noEmit` sin errores; el store es importable y accesible mediante `useHamaStore`; recargando la página, los valores de configuración (tipo de perla, dimensiones, paleta) se restauran desde `localStorage`.

---

- [x] **T5. Hook de carga de imagen y componentes de controles de configuración.** RF-1, RF-2, RF-3, RF-4
  - Crear `src/hama/hooks/useImageLoader.ts` con la firma del plan: expone `loadFile(file: File)`, `loadPreset(type)` y `error: string | null`; internamente lee el archivo con `FileReader`, obtiene el ratio natural de la imagen y llama a `store.setImageSrc`.
  - Crear `src/hama/components/Controls/ImageDropzone.tsx`: zona drag-and-drop con `<input type="file">` oculto, miniatura de la imagen activa con `image-rendering: pixelated`, botones de tres presets y mensaje de error inline (no `alert()`) para formatos no soportados.
  - Crear `src/hama/components/Controls/BeadTypeSelector.tsx`: selector de tres opciones tipadas que llama a `store.setBeadTypeId` al cambiar.
  - Crear `src/hama/components/Controls/DimensionInputs.tsx`: dos campos numéricos (step 0.5, min 4, max 100) con botón candado de bloqueo de proporción y badge de resolución calculada en perlas.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` sin errores; subir un PNG válido actualiza `imageSrc` en el store; subir un archivo `.txt` muestra el mensaje de error sin cambiar el estado; los tres presets cargan sin error.

---

- [x] **T6. Hook de renderizado y visor Canvas 2D interactivo.** RF-9, RF-10, RF-11, RNF-1, RNF-2
  - Crear `src/hama/hooks/useCanvasRenderer.ts` con la firma del plan. Debe:
    - Compensar DPR (`devicePixelRatio`): ajustar `canvas.width/height` y escalar el contexto antes de dibujar.
    - Calcular `cellSize = baseCellSize × zoom`, donde `baseCellSize = clamp(floor(560 / max(cols,rows)), 14, 34)`.
    - Dibujar en orden: fondo de reglas → numeración de ejes → celdas vacías (ajedrezado + punto clavija) → perlas (`hollow`: círculo + hueco; `pixel`: rectángulo sólido) → códigos (solo si `showCodes && cellSize >= 18`) → líneas de cuadrícula (trazo fino) → límites de placa (trazo grueso en rojo).
    - Aplicar `ctx.globalAlpha = 0.18` a las perlas atenuadas cuando `highlightedColorId` está activo.
  - Crear `src/hama/components/Canvas2D/Grid2DCanvas.tsx` que:
    - Monta un `<canvas>` dentro de un `div` con `overflow: auto` (scroll nativo).
    - Usa `useCanvasRenderer` para todo el dibujo.
    - Registra un listener `wheel` con `{ passive: false }` que intercepta `Ctrl + scroll` y ajusta el zoom en el store únicamente cuando `navigator.maxTouchPoints === 0` (escritorio).
    - Muestra en el pie el texto de placa activo y, condicionalmente, el botón "Mostrar todos los colores" cuando `highlightedColorId !== null`.
  - Crear `src/hama/components/Controls/ViewerToolbar.tsx`: botones −/+ de zoom con display de porcentaje, toggles de cuadrícula, códigos, forma de perla y eliminación de fondo.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` sin errores; el canvas renderiza la cuadrícula nítida en monitor HiDPI (sin blur); zoom al 300% activa scroll horizontal/vertical; `Ctrl + rueda` modifica el zoom en escritorio; el resalte atenúa correctamente las perlas no seleccionadas.

---

- [x] **T7. Panel de guía: tabla de materiales, resumen de placas y modal de paleta.** RF-8, RF-11, RF-12, RF-13
  - Crear `src/hama/components/Guide/ColorInventoryTable.tsx`:
    - Deriva `ColorCount[]` de `gridData.cells` (recuento por id, ordenado por count descendente).
    - Muestra muestra de color circular con código interior (color de texto adaptado a luminancia), nombre y recuento en badge.
    - Clic en fila: toggle de `highlightedColorId` en el store (si ya está activo, lo pone a `null`).
    - Muestra el total de perlas en la cabecera.
  - Crear `src/hama/components/Guide/BoardsSummary.tsx`:
    - Muestra tres métricas: Tamaño Final (cm), Placas Base (cols × rows = total), Tiempo Estimado.
    - Llama a `calcBoardsLayout` directamente desde el core para derivar el layout.
  - Crear `src/hama/components/Guide/PaletteModal.tsx`:
    - Modal con overlay, lista los 30 colores de `HAMA_PALETTE` con checkbox.
    - El checkbox del último color activo aparece deshabilitado (RF-8.3).
    - Botones de preset "Todos los colores" y "Colores básicos".
    - Al cerrar, el store ya refleja la paleta actualizada.
  - Hecho cuando: `npx tsc --noEmit` y `npm run lint` sin errores; la tabla muestra el recuento correcto para la imagen de demostración; no es posible dejar la paleta vacía desde el modal; el resalte en tabla sincroniza con el canvas.

---

- [x] **T8. Layout, página principal y orquestación reactiva completa.** RF-1, RF-2, RF-3, RF-5, RF-6, RF-7, RF-9, RF-14, RNF-3, RNF-4
  - Crear `src/hama/layouts/StudioLayout.tsx`: layout de dos columnas (7/12 visor, 5/12 panel) con colapso a columna única en pantallas `< lg`.
  - Crear `src/hama/pages/StudioPage.tsx`:
    - Al montar, si `store.imageSrc === null`, carga el preset "mushroom" vía `useImageLoader.loadPreset`.
    - `useEffect` que observa `{imageSrc, beadTypeId, widthCm, heightCm, enabledColorIds, removeBg}` y, cuando alguno cambia, calcula `cols` y `rows` con `calcBeadCount`, llama a `processImage` y actualiza `store.setGridData` con el resultado.
    - Botón de descarga PNG en la cabecera que llama a `exportPatternPng` con los datos del store.
    - Botón de apertura del `PaletteModal` con contador de colores activos.
    - Toggle de tema claro/oscuro como estado local (`useState`) que aplica/quita la clase `dark` en `document.documentElement`.
    - Monta `StudioLayout` con todos los subcomponentes ensamblados.
  - Reemplazar `src/App.tsx` para que renderice únicamente `<StudioPage />` (eliminar toda la plantilla Vite).
  - Verificar que `src/index.css` incluye los tokens semánticos de Tailwind y que `App.css` está vacío o eliminado.
  - Hecho cuando: `npm run dev` arranca sin errores; la app muestra la seta de demostración al cargar; cambiar tipo de perla, dimensiones o paleta recalcula la cuadrícula automáticamente; el botón de descarga genera un PNG con fondo blanco, cabecera de metadatos y códigos; `npx tsc --noEmit` y `npm run build` sin errores.

---

- [x] **T9. Suite de tests unitarios del core y el store.** RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-10, RF-11, RF-13
  - Crear `src/hama/core/__tests__/grid-calculator.test.ts` con los 10 casos de prueba del plan:
    - Midi 8 cm → 16 perlas.
    - Mini 4 cm → 16 perlas.
    - Maxi 4 cm → fuerza mínimo 8.
    - Midi 1 cm → fuerza mínimo 8.
    - Midi 65 cm → fuerza máximo 120.
    - `clampCm(2)` → 4.
    - `clampCm(150)` → 100.
    - `calcLockedDimension(10, 0.5)` → 5.0.
    - `calcBoardsLayout(30, 29, 29)` → `{cols:2, rows:1, total:2}`.
    - `calcBoardsLayout(29, 29, 29)` → `{cols:1, rows:1, total:1}`.
  - Crear `src/hama/core/__tests__/quantizer.test.ts` con los 8 casos de prueba del plan:
    - `findClosestColor(0,0,0, HAMA_PALETTE)` → id `'18'` (Negro).
    - `findClosestColor(255,255,255, HAMA_PALETTE)` → id `'01'` (Blanco).
    - `findClosestColor` con paleta de 1 elemento → ese único elemento.
    - `processPixel` con alpha=100 → `null`.
    - `processPixel` fondo blanco con removeBg=false → color Hama (no null).
    - `isBackgroundPixel(252,252,252, 255,255,255)` → `true`.
    - `isBackgroundPixel(220,190,171, 255,255,255)` → `false` (Crema, fuera del umbral 20).
    - `isBackgroundPixel(r,g,b, 50,50,50)` → `false` (fondo oscuro).
  - Crear `src/hama/store/__tests__/hama.store.test.ts` con los 4 casos del plan:
    - `setEnabledColorIds([])` → la paleta no se vacía; se mantiene el valor anterior.
    - `setWidthCm` con `lockAspect=true` → actualiza `heightCm` proporcionalmente.
    - `setHighlightedColorId` con el mismo id dos veces → devuelve `null` la segunda vez.
    - `setZoom(5)` → el zoom queda en 3.0 (clamp superior).
  - Hecho cuando: `npm test` pasa los 22 casos sin errores ni advertencias; `npx tsc --noEmit` sin errores.

---

## Resumen de dependencias

```
T1 (scaffolding)
 └─► T2 (core matemático)
      └─► T3 (image processor + png exporter)
           └─► T4 (store Zustand)
                └─► T5 (hook imagen + controles)
                     └─► T6 (canvas 2D + hook renderer)
                          └─► T7 (panel guía + modal paleta)
                               └─► T8 (layout + página + orquestación)
                                    └─► T9 (tests)
```
