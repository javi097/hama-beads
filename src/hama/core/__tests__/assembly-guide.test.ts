// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { deriveAssemblySteps } from '../assembly-guide'
import { generateHollowLayers, generateInterlockingPlates, generateReliefLayers } from '../voxelizer'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell } from '@/interfaces/hama.interface'
import type { Model3DResult } from '@/interfaces/hama-3d.interface'

const redBead = HAMA_PALETTE.find((c) => c.id === '05')!
const blackBead = HAMA_PALETTE.find((c) => c.id === '18')!

function createSolidGrid(cols: number, rows: number, bead = redBead): BeadCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => bead))
}

describe('assembly-guide — deriveAssemblySteps', () => {
  it('devuelve array vacío si el modelo no tiene capas ni placas', () => {
    const emptyHollow: Model3DResult = {
      mode: 'hollow',
      layers: [],
      totalBeads: 0,
      dimensionsMm: { x: 0, y: 0, z: 0 },
    }
    expect(deriveAssemblySteps(emptyHollow)).toEqual([])

    const emptyInterlocking: Model3DResult = {
      mode: 'interlocking',
      plates: [],
      totalBeads: 0,
      dimensionsMm: { x: 0, y: 0, z: 0 },
    }
    expect(deriveAssemblySteps(emptyInterlocking)).toEqual([])
  })

  it('descompone correctamente un modelo de Apilado Hueco en pasos secuenciales', () => {
    const grid = createSolidGrid(5, 5, redBead)
    const layers = generateHollowLayers(grid, 4, 1, 5.0)
    const totalBeads = layers.reduce((sum, l) => sum + l.beadCount, 0)

    const model: Model3DResult = {
      mode: 'hollow',
      layers,
      totalBeads,
      dimensionsMm: { x: 25, y: 25, z: 20 },
    }

    const steps = deriveAssemblySteps(model)

    expect(steps).toHaveLength(4)
    expect(steps[0].stepNumber).toBe(1)
    expect(steps[0].type).toBe('layer')
    expect(steps[0].title).toContain('Capa 1')
    expect(steps[0].instructions).toBeTruthy()

    // La suma de perlas de todos los pasos debe coincidir exactamente con el total del modelo
    const stepsTotalBeads = steps.reduce((sum, s) => sum + s.totalBeads, 0)
    expect(stepsTotalBeads).toBe(totalBeads)

    // Verifica que cada paso desglosa el inventario por color
    expect(steps[0].beadCounts[0].color.id).toBe('05')
    expect(steps[0].beadCounts[0].count).toBe(layers[0].beadCount)
  })

  it('descompone correctamente un modelo Interlocking de Caja 3D en 6 pasos (uno por placa)', () => {
    const grid = createSolidGrid(4, 4, redBead)
    const plates = generateInterlockingPlates(grid, 'box', 4, 5.0)
    const totalBeads = plates.reduce((sum, p) => {
      let count = 0
      for (const row of p.cells) {
        for (const cell of row) {
          if (cell !== null) count++
        }
      }
      return sum + count
    }, 0)

    const model: Model3DResult = {
      mode: 'interlocking',
      plates,
      totalBeads,
      dimensionsMm: { x: 20, y: 20, z: 20 },
    }

    const steps = deriveAssemblySteps(model)

    expect(steps).toHaveLength(6)
    expect(steps[0].type).toBe('plate')
    expect(steps[0].title).toContain('Frontal')
    expect(steps[1].title).toContain('Trasera')
    expect(steps[2].title).toContain('Izquierda')
    expect(steps[3].title).toContain('Derecha')
    expect(steps[4].title).toContain('Superior')
    expect(steps[5].title).toContain('Inferior')

    const stepsTotalBeads = steps.reduce((sum, s) => sum + s.totalBeads, 0)
    expect(stepsTotalBeads).toBe(totalBeads)
  })

  it('descompone correctamente un modelo Interlocking Lego (cross_ribs) en pasos por placa', () => {
    const grid = createSolidGrid(6, 6, redBead)
    const plates = generateInterlockingPlates(grid, 'cross_ribs', 4, 5.0)
    const totalBeads = plates.reduce((sum, p) => {
      let count = 0
      for (const row of p.cells) {
        for (const cell of row) {
          if (cell !== null) count++
        }
      }
      return sum + count
    }, 0)

    const model: Model3DResult = {
      mode: 'interlocking',
      plates,
      totalBeads,
      dimensionsMm: { x: 30, y: 30, z: 20 },
    }

    const steps = deriveAssemblySteps(model)

    expect(steps).toHaveLength(5)
    expect(steps[0].title).toContain('Capa 1')
    expect(steps[4].title).toContain('Columna Conectora Interna')

    const stepsTotalBeads = steps.reduce((sum, s) => sum + s.totalBeads, 0)
    expect(stepsTotalBeads).toBe(totalBeads)
  })

  it('descompone correctamente un modelo de Relieve por Luminancia', () => {
    const grid = createSolidGrid(4, 4, blackBead)
    const layers = generateReliefLayers(grid, 3, 5.0)
    const totalBeads = layers.reduce((sum, l) => sum + l.beadCount, 0)

    const model: Model3DResult = {
      mode: 'relief',
      layers,
      totalBeads,
      dimensionsMm: { x: 20, y: 20, z: 15 },
    }

    const steps = deriveAssemblySteps(model)

    expect(steps).toHaveLength(3)
    const stepsTotalBeads = steps.reduce((sum, s) => sum + s.totalBeads, 0)
    expect(stepsTotalBeads).toBe(totalBeads)
  })
})
