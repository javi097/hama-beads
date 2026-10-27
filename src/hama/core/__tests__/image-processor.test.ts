import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processImage } from '../image-processor'
import { HAMA_PALETTE } from '../palette.const'

describe('image-processor', () => {
  const originalImage = globalThis.Image

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.Image = originalImage
  })

  it('procesa una imagen y devuelve GridData con las dimensiones especificadas', async () => {
    const cols = 2
    const rows = 2

    // Mock de Image
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      width = 16
      height = 16
      crossOrigin = ''

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
    }
    // @ts-expect-error Mocking global Image
    globalThis.Image = MockImage

    // Mock de Canvas / Context
    const mockImageData = new Uint8ClampedArray([
      // (0,0) Rojo
      217, 4, 41, 255,
      // (1,0) Blanco
      255, 255, 255, 255,
      // (0,1) Negro
      17, 24, 39, 255,
      // (1,1) Transparente
      0, 0, 0, 50,
    ])

    const mockCtx = {
      imageSmoothingEnabled: true,
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: mockImageData,
        width: cols,
        height: rows,
      }),
    }

    // Mock OffscreenCanvas
    class MockOffscreenCanvas {
      width: number
      height: number
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
      }
      getContext = vi.fn().mockReturnValue(mockCtx)
    }

    // @ts-expect-error Mocking global OffscreenCanvas
    globalThis.OffscreenCanvas = MockOffscreenCanvas

    const result = await processImage(
      'data:image/png;base64,fake',
      cols,
      rows,
      HAMA_PALETTE,
      true
    )

    expect(result.cols).toBe(cols)
    expect(result.rows).toBe(rows)
    expect(result.cells.length).toBe(rows)
    expect(result.cells[0].length).toBe(cols)

    // La celda transparente debe ser null
    expect(result.cells[1][1]).toBeNull()
    // Las otras celdas deben tener color Hama asignado
    expect(result.cells[0][0]?.id).toBe('05') // Rojo
    expect(result.cells[1][0]?.id).toBe('18') // Negro
  })

  it('rechaza la promesa si la imagen falla al cargar', async () => {
    class FailingImage {
      onload: (() => void) | null = null
      onerror: ((err?: unknown) => void) | null = null
      src = ''
      constructor() {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Load error'))
        }, 10)
      }
    }
    // @ts-expect-error Mocking global Image
    globalThis.Image = FailingImage

    await expect(
      processImage('data:invalid', 2, 2, HAMA_PALETTE, true)
    ).rejects.toThrow('No se pudo cargar la imagen para procesar')
  })
})
