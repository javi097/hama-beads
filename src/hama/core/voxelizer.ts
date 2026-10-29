import type { BeadCell, GridData } from '@/interfaces/hama.interface'
import type {
  VoxelLayer,
  InterlockingPlate,
  InterlockingStructureType,
  Mode3DType,
  Model3DResult,
  GenerateHollowLayersOptions,
  VolumeProfile,
} from '@/interfaces/hama-3d.interface'
import { HAMA_PALETTE } from './palette.const'
import {
  extrudeFrom2D,
  synthesizeRoundedVolume,
  resolveVoxelColor,
  createCavityMaskByColor,
  createCavityMaskBySeed,
  applyCavity,
  extractZSlice,
  setVoxel,
  ensureVerticalSupport,
} from './voxel-grid'

export { resolveVoxelColor }

/**
 * Identifica las celdas interiores de una cuadrícula de perlas mediante erosión morfológica
 * (transformada de distancia 4-conectada) a partir de los bordes exteriores y transparencias.
 *
 * Una celda se considera "interior" si su distancia al exterior es estrictamente mayor
 * que `wallThickness` (grosor perimetral de 1 o 2 perlas).
 * Las celdas transparentes (null) nunca son interiores.
 *
 * @param cells Matriz bidimensional de celdas de perlas
 * @param wallThickness Grosor de pared exterior a preservar (1 o 2 perlas)
 * @returns Matriz booleana del mismo tamaño donde true indica que la celda es interior
 */
export function identifyInteriorCells(
  cells: BeadCell[][],
  wallThickness: 1 | 2
): boolean[][] {
  const rows = cells.length
  if (rows === 0) return []
  const cols = cells[0].length
  if (cols === 0) return [[]]

  // Si la cuadrícula es más pequeña que el mínimo geométrico requerido para albergar
  // interior (3x3 para grosor 1, 5x5 para grosor 2), ninguna celda puede ser interior.
  const minDimension = wallThickness === 1 ? 3 : 5
  if (rows < minDimension || cols < minDimension) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => false))
  }

  // Matriz de distancias euclidianas/Manhattan 4-conectadas inicializada a infinito
  const dist: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Infinity)
  )

  const queue: [number, number][] = []

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  // Paso 1: Localización del contorno perimetral exterior y bordes de huecos null
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (cells[y][x] === null) {
        dist[y][x] = 0
        continue
      }

      // Si la perla toca el borde físico de la cuadrícula, su distancia al exterior es 1
      const isGridEdge = y === 0 || y === rows - 1 || x === 0 || x === cols - 1
      if (isGridEdge) {
        dist[y][x] = 1
        queue.push([y, x])
        continue
      }

      // Si la perla linda con un hueco transparente interior (null), su distancia al exterior es 1
      let touchesNull = false
      for (const [dy, dx] of directions) {
        const ny = y + dy
        const nx = x + dx
        if (cells[ny][nx] === null) {
          touchesNull = true
          break
        }
      }

      if (touchesNull) {
        dist[y][x] = 1
        queue.push([y, x])
      }
    }
  }

  // Paso 2: Propagación BFS de la distancia (erosión morfológica paso a paso)
  let head = 0
  while (head < queue.length) {
    const [cy, cx] = queue[head++]
    const currentDist = dist[cy][cx]

    for (const [dy, dx] of directions) {
      const ny = cy + dy
      const nx = cx + dx

      if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
        if (cells[ny][nx] !== null && dist[ny][nx] > currentDist + 1) {
          dist[ny][nx] = currentDist + 1
          queue.push([ny, nx])
        }
      }
    }
  }

  // Paso 3: Determinación de celdas interiores (aquellas a mayor distancia que la pared)
  const result: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  )

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (cells[y][x] !== null && dist[y][x] > wallThickness) {
        result[y][x] = true
      }
    }
  }

  return result
}

/**
 * Genera un mapa de profundidad 2.5D/3D normalizado (valores entre 0.0 y 1.0) para cada celda
 * de la cuadrícula, combinando la luminancia aparente, la distancia morfológica centrada
 * (abombamiento / volumen natural de regiones continuas) y la saliencia o gradiente local.
 *
 * Celdas vacías (null) tienen profundidad exactamente 0.0.
 * Celdas ocupadas tienen profundidad normalizada entre 0.10 y 1.00.
 *
 * @param baseGrid Cuadrícula 2D con celdas BeadCell[][]
 * @returns Matriz numérica rows x cols con valores de profundidad normalizada [0.0, 1.0]
 */
export function computeDepthMap(baseGrid: BeadCell[][]): number[][] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length
  if (cols === 0) return [[]]

  // 1. Transformada de distancia euclidiana/4-conectada desde el contorno exterior
  const dist: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Infinity)
  )
  const queue: [number, number][] = []
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  let occupiedCount = 0

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] === null) {
        dist[y][x] = 0
        continue
      }
      occupiedCount++

      const isGridEdge = y === 0 || y === rows - 1 || x === 0 || x === cols - 1
      let touchesNull = isGridEdge
      if (!touchesNull) {
        for (const [dy, dx] of directions) {
          const ny = y + dy
          const nx = x + dx
          if (baseGrid[ny][nx] === null) {
            touchesNull = true
            break
          }
        }
      }

      if (touchesNull) {
        dist[y][x] = 1
        queue.push([y, x])
      }
    }
  }

  if (occupiedCount === 0) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
  }

  let head = 0
  let maxDist = 1
  while (head < queue.length) {
    const [cy, cx] = queue[head++]
    const currentDist = dist[cy][cx]
    if (currentDist > maxDist) {
      maxDist = currentDist
    }

    for (const [dy, dx] of directions) {
      const ny = cy + dy
      const nx = cx + dx
      if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
        if (baseGrid[ny][nx] !== null && dist[ny][nx] > currentDist + 1) {
          dist[ny][nx] = currentDist + 1
          queue.push([ny, nx])
        }
      }
    }
  }

  // 2. Cálculo de saliencia / gradiente local
  const saliency: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  )
  let maxSaliency = 0.001

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = baseGrid[y][x]
      if (cell === null) continue

      let diffSum = 0
      let neighborCount = 0
      for (const [dy, dx] of directions) {
        const ny = y + dy
        const nx = x + dx
        if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && baseGrid[ny][nx] !== null) {
          diffSum += Math.abs(cell.luminance - baseGrid[ny][nx]!.luminance)
          neighborCount++
        }
      }
      const sal = neighborCount > 0 ? diffSum / neighborCount : 0
      saliency[y][x] = sal
      if (sal > maxSaliency) {
        maxSaliency = sal
      }
    }
  }

  // 3. Ponderación volumétrica
  let minRaw = Infinity
  let maxRaw = -Infinity
  const rawMap: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  )

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = baseGrid[y][x]
      if (cell === null) continue

      const normDist = dist[y][x] / maxDist
      const lum = cell.luminance
      const normSal = saliency[y][x] / maxSaliency

      const val = 0.50 * normDist + 0.35 * lum + 0.15 * normSal
      rawMap[y][x] = val
      if (val < minRaw) minRaw = val
      if (val > maxRaw) maxRaw = val
    }
  }

  // 4. Normalización a [0.10, 1.00] para celdas ocupadas
  const depthRange = maxRaw - minRaw
  const result: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  )

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] === null) {
        result[y][x] = 0.0
      } else if (depthRange > 0.0001) {
        result[y][x] = 0.10 + 0.90 * ((rawMap[y][x] - minRaw) / depthRange)
      } else {
        result[y][x] = 0.50
      }
    }
  }

  return result
}

/**
 * Calcula el radio morfológico (transformada de distancia al borde exterior)
 * para cada celda no vacía de la cuadrícula.
 * Celdas vacías o transparentes tienen radio 0.
 */
export function computeMorphologicalRadius(baseGrid: BeadCell[][]): {
  radiusMap: number[][]
  maxRadius: number
} {
  const rows = baseGrid.length
  if (rows === 0) return { radiusMap: [], maxRadius: 0 }
  const cols = baseGrid[0].length
  if (cols === 0) return { radiusMap: [[]], maxRadius: 0 }

  const dist: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Infinity)
  )
  const queue: [number, number][] = []
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  let occupiedCount = 0

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] === null) {
        dist[y][x] = 0
        continue
      }
      occupiedCount++

      const isCanvasBorder = y === 0 || y === rows - 1 || x === 0 || x === cols - 1
      let touchesNull = isCanvasBorder
      if (!touchesNull) {
        for (const [dy, dx] of directions) {
          const ny = y + dy
          const nx = x + dx
          if (baseGrid[ny][nx] === null) {
            touchesNull = true
            break
          }
        }
      }

      if (touchesNull) {
        dist[y][x] = 1.0
        queue.push([y, x])
      }
    }
  }

  if (occupiedCount === 0) {
    return {
      radiusMap: Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0)),
      maxRadius: 0,
    }
  }

  let head = 0
  let maxRadius = 1.0
  while (head < queue.length) {
    const [cy, cx] = queue[head++]
    const currentDist = dist[cy][cx]
    if (currentDist > maxRadius) {
      maxRadius = currentDist
    }

    for (const [dy, dx] of directions) {
      const ny = cy + dy
      const nx = cx + dx
      if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
        if (baseGrid[ny][nx] !== null && dist[ny][nx] > currentDist + 1.0) {
          dist[ny][nx] = currentDist + 1.0
          queue.push([ny, nx])
        }
      }
    }
  }

  return { radiusMap: dist, maxRadius }
}

/**
 * Genera el conjunto de capas horizontales para el modo Apilado Hueco.
 *
 * Basado en la representación canónica VoxelGrid3D:
 * - Capas base (Z=0, Capa 1) y superior (Z=N-1, Capa N) sólidas completas al 100% (RF-2.2).
 * - Capas intermedias (1 < idx < N):
 *   * Si se especifican cavidades selectivas (por color o semilla), vacía exclusivamente la cavidad indicada
 *     (por ejemplo, el cuerpo de una cámara permanece sólido mientras el objetivo se vacía).
 *   * Si no se especifican cavidades selectivas, vacía el núcleo interno morfológicamente mediante
 *     `identifyInteriorCells(slice, wallThickness)` conservando un muro perimetral continuo de 1 o 2 perlas.
 * - Validación de soporte vertical: garantiza que ninguna perla quede suspendida en el aire sobre un hueco
 *   sin soporte directo inferior o unión lateral en su plano.
 *
 * @param baseGrid Cuadrícula 2D de diseño base
 * @param totalLayers Número de capas solicitadas (acotado a [3, 30])
 * @param wallThickness Grosor de pared perimetral en perlas (1 o 2)
 * @param diameterMm Diámetro de la perla en milímetros
 * @param options Opciones avanzadas de apilado (profile, cavityColorIds, cavitySeedCoords, etc.)
 */
export function generateHollowLayers(
  baseGrid: BeadCell[][],
  totalLayers: number,
  wallThickness: 1 | 2,
  diameterMm: number,
  options?: GenerateHollowLayersOptions
): VoxelLayer[] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length
  if (cols === 0) return []

  const clampedLayers = Math.max(3, Math.min(30, Math.round(totalLayers)))
  const profile = options?.profile ?? 'prismatic'
  const preserveCapBottom = options?.preserveCapBottom ?? true
  const preserveCapTop = options?.preserveCapTop ?? true
  const enforceVerticalSupport = options?.enforceVerticalSupport ?? true

  // 1. Extrusión inicial en VoxelGrid3D
  let grid3D = extrudeFrom2D(baseGrid, {
    depth: clampedLayers,
    profile,
    diameterMm,
    minWallThickness: wallThickness,
  })

  // 2. Vaciado selectivo o estructural
  const hasSelectiveColorCavity =
    options?.cavityColorIds && options.cavityColorIds.length > 0
  const hasSelectiveSeedCavity =
    options?.cavitySeedCoords && options.cavitySeedCoords.length > 0

  if (hasSelectiveColorCavity || hasSelectiveSeedCavity) {
    // Modo Cavidad Selectiva (por IDs de color o coordenadas semilla)
    const cavityMask: boolean[][][] = Array.from({ length: clampedLayers }, () =>
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => false)
      )
    )

    const zMin = preserveCapBottom ? 1 : 0
    const zMax = preserveCapTop ? clampedLayers - 2 : clampedLayers - 1

    if (hasSelectiveColorCavity) {
      const colorMask = createCavityMaskByColor(
        baseGrid,
        clampedLayers,
        options!.cavityColorIds!,
        [zMin, zMax]
      )
      for (let z = 0; z < clampedLayers; z++) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (colorMask[z]?.[y]?.[x]) cavityMask[z][y][x] = true
          }
        }
      }
    }

    if (hasSelectiveSeedCavity) {
      for (const [seedX, seedY] of options!.cavitySeedCoords!) {
        const seedMask = createCavityMaskBySeed(
          baseGrid,
          clampedLayers,
          seedX,
          seedY,
          [zMin, zMax]
        )
        for (let z = 0; z < clampedLayers; z++) {
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              if (seedMask[z]?.[y]?.[x]) cavityMask[z][y][x] = true
            }
          }
        }
      }
    }

    grid3D = applyCavity(grid3D, cavityMask, {
      preserveCapBottom,
      preserveCapTop,
    })
  } else {
    // Modo Vaciado Inteligente Estándar (RF-2.3)
    // Las capas intermedias se vacían morfológicamente preservando la pared de 1 o 2 perlas
    const zStart = preserveCapBottom ? 1 : 0
    const zEnd = preserveCapTop ? clampedLayers - 2 : clampedLayers - 1

    for (let z = zStart; z <= zEnd; z++) {
      const sliceCells = extractZSlice(grid3D, z)
      const interiorMask = identifyInteriorCells(sliceCells, wallThickness)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (interiorMask[y]?.[x]) {
            setVoxel(grid3D, x, y, z, null)
          }
        }
      }
    }
  }

  // 3. Garantía de soporte vertical (Anti-perlas flotantes)
  if (enforceVerticalSupport) {
    ensureVerticalSupport(grid3D, baseGrid)
  }

  // 4. Extracción de capas VoxelLayer[]
  const layers: VoxelLayer[] = []
  const kMid = (clampedLayers - 1) / 2

  for (let z = 0; z < clampedLayers; z++) {
    const layerIndex = z + 1
    const cells = extractZSlice(grid3D, z)
    let beadCount = 0

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (cells[y][x] !== null) {
          beadCount++
        }
      }
    }

    let name: string
    if (layerIndex === 1) {
      name = `Capa 1 (Base Sólida Posterior -Z)`
    } else if (layerIndex === clampedLayers) {
      name = `Capa ${layerIndex} (Tapa Superior Anterior +Z)`
    } else if (Math.abs(z - kMid) < 0.5) {
      name = `Capa ${layerIndex} (Central Z=0)`
    } else if (z < kMid) {
      name = `Capa ${layerIndex} (Posterior -Z)`
    } else {
      name = `Capa ${layerIndex} (Anterior +Z)`
    }

    layers.push({
      layerIndex,
      name,
      cells,
      beadCount,
      zOffsetMm: z * diameterMm,
    })
  }

  return layers
}

/**
 * Genera el conjunto de placas ortogonales independientes para el modo de Ensamblado Interlocking.
 *
 * En `box` (Caja 3D):
 * - 6 placas: Frontal (XY), Trasera (XY), Lateral Izquierda (YZ), Lateral Derecha (YZ), Tapa (XZ), Base (XZ).
 * - En aristas a 90°, pestañas y ranuras alternadas paso 1 perla, sin colisión.
 *
 * En `cross_ribs` (Figura con costillas ortogonales):
 * - 3 placas: Placa central (XY) y 2 costillas transversales (YZ) con ranuras a media altura.
 *
 * @param baseGrid Cuadrícula 2D de diseño base
 * @param structureType 'box' | 'cross_ribs'
 * @param depthBeads Profundidad en cuentas (acotada a [3, 30])
 * @param diameterMm Diámetro de la perla en milímetros
 */
/**
 * Determina el propietario único de un vóxel superficial en una caja 3D (cols x rows x depth).
 * Garantiza que en cada unión machihembrada a 90° (aristas) las pestañas alternen con paso 'pitch'
 * (por defecto 2 perlas = 10 mm), y en los vértices (esquinas) pertenezcan exclusivamente a
 * Frontal o Trasera sin ninguna colisión volumétrica.
 */
export function getBoxOwner(
  x: number,
  y: number,
  z: number,
  cols: number,
  rows: number,
  depth: number,
  pitch = 2
): 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' {
  const isFront = z === depth - 1
  const isBack = z === 0
  const isLeft = x === 0
  const isRight = x === cols - 1
  const isTop = y === 0
  const isBottom = y === rows - 1

  const touchCount =
    (isFront ? 1 : 0) +
    (isBack ? 1 : 0) +
    (isLeft ? 1 : 0) +
    (isRight ? 1 : 0) +
    (isTop ? 1 : 0) +
    (isBottom ? 1 : 0)

  // 1. Caras interiores de la caja (tocan solo una cara superficial)
  if (touchCount <= 1) {
    if (isFront) return 'front'
    if (isBack) return 'back'
    if (isLeft) return 'left'
    if (isRight) return 'right'
    if (isTop) return 'top'
    return 'bottom'
  }

  // 2. Vértices / Esquinas (tocan 3 caras simultáneamente)
  if (touchCount >= 3) {
    // Vértices frontales pertenecen a Front; traseros pertenecen a Back
    return isFront ? 'front' : 'back'
  }

  // 3. Aristas compartidas a 90° (tocan exactamente 2 caras)
  // Paso de machihembrado en bloques de 'pitch' perlas (por defecto 2 perlas = 10 mm)
  const safePitch = Math.max(1, Math.round(pitch))

  // Aristas verticales Y (Front/Back con Left/Right): alternan según Y
  if ((isFront || isBack) && (isLeft || isRight)) {
    const isTooth = Math.floor(y / safePitch) % 2 === 0
    return isTooth ? (isFront ? 'front' : 'back') : (isLeft ? 'left' : 'right')
  }

  // Aristas horizontales X (Front/Back con Top/Bottom): alternan según X
  if ((isFront || isBack) && (isTop || isBottom)) {
    const isTooth = Math.floor(x / safePitch) % 2 === 0
    return isTooth ? (isFront ? 'front' : 'back') : (isTop ? 'top' : 'bottom')
  }

  // Aristas de profundidad Z (Top/Bottom con Left/Right): alternan según Z
  if ((isTop || isBottom) && (isLeft || isRight)) {
    const isTooth = Math.floor(z / safePitch) % 2 === 0
    return isTooth ? (isTop ? 'top' : 'bottom') : (isLeft ? 'left' : 'right')
  }

  return 'front'
}

/**
 * Cuenta el número de componentes conexas (4-conectividad) en una cuadrícula 2D.
 * Se utiliza para validar que el corte de ranuras mecánicas no fracture la pieza.
 */
export function countConnectedComponents2D(grid: (BeadCell | null)[][]): number {
  const rows = grid.length
  if (rows === 0) return 0
  const cols = grid[0].length
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))
  let count = 0

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== null && !visited[y][x]) {
        count++
        const queue: [number, number][] = [[x, y]]
        visited[y][x] = true
        let head = 0
        while (head < queue.length) {
          const [cx, cy] = queue[head++]
          const nbrs: [number, number][] = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ]
          for (let i = 0; i < 4; i++) {
            const [nx, ny] = nbrs[i]
            if (
              nx >= 0 &&
              nx < cols &&
              ny >= 0 &&
              ny < rows &&
              !visited[ny][nx] &&
              grid[ny][nx] !== null
            ) {
              visited[ny][nx] = true
              queue.push([nx, ny])
            }
          }
        }
      }
    }
  }

  return count
}

/**
 * Verifica si cortar una o más ranuras en la cuadrícula 2D mantiene la figura
 * en un único componente conexo sin fracturar brazos, piernas u otras zonas.
 */
export function canSlotsBeCutWithoutDisconnection(
  baseGrid: BeadCell[][],
  slots: { col: number; startY: number; endY: number }[],
  initialComponents?: number
): boolean {
  const baseCount = initialComponents ?? countConnectedComponents2D(baseGrid)
  if (baseCount === 0) return true

  const rows = baseGrid.length
  const cols = baseGrid[0].length
  const copy: (BeadCell | null)[][] = Array.from({ length: rows }, (_, y) => [...baseGrid[y]])

  for (const slot of slots) {
    for (let y = slot.startY; y <= slot.endY; y++) {
      if (y >= 0 && y < rows && slot.col >= 0 && slot.col < cols) {
        copy[y][slot.col] = null
      }
    }
  }

  const afterCount = countConnectedComponents2D(copy)
  return afterCount <= baseCount
}

export interface RibColumnInfo {
  col: number
  topY: number
  botY: number
  height: number
  slotStartY: number
  slotEndY: number
  slotHeight: number
}

/**
 * Encuentra las columnas estructurales óptimas para costillas transversales:
 * - Filtra columnas con suficiente masa continua de perlas (altura >= 2).
 * - Exige que el corte de ranuras no fracture la figura en múltiples piezas.
 * - Para figuras estrechas (ancho <= 4) genera 1 costilla central; para ancho >= 5 genera 2 costillas.
 */
export function findOptimalRibColumns(
  baseGrid: BeadCell[][],
  minCol: number,
  maxCol: number
): RibColumnInfo[] {
  const rows = baseGrid.length
  const width = maxCol - minCol + 1
  const initialComponents = countConnectedComponents2D(baseGrid)

  const candidates: RibColumnInfo[] = []

  for (let col = minCol; col <= maxCol; col++) {
    let curStart = -1
    let bestStart = -1
    let bestEnd = -1
    let bestH = 0

    for (let y = 0; y < rows; y++) {
      if (baseGrid[y][col] !== null) {
        if (curStart === -1) curStart = y
        const h = y - curStart + 1
        if (h > bestH) {
          bestH = h
          bestStart = curStart
          bestEnd = y
        }
      } else {
        curStart = -1
      }
    }

    if (bestH >= 2) {
      // Probar alturas de ranura desde la mitad hacia abajo (mínimo 1) hasta encontrar una que no fracture la pieza
      const maxSlotH = Math.max(1, Math.floor(bestH / 2))
      let safeSlotH = -1

      for (let sh = maxSlotH; sh >= 1; sh--) {
        const slotStartY = bestEnd - sh + 1
        const slotEndY = bestEnd
        const isSafe = canSlotsBeCutWithoutDisconnection(
          baseGrid,
          [{ col, startY: slotStartY, endY: slotEndY }],
          initialComponents
        )
        if (isSafe) {
          safeSlotH = sh
          break
        }
      }

      if (safeSlotH >= 1) {
        candidates.push({
          col,
          topY: bestStart,
          botY: bestEnd,
          height: bestH,
          slotStartY: bestEnd - safeSlotH + 1,
          slotEndY: bestEnd,
          slotHeight: safeSlotH,
        })
      }
    }
  }

  if (candidates.length === 0) {
    let fallbackCol = Math.floor((minCol + maxCol) / 2)
    let bestH = 0
    let bestStart = 0
    let bestEnd = rows - 1

    for (let col = minCol; col <= maxCol; col++) {
      let count = 0
      let first = -1
      let last = -1
      for (let y = 0; y < rows; y++) {
        if (baseGrid[y][col] !== null) {
          count++
          if (first === -1) first = y
          last = y
        }
      }
      if (count > bestH) {
        bestH = count
        fallbackCol = col
        bestStart = first
        bestEnd = last
      }
    }

    // Probar altura de ranura mínima segura
    let safeH = 1
    for (let sh = Math.min(2, Math.max(1, Math.floor(bestH / 2))); sh >= 1; sh--) {
      if (
        canSlotsBeCutWithoutDisconnection(
          baseGrid,
          [{ col: fallbackCol, startY: bestEnd - sh + 1, endY: bestEnd }],
          initialComponents
        )
      ) {
        safeH = sh
        break
      }
    }

    return [
      {
        col: fallbackCol,
        topY: bestStart,
        botY: bestEnd,
        height: bestH,
        slotStartY: bestEnd - safeH + 1,
        slotEndY: bestEnd,
        slotHeight: safeH,
      },
    ]
  }

  // Si la figura es estrecha (ancho <= 4), colocar 1 sola costilla central
  if (width <= 4 || candidates.length === 1) {
    const center = (minCol + maxCol) / 2
    candidates.sort((a, b) => {
      const distA = Math.abs(a.col - center)
      const distB = Math.abs(b.col - center)
      if (distA !== distB) return distA - distB
      return b.height - a.height
    })
    return [candidates[0]]
  }

  // Para figuras de ancho >= 5: intentar colocar 2 costillas bien espaciadas (tercios)
  const target1 = minCol + Math.max(1, Math.floor(width / 3))
  const target2 = minCol + Math.min(width - 2, Math.max(target1 + 2, Math.floor((2 * width) / 3)))

  let bestPair: [RibColumnInfo, RibColumnInfo] | null = null
  let bestScore = Infinity

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const c1 = candidates[i]
      const c2 = candidates[j]
      if (c2.col - c1.col < 2) continue

      const bothSafe = canSlotsBeCutWithoutDisconnection(
        baseGrid,
        [
          { col: c1.col, startY: c1.slotStartY, endY: c1.slotEndY },
          { col: c2.col, startY: c2.slotStartY, endY: c2.slotEndY },
        ],
        initialComponents
      )

      if (bothSafe) {
        const score = Math.abs(c1.col - target1) + Math.abs(c2.col - target2)
        if (score < bestScore) {
          bestScore = score
          bestPair = [c1, c2]
        }
      }
    }
  }

  if (bestPair) {
    return bestPair
  }

  // Fallback si ningún par es seguro simultáneamente: usar la mejor columna individual
  const center = (minCol + maxCol) / 2
  candidates.sort((a, b) => {
    const distA = Math.abs(a.col - center)
    const distB = Math.abs(b.col - center)
    if (distA !== distB) return distA - distB
    return b.height - a.height
  })
  return [candidates[0]]
}

/**
 * Genera el conjunto de placas ortogonales independientes para el modo de Ensamblado Interlocking.
 *
 * En `box` (Caja 3D de 6 placas):
 * - 6 placas delgadas de 1 perla de espesor: Frontal (XY), Trasera (XY), Lateral Izquierda (YZ),
 *   Lateral Derecha (YZ), Tapa Superior (XZ) y Base Inferior (XZ).
 * - En aristas a 90°, pestañas y ranuras alternadas de paso 2 perlas (10 mm) sin colisión de volumen.
 * - No rellena con perlas artificiales el fondo transparente de la imagen frontal.
 *
 * En `cross_ribs` (Costillas con Peana):
 * - Placa central decorativa (XY) conservando fielmente el diseño 2D original y sus colores.
 * - Costillas transversales (YZ) silueteadas que siguen estrictamente el contorno de la figura,
 *   sin generar bloques rectangulares que atraviesen huecos, entrantes o extremidades.
 * - Ranuras mecánicas de encaje validadas con prueba de no desconexión (anti-fractura).
 * - Distinción explícita de material estructural (Gris claro #77).
 *
 * @param baseGrid Cuadrícula 2D de diseño base
 * @param structureType 'box' | 'cross_ribs'
 * @param depthBeads Profundidad en cuentas (acotada a [3, 30])
 * @param diameterMm Diámetro de la perla en milímetros
 * @param pitch Paso de machihembrado en perlas (por defecto 2 perlas = 10 mm)
 */
export function generateInterlockingPlates(
  baseGrid: BeadCell[][],
  structureType: InterlockingStructureType,
  depthBeads: number,
  diameterMm: number,
  pitch = 2
): InterlockingPlate[] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length
  if (cols === 0) return []

  const depth = Math.max(3, Math.min(30, Math.round(depthBeads)))

  // Color estructural para placas del kit:
  // Blanco Hama #01 para cajas de paredes cerradas;
  // Gris Claro Hama #77 para costillas y peana estructurales para distinguirlas claramente del diseño
  const structuralBead: BeadCell =
    structureType === 'box'
      ? HAMA_PALETTE.find((c) => c.id === '01') || HAMA_PALETTE[0]
      : HAMA_PALETTE.find((c) => c.id === '77') ||
        HAMA_PALETTE.find((c) => c.id === '17') ||
        HAMA_PALETTE.find((c) => c.id === '01') ||
        HAMA_PALETTE[0]

  if (structureType === 'box') {
    // Generar las 6 placas de la Caja 3D con machihembrado alternado de paso 2 perlas (10 mm)
    // Se preserva la transparencia de la imagen 2D frontal (no se inventa fondo blanco)
    const frontCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        const owner = getBoxOwner(x, y, depth - 1, cols, rows, depth, pitch)
        if (owner === 'front') {
          return baseGrid[y][x]
        }
        return null
      })
    )

    const backCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        const owner = getBoxOwner(x, y, 0, cols, rows, depth, pitch)
        if (owner === 'back') {
          return structuralBead
        }
        return null
      })
    )

    const leftCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        const owner = getBoxOwner(0, y, z, cols, rows, depth, pitch)
        if (owner === 'left') {
          return structuralBead
        }
        return null
      })
    )

    const rightCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        const owner = getBoxOwner(cols - 1, y, z, cols, rows, depth, pitch)
        if (owner === 'right') {
          return structuralBead
        }
        return null
      })
    )

    const topCells: BeadCell[][] = Array.from({ length: depth }, (_, z) =>
      Array.from({ length: cols }, (_, x) => {
        const owner = getBoxOwner(x, 0, z, cols, rows, depth, pitch)
        if (owner === 'top') {
          return structuralBead
        }
        return null
      })
    )

    const bottomCells: BeadCell[][] = Array.from({ length: depth }, (_, z) =>
      Array.from({ length: cols }, (_, x) => {
        const owner = getBoxOwner(x, rows - 1, z, cols, rows, depth, pitch)
        if (owner === 'bottom') {
          return structuralBead
        }
        return null
      })
    )

    return [
      {
        id: 'front',
        name: 'Placa Frontal',
        orientation: 'xy',
        cells: frontCells,
        widthBeads: cols,
        heightBeads: rows,
        position3D: [0, 0, (depth - 1) * diameterMm],
      },
      {
        id: 'back',
        name: 'Placa Trasera',
        orientation: 'xy',
        cells: backCells,
        widthBeads: cols,
        heightBeads: rows,
        position3D: [0, 0, 0],
      },
      {
        id: 'left',
        name: 'Placa Lateral Izquierda',
        orientation: 'yz',
        cells: leftCells,
        widthBeads: depth,
        heightBeads: rows,
        position3D: [0, 0, 0],
      },
      {
        id: 'right',
        name: 'Placa Lateral Derecha',
        orientation: 'yz',
        cells: rightCells,
        widthBeads: depth,
        heightBeads: rows,
        position3D: [(cols - 1) * diameterMm, 0, 0],
      },
      {
        id: 'top',
        name: 'Tapa Superior',
        orientation: 'xz',
        cells: topCells,
        widthBeads: cols,
        heightBeads: depth,
        position3D: [0, 0, 0],
      },
      {
        id: 'bottom',
        name: 'Base Inferior',
        orientation: 'xz',
        cells: bottomCells,
        widthBeads: cols,
        heightBeads: depth,
        position3D: [0, -(rows - 1) * diameterMm, 0],
      },
    ]
  }

  // structureType === 'cross_ribs' (Ensamblaje Modular Tipo Lego con Eje Interno de Encastre)
  // Genera TODAS las capas que conforman el volumen 3D redondeado completo (ahuecadas para ahorrar perlas),
  // y añade la placa conectora interna (columna vertebral dentada en YZ oculta dentro de la figura).
  const grid3D = synthesizeRoundedVolume(baseGrid, depth, diameterMm)
  const zMid = (depth - 1) / 2

  let minCol = cols
  let maxCol = -1
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] !== null) {
        if (x < minCol) minCol = x
        if (x > maxCol) maxCol = x
      }
    }
  }

  if (maxCol === -1) {
    return []
  }

  const xSpine = Math.round((minCol + maxCol) / 2)

  // 1. Generar las capas del cuerpo (orientation 'xy')
  const bodyPlates: InterlockingPlate[] = []
  const spineCells: (BeadCell | null)[][] = Array.from({ length: rows }, () =>
    Array(depth).fill(null)
  )

  for (let z = 0; z < depth; z++) {
    const slice = extractZSlice(grid3D, z)
    // Identificar núcleo interior para vaciado (espesor de pared 1 perla)
    const interiorMask = identifyInteriorCells(slice, 1)

    // Cuadrícula de la capa
    const layerCells: (BeadCell | null)[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        if (slice[y][x] === null) return null
        if (interiorMask[y]?.[x]) return null // Núcleo hueco para ahorro de material
        return slice[y][x]
      })
    )

    // Buscar filas de cavidad interna en la columna del eje xSpine
    const cavityRows: number[] = []
    for (let y = 0; y < rows; y++) {
      if (interiorMask[y]?.[xSpine]) {
        cavityRows.push(y)
      }
    }

    let ySlot: number | null = null
    if (cavityRows.length > 0) {
      ySlot = cavityRows[Math.floor(cavityRows.length / 2)]
    } else if (z > 0 && z < depth - 1) {
      // Si la capa es intermedia y sólida o estrecha, usar el centro vertical del objeto en xSpine
      const nonNullRows: number[] = []
      for (let y = 0; y < rows; y++) {
        if (slice[y][xSpine] !== null) nonNullRows.push(y)
      }
      if (nonNullRows.length > 0) {
        ySlot = nonNullRows[Math.floor(nonNullRows.length / 2)]
      }
    }

    if (ySlot !== null) {
      // Ranura en la capa del cuerpo: orificio de paso en (xSpine, ySlot)
      layerCells[ySlot][xSpine] = null

      // Refuerzo lateral del orificio (flancos del socket)
      if (xSpine - 1 >= 0 && baseGrid[ySlot][xSpine - 1] !== null) {
        layerCells[ySlot][xSpine - 1] = baseGrid[ySlot][xSpine - 1]
      }
      if (xSpine + 1 < cols && baseGrid[ySlot][xSpine + 1] !== null) {
        layerCells[ySlot][xSpine + 1] = baseGrid[ySlot][xSpine + 1]
      }

      // Diente de encastre en la columna vertebral interna:
      spineCells[ySlot][z] = structuralBead

      // Eje vertical conector dentro de la cavidad interna
      for (const y of cavityRows) {
        if (grid3D.voxels[z][y][xSpine] !== null && layerCells[y][xSpine] === null) {
          if (Math.abs(y - ySlot) <= 1) {
            spineCells[y][z] = structuralBead
          }
        }
      }
    }

    let layerName = `Capa ${z + 1}`
    if (z === 0) layerName += ' (Posterior -Z)'
    else if (z === depth - 1) layerName += ' (Anterior +Z)'
    else if (Math.abs(z - zMid) < 0.6) layerName += ' (Central Z=0)'

    bodyPlates.push({
      id: `layer_${z + 1}`,
      name: layerName,
      orientation: 'xy',
      cells: layerCells as BeadCell[][],
      widthBeads: cols,
      heightBeads: rows,
      position3D: [0, 0, z * diameterMm],
    })
  }

  // 2. Comprobar si la columna vertebral tiene perlas activas y añadirla
  let spineBeadsCount = 0
  for (let y = 0; y < rows; y++) {
    for (let z = 0; z < depth; z++) {
      if (spineCells[y][z] !== null) spineBeadsCount++
    }
  }

  const plates: InterlockingPlate[] = [...bodyPlates]

  if (spineBeadsCount > 0) {
    plates.push({
      id: 'spine_1',
      name: 'Columna Conectora Interna',
      orientation: 'yz',
      cells: spineCells as BeadCell[][],
      widthBeads: depth,
      heightBeads: rows,
      position3D: [xSpine * diameterMm, 0, 0],
    })
  }

  return plates
}

/**
 * Modo 3: Genera escultura en bajorrelieve según luminancia perceptual acumulativa.
 * Clasifica la luminancia de cada celda en rangos equitativos correspondientes al número
 * de niveles configurado (entre 2 y 6).
 * Rellena sólidamente todas las capas inferiores a la altura asignada para que la escultura
 * sea físicamente construible sin perlas flotantes.
 *
 * @param baseGrid Cuadrícula 2D de diseño base
 * @param levels Número de niveles de relieve deseados (acotado a [2, 6])
 * @param diameterMm Diámetro de la perla en mm (ej. 5.0 para Midi)
 * @returns Array de capas horizontales apiladas VoxelLayer[]
 */
export function generateReliefLayers(
  baseGrid: BeadCell[][],
  levels: number,
  diameterMm: number
): VoxelLayer[] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length
  if (cols === 0) return []

  const clampedLevels = Math.max(2, Math.min(6, Math.round(levels)))

  // Calcular el nivel objetivo de cada perla (1 a clampedLevels)
  const targetLevels: number[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const bead = baseGrid[y][x]
      if (bead === null) return 0
      const lum = Math.max(0, Math.min(1, bead.luminance))
      const lvl = Math.floor(lum * clampedLevels) + 1
      return Math.min(clampedLevels, lvl)
    })
  )

  const layers: VoxelLayer[] = []

  for (let lvl = 1; lvl <= clampedLevels; lvl++) {
    let beadCount = 0
    const cells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        // Relleno acumulativo inferior sólido
        if (targetLevels[y][x] >= lvl) {
          beadCount++
          return baseGrid[y][x]
        }
        return null
      })
    )

    let layerName: string
    if (lvl === 1) {
      layerName = `Capa 1 (Base Sólida)`
    } else if (lvl === clampedLevels) {
      layerName = `Capa ${lvl} (Cúspide)`
    } else {
      layerName = `Capa ${lvl} (Relieve Medio)`
    }

    layers.push({
      layerIndex: lvl,
      name: layerName,
      cells,
      beadCount,
      zOffsetMm: (lvl - 1) * diameterMm,
    })
  }

  return layers
}

export interface ComputeModel3DOptions {
  mode3d: Mode3DType
  hollowLayersCount: number
  hollowWallThickness: 1 | 2
  interlockingType: InterlockingStructureType
  interlockingDepthBeads: number
  reliefLevels: number
  diameterMm: number
  hollowProfile?: VolumeProfile
  cavityColorIds?: string[]
  cavitySeedCoords?: [number, number][]
  preserveCapBottom?: boolean
  preserveCapTop?: boolean
  enforceVerticalSupport?: boolean
}

/**
 * Genera el modelo tridimensional unificado (Model3DResult) para el visor 3D,
 * la guía de montaje y la exportación de documentos PDF.
 */
export function computeModel3D(
  gridData: GridData | null,
  options: ComputeModel3DOptions
): Model3DResult | null {
  if (
    !gridData ||
    gridData.cells.length === 0 ||
    gridData.cols === 0 ||
    gridData.rows === 0
  ) {
    return null
  }

  const { cells, cols, rows } = gridData
  const {
    mode3d,
    hollowLayersCount,
    hollowWallThickness,
    interlockingType,
    interlockingDepthBeads,
    reliefLevels,
    diameterMm,
    hollowProfile,
    cavityColorIds,
    cavitySeedCoords,
    preserveCapBottom,
    preserveCapTop,
    enforceVerticalSupport,
  } = options

  if (mode3d === 'hollow') {
    const layers = generateHollowLayers(
      cells,
      hollowLayersCount,
      hollowWallThickness,
      diameterMm,
      {
        profile: hollowProfile ?? 'rounded',
        cavityColorIds,
        cavitySeedCoords,
        preserveCapBottom,
        preserveCapTop,
        enforceVerticalSupport,
      }
    )
    const totalBeads = layers.reduce((sum, l) => sum + l.beadCount, 0)
    return {
      mode: 'hollow',
      layers,
      totalBeads,
      dimensionsMm: {
        x: cols * diameterMm,
        y: rows * diameterMm,
        z: layers.length * diameterMm,
      },
    }
  }

  if (mode3d === 'interlocking') {
    const plates = generateInterlockingPlates(
      cells,
      interlockingType,
      interlockingDepthBeads,
      diameterMm
    )
    let totalBeads = 0
    plates.forEach((p) => {
      p.cells.forEach((row) => {
        row.forEach((c) => {
          if (c !== null) totalBeads++
        })
      })
    })

    const depth = Math.max(3, Math.min(30, Math.round(interlockingDepthBeads)))

    return {
      mode: 'interlocking',
      plates,
      totalBeads,
      dimensionsMm: {
        x: cols * diameterMm,
        y: rows * diameterMm,
        z: depth * diameterMm,
      },
    }
  }

  if (mode3d === 'relief') {
    const layers = generateReliefLayers(cells, reliefLevels, diameterMm)
    const totalBeads = layers.reduce((sum, l) => sum + l.beadCount, 0)
    return {
      mode: 'relief',
      layers,
      totalBeads,
      dimensionsMm: {
        x: cols * diameterMm,
        y: rows * diameterMm,
        z: layers.length * diameterMm,
      },
    }
  }

  return null
}
