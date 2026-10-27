import { describe, it, expect, vi } from 'vitest'
import { calcCellSize, calcCanvasDimensions, renderGrid2D } from '../useCanvasRenderer'
import { BEAD_TYPES, HAMA_PALETTE } from '@/hama/core/palette.const'
import type { GridData } from '@/interfaces/hama.interface'

describe('useCanvasRenderer helper functions & drawing logic', () => {
  it('calcCellSize calcula el tamaño base y aplica el factor de zoom adecuadamente', () => {
    // Para 16x16: 560 / 16 = 35 -> clamped a 34. Zoom 1 -> 34
    expect(calcCellSize(16, 16, 1)).toBe(34)
    // Zoom 2x -> 68
    expect(calcCellSize(16, 16, 2)).toBe(68)
    // Zoom 0.5x -> 17
    expect(calcCellSize(16, 16, 0.5)).toBe(17)

    // Para cuadrícula grande 120x120: 560 / 120 = 4.66 -> clamped al mínimo 14
    expect(calcCellSize(120, 120, 1)).toBe(14)
  })

  it('calcCanvasDimensions suma el rulerOffset a las dimensiones en píxeles', () => {
    const dim = calcCanvasDimensions(10, 10, 20, 26)
    expect(dim.width).toBe(10 * 20 + 26)
    expect(dim.height).toBe(10 * 20 + 26)
  })

  it('renderGrid2D dibuja reglas, celdas y aplica opacidad reducida si hay highlight', () => {
    const mockCtx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: vi.fn().mockReturnValue(mockCtx),
    }

    const gridData: GridData = {
      cols: 2,
      rows: 2,
      cells: [
        [HAMA_PALETTE[0], HAMA_PALETTE[4]],
        [null, HAMA_PALETTE[0]],
      ],
    }

    renderGrid2D(
      mockCanvas as unknown as HTMLCanvasElement,
      gridData,
      {
        zoom: 1,
        showGrid: true,
        showCodes: true,
        beadShape: 'hollow',
        highlightedColorId: '05', // Resaltar Rojo (#05)
        beadType: BEAD_TYPES.midi,
        darkMode: true,
        dpr: 2, // HiDPI
      }
    )

    // Comprobar escalado por DPR
    expect(mockCtx.scale).toHaveBeenCalledWith(2, 2)
    // Comprobar que se llamó a save/restore para el manejo de alpha
    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
    // Comprobar dibujo de arcos (perlas y clavijas)
    expect(mockCtx.arc).toHaveBeenCalled()
  })
})
