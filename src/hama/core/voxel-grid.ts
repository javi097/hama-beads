import type { BeadCell } from '@/interfaces/hama.interface'
import type {
  VoxelCell,
  VoxelGrid3D,
  ExtrusionOptions,
  CavityOptions,
} from '@/interfaces/hama-3d.interface'

/**
 * Direcciones ortogonales para vecindad 6-conectada en 3D (±X, ±Y, ±Z).
 */
export const NEIGHBORS_6: readonly [number, number, number][] = [
  [-1, 0, 0],
  [1, 0, 0],
  [0, -1, 0],
  [0, 1, 0],
  [0, 0, -1],
  [0, 0, 1],
] as const

/**
 * Direcciones ortogonales para vecindad 4-conectada en 2D (±X, ±Y).
 */
export const NEIGHBORS_4_2D: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

/**
 * Crea una cuadrícula tridimensional vacía (todos los vóxeles inicializados a null).
 *
 * @param cols Número de columnas en eje X (ancho)
 * @param rows Número de filas en eje Y (alto)
 * @param depth Número de capas en eje Z (profundidad)
 * @param diameterMm Diámetro nominal de la perla en milímetros (por defecto 5.0 mm)
 */
export function createEmptyVoxelGrid(
  cols: number,
  rows: number,
  depth: number,
  diameterMm = 5.0
): VoxelGrid3D {
  const safeCols = Math.max(0, Math.floor(cols))
  const safeRows = Math.max(0, Math.floor(rows))
  const safeDepth = Math.max(0, Math.floor(depth))

  const voxels: (VoxelCell | null)[][][] = Array.from({ length: safeDepth }, () =>
    Array.from({ length: safeRows }, () =>
      Array.from({ length: safeCols }, () => null)
    )
  )

  return {
    cols: safeCols,
    rows: safeRows,
    depth: safeDepth,
    voxels,
    diameterMm,
  }
}

/**
 * Comprueba si una coordenada (x, y, z) se encuentra dentro de los límites del VoxelGrid3D.
 */
export function isInsideGrid(
  grid: VoxelGrid3D,
  x: number,
  y: number,
  z: number
): boolean {
  return (
    x >= 0 &&
    x < grid.cols &&
    y >= 0 &&
    y < grid.rows &&
    z >= 0 &&
    z < grid.depth
  )
}

/**
 * Obtiene de forma segura el vóxel en (x, y, z) o null si está vacío o fuera de rango.
 */
export function getVoxel(
  grid: VoxelGrid3D,
  x: number,
  y: number,
  z: number
): VoxelCell | null {
  if (!isInsideGrid(grid, x, y, z)) return null
  return grid.voxels[z][y][x]
}

/**
 * Asigna un vóxel en (x, y, z) si la coordenada se encuentra dentro de los límites.
 */
export function setVoxel(
  grid: VoxelGrid3D,
  x: number,
  y: number,
  z: number,
  cell: VoxelCell | null
): void {
  if (isInsideGrid(grid, x, y, z)) {
    grid.voxels[z][y][x] = cell
  }
}

/**
 * Clona profundamente un VoxelGrid3D garantizando inmutabilidad.
 */
export function cloneVoxelGrid(grid: VoxelGrid3D): VoxelGrid3D {
  const clonedVoxels: (VoxelCell | null)[][][] = grid.voxels.map((layer) =>
    layer.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null))
    )
  )

  const clonedCavityMask: boolean[][][] | undefined = grid.cavityMask
    ? grid.cavityMask.map((layer) =>
        layer.map((row) => [...row])
      )
    : undefined

  return {
    cols: grid.cols,
    rows: grid.rows,
    depth: grid.depth,
    voxels: clonedVoxels,
    diameterMm: grid.diameterMm,
    cavityMask: clonedCavityMask,
  }
}

/**
 * Cuenta el número total de vóxeles activos (no nulos) en el grid.
 */
export function countActiveVoxels(grid: VoxelGrid3D): number {
  let count = 0
  for (let z = 0; z < grid.depth; z++) {
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (grid.voxels[z][y][x] !== null) {
          count++
        }
      }
    }
  }
  return count
}

/**
 * Calcula la transformada de distancia euclidiana/Manhattan 2D para cada celda
 * no nula respecto al contorno exterior o huecos nulos de la cuadrícula base.
 */
export function computeDistanceTransform2D(baseGrid: BeadCell[][]): {
  distMap: number[][]
  maxDist: number
} {
  const rows = baseGrid.length
  if (rows === 0) return { distMap: [], maxDist: 0 }
  const cols = baseGrid[0].length
  if (cols === 0) return { distMap: [[]], maxDist: 0 }

  const dist: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Infinity)
  )
  const queue: [number, number][] = []

  let occupiedCount = 0

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] === null) {
        dist[y][x] = 0
        continue
      }
      occupiedCount++

      const isBorder = y === 0 || y === rows - 1 || x === 0 || x === cols - 1
      let touchesNull = isBorder
      if (!touchesNull) {
        for (const [dy, dx] of NEIGHBORS_4_2D) {
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
    return {
      distMap: Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0)),
      maxDist: 0,
    }
  }

  let head = 0
  let maxDist = 1
  while (head < queue.length) {
    const [cy, cx] = queue[head++]
    const currentDist = dist[cy][cx]
    if (currentDist > maxDist) {
      maxDist = currentDist
    }

    for (const [dy, dx] of NEIGHBORS_4_2D) {
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

  return { distMap: dist, maxDist }
}

/**
 * Síntesis de Volumen 3D Redondeado (Revolución / Inflado Elipsoidal por Fila).
 *
 * A partir de una imagen/diseño 2D en baseGrid, reconstruye un volumen 3D completo en 360°:
 * - En cada fila y, identifica los segmentos horizontales continuos de perlas [xStart, xEnd].
 * - Para cada segmento de ancho W = xEnd - xStart + 1 y centro xCenter = (xStart + xEnd) / 2:
 *   * Rx = W / 2
 *   * Rz = (W / maxWidth) * (depth / 2)
 *   * Vóxel (x, y, z) pertenece al volumen si ((x - xCenter) / Rx)^2 + ((z - zCenter) / Rz)^2 <= 1.0
 *   * El color hereda baseGrid[y][x], proyectando los colores del arte alrededor de la figura.
 *
 * El resultado es una escultura 3D redondeada (por ejemplo, sombrero esférico y tallo cilíndrico en la seta).
 *
 * @param baseGrid Cuadrícula bidimensional 2D
 * @param depth Profundidad total en capas Z (acotada a [1, 30])
 * @param diameterMm Diámetro de la perla en milímetros
 */
export function synthesizeRoundedVolume(
  baseGrid: BeadCell[][],
  depth: number,
  diameterMm = 5.0
): VoxelGrid3D {
  const rows = baseGrid.length
  if (rows === 0) return createEmptyVoxelGrid(0, 0, 0, diameterMm)
  const cols = baseGrid[0].length
  if (cols === 0) return createEmptyVoxelGrid(0, 0, 0, diameterMm)

  const safeDepth = Math.max(1, Math.min(30, Math.round(depth)))
  const grid = createEmptyVoxelGrid(cols, rows, safeDepth, diameterMm)

  // 1. Identificar segmentos horizontales continuos y calcular maxWidth global
  interface Segment {
    xStart: number
    xEnd: number
    width: number
    xCenter: number
  }

  const rowSegments: Segment[][] = []
  let maxWidth = 0

  for (let y = 0; y < rows; y++) {
    const segments: Segment[] = []
    let inSeg = false
    let startX = 0

    for (let x = 0; x < cols; x++) {
      if (baseGrid[y][x] !== null) {
        if (!inSeg) {
          inSeg = true
          startX = x
        }
      } else {
        if (inSeg) {
          const w = x - startX
          segments.push({
            xStart: startX,
            xEnd: x - 1,
            width: w,
            xCenter: (startX + x - 1) / 2,
          })
          if (w > maxWidth) maxWidth = w
          inSeg = false
        }
      }
    }
    if (inSeg) {
      const w = cols - startX
      segments.push({
        xStart: startX,
        xEnd: cols - 1,
        width: w,
        xCenter: (startX + cols - 1) / 2,
      })
      if (w > maxWidth) maxWidth = w
    }
    rowSegments.push(segments)
  }

  if (maxWidth === 0) {
    return grid
  }

  const zCenter = (safeDepth - 1) / 2
  const maxRz = safeDepth / 2

  // 2. Evaluar para cada vóxel si cae dentro de la sección elipsoidal de su segmento
  for (let z = 0; z < safeDepth; z++) {
    const isCentralZ = Math.abs(z - zCenter) < 0.6 // Capa central coronal conserva 100% el diseño original 2D

    for (let y = 0; y < rows; y++) {
      const segments = rowSegments[y]
      if (segments.length === 0) continue

      for (const seg of segments) {
        const Rx = Math.max(0.5, seg.width / 2)
        const Rz = Math.max(0.5, (seg.width / maxWidth) * maxRz)

        for (let x = seg.xStart; x <= seg.xEnd; x++) {
          const dx = (x - seg.xCenter) / Rx
          const dz = (z - zCenter) / Rz
          const distSq = dx * dx + dz * dz

          // En la capa central se incluye siempre todo el segmento;
          // en las demás capas se comprueba la sección elipsoidal
          if (isCentralZ || distSq <= 1.001) {
            const bead = baseGrid[y][x]
            if (bead !== null) {
              grid.voxels[z][y][x] = {
                x,
                y,
                z,
                color: bead,
              }
            }
          }
        }
      }
    }
  }

  return grid
}

/**
 * Realiza la extrusión tridimensional a partir de una cuadrícula base 2D.
 *
 * - Perfil 'prismatic' (por defecto): Extrusión ortogonal uniforme. Cada capa Z contiene
 *   exactamente la silueta y colores de la cuadrícula 2D. Ideal para prismas, cámaras, cajas y maquetas.
 * - Perfil 'rounded': Síntesis elipsoidal redondeada en 360° por fila (Revolución / Inflado morfológico).
 *
 * @param baseGrid Cuadrícula bidimensional de diseño 2D (BeadCell[][])
 * @param options Opciones de extrusión (depth, profile, diameterMm, minWallThickness)
 */
export function extrudeFrom2D(
  baseGrid: BeadCell[][],
  options: ExtrusionOptions
): VoxelGrid3D {
  const rows = baseGrid.length
  if (rows === 0) return createEmptyVoxelGrid(0, 0, 0)
  const cols = baseGrid[0].length
  if (cols === 0) return createEmptyVoxelGrid(0, 0, 0)

  const depth = Math.max(1, Math.round(options.depth))
  const diameterMm = options.diameterMm ?? 5.0
  const profile = options.profile ?? 'prismatic'

  if (profile === 'rounded') {
    return synthesizeRoundedVolume(baseGrid, depth, diameterMm)
  }

  const grid = createEmptyVoxelGrid(cols, rows, depth, diameterMm)

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const bead = baseGrid[y][x]
        if (bead !== null) {
          grid.voxels[z][y][x] = {
            x,
            y,
            z,
            color: bead,
          }
        }
      }
    }
  }
  return grid
}

/**
 * Comprueba la conectividad de 6-vecinos en el espacio tridimensional discreto.
 *
 * Utiliza BFS para identificar todos los componentes conexos en 3D.
 *
 * @returns { isConnected, componentCount, sizes }
 *   - isConnected: true si todos los vóxeles activos forman un único componente conexo (o 0 si está vacío)
 *   - componentCount: número de componentes disjuntos
 *   - sizes: tamaño (recuento de vóxeles) de cada componente ordenados descendentemente
 */
export function checkConnectivity6(grid: VoxelGrid3D): {
  isConnected: boolean
  componentCount: number
  sizes: number[]
} {
  const { cols, rows, depth, voxels } = grid
  const visited: boolean[][][] = Array.from({ length: depth }, () =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => false))
  )

  const sizes: number[] = []

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (voxels[z][y][x] === null || visited[z][y][x]) continue

        // Iniciar BFS para este nuevo componente conexo
        let componentSize = 0
        const queue: [number, number, number][] = [[x, y, z]]
        visited[z][y][x] = true

        let head = 0
        while (head < queue.length) {
          const [cx, cy, cz] = queue[head++]
          componentSize++

          for (const [dx, dy, dz] of NEIGHBORS_6) {
            const nx = cx + dx
            const ny = cy + dy
            const nz = cz + dz

            if (isInsideGrid(grid, nx, ny, nz)) {
              if (voxels[nz][ny][nx] !== null && !visited[nz][ny][nx]) {
                visited[nz][ny][nx] = true
                queue.push([nx, ny, nz])
              }
            }
          }
        }

        sizes.push(componentSize)
      }
    }
  }

  sizes.sort((a, b) => b - a)
  const componentCount = sizes.length

  return {
    isConnected: componentCount <= 1,
    componentCount,
    sizes,
  }
}

/**
 * Identifica los vóxeles interiores en 3D mediante transformada de distancia 6-conectada.
 * Un vóxel se considera interior si su distancia a cualquier celda nula o al exterior
 * de la cuadrícula es estrictamente mayor que `wallThickness` (1 o 2 perlas).
 *
 * @returns Máscara booleana tridimensional [z][y][x] donde true indica vóxel interior.
 */
export function identifyInteriorVoxels3D(
  grid: VoxelGrid3D,
  wallThickness: 1 | 2
): boolean[][][] {
  const { cols, rows, depth, voxels } = grid
  const dist: number[][][] = Array.from({ length: depth }, () =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Infinity)
    )
  )

  const queue: [number, number, number][] = []

  // Paso 1: Localizar contornos superficiales 3D y celdas nulas
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (voxels[z][y][x] === null) {
          dist[z][y][x] = 0
          continue
        }

        // Si el vóxel está en el borde exterior del volumen discreto
        const isGridEdge =
          x === 0 ||
          x === cols - 1 ||
          y === 0 ||
          y === rows - 1 ||
          z === 0 ||
          z === depth - 1

        let touchesNull = isGridEdge
        if (!touchesNull) {
          for (const [dx, dy, dz] of NEIGHBORS_6) {
            const nx = x + dx
            const ny = y + dy
            const nz = z + dz
            if (voxels[nz][ny][nx] === null) {
              touchesNull = true
              break
            }
          }
        }

        if (touchesNull) {
          dist[z][y][x] = 1
          queue.push([x, y, z])
        }
      }
    }
  }

  // Paso 2: Propagación BFS en 3D
  let head = 0
  while (head < queue.length) {
    const [cx, cy, cz] = queue[head++]
    const currentDist = dist[cz][cy][cx]

    for (const [dx, dy, dz] of NEIGHBORS_6) {
      const nx = cx + dx
      const ny = cy + dy
      const nz = cz + dz

      if (isInsideGrid(grid, nx, ny, nz)) {
        if (voxels[nz][ny][nx] !== null && dist[nz][ny][nx] > currentDist + 1) {
          dist[nz][ny][nx] = currentDist + 1
          queue.push([nx, ny, nz])
        }
      }
    }
  }

  // Paso 3: Marcar vóxeles cuya distancia sea estrictamente mayor que wallThickness
  const interiorMask: boolean[][][] = Array.from({ length: depth }, () =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    )
  )

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (voxels[z][y][x] !== null && dist[z][y][x] > wallThickness) {
          interiorMask[z][y][x] = true
        }
      }
    }
  }

  return interiorMask
}

/**
 * Erosión morfológica tridimensional (6-conectada).
 * Elimina una o más capas exteriores de vóxeles del VoxelGrid3D.
 */
export function erodeVoxelGrid(grid: VoxelGrid3D, layers = 1): VoxelGrid3D {
  let currentGrid = cloneVoxelGrid(grid)

  for (let step = 0; step < layers; step++) {
    const nextGrid = createEmptyVoxelGrid(
      currentGrid.cols,
      currentGrid.rows,
      currentGrid.depth,
      currentGrid.diameterMm
    )

    for (let z = 0; z < currentGrid.depth; z++) {
      for (let y = 0; y < currentGrid.rows; y++) {
        for (let x = 0; x < currentGrid.cols; x++) {
          const cell = currentGrid.voxels[z][y][x]
          if (cell === null) continue

          // Un vóxel sobrevive a la erosión si todos sus 6 vecinos están dentro del grid y no son nulos
          let survives = true
          for (const [dx, dy, dz] of NEIGHBORS_6) {
            const nx = x + dx
            const ny = y + dy
            const nz = z + dz

            if (!isInsideGrid(currentGrid, nx, ny, nz) || currentGrid.voxels[nz][ny][nx] === null) {
              survives = false
              break
            }
          }

          if (survives) {
            nextGrid.voxels[z][y][x] = { ...cell }
          }
        }
      }
    }

    currentGrid = nextGrid
  }

  return currentGrid
}

/**
 * Encuentra un componente conectado bidimensional en la cuadrícula 2D
 * a partir de una celda semilla (seedX, seedY) utilizando 4-conectividad.
 *
 * @param baseGrid Cuadrícula 2D
 * @param seedX Coordenada X inicial
 * @param seedY Coordenada Y inicial
 * @param sameColorOnly Si es true, solo incluye celdas con el mismo color exacto que la semilla
 * @returns Máscara booleana 2D [rows][cols] con true en las celdas del componente
 */
export function findConnected2DRegion(
  baseGrid: BeadCell[][],
  seedX: number,
  seedY: number,
  sameColorOnly = true
): boolean[][] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length
  if (cols === 0) return []

  const mask: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  )

  if (seedY < 0 || seedY >= rows || seedX < 0 || seedX >= cols) return mask
  const targetBead = baseGrid[seedY][seedX]
  if (targetBead === null) return mask

  const targetColorId = targetBead.id
  const queue: [number, number][] = [[seedX, seedY]]
  mask[seedY][seedX] = true

  let head = 0
  while (head < queue.length) {
    const [cx, cy] = queue[head++]

    for (const [dx, dy] of NEIGHBORS_4_2D) {
      const nx = cx + dx
      const ny = cy + dy

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !mask[ny][nx]) {
        const neighbor = baseGrid[ny][nx]
        if (neighbor !== null) {
          if (!sameColorOnly || neighbor.id === targetColorId) {
            mask[ny][nx] = true
            queue.push([nx, ny])
          }
        }
      }
    }
  }

  return mask
}

/**
 * Genera una máscara 3D de cavidad a partir de IDs de color seleccionados en la cuadrícula 2D.
 * Las columnas que correspondan a dichos colores se marcan para vaciado en el rango Z especificado.
 *
 * @param baseGrid Cuadrícula 2D fuente
 * @param depth Profundidad total en capas Z
 * @param targetColorIds Conjunto de identificadores de color que definen la cavidad
 * @param zRange Rango opcional de capas [zMin, zMax] inclusive. Por defecto [1, depth - 2] para cerrar tapas.
 */
export function createCavityMaskByColor(
  baseGrid: BeadCell[][],
  depth: number,
  targetColorIds: string[],
  zRange?: [number, number]
): boolean[][][] {
  const rows = baseGrid.length
  const cols = rows > 0 ? baseGrid[0].length : 0

  const mask: boolean[][][] = Array.from({ length: depth }, () =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    )
  )

  if (rows === 0 || cols === 0 || depth === 0 || targetColorIds.length === 0) {
    return mask
  }

  const colorSet = new Set(targetColorIds)
  const zMin = zRange ? Math.max(0, zRange[0]) : Math.min(1, depth - 1)
  const zMax = zRange ? Math.min(depth - 1, zRange[1]) : Math.max(0, depth - 2)

  for (let z = zMin; z <= zMax; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const bead = baseGrid[y][x]
        if (bead !== null && colorSet.has(bead.id)) {
          mask[z][y][x] = true
        }
      }
    }
  }

  return mask
}

/**
 * Genera una máscara 3D de cavidad a partir de una coordenada semilla en la cuadrícula 2D.
 * Encuentra el componente conexo 2D y lo proyecta verticalmente en el rango Z indicado.
 */
export function createCavityMaskBySeed(
  baseGrid: BeadCell[][],
  depth: number,
  seedX: number,
  seedY: number,
  zRange?: [number, number]
): boolean[][][] {
  const region2D = findConnected2DRegion(baseGrid, seedX, seedY, true)
  const rows = baseGrid.length
  const cols = rows > 0 ? baseGrid[0].length : 0

  const mask: boolean[][][] = Array.from({ length: depth }, () =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    )
  )

  if (rows === 0 || cols === 0 || depth === 0) return mask

  const zMin = zRange ? Math.max(0, zRange[0]) : Math.min(1, depth - 1)
  const zMax = zRange ? Math.min(depth - 1, zRange[1]) : Math.max(0, depth - 2)

  for (let z = zMin; z <= zMax; z++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (region2D[y][x]) {
          mask[z][y][x] = true
        }
      }
    }
  }

  return mask
}

/**
 * Aplica una máscara tridimensional de cavidad a un VoxelGrid3D existente.
 *
 * Vacía los vóxeles donde `cavityMask` es true (respetando si procede las tapas base/superior)
 * y marca los vóxeles adyacentes a la cavidad con el flag `isCavityWall = true`.
 *
 * @param grid Cuadrícula 3D original
 * @param cavityMask Máscara tridimensional de celdas a vaciar [z][y][x]
 * @param options Opciones de cavidad (preserveCapBottom, preserveCapTop, wallThickness)
 * @returns Nuevo VoxelGrid3D con la cavidad aplicada
 */
export function applyCavity(
  grid: VoxelGrid3D,
  cavityMask: boolean[][][],
  options: CavityOptions = {}
): VoxelGrid3D {
  const result = cloneVoxelGrid(grid)
  const { cols, rows, depth } = result
  const preserveCapBottom = options.preserveCapBottom ?? true
  const preserveCapTop = options.preserveCapTop ?? true

  // Lista de vóxeles vaciados para marcar posteriormente sus paredes colindantes
  const clearedCoords: [number, number, number][] = []

  for (let z = 0; z < depth; z++) {
    // Si se deben preservar las tapas sólidas
    if (z === 0 && preserveCapBottom) continue
    if (z === depth - 1 && preserveCapTop) continue

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (cavityMask[z]?.[y]?.[x] && result.voxels[z][y][x] !== null) {
          result.voxels[z][y][x] = null
          clearedCoords.push([x, y, z])
        }
      }
    }
  }

  // Marcar los vóxeles supervivientes adyacentes a la cavidad como 'isCavityWall'
  for (const [cx, cy, cz] of clearedCoords) {
    for (const [dx, dy, dz] of NEIGHBORS_6) {
      const nx = cx + dx
      const ny = cy + dy
      const nz = cz + dz

      if (isInsideGrid(result, nx, ny, nz)) {
        const neighbor = result.voxels[nz][ny][nx]
        if (neighbor !== null) {
          neighbor.isCavityWall = true
        }
      }
    }
  }

  result.cavityMask = cavityMask
  return result
}

/**
 * Extrae una capa horizontal Z del VoxelGrid3D en formato BeadCell[][] compatible
 * con el motor de renderizado 2D y la interfaz VoxelLayer.
 */
export function extractZSlice(grid: VoxelGrid3D, z: number): BeadCell[][] {
  const { cols, rows, depth, voxels } = grid
  if (z < 0 || z >= depth) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))
  }

  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const cell = voxels[z][y][x]
      return cell ? cell.color : null
    })
  )
}

/**
 * Descompone todo el VoxelGrid3D en un array de capas horizontales en Z (BeadCell[][][]).
 */
export function sliceGridToLayers(grid: VoxelGrid3D): BeadCell[][][] {
  return Array.from({ length: grid.depth }, (_, z) => extractZSlice(grid, z))
}

/**
 * Extrae un corte ortogonal planar en cualquiera de los 3 planos cartesianos:
 * - 'xy': Corte horizontal a elevación Z=index (dimensiones cols x rows)
 * - 'yz': Corte sagital a posición X=index (dimensiones depth x rows)
 * - 'xz': Corte coronal a posición Y=index (dimensiones cols x depth)
 *
 * Muy útil para la generación de placas de ensamblado Interlocking.
 */
export function extractSlicePlane(
  grid: VoxelGrid3D,
  plane: 'xy' | 'yz' | 'xz',
  index: number
): BeadCell[][] {
  const { cols, rows, depth, voxels } = grid

  if (plane === 'xy') {
    return extractZSlice(grid, index)
  }

  if (plane === 'yz') {
    // index representa la columna X
    const safeX = Math.max(0, Math.min(cols - 1, Math.round(index)))
    return Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        const cell = voxels[z]?.[y]?.[safeX]
        return cell ? cell.color : null
      })
    )
  }

  // plane === 'xz': index representa la fila Y
  const safeY = Math.max(0, Math.min(rows - 1, Math.round(index)))
  return Array.from({ length: depth }, (_, z) =>
    Array.from({ length: cols }, (_, x) => {
      const cell = voxels[z]?.[safeY]?.[x]
      return cell ? cell.color : null
    })
  )
}

/**
 * Garantiza que cada componente conectado en cada capa Z >= 1 tenga al menos
 * una perla de apoyo físico directo sobre la capa inferior Z-1.
 * Si un componente conexo queda completamente suspendido en el aire (flotante),
 * proyecta soporte vertical hacia abajo en Z-1 recursivamente.
 */
export function ensureVerticalSupport(
  grid: VoxelGrid3D,
  baseGrid: BeadCell[][]
): void {
  const { cols, rows, depth, voxels } = grid

  // Recorrer desde las capas superiores hacia abajo para propagar soporte si fuera necesario
  for (let z = depth - 1; z >= 1; z--) {
    const visited: boolean[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    )

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (voxels[z][y][x] === null || visited[y][x]) continue

        // Encontrar el componente conexo 4-conectado en la capa z
        const component: [number, number][] = []
        const queue: [number, number][] = [[x, y]]
        visited[y][x] = true

        let hasDirectSupport = false
        let head = 0

        while (head < queue.length) {
          const [cx, cy] = queue[head++]
          component.push([cx, cy])

          // Comprobar si esta perla del componente tiene apoyo en z - 1
          if (voxels[z - 1][cy][cx] !== null) {
            hasDirectSupport = true
          }

          for (const [dy, dx] of NEIGHBORS_4_2D) {
            const ny = cy + dy
            const nx = cx + dx
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              if (voxels[z][ny][nx] !== null && !visited[ny][nx]) {
                visited[ny][nx] = true
                queue.push([nx, ny])
              }
            }
          }
        }

        // Si ninguna perla de este componente tiene apoyo en z - 1, el componente está flotando en el aire.
        // Se añade soporte en z - 1 para todas las perlas del componente
        if (!hasDirectSupport) {
          for (const [cx, cy] of component) {
            if (baseGrid[cy][cx] !== null) {
              setVoxel(grid, cx, cy, z - 1, {
                x: cx,
                y: cy,
                z: z - 1,
                color: baseGrid[cy][cx]!,
                isStructural: true,
              })
            }
          }
        }
      }
    }
  }
}

