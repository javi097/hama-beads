// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  identifyInteriorCells,
  generateHollowLayers,
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
})
