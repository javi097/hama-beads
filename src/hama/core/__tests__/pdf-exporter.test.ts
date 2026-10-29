// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildAssemblyManualPdf } from '../pdf-exporter'
import { computeModel3D } from '../voxelizer'
import { deriveAssemblySteps } from '../assembly-guide'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell, GridData } from '@/interfaces/hama.interface'
import type { PdfExportOptions } from '@/interfaces/hama-3d.interface'

const redBead = HAMA_PALETTE.find((c) => c.id === '05')!
const blackBead = HAMA_PALETTE.find((c) => c.id === '18')!

function createSolidGrid(cols: number, rows: number, bead = redBead): BeadCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => bead))
}

describe('pdf-exporter — buildAssemblyManualPdf', () => {
  it('genera un documento PDF con Portada (Página 1) + 1 página por cada paso', () => {
    const grid = createSolidGrid(4, 4, redBead)
    const gridData: GridData = { cols: 4, rows: 4, cells: grid }

    const model3D = computeModel3D(gridData, {
      mode3d: 'hollow',
      hollowLayersCount: 3,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 4,
      reliefLevels: 3,
      diameterMm: 5.0,
    })!

    const steps = deriveAssemblySteps(model3D)
    expect(steps).toHaveLength(3)

    const options: PdfExportOptions = {
      projectName: 'Proyecto Test Hollow',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '2.0 × 2.0 × 1.5 cm',
      model3D,
      steps,
      coverPreviewDataUrl: '',
    }

    const doc = buildAssemblyManualPdf(options)

    // Portada (1) + 3 pasos = 4 páginas en total
    expect(doc.getNumberOfPages()).toBe(4)
  })

  it('incrusta la captura real del modelo 3D en la portada si coverPreviewDataUrl está presente', () => {
    const grid = createSolidGrid(3, 3, redBead)
    const gridData: GridData = { cols: 3, rows: 3, cells: grid }

    const model3D = computeModel3D(gridData, {
      mode3d: 'hollow',
      hollowLayersCount: 3,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 3,
      reliefLevels: 3,
      diameterMm: 5.0,
    })!

    const steps = deriveAssemblySteps(model3D)
    const samplePngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const options: PdfExportOptions = {
      projectName: 'Proyecto con Captura 3D Real',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '1.5 × 1.5 × 1.5 cm',
      model3D,
      steps,
      coverPreviewDataUrl: samplePngDataUrl,
    }

    const doc = buildAssemblyManualPdf(options)
    expect(doc.getNumberOfPages()).toBe(4)
  })

  it('compone correctamente un manual para Ensamblado Interlocking (2 placas)', () => {
    const grid = createSolidGrid(4, 4, blackBead)
    const gridData: GridData = { cols: 4, rows: 4, cells: grid }

    const model3D = computeModel3D(gridData, {
      mode3d: 'interlocking',
      hollowLayersCount: 4,
      hollowWallThickness: 1,
      interlockingType: 'box',
      interlockingDepthBeads: 4,
      reliefLevels: 3,
      diameterMm: 5.0,
    })!

    const steps = deriveAssemblySteps(model3D)
    expect(steps).toHaveLength(2)

    const options: PdfExportOptions = {
      projectName: 'Caja Interlocking',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '2.0 × 2.0 × 2.0 cm',
      model3D,
      steps,
      coverPreviewDataUrl: '',
    }

    const doc = buildAssemblyManualPdf(options)

    // Portada (1) + 2 placas = 3 páginas en total
    expect(doc.getNumberOfPages()).toBe(3)
  })

  it('maneja pasos vacíos o modelos sin perlas generando al menos la portada sin fallos', () => {
    const emptyModel = {
      mode: 'hollow' as const,
      totalBeads: 0,
      dimensionsMm: { x: 0, y: 0, z: 0 },
    }

    const options: PdfExportOptions = {
      projectName: 'Modelo Vacio',
      beadTypeName: 'Hama Beads Midi (5.0 mm)',
      dimensionsCm: '0 × 0 × 0 cm',
      model3D: emptyModel,
      steps: [],
      coverPreviewDataUrl: '',
    }

    const doc = buildAssemblyManualPdf(options)
    expect(doc.getNumberOfPages()).toBe(1)
  })
})
