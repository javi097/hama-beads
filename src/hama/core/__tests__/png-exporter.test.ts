import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportPatternPng } from '../png-exporter'
import { BEAD_TYPES, HAMA_PALETTE } from '../palette.const'
import type { GridData } from '@/interfaces/hama.interface'

describe('png-exporter', () => {
  const originalDocument = globalThis.document

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.document = originalDocument
  })

  it('crea el canvas con fondo blanco, dibuja encabezado, celdas y dispara la descarga', () => {
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockpng'),
    }

    const mockAnchor = {
      download: '',
      href: '',
      click: vi.fn(),
    }

    // @ts-expect-error Mocking document
    globalThis.document = {
      createElement: vi.fn().mockImplementation((tagName: string) => {
        if (tagName === 'canvas') return mockCanvas
        if (tagName === 'a') return mockAnchor
        return {}
      }),
    }

    const gridData: GridData = {
      cols: 2,
      rows: 2,
      cells: [
        [HAMA_PALETTE[0], null],
        [HAMA_PALETTE[13], HAMA_PALETTE[4]],
      ],
    }

    exportPatternPng(gridData, BEAD_TYPES.midi, 8, 8)

    // Comprobar nombre de descarga
    expect(mockAnchor.download).toBe('Patron_Hama_2x2_8cm.png')
    expect(mockAnchor.href).toBe('data:image/png;base64,mockpng')
    expect(mockAnchor.click).toHaveBeenCalled()

    // Comprobar fondo blanco
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height)

    // Comprobar dibujo de perlas
    expect(mockCtx.arc).toHaveBeenCalledTimes(3) // 3 celdas no nulas
  })
})
