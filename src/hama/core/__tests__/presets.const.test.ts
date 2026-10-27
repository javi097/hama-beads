import { describe, it, expect } from 'vitest'
import {
  isSupportedImageType,
  createPresetDataUrl,
} from '../presets.const'

describe('presets.const & image validation', () => {
  it('valida formatos permitidos (PNG, JPEG, WEBP, SVG)', () => {
    expect(isSupportedImageType('image/png')).toBe(true)
    expect(isSupportedImageType('image/jpeg')).toBe(true)
    expect(isSupportedImageType('image/webp')).toBe(true)
    expect(isSupportedImageType('image/svg+xml')).toBe(true)
    expect(isSupportedImageType('', 'foto.PNG')).toBe(true)
    expect(isSupportedImageType('', 'figura.webp')).toBe(true)
  })

  it('rechaza formatos no soportados como texto, PDF o ejecutables', () => {
    expect(isSupportedImageType('text/plain')).toBe(false)
    expect(isSupportedImageType('application/pdf')).toBe(false)
    expect(isSupportedImageType('', 'archivo.txt')).toBe(false)
    expect(isSupportedImageType('', 'documento.exe')).toBe(false)
  })

  it('genera DataURL válido para cada preset (mushroom, heart, duck)', () => {
    const mushroomUrl = createPresetDataUrl('mushroom')
    expect(mushroomUrl).toMatch(/^data:image\//)

    const heartUrl = createPresetDataUrl('heart')
    expect(heartUrl).toMatch(/^data:image\//)

    const duckUrl = createPresetDataUrl('duck')
    expect(duckUrl).toMatch(/^data:image\//)
  })
})
