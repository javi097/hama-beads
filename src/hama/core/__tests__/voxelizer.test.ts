// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
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

  describe('generateHollowLayers', () => {
    it('limita el número de capas al rango [3, 30]', () => {
      const grid = createSolidGrid(5, 5)
      const layersLow = generateHollowLayers(grid, 1, 1, 5.0)
      expect(layersLow).toHaveLength(3)

      const layersHigh = generateHollowLayers(grid, 50, 1, 5.0)
      expect(layersHigh).toHaveLength(30)
    })

    it('la capa 1 (base) y la última capa (tapa) son 100% sólidas', () => {
      const grid = createSolidGrid(5, 5, blackBead)
      const totalLayers = 5
      const layers = generateHollowLayers(grid, totalLayers, 1, 5.0)

      expect(layers).toHaveLength(5)

      // Capa base
      expect(layers[0].layerIndex).toBe(1)
      expect(layers[0].name).toContain('Base')
      expect(layers[0].beadCount).toBe(25)
      expect(layers[0].cells).toEqual(grid)

      // Capa tapa
      expect(layers[4].layerIndex).toBe(5)
      expect(layers[4].name).toContain('Tapa')
      expect(layers[4].beadCount).toBe(25)
      expect(layers[4].cells).toEqual(grid)
    })

    it('las capas intermedias tienen el interior vaciado (null) y reducen el inventario', () => {
      const grid = createSolidGrid(5, 5, redBead)
      const totalLayers = 4
      const layers = generateHollowLayers(grid, totalLayers, 1, 5.0)

      // Capas intermedias: índice 1 y 2 (capas 2 y 3)
      for (let i = 1; i <= 2; i++) {
        const layer = layers[i]
        expect(layer.name).toContain('Hueca')
        // 25 - 9 interiores = 16 perlas perimetrales
        expect(layer.beadCount).toBe(16)
        expect(layer.cells[2][2]).toBeNull()
        expect(layer.cells[1][1]).toBeNull()
        // Perímetro exterior intacto
        expect(layer.cells[0][0]).toEqual(redBead)
        expect(layer.cells[0][4]).toEqual(redBead)
        expect(layer.cells[4][0]).toEqual(redBead)
        expect(layer.cells[4][4]).toEqual(redBead)
      }
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
      it('genera exactamente 6 placas con IDs y orientaciones correctas', () => {
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
        expect(left.widthBeads).toBe(4)
        expect(left.heightBeads).toBe(5)
        expect(top.widthBeads).toBe(5)
        expect(top.heightBeads).toBe(4)
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

      it('las pestañas y ranuras coinciden perfectamente sin colisión en aristas a 90° (Front vs Left)', () => {
        const grid = createSolidGrid(5, 5, redBead)
        const depth = 4
        const plates = generateInterlockingPlates(grid, 'box', depth, 5.0)

        const front = plates.find((p) => p.id === 'front')!
        const left = plates.find((p) => p.id === 'left')!

        // Arista vertical de unión: Front col 0 vs Left col (depth - 1)
        for (let y = 0; y < 5; y++) {
          const frontHasBead = front.cells[y][0] !== null
          const leftHasBead = left.cells[y][depth - 1] !== null

          // Exactamente una debe tener perla (diente) y la otra debe ser hueco (ranura)
          expect(frontHasBead).not.toBe(leftHasBead)
        }
      })

      it('las pestañas y ranuras coinciden perfectamente sin colisión en aristas a 90° (Front vs Top)', () => {
        const grid = createSolidGrid(5, 5, redBead)
        const depth = 4
        const plates = generateInterlockingPlates(grid, 'box', depth, 5.0)

        const front = plates.find((p) => p.id === 'front')!
        const top = plates.find((p) => p.id === 'top')!

        // Arista horizontal de unión: Front fila 0 vs Top fila (depth - 1)
        for (let x = 0; x < 5; x++) {
          const frontHasBead = front.cells[0][x] !== null
          const topHasBead = top.cells[depth - 1][x] !== null

          expect(frontHasBead).not.toBe(topHasBead)
        }
      })

      it('las aristas laterales y de tapa/base (Left vs Top) encajan sin colisiones', () => {
        const grid = createSolidGrid(5, 5, redBead)
        const depth = 4
        const plates = generateInterlockingPlates(grid, 'box', depth, 5.0)

        const left = plates.find((p) => p.id === 'left')!
        const top = plates.find((p) => p.id === 'top')!

        // Arista de profundidad: Left fila 0 vs Top col 0
        for (let z = 0; z < depth; z++) {
          const leftHasBead = left.cells[0][z] !== null
          const topHasBead = top.cells[z][0] !== null

          // Nunca colisionan en la arista compartida
          expect(leftHasBead && topHasBead).toBe(false)
        }

        // En los dientes interiores se alternan perfectamente
        for (let z = 1; z < depth - 1; z++) {
          const leftHasBead = left.cells[0][z] !== null
          const topHasBead = top.cells[z][0] !== null
          expect(leftHasBead).not.toBe(topHasBead)
        }
      })
    })

    describe('Figura con costillas ortogonales (structureType === "cross_ribs")', () => {
      it('genera la placa central y al menos dos costillas transversales', () => {
        const grid = createSolidGrid(7, 6, blackBead)
        const plates = generateInterlockingPlates(grid, 'cross_ribs', 5, 5.0)

        expect(plates).toHaveLength(3)
        const [main, rib1, rib2] = plates

        expect(main.id).toBe('main')
        expect(main.orientation).toBe('xy')
        expect(main.widthBeads).toBe(7)
        expect(main.heightBeads).toBe(6)

        expect(rib1.id).toBe('rib_1')
        expect(rib1.orientation).toBe('yz')
        expect(rib1.widthBeads).toBe(5)
        expect(rib1.heightBeads).toBe(6)

        expect(rib2.id).toBe('rib_2')
        expect(rib2.orientation).toBe('yz')
        expect(rib2.widthBeads).toBe(5)
        expect(rib2.heightBeads).toBe(6)
      })

      it('las ranuras de inserción en la figura y en las costillas encajan a media altura sin colisión', () => {
        const grid = createSolidGrid(7, 6, redBead)
        const depth = 5
        const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

        const main = plates.find((p) => p.id === 'main')!
        const rib1 = plates.find((p) => p.id === 'rib_1')!
        const zSlot = Math.floor(depth / 2)
        const rib1X = Math.max(1, Math.floor(7 / 3))

        // A lo largo de la columna rib1X:
        // En la mitad superior (y < 3): main tiene perla, rib1 tiene hueco (null)
        // En la mitad inferior (y >= 3): main tiene hueco (null), rib1 tiene perla
        for (let y = 0; y < 6; y++) {
          const mainHasBead = main.cells[y][rib1X] !== null
          const ribHasBead = rib1.cells[y][zSlot] !== null

          // Nunca colisionan en la línea de inserción
          expect(mainHasBead && ribHasBead).toBe(false)
          // Y al menos una tiene material (ensamblado continuo)
          expect(mainHasBead || ribHasBead).toBe(true)
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
