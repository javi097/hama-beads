// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  computeDepthMap,
  computeMorphologicalRadius,
  identifyInteriorCells,
  generateHollowLayers,
  generateInterlockingPlates,
  generateReliefLayers,
  computeModel3D,
} from '../voxelizer'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell } from '@/interfaces/hama.interface'

const blackBead = HAMA_PALETTE.find((c) => c.id === '18')!
const redBead = HAMA_PALETTE.find((c) => c.id === '05')!

/** Helper para crear una cuadrícula bidimensional sólida */
function createSolidGrid(cols: number, rows: number, bead = redBead): BeadCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => bead))
}

describe('voxelizer — Hollow Slicing (Modo 1)', () => {
  describe('identifyInteriorCells', () => {
    it('devuelve matriz vacía si la cuadrícula está vacía', () => {
      expect(identifyInteriorCells([], 1)).toEqual([])
      expect(identifyInteriorCells([[]], 1)).toEqual([[]])
    })

    it('figuras delgadas (< 3 perlas de ancho o alto) permanecen 100% sólidas sin interior', () => {
      // Cuadrícula 2x2
      const grid2x2 = createSolidGrid(2, 2)
      const interior1 = identifyInteriorCells(grid2x2, 1)
      expect(interior1.flat().every((cell) => cell === false)).toBe(true)

      // Línea horizontal 5x1
      const line5x1 = createSolidGrid(5, 1)
      const interiorLine = identifyInteriorCells(line5x1, 1)
      expect(interiorLine.flat().every((cell) => cell === false)).toBe(true)
    })

    it('en un cuadrado 3x3 con grosor 1, solo la celda central es interior', () => {
      const grid3x3 = createSolidGrid(3, 3)
      const interior = identifyInteriorCells(grid3x3, 1)

      expect(interior[1][1]).toBe(true)

      // El perímetro (8 celdas exteriores) debe ser false
      const perimeterCoords = [
        [0, 0], [0, 1], [0, 2],
        [1, 0],         [1, 2],
        [2, 0], [2, 1], [2, 2],
      ]
      for (const [y, x] of perimeterCoords) {
        expect(interior[y][x]).toBe(false)
      }
    })

    it('en un cuadrado 3x3 con grosor 2, ninguna celda se ahueca (permanece sólida)', () => {
      const grid3x3 = createSolidGrid(3, 3)
      const interior = identifyInteriorCells(grid3x3, 2)
      expect(interior.flat().every((cell) => cell === false)).toBe(true)
    })

    it('en un cuadrado 5x5 con grosor 1, el bloque central 3x3 es interior (9 celdas)', () => {
      const grid5x5 = createSolidGrid(5, 5)
      const interior = identifyInteriorCells(grid5x5, 1)

      let interiorCount = 0
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const isBorder = y === 0 || y === 4 || x === 0 || x === 4
          if (isBorder) {
            expect(interior[y][x]).toBe(false)
          } else {
            expect(interior[y][x]).toBe(true)
            interiorCount++
          }
        }
      }
      expect(interiorCount).toBe(9)
    })

    it('en un cuadrado 5x5 con grosor 2, solo el centro exacto (1 celda) es interior', () => {
      const grid5x5 = createSolidGrid(5, 5)
      const interior = identifyInteriorCells(grid5x5, 2)

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          if (y === 2 && x === 2) {
            expect(interior[y][x]).toBe(true)
          } else {
            expect(interior[y][x]).toBe(false)
          }
        }
      }
    })

    it('respeta transparencias internas: no ahueca celdas que ya son null', () => {
      const grid = createSolidGrid(5, 5)
      grid[2][2] = null // Hueco original transparente en el centro

      const interior = identifyInteriorCells(grid, 1)
      expect(interior[2][2]).toBe(false)
      // Los vecinos adyacentes al hueco se convierten en pared exterior, no interior
      expect(interior[1][2]).toBe(false)
      expect(interior[3][2]).toBe(false)
      expect(interior[2][1]).toBe(false)
      expect(interior[2][3]).toBe(false)
    })
  })

  describe('computeDepthMap (2.5D Volumetric Reconstruction)', () => {
    it('devuelve array vacío si la cuadrícula base está vacía', () => {
      expect(computeDepthMap([])).toEqual([])
      expect(computeDepthMap([[]])).toEqual([[]])
    })

    it('devuelve ceros en celdas vacías/nulas', () => {
      const grid = createSolidGrid(3, 3)
      grid[1][1] = null
      const depth = computeDepthMap(grid)
      expect(depth[1][1]).toBe(0.0)
    })

    it('acota los valores de profundidad normalizada estrictamente en [0.10, 1.00] para perlas activas', () => {
      const grid = createSolidGrid(5, 5, redBead)
      const depth = computeDepthMap(grid)

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(depth[y][x]).toBeGreaterThanOrEqual(0.10)
          expect(depth[y][x]).toBeLessThanOrEqual(1.00)
        }
      }
    })

    it('asigna mayor elevación Z al centro morfológico que al borde exterior', () => {
      const grid = createSolidGrid(5, 5, redBead)
      const depth = computeDepthMap(grid)

      const centerDepth = depth[2][2]
      const cornerDepth = depth[0][0]
      const edgeDepth = depth[0][2]

      // Centro > Borde > Esquina
      expect(centerDepth).toBeGreaterThan(edgeDepth)
      expect(edgeDepth).toBeGreaterThanOrEqual(cornerDepth)
      expect(centerDepth).toBeCloseTo(1.0, 2)
    })
  })

  describe('generateHollowLayers', () => {
    it('limita el número de capas al rango [3, 30]', () => {
      const grid = createSolidGrid(5, 5)
      const layersLow = generateHollowLayers(grid, 1, 1, 5.0)
      expect(layersLow).toHaveLength(3)

      const layersHigh = generateHollowLayers(grid, 50, 1, 5.0)
      expect(layersHigh).toHaveLength(30)
    })

    it('las capas base (Z=1) y superior (Z=N) son sólidas (RF-2.2) y las intermedias tienen el interior vaciado', () => {
      const grid = createSolidGrid(5, 5, blackBead)
      const totalLayers = 5
      const layers = generateHollowLayers(grid, totalLayers, 1, 5.0)

      expect(layers).toHaveLength(5)

      // Capa base (Z=1) y Capa superior (Z=5) son 100% sólidas (25 perlas cada una, RF-2.2)
      expect(layers[0].layerIndex).toBe(1)
      expect(layers[0].name).toContain('Base Sólida')
      expect(layers[0].beadCount).toBe(25)

      expect(layers[4].layerIndex).toBe(5)
      expect(layers[4].name).toContain('Tapa Superior')
      expect(layers[4].beadCount).toBe(25)

      // Capa central (Z=0, layerIndex 3) tiene el interior vaciado (16 perlas perimetrales)
      const midLayer = layers[2]
      expect(midLayer.layerIndex).toBe(3)
      expect(midLayer.name).toContain('Central Z=0')
      expect(midLayer.beadCount).toBe(16)
      expect(midLayer.cells[2][2]).toBeNull() // Centro vaciado
    })

    it('las capas intermedias mantienen la pared perimetral sólida y vacían el interior para ahorrar perlas', () => {
      const grid = createSolidGrid(7, 7, redBead)
      const totalLayers = 5
      const layers = generateHollowLayers(grid, totalLayers, 1, 5.0)

      // Capa central (índice 2, Capa 3)
      const midLayer = layers[2]
      // Núcleo interno vaciado (el centro geométrico está hueco)
      expect(midLayer.cells[3][3]).toBeNull()
      // Perímetro exterior preservado
      expect(midLayer.cells[0][3]).toEqual(redBead)
      expect(midLayer.cells[6][3]).toEqual(redBead)
      expect(midLayer.cells[3][0]).toEqual(redBead)
      expect(midLayer.cells[3][6]).toEqual(redBead)
    })

    it('con profile "rounded", las capas exteriores aplican contracción morfológica suave', () => {
      // Figura 7x7 con centro grueso 3x3 y extremidades delgadas de 1 perla
      const grid: BeadCell[][] = Array.from({ length: 7 }, (_, y) =>
        Array.from({ length: 7 }, (_, x) => {
          if (y >= 2 && y <= 4 && x >= 2 && x <= 4) {
            return blackBead // Núcleo focal grueso
          }
          if (x === 3 || y === 3) {
            return redBead // Brazos/extremidades delgadas
          }
          return null
        })
      )

      const layers = generateHollowLayers(grid, 5, 1, 5.0, { profile: 'rounded' })
      expect(layers).toHaveLength(5)

      const topCap = layers[4] // Tapa anterior (+Z)
      expect(topCap.beadCount).toBeGreaterThan(0)
      expect(topCap.cells[3][3]).toEqual(blackBead)
    })

    it('permite cavidades selectivas: cuerpo macizo y cavidad hueca según color (ej. cámara fotográfica)', () => {
      // Grid 6x6: cuerpo rojo con objetivo negro central 2x2
      const grid = createSolidGrid(6, 6, redBead)
      grid[2][2] = blackBead
      grid[2][3] = blackBead
      grid[3][2] = blackBead
      grid[3][3] = blackBead

      // Vaciado selectivo solo del color negro ('18')
      const layers = generateHollowLayers(grid, 5, 1, 5.0, {
        cavityColorIds: ['18'],
      })

      expect(layers).toHaveLength(5)

      // Capa 1 y Capa 5 permanecen sólidas
      expect(layers[0].cells[2][2]).toEqual(blackBead)
      expect(layers[4].cells[2][2]).toEqual(blackBead)

      // En capas intermedias (Capa 2, 3, 4), el cuerpo rojo permanece 100% sólido y el objetivo negro se vacía
      const midLayer = layers[2]
      expect(midLayer.cells[0][0]).toEqual(redBead) // Cuerpo exterior sólido
      expect(midLayer.cells[1][1]).toEqual(redBead) // Cuerpo interior sólido (no se vacía indiscriminadamente)
      expect(midLayer.cells[2][2]).toBeNull() // Cavidad del objetivo vacía
      expect(midLayer.cells[2][3]).toBeNull()
      expect(midLayer.cells[3][2]).toBeNull()
      expect(midLayer.cells[3][3]).toBeNull()
    })

    it('garantiza soporte vertical evitando que perlas de capas superiores queden flotando en el aire', () => {
      const grid = createSolidGrid(5, 5, redBead)
      const layers = generateHollowLayers(grid, 5, 1, 5.0, {
        enforceVerticalSupport: true,
      })

      // Para cada capa intermedia y superior, verificar que cada componente conexo tenga apoyo directo en la capa inferior
      for (let l = 1; l < layers.length; l++) {
        const current = layers[l].cells
        const below = layers[l - 1].cells

        const visited: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false))
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 5; x++) {
            if (current[y][x] === null || visited[y][x]) continue

            const queue: [number, number][] = [[x, y]]
            visited[y][x] = true
            let componentHasDirectSupport = false

            let head = 0
            while (head < queue.length) {
              const [cx, cy] = queue[head++]
              if (below[cy][cx] !== null) {
                componentHasDirectSupport = true
              }

              for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const ny = cy + dy
                const nx = cx + dx
                if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && current[ny][nx] !== null && !visited[ny][nx]) {
                  visited[ny][nx] = true
                  queue.push([nx, ny])
                }
              }
            }

            expect(componentHasDirectSupport).toBe(true)
          }
        }
      }
    })

    it('calcula el radio morfológico con computeMorphologicalRadius', () => {
      const grid = createSolidGrid(5, 5, redBead)
      const { radiusMap, maxRadius } = computeMorphologicalRadius(grid)
      expect(maxRadius).toBe(3)
      expect(radiusMap[2][2]).toBe(3)
      expect(radiusMap[0][0]).toBe(1)
    })

    it('calcula zOffsetMm proporcionalmente al diámetro de la perla', () => {
      const grid = createSolidGrid(4, 4)
      const layersMidi = generateHollowLayers(grid, 3, 1, 5.0)
      expect(layersMidi[0].zOffsetMm).toBe(0)
      expect(layersMidi[1].zOffsetMm).toBe(5.0)
      expect(layersMidi[2].zOffsetMm).toBe(10.0)

      const layersMini = generateHollowLayers(grid, 3, 1, 2.5)
      expect(layersMini[0].zOffsetMm).toBe(0)
      expect(layersMini[1].zOffsetMm).toBe(2.5)
      expect(layersMini[2].zOffsetMm).toBe(5.0)
    })
  })

  describe('generateInterlockingPlates (Modo 2)', () => {
    it('devuelve array vacío si la cuadrícula base está vacía', () => {
      expect(generateInterlockingPlates([], 'box', 5, 5.0)).toEqual([])
      expect(generateInterlockingPlates([[]], 'box', 5, 5.0)).toEqual([])
      expect(generateInterlockingPlates([], 'cross_ribs', 5, 5.0)).toEqual([])
    })

    describe('Caja 3D (structureType === "box")', () => {
      it('genera exactamente 6 placas ortogonales independientes (front, back, left, right, top, bottom)', () => {
        const grid = createSolidGrid(5, 5, redBead)
        const plates = generateInterlockingPlates(grid, 'box', 4, 5.0)

        expect(plates).toHaveLength(6)
        const plateIds = plates.map((p) => p.id)
        expect(plateIds).toEqual(['front', 'back', 'left', 'right', 'top', 'bottom'])

        const front = plates.find((p) => p.id === 'front')!
        const back = plates.find((p) => p.id === 'back')!
        const left = plates.find((p) => p.id === 'left')!
        const right = plates.find((p) => p.id === 'right')!
        const top = plates.find((p) => p.id === 'top')!
        const bottom = plates.find((p) => p.id === 'bottom')!

        expect(front.orientation).toBe('xy')
        expect(back.orientation).toBe('xy')
        expect(left.orientation).toBe('yz')
        expect(right.orientation).toBe('yz')
        expect(top.orientation).toBe('xz')
        expect(bottom.orientation).toBe('xz')

        // Dimensiones: W=5, H=5, D=4
        expect(front.widthBeads).toBe(5)
        expect(front.heightBeads).toBe(5)
        expect(back.widthBeads).toBe(5)
        expect(back.heightBeads).toBe(5)

        expect(left.widthBeads).toBe(4)
        expect(left.heightBeads).toBe(5)
        expect(right.widthBeads).toBe(4)
        expect(right.heightBeads).toBe(5)

        expect(top.widthBeads).toBe(5)
        expect(top.heightBeads).toBe(4)
        expect(bottom.widthBeads).toBe(5)
        expect(bottom.heightBeads).toBe(4)
      })

      it('emplea blanco (#01) como color estructural para las placas de la caja', () => {
        const grid = createSolidGrid(4, 4, blackBead)
        const plates = generateInterlockingPlates(grid, 'box', 3, 5.0)

        const left = plates.find((p) => p.id === 'left')!
        const leftBeads = left.cells.flat().filter((c) => c !== null)
        expect(leftBeads.length).toBeGreaterThan(0)
        // La placa estructural debe ser blanca (#01), no negra (#18)
        expect(leftBeads[0]!.id).toBe('01')
      })

      it('acota depthBeads a un mínimo de 3 y máximo de 30', () => {
        const grid = createSolidGrid(4, 4)
        const platesLow = generateInterlockingPlates(grid, 'box', 1, 5.0)
        const leftLow = platesLow.find((p) => p.id === 'left')!
        expect(leftLow.widthBeads).toBe(3)

        const platesHigh = generateInterlockingPlates(grid, 'box', 50, 5.0)
        const leftHigh = platesHigh.find((p) => p.id === 'left')!
        expect(leftHigh.widthBeads).toBe(30)
      })

      it('juntas machihembradas con paso de 2 perlas (10 mm) encajan en todas las aristas sin colisión volumétrica', () => {
        const cols = 6
        const rows = 6
        const depth = 4
        const grid = createSolidGrid(cols, rows, redBead)
        const plates = generateInterlockingPlates(grid, 'box', depth, 5.0, 2)

        // Comprobar arista vertical Frontal con Lateral Izquierda (x = 0, z = depth - 1)
        const front = plates.find((p) => p.id === 'front')!
        const left = plates.find((p) => p.id === 'left')!

        for (let y = 0; y < rows; y++) {
          const frontHasBead = front.cells[y][0] !== null
          const leftHasBead = left.cells[y][depth - 1] !== null

          // No colisionan ambas a la vez en la arista compartida
          expect(frontHasBead && leftHasBead).toBe(false)
          // Y al menos una tiene material (contacto continuo)
          expect(frontHasBead || leftHasBead).toBe(true)
        }

        // Comprobar paso de 2 perlas: Front tiene dientes en y=0,1; Left tiene dientes en y=2,3
        expect(front.cells[0][0]).not.toBeNull()
        expect(front.cells[1][0]).not.toBeNull()
        expect(left.cells[2][depth - 1]).not.toBeNull()
        expect(left.cells[3][depth - 1]).not.toBeNull()
      })

      it('en la posición final ensamblada, ningún vóxel de la superficie de la caja colisiona entre placas', () => {
        const cols = 5
        const rows = 5
        const depth = 4
        const grid = createSolidGrid(cols, rows, redBead)
        const plates = generateInterlockingPlates(grid, 'box', depth, 5.0, 2)

        // Matriz de ocupación 3D para registrar propietarios
        const occupancy: Map<string, string> = new Map()

        for (const plate of plates) {
          const [posX, posY, posZ] = plate.position3D
          const d = 5.0

          for (let r = 0; r < plate.cells.length; r++) {
            for (let c = 0; c < plate.cells[r].length; c++) {
              if (plate.cells[r][c] !== null) {
                let x = 0
                let y = 0
                let z = 0

                if (plate.orientation === 'xy') {
                  x = Math.round((posX + (c + 0.5) * d - 0.5 * d) / d)
                  y = Math.round(-(posY - (r + 0.5) * d + 0.5 * d) / d)
                  z = Math.round((posZ + 0.5 * d - 0.5 * d) / d)
                } else if (plate.orientation === 'yz') {
                  x = Math.round((posX + 0.5 * d - 0.5 * d) / d)
                  y = Math.round(-(posY - (r + 0.5) * d + 0.5 * d) / d)
                  z = Math.round((posZ + (c + 0.5) * d - 0.5 * d) / d)
                } else if (plate.orientation === 'xz') {
                  x = Math.round((posX + (c + 0.5) * d - 0.5 * d) / d)
                  y = Math.round(-(posY - 0.5 * d + 0.5 * d) / d)
                  z = Math.round((posZ + (r + 0.5) * d - 0.5 * d) / d)
                }

                const key = `${x},${y},${z}`
                // Ningún vóxel debe haber sido reclamado previamente por otra placa
                expect(occupancy.has(key)).toBe(false)
                occupancy.set(key, plate.id)
              }
            }
          }
        }

        // Se han ocupado exactamente los vóxeles de la superficie de la caja
        expect(occupancy.size).toBeGreaterThan(0)
      })
    })

    describe('Ensamblaje Modular Tipo Lego (structureType === "cross_ribs")', () => {
      it('genera todas las capas del cuerpo redondeado en Z más la columna vertebral interna de encastre', () => {
        const grid = createSolidGrid(7, 6, blackBead)
        const depth = 5
        const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

        // 5 capas del cuerpo ('xy') + 1 columna vertebral interna ('yz') = 6 placas
        expect(plates).toHaveLength(6)

        const bodyPlates = plates.filter((p) => p.orientation === 'xy')
        expect(bodyPlates).toHaveLength(5)
        bodyPlates.forEach((layer, idx) => {
          expect(layer.id).toBe(`layer_${idx + 1}`)
          expect(layer.widthBeads).toBe(7)
          expect(layer.heightBeads).toBe(6)
        })

        const spine = plates.find((p) => p.id === 'spine_1')!
        expect(spine).toBeDefined()
        expect(spine.orientation).toBe('yz')
        expect(spine.widthBeads).toBe(5)
        expect(spine.heightBeads).toBe(6)
      })

      it('las ranuras de inserción en las capas y los dientes de la columna vertebral encajan sin colisión volumétrica', () => {
        const grid = createSolidGrid(7, 6, redBead)
        const depth = 5
        const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

        // Comprobar que en la posición 3D no hay colisiones entre las capas del cuerpo y la columna
        const occupancy = new Set<string>()

        for (const plate of plates) {
          const [posX, posY, posZ] = plate.position3D
          const d = 5.0

          for (let r = 0; r < plate.cells.length; r++) {
            for (let c = 0; c < plate.cells[r].length; c++) {
              if (plate.cells[r][c] !== null) {
                let x = 0
                let y = 0
                let z = 0

                if (plate.orientation === 'xy') {
                  x = Math.round((posX + (c + 0.5) * d - 0.5 * d) / d)
                  y = Math.round(-(posY - (r + 0.5) * d + 0.5 * d) / d)
                  z = Math.round((posZ + 0.5 * d - 0.5 * d) / d)
                } else if (plate.orientation === 'yz') {
                  x = Math.round((posX + 0.5 * d - 0.5 * d) / d)
                  y = Math.round(-(posY - (r + 0.5) * d + 0.5 * d) / d)
                  z = Math.round((posZ + (c + 0.5) * d - 0.5 * d) / d)
                }

                const key = `${x},${y},${z}`
                expect(occupancy.has(key)).toBe(false)
                occupancy.add(key)
              }
            }
          }
        }

        expect(occupancy.size).toBeGreaterThan(0)
      })

      it('en figuras recortadas con fondo transparente, la columna vertebral queda estrictamente dentro de la silueta sin sobresalir', () => {
        // Cuadrícula 10x10 con figura solo en filas 3 a 7 y cols 2 a 8
        const grid: BeadCell[][] = Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 10 }, (_, x) => {
            if (y >= 3 && y <= 7 && x >= 2 && x <= 8) {
              return redBead
            }
            return null
          })
        )

        const plates = generateInterlockingPlates(grid, 'cross_ribs', 4, 5.0)
        const spine = plates.find((p) => p.id === 'spine_1')!
        expect(spine).toBeDefined()

        // Filas fuera del rango vertical [3, 7] no deben tener perlas en la columna vertebral
        for (let y = 0; y < 10; y++) {
          if (y < 3 || y > 7) {
            for (let z = 0; z < 4; z++) {
              expect(spine.cells[y][z]).toBeNull()
            }
          }
        }
      })
    })
  })

  describe('generateReliefLayers (Modo 3)', () => {
    it('devuelve array vacío si la cuadrícula base está vacía', () => {
      expect(generateReliefLayers([], 3, 5.0)).toEqual([])
      expect(generateReliefLayers([[]], 3, 5.0)).toEqual([])
    })

    it('limita los niveles de relieve estrictamente al rango [2, 6]', () => {
      const grid = createSolidGrid(4, 4, redBead)
      const layersLow = generateReliefLayers(grid, 1, 5.0)
      expect(layersLow).toHaveLength(2)

      const layersHigh = generateReliefLayers(grid, 10, 5.0)
      expect(layersHigh).toHaveLength(6)
    })

    it('la capa 1 (base sólida) contiene el 100% de las perlas del diseño original', () => {
      const grid = createSolidGrid(4, 4, redBead)
      grid[0][0] = null // Un hueco transparente
      const layers = generateReliefLayers(grid, 3, 5.0)

      expect(layers[0].layerIndex).toBe(1)
      expect(layers[0].beadCount).toBe(15)
      expect(layers[0].cells[0][0]).toBeNull()
      expect(layers[0].cells[1][1]).toEqual(redBead)
    })

    it('rellena sólidamente todas las capas inferiores a la altura de luminancia (acumulativo)', () => {
      const whiteBead = HAMA_PALETTE.find((c) => c.id === '01')! // luminance 1.0
      const blackBead = HAMA_PALETTE.find((c) => c.id === '18')! // luminance 0.0

      const customGrid: BeadCell[][] = [
        [blackBead, whiteBead],
      ]

      const layers = generateReliefLayers(customGrid, 3, 5.0)
      expect(layers).toHaveLength(3)

      // Capa 1: Ambos están presentes
      expect(layers[0].cells[0][0]).toEqual(blackBead)
      expect(layers[0].cells[0][1]).toEqual(whiteBead)

      // Capa 3: El negro (nivel 1) ya no está (null), pero el blanco (nivel 3) sí
      expect(layers[2].cells[0][0]).toBeNull()
      expect(layers[2].cells[0][1]).toEqual(whiteBead)

      // Recuento decreciente o igual: Capa 1 >= Capa 2 >= Capa 3
      expect(layers[0].beadCount).toBeGreaterThanOrEqual(layers[1].beadCount)
      expect(layers[1].beadCount).toBeGreaterThanOrEqual(layers[2].beadCount)
    })

    it('calcula zOffsetMm proporcionalmente a cada nivel', () => {
      const grid = createSolidGrid(3, 3, redBead)
      const layers = generateReliefLayers(grid, 3, 5.0)

      expect(layers[0].zOffsetMm).toBe(0)
      expect(layers[1].zOffsetMm).toBe(5.0)
      expect(layers[2].zOffsetMm).toBe(10.0)
    })
  })

  describe('computeModel3D (Unified 3D Model Generator)', () => {
    it('devuelve null si gridData es null o no tiene celdas', () => {
      const resNull = computeModel3D(null, {
        mode3d: 'hollow',
        hollowLayersCount: 5,
        hollowWallThickness: 1,
        interlockingType: 'box',
        interlockingDepthBeads: 5,
        reliefLevels: 3,
        diameterMm: 5.0,
      })
      expect(resNull).toBeNull()

      const resEmpty = computeModel3D({ cols: 0, rows: 0, cells: [] }, {
        mode3d: 'hollow',
        hollowLayersCount: 5,
        hollowWallThickness: 1,
        interlockingType: 'box',
        interlockingDepthBeads: 5,
        reliefLevels: 3,
        diameterMm: 5.0,
      })
      expect(resEmpty).toBeNull()
    })

    it('genera Model3DResult completo para modo hollow con dimensiones métricas calculadas', () => {
      const grid = createSolidGrid(4, 4, redBead)
      const res = computeModel3D({ cols: 4, rows: 4, cells: grid }, {
        mode3d: 'hollow',
        hollowLayersCount: 4,
        hollowWallThickness: 1,
        interlockingType: 'box',
        interlockingDepthBeads: 5,
        reliefLevels: 3,
        diameterMm: 5.0,
      })

      expect(res).not.toBeNull()
      expect(res?.mode).toBe('hollow')
      expect(res?.layers).toHaveLength(4)
      expect(res?.dimensionsMm).toEqual({ x: 20, y: 20, z: 20 })
      expect(res?.totalBeads).toBeGreaterThan(0)
    })

    it('genera Model3DResult completo para modo interlocking (box)', () => {
      const grid = createSolidGrid(4, 4, redBead)
      const res = computeModel3D({ cols: 4, rows: 4, cells: grid }, {
        mode3d: 'interlocking',
        hollowLayersCount: 4,
        hollowWallThickness: 1,
        interlockingType: 'box',
        interlockingDepthBeads: 4,
        reliefLevels: 3,
        diameterMm: 5.0,
      })

      expect(res).not.toBeNull()
      expect(res?.mode).toBe('interlocking')
      expect(res?.plates).toHaveLength(6)
      expect(res?.dimensionsMm).toEqual({ x: 20, y: 20, z: 20 })
      expect(res?.totalBeads).toBeGreaterThan(0)
    })

    it('genera Model3DResult completo para modo relief', () => {
      const grid = createSolidGrid(4, 4, redBead)
      const res = computeModel3D({ cols: 4, rows: 4, cells: grid }, {
        mode3d: 'relief',
        hollowLayersCount: 4,
        hollowWallThickness: 1,
        interlockingType: 'box',
        interlockingDepthBeads: 4,
        reliefLevels: 3,
        diameterMm: 5.0,
      })

      expect(res).not.toBeNull()
      expect(res?.mode).toBe('relief')
      expect(res?.layers).toHaveLength(3)
      expect(res?.dimensionsMm).toEqual({ x: 20, y: 20, z: 15 })
    })
  })
})
