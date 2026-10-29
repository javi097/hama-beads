// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeModel3D } from '../voxelizer'
import { deriveAssemblySteps } from '../assembly-guide'
import { buildAssemblyManualPdf } from '../pdf-exporter'
import { deriveColorInventory } from '../inventory'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell, GridData } from '@/interfaces/hama.interface'

const redBead = HAMA_PALETTE.find((c) => c.id === '05')!
const blueBead = HAMA_PALETTE.find((c) => c.id === '08')!

function createSolidGrid(cols: number, rows: number): BeadCell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, x) => (x % 2 === 0 ? redBead : blueBead))
  )
}

describe('Spec 002 — End-to-End 3D Studio Integration', () => {
  const grid = createSolidGrid(6, 6)
  const gridData: GridData = { cols: 6, rows: 6, cells: grid }
  const diameterMm = 5.0

  it('Modo 1: Flujo completo de Apilado Hueco -> Inventario 3D -> Pasos -> PDF', () => {
    // 1. Generar modelo 3D
    const model = computeModel3D(gridData, {
      mode3d: 'hollow',
      hollowLayersCount: 5,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 5,
      reliefLevels: 3,
      diameterMm,
    })!

    expect(model).not.toBeNull()
    expect(model.mode).toBe('hollow')
    expect(model.layers).toHaveLength(5)

    // 2. Sincronización de inventario 3D
    const allCells = model.layers!.flatMap((l) => l.cells)
    const inventory = deriveColorInventory(allCells)
    expect(inventory.total).toBe(model.totalBeads)
    expect(inventory.items.length).toBeGreaterThanOrEqual(2)

    // 3. Guía secuencial de pasos
    const steps = deriveAssemblySteps(model)
    expect(steps).toHaveLength(5)
    const totalStepBeads = steps.reduce((sum, s) => sum + s.totalBeads, 0)
    expect(totalStepBeads).toBe(model.totalBeads)

    // 4. Composición de manual PDF
    const pdf = buildAssemblyManualPdf({
      projectName: 'Test Hollow Integration',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '3.0 × 3.0 × 2.5 cm',
      model3D: model,
      steps,
      coverPreviewDataUrl: '',
    })

    expect(pdf.getNumberOfPages()).toBe(6) // 1 Portada + 5 Capas
  })

  it('Modo 1 con Cavidad Selectiva (ej. objetivo de cámara): flujo integral 3D -> BOM -> PDF', () => {
    // Cuadrícula 6x6 con centro 2x2 azul representando una cavidad selectiva
    const cameraGrid = createSolidGrid(6, 6)
    cameraGrid[2][2] = blueBead
    cameraGrid[2][3] = blueBead
    cameraGrid[3][2] = blueBead
    cameraGrid[3][3] = blueBead

    const cameraGridData: GridData = { cols: 6, rows: 6, cells: cameraGrid }

    const model = computeModel3D(cameraGridData, {
      mode3d: 'hollow',
      hollowLayersCount: 5,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 5,
      reliefLevels: 3,
      diameterMm,
      cavityColorIds: [blueBead.id],
    })!

    expect(model).not.toBeNull()
    expect(model.layers).toHaveLength(5)

    // En las capas intermedias, el azul está vaciado pero el cuerpo rojo sigue sólido
    const midLayer = model.layers![2]
    expect(midLayer.cells[2][2]).toBeNull()
    expect(midLayer.cells[0][0]).not.toBeNull()

    // Sincronización exacta con inventario BOM
    const allCells = model.layers!.flatMap((l) => l.cells)
    const inventory = deriveColorInventory(allCells)
    expect(inventory.total).toBe(model.totalBeads)

    const steps = deriveAssemblySteps(model)
    const totalStepBeads = steps.reduce((sum, s) => sum + s.totalBeads, 0)
    expect(totalStepBeads).toBe(model.totalBeads)

    const pdf = buildAssemblyManualPdf({
      projectName: 'Cámara con Objetivo Hueco',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '3.0 × 3.0 × 2.5 cm',
      model3D: model,
      steps,
      coverPreviewDataUrl: '',
    })

    expect(pdf.getNumberOfPages()).toBe(6)
  })

  it('Modo 2: Flujo completo de Ensamblado Interlocking (Box) -> Inventario 3D -> Pasos -> PDF', () => {
    const model = computeModel3D(gridData, {
      mode3d: 'interlocking',
      hollowLayersCount: 5,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 4,
      reliefLevels: 3,
      diameterMm,
    })!

    expect(model.plates).toHaveLength(2)

    const allCells = model.plates!.flatMap((p) => p.cells)
    const inventory = deriveColorInventory(allCells)
    expect(inventory.total).toBe(model.totalBeads)

    const steps = deriveAssemblySteps(model)
    expect(steps).toHaveLength(2)

    const pdf = buildAssemblyManualPdf({
      projectName: 'Test Box Integration',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '3.0 × 3.0 × 2.0 cm',
      model3D: model,
      steps,
      coverPreviewDataUrl: '',
    })

    expect(pdf.getNumberOfPages()).toBe(3) // 1 Portada + 2 Placas
  })

  it('Modo 3: Flujo completo de Relieve -> Inventario 3D -> Pasos -> PDF', () => {
    const model = computeModel3D(gridData, {
      mode3d: 'relief',
      hollowLayersCount: 5,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 4,
      reliefLevels: 4,
      diameterMm,
    })!

    expect(model.layers).toHaveLength(4)

    const allCells = model.layers!.flatMap((l) => l.cells)
    const inventory = deriveColorInventory(allCells)
    expect(inventory.total).toBe(model.totalBeads)

    const steps = deriveAssemblySteps(model)
    expect(steps).toHaveLength(4)

    const pdf = buildAssemblyManualPdf({
      projectName: 'Test Relief Integration',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '3.0 × 3.0 × 2.0 cm',
      model3D: model,
      steps,
      coverPreviewDataUrl: '',
    })

    expect(pdf.getNumberOfPages()).toBe(5) // 1 Portada + 4 Niveles
  })
})
