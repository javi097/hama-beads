# Plan 001 — Core y Estudio 2D
Estado: aprobado

Spec de referencia: `specs/001-core-and-2d-studio/spec.md` (aprobada)

---

## Visión de conjunto

La implementación se divide en **cuatro capas**, de interior a exterior, respetando el principio de pureza matemática de la constitución:

```
[1] core/          — Funciones puras sin dependencias de React ni DOM
[2] interfaces/    — Contratos TypeScript globales
[3] store/         — Estado global reactivo (Zustand) + persistencia
[4] UI             — Página, layout, componentes y hooks
```

El flujo de datos es unidireccional: la UI escribe en el store → el store dispara el procesamiento del core → el resultado (cuadrícula) se persiste en el store → los componentes visuales leen el store y renderizan.

---

## Árbol de archivos a crear o modificar

```
src/
├── interfaces/
│   └── hama.interface.ts              ← Contratos globales de datos
│
├── hama/
│   ├── core/
│   │   ├── palette.const.ts           ← Paleta oficial Hama (30 colores)
│   │   ├── quantizer.ts               ← Motor Redmean + detección de fondo
│   │   ├── grid-calculator.ts         ← cm → perlas, clamp, placas
│   │   ├── image-processor.ts         ← Escalado, muestreo y pipeline completo
│   │   └── png-exporter.ts            ← Generación del PNG de alta resolución
│   │
│   ├── store/
│   │   └── hama.store.ts              ← Zustand con persistencia localStorage
│   │
│   ├── hooks/
│   │   ├── useImageLoader.ts          ← Carga de archivo/URL → dataURL
│   │   └── useCanvasRenderer.ts       ← Renderizado DPR-aware del canvas 2D
│   │
│   ├── components/
│   │   ├── Controls/
│   │   │   ├── ImageDropzone.tsx      ← Upload, drag-drop y presets
│   │   │   ├── BeadTypeSelector.tsx   ← Selector Mini/Midi/Maxi
│   │   │   ├── DimensionInputs.tsx    ← Ancho/alto cm + bloqueo proporción
│   │   │   └── ViewerToolbar.tsx      ← Zoom, cuadrícula, códigos, forma perla
│   │   │
│   │   ├── Canvas2D/
│   │   │   └── Grid2DCanvas.tsx       ← Canvas 2D interactivo (visor)
│   │   │
│   │   └── Guide/
│   │       ├── ColorInventoryTable.tsx ← BOM: tabla de materiales
│   │       ├── BoardsSummary.tsx       ← Resumen de placas y metadatos
│   │       └── PaletteModal.tsx        ← Modal de gestión de paleta activa
│   │
│   ├── layouts/
│   │   └── StudioLayout.tsx           ← Split: visor izq. / panel der.
│   │
│   └── pages/
│       └── StudioPage.tsx             ← Ensamblador de la página principal
│
├── lib/
│   └── utils.ts                       ← cn() helper (clsx + tailwind-merge)
│
├── App.tsx                            ← Sustituye plantilla; monta StudioPage
├── main.tsx                           ← Sin cambios
└── index.css                          ← Tokens semánticos Tailwind
```

> **Archivos eliminados tras la implementación:** `src/App.css` y los assets de plantilla Vite (`react.svg`, `vite.svg`, `hero.png`).

---

## Contratos de datos — `src/interfaces/hama.interface.ts`

Cubre: RF-2, RF-5, RF-7, RF-8, RF-12, RF-13

```
HamaColor {
  id: string           // Código oficial ("01", "17"…)
  name: string         // Nombre en español e inglés
  hex: string          // Valor HEX (#RRGGBB)
  r: number            // Canal rojo 0-255 (precalculado)
  g: number            // Canal verde 0-255
  b: number            // Canal azul 0-255
  luminance: number    // 0-1, precalculado con pesos perceptuales
}

BeadType {
  id: 'mini' | 'midi' | 'maxi'
  name: string
  diameterMm: number   // 2.5 | 5.0 | 10.0
  pegboardSize: number // 28 | 29 | 15
}

BeadCell = HamaColor | null  // null = celda vacía (transparente)

GridData {
  cols: number
  rows: number
  cells: BeadCell[][]  // [row][col], filas × columnas
}

ColorCount {
  color: HamaColor
  count: number
}

BoardsLayout {
  cols: number    // Placas en horizontal
  rows: number    // Placas en vertical
  total: number   // cols × rows
}

HamaStoreState {
  // Configuración
  beadTypeId: 'mini' | 'midi' | 'maxi'
  widthCm: number
  heightCm: number
  lockAspect: boolean
  removeBg: boolean
  enabledColorIds: string[]
  // Imagen
  imageSrc: string | null
  imageAspectRatio: number | null  // height/width natural
  // Resultado del procesamiento
  gridData: GridData | null
  // Preferencias de vista
  zoom: number           // 0.5 – 3.0
  showGrid: boolean
  showCodes: boolean
  beadShape: 'hollow' | 'pixel'
  highlightedColorId: string | null
}
```

**Decisión:** Se separan los contratos de datos en `src/interfaces/` y no en el store ni en el core para respetar la constitución (principio 1 y 3) y facilitar la reutilización en la Spec 002 sin acoplamientos.

---

## Funciones puras del core

### `src/hama/core/palette.const.ts`
**Trazabilidad:** RF-7, RF-8

Exporta la constante `HAMA_PALETTE: HamaColor[]` con los 30 colores oficiales Hama Midi precalculados (r, g, b, luminance). Esta es la única fuente de verdad de la paleta en toda la aplicación.

**Decisión:** Se precalculan r, g, b y luminance en la constante (no en tiempo de ejecución) para que `quantizer.ts` opere sin transformaciones internas en cada llamada. Alternativa descartada: calcularlos en el cuantizador —añadiría ruido a la función pura sin ganancia.

---

### `src/hama/core/grid-calculator.ts`
**Trazabilidad:** RF-2, RF-3, RF-4, RF-5, RF-13

```
// Convierte centímetros a número de perlas con clamp [8, 120]
calcBeadCount(cm: number, diameterMm: number): number
  → raw = Math.round(cm / (diameterMm / 10))
  → return Math.min(120, Math.max(8, raw))

// Ajusta la segunda dimensión manteniendo la proporción
calcLockedDimension(
  primaryCm: number,
  aspectRatio: number,   // height/width o width/height
  decimalPlaces?: number // default 1
): number
  → result = primaryCm * aspectRatio
  → return parseFloat(result.toFixed(decimalPlaces ?? 1))

// Clamps una dimensión al rango físico [4, 100]
clampCm(cm: number): number
  → return Math.min(100, Math.max(4, cm))

// Calcula las placas necesarias para cubrir la cuadrícula
calcBoardsLayout(cols: number, rows: number, pegboardSize: number): BoardsLayout
  → bCols = Math.ceil(cols / pegboardSize)
  → bRows = Math.ceil(rows / pegboardSize)
  → return { cols: bCols, rows: bRows, total: bCols * bRows }
```

**Decisión:** `clampCm` y `calcBeadCount` son funciones separadas. Alternativa descartada: una sola función "calcGrid" con lógica de clamp interna —dificulta las pruebas unitarias atómicas de cada regla de negocio.

---

### `src/hama/core/quantizer.ts`
**Trazabilidad:** RF-6, RF-7

```
// Distancia Redmean entre un píxel y un color de la paleta
redmeanDistance(r1: number, g1: number, b1: number, color: HamaColor): number
  → rmean = (r1 + color.r) / 2
  → dr = r1 - color.r; dg = g1 - color.g; db = b1 - color.b
  → return sqrt((2 + rmean/256)*dr² + 4*dg² + (2 + (255-rmean)/256)*db²)

// Encuentra el color más cercano en la paleta activa
findClosestColor(r: number, g: number, b: number, palette: HamaColor[]): HamaColor
  → Itera sobre palette, devuelve el color con menor redmeanDistance

// Determina si un píxel de fondo debe descartarse (RF-6.3)
isBackgroundPixel(
  r: number, g: number, b: number,
  bgR: number, bgG: number, bgB: number
): boolean
  → Si bgR>240 && bgG>240 && bgB>240:
      distancia = sqrt((r-bgR)²+(g-bgG)²+(b-bgB)²)
      return distancia <= 20
  → Si no: return false  (fondo no claro → no se descarta)

// Detecta el color de fondo muestreando las 4 esquinas
detectBackgroundColor(imageData: Uint8ClampedArray, cols: number, rows: number): {r,g,b}
  → Toma píxeles en (0,0), (cols-1,0), (0,rows-1), (cols-1,rows-1)
  → Promedia sus componentes RGB
  → Devuelve el promedio

// Procesa un píxel y devuelve la celda correspondiente
processPixel(
  r: number, g: number, b: number, alpha: number,
  bg: {r,g,b},
  removeBg: boolean,
  palette: HamaColor[]
): BeadCell
  → Si alpha < 120: return null
  → Si removeBg && isBackgroundPixel(r,g,b, bg.r,bg.g,bg.b): return null
  → return findClosestColor(r, g, b, palette)
```

**Decisión:** `detectBackgroundColor` recibe el `imageData` ya escalado (de la imagen reducida al tamaño de la cuadrícula), no la imagen original. Esto garantiza que el muestreo de esquinas corresponda a la resolución real de la cuadrícula y no a la imagen fuente, evitando falsos negativos en imágenes con bordes decorativos. Alternativa descartada: muestrear la imagen original —incoherente con la cuadrícula resultante.

---

### `src/hama/core/image-processor.ts`
**Trazabilidad:** RF-1, RF-5, RF-6, RF-7, RF-12

```
// Pipeline principal: imagen → GridData
processImage(
  imageSrc: string,        // dataURL
  cols: number,
  rows: number,
  activePalette: HamaColor[],
  removeBg: boolean
): Promise<GridData>
```

**Flujo interno:**
1. Crea un `HTMLImageElement` y espera su carga (`onload`).
2. Crea un `OffscreenCanvas` (o `HTMLCanvasElement` si no disponible) de `cols × rows`.
3. Dibuja la imagen escalada con `imageSmoothingEnabled = false` para preservar bordes nítidos.
4. Extrae `ImageData` (`ctx.getImageData`).
5. Llama a `detectBackgroundColor` con el `imageData` escalado.
6. Itera cada píxel con `processPixel`; construye la matriz `cells: BeadCell[][]`.
7. Devuelve `{ cols, rows, cells }`.

**Decisión:** El pipeline es asíncrono (`Promise`) porque la carga de imagen es inherentemente async. Se usa `OffscreenCanvas` cuando esté disponible (mejor rendimiento en Chrome) con fallback a `HTMLCanvasElement`. Alternativa descartada: ejecutar el pipeline en un Web Worker —mejora el rendimiento en cuadrículas extremas pero aumenta la complejidad de la implementación fuera del alcance de esta spec.

---

### `src/hama/core/png-exporter.ts`
**Trazabilidad:** RF-14

```
// Genera y descarga el PNG del patrón
exportPatternPng(
  gridData: GridData,
  beadType: BeadType,
  widthCm: number,
  heightCm: number
): void
```

**Flujo interno:**
1. Crea un `HTMLCanvasElement` offscreen con fondo blanco `#ffffff`.
2. Dibuja la cabecera de metadatos (texto): nombre del patrón, tipo de perla, dimensiones cm y resolución en perlas.
3. Dibuja reglas numéricas en eje X (columnas) y Y (filas).
4. Por cada celda no nula: dibuja un círculo relleno con el color HEX de la perla + código oficial centrado, con color de texto determinado por luminancia.
5. Por cada celda nula: dibuja el contorno vacío de la celda.
6. Invoca `canvas.toDataURL('image/png')` y dispara una descarga mediante un `<a>` temporal.

**Decisión:** El tamaño de celda fijo en el PNG es 32 px (independiente del zoom del visor), garantizando siempre una resolución de exportación legible. Alternativa descartada: exportar al zoom actual del visor —produciría PNGs de calidad inconsistente.

---

## Estado global — `src/hama/store/hama.store.ts`
**Trazabilidad:** RF-1 a RF-14, RNF-4

Zustand store con `persist` middleware sobre `localStorage` (clave `hama-storage`).

**Acciones expuestas:**

| Acción | Descripción | RF |
|---|---|---|
| `setImageSrc(src, aspectRatio)` | Actualiza imagen y ratio; si lockAspect, recalcula heightCm | RF-1, RF-4 |
| `setBeadTypeId(id)` | Cambia el tipo de perla | RF-2 |
| `setWidthCm(cm)` | Clamp + actualiza; si lockAspect, recalcula heightCm | RF-3, RF-4 |
| `setHeightCm(cm)` | Clamp + actualiza; si lockAspect, recalcula widthCm | RF-3, RF-4 |
| `setLockAspect(lock)` | Activa/desactiva el bloqueo de proporción | RF-4 |
| `setRemoveBg(active)` | Activa/desactiva eliminación de fondo | RF-6 |
| `setEnabledColorIds(ids)` | Actualiza paleta activa (nunca vacía) | RF-8 |
| `setGridData(data)` | Persiste el resultado del procesamiento | RF-5, RF-7 |
| `setZoom(zoom)` | Actualiza zoom del visor | RF-10 |
| `setShowGrid(v)` | Toggle cuadrícula | RF-9 |
| `setShowCodes(v)` | Toggle códigos | RF-9 |
| `setBeadShape(s)` | Alterna hollow/pixel | RF-9 |
| `setHighlightedColorId(id)` | Activa/desactiva resalte de color | RF-11 |

**Valores por defecto persistidos:**

```
beadTypeId:        'midi'
widthCm:           8
heightCm:          8
lockAspect:        true
removeBg:          true
enabledColorIds:   [todos los 30 ids de HAMA_PALETTE]
imageSrc:          null  (no persistida — se recarga el preset al iniciar)
imageAspectRatio:  null
gridData:          null  (no persistida — se recalcula)
zoom:              1
showGrid:          true
showCodes:         false
beadShape:         'hollow'
highlightedColorId: null
```

**Decisión:** `imageSrc` y `gridData` **no se persisten** en localStorage para evitar almacenar strings de dataURL de gran tamaño (pueden superar los 5 MB) y causar errores de cuota. Al recargar, `StudioPage` detecta `imageSrc === null` y carga el preset de demostración automáticamente. Alternativa descartada: persistir todo el estado —riesgo de exceder la cuota de localStorage con imágenes grandes.

---

## Hooks de integración

### `src/hama/hooks/useImageLoader.ts`
**Trazabilidad:** RF-1

Encapsula la lectura de `File` → dataURL (mediante `FileReader`) y la carga de presets (dataURL inline). Expone:
```
useImageLoader(): {
  loadFile: (file: File) => void
  loadPreset: (type: 'mushroom' | 'heart' | 'duck') => void
  error: string | null
}
```
Internamente llama a `store.setImageSrc` con el dataURL resultante y el ratio natural de la imagen.

**Decisión:** Se encapsula en un hook y no en el store para mantener el store libre de efectos secundarios (FileReader, Image onload). El store solo recibe datos ya procesados. Alternativa descartada: manejar la carga en el store con middleware —viola la pureza del store y complica el testing.

---

### `src/hama/hooks/useCanvasRenderer.ts`
**Trazabilidad:** RF-9, RF-10, RF-11, RNF-2

Hook que encapsula toda la lógica de dibujo del canvas 2D. Recibe una `ref` al elemento `<canvas>` y los parámetros de renderizado, y ejecuta el dibujo en un `useEffect`. Expone:
```
useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  gridData: GridData | null,
  options: {
    zoom: number
    showGrid: boolean
    showCodes: boolean
    beadShape: 'hollow' | 'pixel'
    highlightedColorId: string | null
    beadType: BeadType
    darkMode: boolean
  }
): void
```

**Responsabilidades internas:**
1. Calcula `cellSize = baseCellSize × zoom` con `baseCellSize` adaptado al mayor lado de la cuadrícula.
2. Aplica DPR: `canvas.width = (cols × cellSize + rulerOffset) × dpr`, escala el contexto con `ctx.scale(dpr, dpr)`.
3. Dibuja: fondo de reglas → numeración de ejes → celdas vacías (ajedrezado + clavija) → perlas (hollow o pixel) → códigos → líneas de cuadrícula y límites de placa.
4. Aplica `globalAlpha = 0.18` a perlas atenuadas cuando `highlightedColorId` está activo.

**Decisión:** El renderizado completo se rehace en cada cambio de parámetros (sin renders incrementales). Para cuadrículas de hasta 120×120 con celdas de ~34 px esta estrategia es suficientemente rápida (< 2 s, RNF-1). Alternativa descartada: renderizado incremental con `dirty flags` —complejidad innecesaria para el rango de tamaños de esta spec.

---

## Componentes UI

### `src/hama/components/Controls/ImageDropzone.tsx`
**Trazabilidad:** RF-1

- Zona con eventos `onDragOver` / `onDrop` y botón que activa un `<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">` oculto.
- Botones de presets (Seta 🍄, Corazón ❤️, Patito 🦆).
- Muestra la miniatura de la imagen activa (`pixelated` rendering).
- Si el archivo tiene formato no soportado, muestra un mensaje de error inline transitorio (RF-1.7). No usa `alert()`.

---

### `src/hama/components/Controls/BeadTypeSelector.tsx`
**Trazabilidad:** RF-2

- Selector de tres opciones (Mini / Midi / Maxi) con descripción del diámetro.
- Al cambiar, llama a `store.setBeadTypeId`.

---

### `src/hama/components/Controls/DimensionInputs.tsx`
**Trazabilidad:** RF-3, RF-4, RF-5

- Dos campos numéricos (Ancho cm / Alto cm) con `step="0.5"` y `min="4"` `max="100"`.
- Botón de candado (🔒/🔓) que activa/desactiva `lockAspect`.
- Badge que muestra la resolución calculada en perlas (columnas × filas) — derivado del store.

---

### `src/hama/components/Controls/ViewerToolbar.tsx`
**Trazabilidad:** RF-9, RF-10

- Controles de zoom: botones − y + con display del porcentaje actual.
- Toggle cuadrícula (# Cuadrícula).
- Toggle códigos (🆔 Códigos).
- Toggle forma de perla (⭕ Perla / ⬛ Píxel).
- Toggle eliminación de fondo (🪄 Quitar fondo / activo por defecto).

---

### `src/hama/components/Canvas2D/Grid2DCanvas.tsx`
**Trazabilidad:** RF-9, RF-10, RF-11, RNF-2

- Renderiza un `<canvas>` dentro de un contenedor con `overflow: auto` (scroll nativo, RF-10.2).
- Usa `useCanvasRenderer` para toda la lógica de dibujo.
- Registra el listener de `wheel` con `{ passive: false }` para interceptar `Ctrl+scroll` (RF-10.3); solo en desktop (detectado por `navigator.maxTouchPoints === 0`).
- Muestra en el pie el texto descriptivo del tipo de placa activo y, si hay color resaltado, el botón "Mostrar todos los colores" (RF-11.3).

---

### `src/hama/components/Guide/ColorInventoryTable.tsx`
**Trazabilidad:** RF-11, RF-12

- Deriva la lista `ColorCount[]` a partir de `gridData.cells`: recuento por id, ordenado por count desc.
- Muestra: muestra de color circular con código interior, nombre, recuento en badge.
- Clic en fila: llama a `store.setHighlightedColorId` (toggle: si ya está activo, lo desactiva).
- Fila activa resaltada con fondo de acento.
- Total de perlas visible en la cabecera de la tabla.

---

### `src/hama/components/Guide/BoardsSummary.tsx`
**Trazabilidad:** RF-13

- Muestra tres métricas en tarjeta: Tamaño Final (cm), Placas Base (cols × rows = total), Tiempo Estimado.
- Deriva `BoardsLayout` de `gridData` + `beadType` usando `calcBoardsLayout` importado directamente del core.

---

### `src/hama/components/Guide/PaletteModal.tsx`
**Trazabilidad:** RF-8

- Modal (overlay) con los 30 colores de `HAMA_PALETTE`.
- Checkbox por color; si solo queda 1 activo, el checkbox del último activo queda deshabilitado.
- Botones de preset: "Todos los colores" y "Colores básicos".
- Al cerrar, el store ya tiene la paleta activa actualizada y el re-procesamiento se dispara.

---

### `src/hama/layouts/StudioLayout.tsx`
**Trazabilidad:** RF-9, RF-12 (composición)

Layout en dos columnas mediante CSS Grid/Flex con Tailwind:
- **Columna izquierda (7/12):** `Grid2DCanvas` + `ViewerToolbar`.
- **Columna derecha (5/12):** `ColorInventoryTable` + `BoardsSummary` + instrucciones de montaje básicas.
- En pantallas < lg: columna única con scroll vertical.

---

### `src/hama/pages/StudioPage.tsx`
**Trazabilidad:** Orquesta toda la spec

- Lee el store y, cuando `imageSrc === null`, carga el preset de demostración (Seta) al montar.
- Observa con `useEffect` los cambios en `{imageSrc, cols, rows, enabledColorIds, removeBg}` y llama a `processImage` del core, actualizando `store.setGridData` con el resultado.
- Contiene el botón de descarga PNG (llama a `exportPatternPng`).
- Monta `StudioLayout` con todos los subcomponentes.

---

### `src/App.tsx` (reemplazado)
**Trazabilidad:** Punto de entrada

Elimina la plantilla Vite. Renderiza únicamente:
```tsx
import StudioPage from '@/hama/pages/StudioPage'
export default function App() {
  return <StudioPage />
}
```

---

### `src/lib/utils.ts`
Helper `cn()` que combina `clsx` + `tailwind-merge`. Requerido por todas las utilidades de estilo.

---

## Algoritmo central — Flujo de datos completo

```
Usuario cambia imagen / dimensiones / tipo de perla / paleta / removeBg
         │
         ▼
StudioPage (useEffect detecta cambio)
         │
         ├─► calcBeadCount(widthCm, diameterMm)  → cols (clamp 8-120)
         ├─► calcBeadCount(heightCm, diameterMm) → rows (clamp 8-120)
         │
         ▼
processImage(imageSrc, cols, rows, activePalette, removeBg)
         │
         ├─► Escalar imagen a cols×rows px (OffscreenCanvas)
         ├─► detectBackgroundColor(imageData, cols, rows) → bg {r,g,b}
         └─► Por cada píxel:
               processPixel(r,g,b,a, bg, removeBg, palette) → BeadCell
         │
         ▼
store.setGridData({ cols, rows, cells })
         │
         ├─► Grid2DCanvas      → useCanvasRenderer redibuja el canvas
         ├─► ColorInventoryTable → deriva BOM de cells
         └─► BoardsSummary     → calcBoardsLayout(cols, rows, pegboardSize)
```

---

## Integración del tema visual

- La aplicación soporta modo claro y oscuro mediante la clase `dark` en `<html>`.
- El tema se gestiona con un estado local en `StudioPage` (no persistido en Zustand) para no mezclar preferencias de UI con datos de dominio.
- El canvas 2D adapta sus colores de fondo y cuadrícula según el tema activo, recibido como prop en `useCanvasRenderer`.
- El PNG exportado usa **siempre fondo blanco** (RF-14.5), ignorando el tema activo.

---

## Estrategia de tests

Framework: **Vitest** (ya configurado en `package.json`).
Localización: `src/hama/core/__tests__/` (funciones puras) y `src/hama/store/__tests__/` (store).
No se requieren tests de componentes en esta spec (la validación visual se realiza con el servidor de desarrollo y Chrome DevTools MCP).

### Tests de `grid-calculator.ts`

| Test | Entrada | Salida esperada | RF |
|---|---|---|---|
| Midi 8 cm | cm=8, diam=5.0 | 16 | RF-5.1 |
| Mini 4 cm (límite inf.) | cm=4, diam=2.5 | 16 | RF-5.1 |
| Maxi 4 cm → fuerza mínimo | cm=4, diam=10.0 | 8 | RF-5.2 |
| Midi 1 cm → fuerza mínimo | cm=1, diam=5.0 | 8 | RF-5.2 |
| Midi 65 cm → fuerza máximo | cm=65, diam=5.0 | 120 | RF-5.3 |
| clampCm bajo | cm=2 | 4 | RF-3.3 |
| clampCm alto | cm=150 | 100 | RF-3.4 |
| calcLockedDimension | primary=10, ratio=0.5 | 5.0 | RF-4.2 |
| calcBoardsLayout Midi | cols=30, rows=29, peg=29 | {cols:2,rows:1,total:2} | RF-13 |
| calcBoardsLayout exact fit | cols=29, rows=29, peg=29 | {cols:1,rows:1,total:1} | RF-13 |

### Tests de `quantizer.ts`

| Test | Descripción | RF |
|---|---|---|
| `findClosestColor` negro puro | RGB (0,0,0) → color Hama #18 Negro | RF-7.1 |
| `findClosestColor` blanco puro | RGB (255,255,255) → color Hama #01 Blanco | RF-7.1 |
| `findClosestColor` paleta de 1 | Cualquier RGB → único color disponible | RF-7.2 |
| `processPixel` alfa bajo | alpha=100 → null | RF-6.1 |
| `processPixel` alfa OK, sin removeBg | RGB fondo blanco, removeBg=false → color Hama | RF-6.4 |
| `isBackgroundPixel` fondo blanco + dentro del umbral | (252,252,252) con bg (255,255,255) → true | RF-6.3 |
| `isBackgroundPixel` fondo blanco + fuera del umbral | (220,190,171) con bg (255,255,255) → false (Crema) | RF-6.3 |
| `isBackgroundPixel` fondo oscuro | bg (50,50,50) → siempre false | RF-6.3 |

### Tests del store `hama.store.ts`

| Test | Descripción | RF |
|---|---|---|
| `setEnabledColorIds([])` | No reduce a 0; mantiene al menos 1 | RF-8.3 |
| `setWidthCm` + lockAspect | Actualiza heightCm proporcionalmente | RF-4.2 |
| `setHighlightedColorId` toggle | Llamar dos veces con el mismo id → null | RF-11.2 |
| `setZoom` clamp | Valores fuera de [0.5, 3] son descartados | RF-10.1 |

---

## Decisiones técnicas justificadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| **`imageSrc` y `gridData` no persistidos** | Persistir todo el estado | dataURLs de imágenes grandes superan la cuota de localStorage (≈5 MB en Chrome) |
| **Redibujado completo del canvas** | Dirty flags / patches incrementales | La cuadrícula máxima (120×120 × 34 px × DPR) es < 2 s; la complejidad incremental no está justificada |
| **OffscreenCanvas con fallback** | Solo HTMLCanvasElement | OffscreenCanvas es más rápido y no bloquea el hilo principal; el fallback garantiza compatibilidad con Safari |
| **Carga de imagen en hook, no en store** | Middleware Zustand con FileReader | El store debe ser puro (solo datos y acciones síncronas); los efectos secundarios van a hooks |
| **Detección de fondo sobre imagen escalada** | Detección sobre imagen original | Las esquinas de la imagen escalada corresponden exactamente a las celdas de la cuadrícula generada |
| **Tema claro/oscuro como estado local de StudioPage** | En el store Zustand | No es dato de dominio; no tiene sentido persistirlo junto con la configuración de perlas |
| **Tests solo de core y store** | Tests de componentes React | Las funciones puras son deterministas y fácilmente testeables con Vitest; los componentes se validan visualmente vía Chrome DevTools MCP |

---

## Trazabilidad RF → Archivos

| RF | Archivos principales |
|---|---|
| RF-1 | `useImageLoader.ts`, `ImageDropzone.tsx`, `StudioPage.tsx` |
| RF-2 | `BeadTypeSelector.tsx`, `hama.store.ts`, `palette.const.ts` |
| RF-3 | `DimensionInputs.tsx`, `grid-calculator.ts`, `hama.store.ts` |
| RF-4 | `DimensionInputs.tsx`, `grid-calculator.ts`, `hama.store.ts` |
| RF-5 | `grid-calculator.ts`, `StudioPage.tsx`, `DimensionInputs.tsx` |
| RF-6 | `quantizer.ts`, `image-processor.ts`, `ViewerToolbar.tsx` |
| RF-7 | `quantizer.ts`, `image-processor.ts`, `palette.const.ts` |
| RF-8 | `PaletteModal.tsx`, `hama.store.ts`, `palette.const.ts` |
| RF-9 | `Grid2DCanvas.tsx`, `useCanvasRenderer.ts` |
| RF-10 | `Grid2DCanvas.tsx`, `useCanvasRenderer.ts`, `ViewerToolbar.tsx` |
| RF-11 | `Grid2DCanvas.tsx`, `ColorInventoryTable.tsx`, `hama.store.ts` |
| RF-12 | `ColorInventoryTable.tsx` |
| RF-13 | `BoardsSummary.tsx`, `grid-calculator.ts` |
| RF-14 | `png-exporter.ts`, `StudioPage.tsx` |
