import type { BeadCell } from '@/interfaces/hama.interface'
import type { VoxelLayer } from '@/interfaces/hama-3d.interface'

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
