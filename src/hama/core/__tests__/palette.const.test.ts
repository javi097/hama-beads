// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { HAMA_PALETTE, BEAD_TYPES } from '../palette.const'

describe('HAMA_PALETTE & BEAD_TYPES', () => {
  it('contiene exactamente los 30 colores oficiales Hama Midi', () => {
    expect(HAMA_PALETTE).toBeDefined()
    expect(HAMA_PALETTE.length).toBe(30)
  })

  it('cada color tiene r, g, b enteros y luminancia entre 0 y 1', () => {
    for (const color of HAMA_PALETTE) {
      expect(color.id).toMatch(/^\d{2}$/)
      expect(color.name).toBeTruthy()
      expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(color.r).toBeGreaterThanOrEqual(0)
      expect(color.r).toBeLessThanOrEqual(255)
      expect(color.g).toBeGreaterThanOrEqual(0)
      expect(color.g).toBeLessThanOrEqual(255)
      expect(color.b).toBeGreaterThanOrEqual(0)
      expect(color.b).toBeLessThanOrEqual(255)
      expect(color.luminance).toBeGreaterThanOrEqual(0)
      expect(color.luminance).toBeLessThanOrEqual(1)
    }
  })

  it('BEAD_TYPES contiene mini, midi y maxi con especificaciones correctas', () => {
    expect(BEAD_TYPES.mini).toEqual({
      id: 'mini',
      name: 'Hama Mini (2.5 mm)',
      diameterMm: 2.5,
      pegboardSize: 28,
    })
    expect(BEAD_TYPES.midi).toEqual({
      id: 'midi',
      name: 'Hama Midi (5.0 mm)',
      diameterMm: 5.0,
      pegboardSize: 29,
    })
    expect(BEAD_TYPES.maxi).toEqual({
      id: 'maxi',
      name: 'Hama Maxi (10.0 mm)',
      diameterMm: 10.0,
      pegboardSize: 15,
    })
  })
})
