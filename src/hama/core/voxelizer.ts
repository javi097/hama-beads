import type { BeadCell } from '@/interfaces/hama.interface'
import type {
  VoxelLayer,
  InterlockingPlate,
  InterlockingStructureType,
} from '@/interfaces/hama-3d.interface'
import { HAMA_PALETTE } from './palette.const'

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
 * Genera el conjunto de capas apiladas para el modo de Apilado Multicapa Hueco (Slicing Inteligente).
 * - La primera capa (Base, índice 1) y la última capa (Tapa, índice N) son 100% sólidas.
 * - Las capas intermedias tienen sus celdas interiores vaciadas (convertidas a null).
 * - El número de capas se acota estrictamente entre 3 y 30.
 *
 * @param baseGrid Cuadrícula 2D de diseño base
 * @param totalLayers Número de capas solicitadas (acotado a [3, 30])
 * @param wallThickness Grosor de pared perimetral en perlas (1 o 2)
 * @param diameterMm Diámetro de la perla en milímetros (ej. 5.0 para Midi, 2.5 para Mini)
 */
export function generateHollowLayers(
  baseGrid: BeadCell[][],
  totalLayers: number,
  wallThickness: 1 | 2,
  diameterMm: number
): VoxelLayer[] {
  const rows = baseGrid.length
  if (rows === 0) return []
  const cols = baseGrid[0].length

  const clampedLayers = Math.max(3, Math.min(30, Math.round(totalLayers)))
  const interiorMask = identifyInteriorCells(baseGrid, wallThickness)

  const layers: VoxelLayer[] = []

  for (let i = 0; i < clampedLayers; i++) {
    const isBase = i === 0
    const isTop = i === clampedLayers - 1
    const layerIndex = i + 1

    let layerName: string
    if (isBase) {
      layerName = `Capa ${layerIndex} (Base)`
    } else if (isTop) {
      layerName = `Capa ${layerIndex} (Tapa)`
    } else {
      layerName = `Capa ${layerIndex} (Hueca)`
    }

    let cells: BeadCell[][]
    let beadCount = 0

    if (isBase || isTop) {
      // Capa sólida: clonar diseño base
      cells = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          const bead = baseGrid[y][x]
          if (bead !== null) {
            beadCount++
          }
          return bead
        })
      )
    } else {
      // Capa intermedia: vaciar celdas interiores (convertidas en null)
      cells = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          if (interiorMask[y]?.[x]) {
            return null
          }
          const bead = baseGrid[y][x]
          if (bead !== null) {
            beadCount++
          }
          return bead
        })
      )
    }

    layers.push({
      layerIndex,
      name: layerName,
      cells,
      beadCount,
      zOffsetMm: i * diameterMm,
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

  // Determinar color de relleno para placas estructurales (el más frecuente o #01 blanco)
  let fallbackBead: BeadCell = null
  const colorCounts = new Map<string, { bead: NonNullable<BeadCell>; count: number }>()
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = baseGrid[y][x]
      if (cell !== null) {
        const entry = colorCounts.get(cell.id)
        if (entry) {
          entry.count++
        } else {
          colorCounts.set(cell.id, { bead: cell, count: 1 })
        }
      }
    }
  }

  let maxCount = -1
  for (const { bead, count } of colorCounts.values()) {
    if (count > maxCount) {
      maxCount = count
      fallbackBead = bead
    }
  }
  if (!fallbackBead) {
    fallbackBead = HAMA_PALETTE.find((c) => c.id === '01') || null
  }

  if (structureType === 'box') {
    // 1. Frontal (XY, Z = (depth - 1) * diameterMm)
    const frontCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        // En los bordes exteriores, alternar pestañas (y o x par) y ranuras (y o x impar)
        const isLeft = x === 0
        const isRight = x === cols - 1
        const isTop = y === 0
        const isBottom = y === rows - 1

        if (isLeft || isRight) {
          if (y % 2 !== 0) return null
        }
        if (isTop || isBottom) {
          if (x % 2 !== 0) return null
        }

        return baseGrid[y][x] || fallbackBead
      })
    )

    // 2. Trasera (XY, Z = 0)
    const backCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        const isLeft = x === 0
        const isRight = x === cols - 1
        const isTop = y === 0
        const isBottom = y === rows - 1

        if (isLeft || isRight) {
          if (y % 2 !== 0) return null
        }
        if (isTop || isBottom) {
          if (x % 2 !== 0) return null
        }

        return fallbackBead
      })
    )

    // 3. Lateral Izquierda (YZ, X = 0)
    // Dimensiones: rows x depth (y x z)
    const leftCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        const isFrontEdge = z === depth - 1
        const isBackEdge = z === 0
        const isTopEdge = y === 0
        const isBottomEdge = y === rows - 1

        // Aristas verticales de unión con Front y Back
        if (isFrontEdge || isBackEdge) {
          // Front/Back tienen perla en y % 2 === 0, por lo que Left debe tener hueco
          if (y % 2 === 0) return null
          return fallbackBead
        }

        // Aristas horizontales de unión con Top y Bottom (z interior [1, depth - 2])
        if (isTopEdge || isBottomEdge) {
          if (z % 2 === 0) return null
          return fallbackBead
        }

        return fallbackBead
      })
    )

    // 4. Lateral Derecha (YZ, X = (cols - 1) * diameterMm)
    const rightCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        const isFrontEdge = z === depth - 1
        const isBackEdge = z === 0
        const isTopEdge = y === 0
        const isBottomEdge = y === rows - 1

        if (isFrontEdge || isBackEdge) {
          if (y % 2 === 0) return null
          return fallbackBead
        }

        if (isTopEdge || isBottomEdge) {
          if (z % 2 === 0) return null
          return fallbackBead
        }

        return fallbackBead
      })
    )

    // 5. Tapa Superior (XZ, Y = 0)
    // Dimensiones: depth x cols (z x x)
    const topCells: BeadCell[][] = Array.from({ length: depth }, (_, z) =>
      Array.from({ length: cols }, (_, x) => {
        const isFrontEdge = z === depth - 1
        const isBackEdge = z === 0
        const isLeftEdge = x === 0
        const isRightEdge = x === cols - 1

        // Aristas que unen con Front y Back
        if (isFrontEdge || isBackEdge) {
          // Front/Back tienen perla en x % 2 === 0, por lo que Top debe tener hueco
          if (x % 2 === 0) return null
          return fallbackBead
        }

        // Aristas que unen con Left y Right (z interior [1, depth - 2])
        if (isLeftEdge || isRightEdge) {
          // Left/Right tienen perla en z % 2 !== 0, por lo que Top tiene perla en z % 2 === 0
          if (z % 2 !== 0) return null
          return fallbackBead
        }

        return fallbackBead
      })
    )

    // 6. Base Inferior (XZ, Y = (rows - 1) * diameterMm)
    // Dimensiones: depth x cols (z x x)
    const bottomCells: BeadCell[][] = Array.from({ length: depth }, (_, z) =>
      Array.from({ length: cols }, (_, x) => {
        const isFrontEdge = z === depth - 1
        const isBackEdge = z === 0
        const isLeftEdge = x === 0
        const isRightEdge = x === cols - 1

        if (isFrontEdge || isBackEdge) {
          if (x % 2 === 0) return null
          return fallbackBead
        }

        if (isLeftEdge || isRightEdge) {
          if (z % 2 !== 0) return null
          return fallbackBead
        }

        return fallbackBead
      })
    )

    return [
      {
        id: 'front',
        name: 'Frontal',
        orientation: 'xy',
        cells: frontCells,
        widthBeads: cols,
        heightBeads: rows,
        position3D: [0, 0, (depth - 1) * diameterMm],
      },
      {
        id: 'back',
        name: 'Trasera',
        orientation: 'xy',
        cells: backCells,
        widthBeads: cols,
        heightBeads: rows,
        position3D: [0, 0, 0],
      },
      {
        id: 'left',
        name: 'Lateral Izquierda',
        orientation: 'yz',
        cells: leftCells,
        widthBeads: depth,
        heightBeads: rows,
        position3D: [0, 0, 0],
      },
      {
        id: 'right',
        name: 'Lateral Derecha',
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
        position3D: [0, (rows - 1) * diameterMm, 0],
      },
    ]
  }

  // structureType === 'cross_ribs'
  const zSlot = Math.floor(depth / 2)
  const halfY = Math.floor(rows / 2)

  const x1 = cols > 2 ? Math.max(1, Math.floor(cols / 3)) : 0
  const x2 = cols > 3 ? Math.min(cols - 2, Math.max(x1 + 1, Math.floor((2 * cols) / 3))) : (cols > 1 ? cols - 1 : 0)

  // 1. Placa principal central (XY)
  // Las columnas x1 y x2 se vacían en la mitad inferior (y >= halfY) para recibir las costillas
  const mainCells: BeadCell[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if ((x === x1 || x === x2) && y >= halfY) {
        return null
      }
      return baseGrid[y][x]
    })
  )

  // Función para construir una costilla transversal (YZ)
  // En zSlot, la mitad superior (y < halfY) está vaciada; la mitad inferior es sólida
  const createRibCells = (columnX: number): BeadCell[][] => {
    return Array.from({ length: rows }, (_, y) =>
      Array.from({ length: depth }, (_, z) => {
        if (z === zSlot) {
          if (y < halfY) return null
          return baseGrid[y]?.[columnX] || fallbackBead
        }
        return baseGrid[y]?.[columnX] || fallbackBead
      })
    )
  }

  const rib1Cells = createRibCells(x1)
  const rib2Cells = createRibCells(x2)

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
