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
  createCavityMaskByColor,
  createCavityMaskBySeed,
  applyCavity,
  extractZSlice,
  setVoxel,
  ensureVerticalSupport,
} from './voxel-grid'

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
 * Garantiza que en cada unión machihembrada a 90° (aristas) las pestañas alternen con paso 1 perla,
 * y en los vértices (esquinas) pertenezcan exclusivamente a Frontal o Trasera sin ninguna colisión.
 */
export function getBoxOwner(
  x: number,
  y: number,
  z: number,
  cols: number,
  rows: number,
  depth: number
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
  // Aristas verticales Y (Front/Back con Left/Right): alternan según Y
  if ((isFront || isBack) && (isLeft || isRight)) {
    return y % 2 === 0 ? (isFront ? 'front' : 'back') : (isLeft ? 'left' : 'right')
  }

  // Aristas horizontales X (Front/Back con Top/Bottom): alternan según X
  if ((isFront || isBack) && (isTop || isBottom)) {
    return x % 2 === 0 ? (isFront ? 'front' : 'back') : (isTop ? 'top' : 'bottom')
  }

  // Aristas de profundidad Z (Top/Bottom con Left/Right): alternan según Z
  if ((isTop || isBottom) && (isLeft || isRight)) {
    return z % 2 === 0 ? (isTop ? 'top' : 'bottom') : (isLeft ? 'left' : 'right')
  }

  return 'front'
}

/**
 * Genera el conjunto de placas ortogonales independientes para el modo de Ensamblado Interlocking.
 *
 * En `box` (Caja 3D):
 * - 6 placas delgadas de 1 perla de espesor: Frontal (XY), Trasera (XY), Lateral Izquierda (YZ),
 *   Lateral Derecha (YZ), Tapa Superior (XZ) y Base Inferior (XZ).
 * - Dimensiones exactas:
 *   * Front / Back: width × height (cols × rows)
 *   * Left / Right: depthBeads × height (depth × rows)
 *   * Top / Bottom: width × depthBeads (cols × depth)
 * - En aristas a 90°, pestañas y ranuras alternadas de paso 1 perla (1 diente / 1 hueco)
 *   sin colisión de volumen.
 *
 * En `cross_ribs` (Figura con costillas ortogonales):
 * - 3 placas delgadas: Placa central (XY) conservando el diseño 2D con ranuras ascendentes
 *   hasta el 50% de la altura, y dos costillas transversales (YZ) de 1 perla de grosor
 *   con ranuras descendentes al 50% para encajar a media madera sin pegamento.
 *
 * @param baseGrid Cuadrícula 2D de diseño base
 * @param structureType 'box' | 'cross_ribs'
 * @param depthBeads Profundidad en cuentas (acotada a [3, 30])
 * @param diameterMm Diámetro de la perla en milímetros
 */
export function generateInterlockingPlates(
  baseGrid: BeadCell[][],
  structureType: InterlockingStructureType,
  depthBeads: number,
  diameterMm: number
): InterlockingPlate[] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length
  if (cols === 0) return []

  const depth = Math.max(3, Math.min(30, Math.round(depthBeads)))

  // Color estructural para placas del kit:
  // Se utiliza Blanco Hama (#01) oficial por defecto para dar un acabado limpio de maqueta,
  // o el primer color no negro de la paleta si blanco no estuviera disponible.
  const structuralBead: BeadCell =
    HAMA_PALETTE.find((c) => c.id === '01') ||
    baseGrid.flat().find((c) => c !== null && c.id !== '18') ||
    baseGrid.flat().find((c) => c !== null) ||
    HAMA_PALETTE[0]

  // Encontrar rango horizontal y vertical del diseño (bounding box del objeto)
  let minCol = cols
  let maxCol = -1
  let minRow = rows
  let maxRow = -1
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] !== null) {
        if (x < minCol) minCol = x
        if (x > maxCol) maxCol = x
        if (y < minRow) minRow = y
        if (y > maxRow) maxRow = y
      }
    }
  }

  // Si no hay perlas, usar toda la cuadrícula
  if (maxCol === -1) {
    minCol = 0
    maxCol = cols - 1
    minRow = 0
    maxRow = rows - 1
  }

  const figWidth = maxCol - minCol + 1
  const xCenter = Math.floor((minCol + maxCol) / 2)
  const zSlot = Math.floor(depth / 2)

  if (structureType === 'box') {
    // Buscar la columna central que contenga perlas para realizar el cruce a media madera
    let xCross = xCenter
    let topY = -1
    let botY = -1

    for (let offset = 0; offset <= Math.floor(figWidth / 2); offset++) {
      for (const testCol of [xCenter + offset, xCenter - offset]) {
        if (testCol >= minCol && testCol <= maxCol) {
          let t = -1
          let b = -1
          for (let y = 0; y < rows; y++) {
            if (baseGrid[y][testCol] !== null) {
              if (t === -1) t = y
              b = y
            }
          }
          if (t !== -1) {
            xCross = testCol
            topY = t
            botY = b
            break
          }
        }
      }
      if (topY !== -1) break
    }

    if (topY === -1) {
      topY = minRow
      botY = maxRow
    }

    const crossHeight = botY - topY + 1
    const halfH = Math.max(1, Math.floor(crossHeight / 2))

    // 1. Placa Frontal (XY): conserva el diseño 2D completo del objeto
    // con una ranura vertical ascendente de 1 perla de paso desde la base hasta el 50% de la altura
    const frontCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        if (baseGrid[y][x] === null) return null
        if (x === xCross && y >= botY - halfH + 1 && y <= botY) {
          return null // Ranura de encaje inferior
        }
        return baseGrid[y][x]
      })
    )

    // 2. Placa de Perfil (YZ): placa ortogonal continua con ranura descendente al 50%
    // y peana física continua en la base para sostener la figura erguida en pie
    const profileCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        if (y < topY || y > botY) {
          return null
        }

        // Línea central de intersección con la placa frontal (zSlot):
        if (z === zSlot) {
          // Ranura descendente al 50% para encajar a media madera
          if (y < topY + halfH) {
            return null
          }
          return structuralBead
        }

        // Alas continuas de la peana en toda la profundidad Z para estabilidad física
        return structuralBead
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
        position3D: [0, 0, zSlot * diameterMm],
      },
      {
        id: 'profile',
        name: 'Placa de Perfil (Peana)',
        orientation: 'yz',
        cells: profileCells,
        widthBeads: depth,
        heightBeads: rows,
        position3D: [xCross * diameterMm, 0, 0],
      },
    ]
  }

  // structureType === 'cross_ribs'
  const figureWidth = figWidth
  const x1 =
    figureWidth > 2
      ? minCol + Math.max(1, Math.floor(figureWidth / 3))
      : minCol
  const x2 =
    figureWidth > 3
      ? minCol +
        Math.min(
          figureWidth - 2,
          Math.max(Math.floor(figureWidth / 3) + 1, Math.floor((2 * figureWidth) / 3))
        )
      : maxCol

  // Calcular rango vertical de la figura en cada columna de costilla
  const getColBounds = (col: number) => {
    let topY = -1
    let botY = -1
    for (let y = 0; y < rows; y++) {
      if (baseGrid[y][col] !== null) {
        if (topY === -1) topY = y
        botY = y
      }
    }
    if (topY === -1) {
      topY = minRow
      botY = maxRow
    }
    return { topY, botY, height: botY - topY + 1 }
  }

  const bounds1 = getColBounds(x1)
  const bounds2 = getColBounds(x2)

  const halfH1 = Math.max(1, Math.floor(bounds1.height / 2))
  const halfH2 = Math.max(1, Math.floor(bounds2.height / 2))

  // 1. Placa central (XY): mantiene el diseño 2D, con ranuras verticales de 1 perla de paso
  // que suben desde la base de la intersección hasta el 50% de la altura
  const mainCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (baseGrid[y][x] === null) return null
      if (x === x1 && y >= bounds1.botY - halfH1 + 1 && y <= bounds1.botY) {
        return null
      }
      if (x === x2 && y >= bounds2.botY - halfH2 + 1 && y <= bounds2.botY) {
        return null
      }
      return baseGrid[y][x]
    })
  )

  // 2. Peanas / Costillas transversales (YZ):
  // Placas de base perpendiculares CONTINUAS (no fragmentos sueltos) de ancho depthBeads
  // con ranuras descendentes al 50% que encajan firmemente a presión a media madera
  const createRibCells = (
    bounds: { topY: number; botY: number; height: number },
    halfH: number
  ): BeadCell[][] => {
    return Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        // Fuera del rango vertical del objeto no añadir material
        if (y < bounds.topY || y > bounds.botY) {
          return null
        }

        // En la línea de intersección central con la placa principal (zSlot):
        if (z === zSlot) {
          // Ranura descendente: mitad superior es hueco (null) para encajar a media madera
          if (y < bounds.topY + halfH) {
            return null
          }
          return structuralBead
        }

        // Toda la extensión de la peana en Z es continua y sólida para máxima estabilidad física
        return structuralBead
      })
    )
  }

  const rib1Cells = createRibCells(bounds1, halfH1)
  const rib2Cells = createRibCells(bounds2, halfH2)

  return [
    {
      id: 'main',
      name: 'Figura Central',
      orientation: 'xy',
      cells: mainCells,
      widthBeads: cols,
      heightBeads: rows,
      position3D: [0, 0, zSlot * diameterMm],
    },
    {
      id: 'rib_1',
      name: 'Costilla Transversal 1',
      orientation: 'yz',
      cells: rib1Cells,
      widthBeads: depth,
      heightBeads: rows,
      position3D: [x1 * diameterMm, 0, 0],
    },
    {
      id: 'rib_2',
      name: 'Costilla Transversal 2',
      orientation: 'yz',
      cells: rib2Cells,
      widthBeads: depth,
      heightBeads: rows,
      position3D: [x2 * diameterMm, 0, 0],
    },
  ]
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
        profile: hollowProfile,
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
