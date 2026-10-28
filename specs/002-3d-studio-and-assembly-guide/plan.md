# Plan Técnico — Spec 002: Estudio 3D y Guía de Montaje Multicapa

---

## 1. Arquitectura y Responsabilidades de Archivos

Siguiendo estrictamente la Constitución (`docs/constitution.md`) y la estructura modular por dominios de `AGENTS.md`, la implementación de la Spec 002 se divide en las siguientes capas desacopladas:

```
src/
├── interfaces/
│   ├── hama-3d.interface.ts           # [NUEVO] Contratos de datos TypeScript para vóxeles, capas 3D, modos y guía de montaje
├── hama/
│   ├── core/
│   │   ├── voxelizer.ts               # [NUEVO] Motores matemáticos puros: Vaciado hueco (Hollow Slicing), Interlocking (Tabs & Slots) y Relieve
│   │   ├── assembly-guide.ts          # [NUEVO] Generación algorítmica de la secuencia paso a paso (BOM parcial y coordenadas)
│   │   ├── pdf-exporter.ts            # [NUEVO] Generador de manual de montaje PDF multi-página con jspdf
│   │   └── __tests__/
│   │       ├── voxelizer.test.ts      # [NUEVO] Tests unitarios de vaciado hueco, interlocking y relieve
│   │       ├── assembly-guide.test.ts # [NUEVO] Tests unitarios de descomposición secuencial
│   │       └── pdf-exporter.test.ts   # [NUEVO] Tests de composición del documento PDF
│   ├── hooks/
│   │   ├── useThreeScene.ts           # [NUEVO] Hook de integración WebGL con Three.js, InstancedMesh, OrbitControls y ciclo de vida (dispose)
│   ├── components/
│   │   ├── Scene3D/
│   │   │   ├── VoxelScene3D.tsx       # [NUEVO] Componente contenedor del visor 3D y canvas WebGL
│   │   │   ├── LayerStackControls.tsx # [NUEVO] Controles de vista explosionada (0-50mm), selector de capa y aislamiento
│   │   │   └── Scene3DOverlay.tsx     # [NUEVO] Reencuadre de cámara, captura de miniatura y estadísticas de perlas 3D
│   │   ├── Controls/
│   │   │   └── Mode3DSelector.tsx     # [NUEVO] Selector de los 3 modos 3D (Hueco, Interlocking, Relieve) y sus parámetros
│   │   └── Guide/
│   │       └── ExportPdfButton.tsx    # [NUEVO] Botón de exportación del manual de montaje con feedback de progreso
│   ├── layouts/
│   │   └── StudioLayout.tsx           # [MODIFICAR] Soporte para alternar visor 2D (Grid2DCanvas) y visor 3D (VoxelScene3D)
│   ├── pages/
│   │   └── StudioPage.tsx             # [MODIFICAR] Integración de pestañas '2D' / '3D' y sincronización del store
│   └── store/
│       └── hama.store.ts              # [MODIFICAR] Estado reactivo 3D (modo activo, configuración de capas, vista explosionada)
```

---

## 2. Contratos de Datos (`src/interfaces/hama-3d.interface.ts`)

```typescript
import type { BeadCell, HamaColor } from './hama.interface'

export type Mode3DType = 'hollow' | 'interlocking' | 'relief'
export type InterlockingStructureType = 'box' | 'cross_ribs'

export interface VoxelPosition {
  x: number // Columna en cuadrícula (eje X)
  y: number // Fila en cuadrícula (eje Y)
  z: number // Capa o elevación (eje Z)
}

export interface VoxelBead {
  position: VoxelPosition
  color: HamaColor
}

export interface VoxelLayer {
  layerIndex: number
  name: string
  cells: BeadCell[][]
  beadCount: number
  zOffsetMm: number
}

export interface InterlockingPlate {
  id: string
  name: string // ej. 'Frontal', 'Lateral Izquierda', 'Tapa'
  orientation: 'xy' | 'xz' | 'yz'
  cells: BeadCell[][]
  widthBeads: number
  heightBeads: number
  position3D: [number, number, number] // Desplazamiento inicial en mm
}

export interface AssemblyStep {
  stepNumber: number
  title: string
  type: 'layer' | 'plate'
  cells: BeadCell[][]
  beadCounts: { color: HamaColor; count: number }[]
  totalBeads: number
  instructions: string
}

export interface Model3DResult {
  mode: Mode3DType
  layers?: VoxelLayer[]
  plates?: InterlockingPlate[]
  totalBeads: number
  dimensionsMm: { x: number; y: number; z: number }
}
```

---

## 3. Funciones Puras de Lógica (`src/hama/core/`)

Todas las funciones son matemáticas puras, sin `window`, `document`, React hooks ni Canvas context:

### 3.1. `src/hama/core/voxelizer.ts`

```typescript
/**
 * Detecta celdas internas mediante erosión morfológica 4-conectada
 * para generar capas huecas con grosor de 1 o 2 perlas.
 */
export function identifyInteriorCells(
  cells: BeadCell[][],
  wallThickness: 1 | 2
): boolean[][]

/**
 * Modo 1: Genera el apilado multicapa hueco (Slicing).
 * Capa 1 y N son sólidas; capas 2 a N-1 se ahuecan con wallThickness.
 */
export function generateHollowLayers(
  baseGrid: BeadCell[][],
  totalLayers: number,
  wallThickness: 1 | 2,
  diameterMm: number
): VoxelLayer[]

/**
 * Modo 2: Descompone el modelo en placas ortogonales con pestañas y ranuras (Tabs & Slots).
 * Si structureType === 'box': 6 placas (Frontal, Trasera, Laterales, Tapas).
 * Si structureType === 'cross_ribs': Placa principal + 2 costillas transversales.
 */
export function generateInterlockingPlates(
  baseGrid: BeadCell[][],
  structureType: InterlockingStructureType,
  depthBeads: number,
  diameterMm: number
): InterlockingPlate[]

/**
 * Modo 3: Genera escultura en bajorrelieve según luminancia acumulativa.
 * Mapea luminancia a niveles (2 a 6) rellenando sólidamente capas inferiores.
 */
export function generateReliefLayers(
  baseGrid: BeadCell[][],
  levels: number,
  diameterMm: number
): VoxelLayer[]
```

### 3.2. `src/hama/core/assembly-guide.ts`

```typescript
/**
 * Convierte un resultado 3D (capas o placas) en una secuencia ordenada
 * de pasos de montaje con inventario parcial y coordenadas exactas.
 */
export function deriveAssemblySteps(model: Model3DResult): AssemblyStep[]
```

### 3.3. `src/hama/core/pdf-exporter.ts`

```typescript
export interface PdfExportOptions {
  projectName: string
  beadTypeName: string
  dimensionsCm: string
  model3D: Model3DResult
  steps: AssemblyStep[]
  coverPreviewDataUrl: string
}

/**
 * Genera el documento PDF multi-página paso a paso en el cliente mediante jsPDF.
 */
export async function exportAssemblyManualPdf(options: PdfExportOptions): Promise<void>
```

---

## 4. Algoritmos y Flujo de Datos

### 4.1. Algoritmo de Ahuecado Morfológico (Hollow Core Slicing)
1. Para una capa intermedia `cells[y][x]`, una celda no vacía es **perimetral** si alguno de sus 4 vecinos directos (arriba, abajo, izquierda, derecha) es `null` (fondo o fuera de límites).
2. Si `wallThickness === 1`:
   - Las celdas con al menos 1 vecino `null` se conservan.
   - Las celdas cuyos 4 vecinos son perlas válidas se reemplazan por `null` (núcleo hueco).
3. Si `wallThickness === 2`:
   - Se ejecuta una segunda pasada de erosión: una celda interior se conserva si tiene al menos un vecino que era perimetral en la primera pasada.
4. Criterio de seguridad: si una pieza tiene un ancho $< 3$ perlas, ninguna celda se elimina para evitar desconexiones físicas.

### 4.2. Algoritmo de Machihembrado Ortogonal (Tabs & Slots a 90°)
1. En cada borde de unión de longitud $L$ perlas:
   - Placa macho (ej. Frontal): posiciones pares $x \pmod 2 == 0$ proyectan una pestaña ($+1$ perla en el plano adyacente); posiciones impares quedan al ras.
   - Placa hembra (ej. Lateral): posiciones pares tienen una ranura vacía ($null$), posiciones impares tienen material sólido de retención.
2. Encaje exacto: al unir ambas placas a 90°, cada pestaña encaja sin holguras en la ranura correspondiente, logrando fricción mecánica autoblocante sin adhesivo.

### 4.3. Flujo en el Visor 3D (`useThreeScene.ts` e `InstancedMesh`)
1. Al recibir `Model3DResult`, la función calcula el total de perlas y agrupa las posiciones por color oficial Hama.
2. Para cada color único, se instancia un `InstancedMesh` con geometría cilíndrica (`CylinderGeometry` con radio 0.45, altura 0.9, subdivisión 16) y material `MeshStandardMaterial` con el color HEX y rugosidad 0.35.
3. Para la **Vista Explosionada**:
   - Cada perla calcula su matriz de transformación $M = T \times R \times S$.
   - La traslación incorpora la separación: $Z_{\text{visual}} = Z \times (\text{alturaPerla} + \text{explodedGapMm})$.
   - Al mover el slider en la UI, se actualizan las matrices de instancia (`setMatrixAt`) sin recrear geometrías ni materiales en GPU (rendimiento a 60 FPS garantizado).
4. **Aislamiento de capa:** Si `activeLayerIndex !== null`, se ocultan los `InstancedMesh` o se les aplica matriz de escala 0 a las perlas que no correspondan a la capa activa.

---

## 5. Decisiones Técnicas Justificadas

| Decisión Técnica | Alternativa Descartada | Justificación |
|---|---|---|
| **Three.js modular nativo con `InstancedMesh`** | React Three Fiber (`@react-three/fiber` + `@react-three/drei`) | El proyecto ya tiene instalado `three: ^0.186.1` y `@types/three`. `InstancedMesh` agrupa miles de perlas por color en un solo draw-call (60 FPS estables con $10.000$ perlas). R3F agregaría dependencias pesadas, incompatibilidades de versión con React 18/19 y mayor overhead de reconciliación. |
| **Generación PDF con `jspdf` en el cliente** | `pdfmake` o impresión HTML `window.print()` | `jspdf` permite control milimétrico exacto de coordenadas vectoriales, dibujo directo de celdas con colores HEX y textos centrados en papel A4, garantizando exportación determinista e idéntica en cualquier navegador y sistema operativo sin diálogos de impresión dependientes del SO. |
| **Erosión morfológica en 2D para ahuecado** | Operaciones booleanas CSG en mallas 3D | El modelo de Hama Beads es intrínsecamente discreto (grilla de cuentas). Operar sobre la matriz 2D `BeadCell[][]` es determinista, tiene complejidad $O(W \times H)$, es 100% testeable en Vitest y no sufre de errores de precisión flotante o mallas no-manifold. |
| **Juntas a 90° con paso de 1 perla (1 tab / 1 slot)** | Juntas de 2 o más perlas | En perlas Midi (5 mm) o Mini (2.5 mm), el paso unitario de 1 perla maximiza la superficie de rozamiento y rigidez en figuras pequeñas (ej. 15 a 30 perlas de arista) sin requerir adhesivos. |

---

## 6. Estrategia de Tests (`npm test`)

Se crearán 3 suites de pruebas unitarias puras en `src/hama/core/__tests__/`:

1. **`voxelizer.test.ts` (10-12 tests):**
   - Vaciado morfológico con grosor 1: celdas interiores se convierten en `null`; celdas de borde permanecen intactas.
   - Vaciado con grosor 2: conserva 2 perlas de borde antes de vaciar.
   - Seguridad en figuras finas (< 3 perlas): no elimina perlas para evitar colapso.
   - Capas base y superior siempre 100% sólidas en modo Slicing.
   - Interlocking Box: genera 6 placas con dimensiones y juntas complementarias (las pestañas de la frontal coinciden con las ranuras de la lateral).
   - Interlocking Costillas: genera ranuras de inserción a la mitad de la altura.
   - Relieve por luminancia: clasificación correcta en niveles discretos y relleno sólido inferior.

2. **`assembly-guide.test.ts` (6-8 tests):**
   - Descompone correctamente un modelo de N capas en N pasos cronológicos.
   - El recuento de perlas de cada paso suma exactamente el inventario total del modelo 3D.
   - Las coordenadas de cada celda coinciden con las del diagrama visual.

3. **`pdf-exporter.test.ts` (4-6 tests):**
   - Mock de `jsPDF` verificando inserción de portada, tablas y páginas secuenciales.
   - Verificación de metadatos y cálculo correcto de páginas totales.

---

## 7. Trazabilidad de Requisitos (Spec 002)

| Requisito Funcional | Archivos de Implementación | Tests de Cobertura |
|---|---|---|
| **RF-1 (Selector de Modo 3D)** | `hama.store.ts`, `Mode3DSelector.tsx`, `StudioPage.tsx` | `hama.store.test.ts` |
| **RF-2 (Apilado Multicapa Hueco)** | `voxelizer.ts` (`generateHollowLayers`, `identifyInteriorCells`) | `voxelizer.test.ts` |
| **RF-3 (Ensamblado Interlocking)** | `voxelizer.ts` (`generateInterlockingPlates`) | `voxelizer.test.ts` |
| **RF-4 (Relieve por Luminancia)** | `voxelizer.ts` (`generateReliefLayers`) | `voxelizer.test.ts` |
| **RF-5 (Visor 3D Interactivo)** | `useThreeScene.ts`, `VoxelScene3D.tsx`, `LayerStackControls.tsx` | `useThreeScene.test.ts` |
| **RF-6 (Manual de Montaje PDF)** | `assembly-guide.ts`, `pdf-exporter.ts`, `ExportPdfButton.tsx` | `assembly-guide.test.ts`, `pdf-exporter.test.ts` |
