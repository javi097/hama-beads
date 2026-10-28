// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { HAMA_PALETTE, BEAD_TYPES } from '../palette.const'

describe('HAMA_PALETTE & BEAD_TYPES', () => {
  it('contiene colores Hama oficiales (al menos 1, sin IDs duplicados)', () => {
    expect(HAMA_PALETTE).toBeDefined()
    expect(HAMA_PALETTE.length).toBeGreaterThan(0)

    // Sin IDs duplicados
    const ids = HAMA_PALETTE.map((c) => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('cada color tiene formato HEX válido (#RRGGBB), RGB íntegro y luminancia en [0, 1]', () => {
    for (const color of HAMA_PALETTE) {
      // id: solo dígitos, al menos 2 caracteres
      expect(color.id).toMatch(/^\d{2,}$/)

      expect(color.name).toBeTruthy()

      // HEX exactamente #RRGGBB (6 dígitos hexadecimales)
      expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)

      // r, g, b son enteros en [0, 255] y coinciden con la tupla rgb
      expect(color.rgb).toEqual([color.r, color.g, color.b])
      for (const channel of [color.r, color.g, color.b]) {
        expect(Number.isInteger(channel)).toBe(true)
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }

      // Luminancia perceptual ∈ [0, 1]
      expect(color.luminance).toBeGreaterThanOrEqual(0)
      expect(color.luminance).toBeLessThanOrEqual(1)
    }
  })

  it('colores ancla negro (#18) y blanco (#01) tienen valores exactos normalizados', () => {
    const negro = HAMA_PALETTE.find((c) => c.id === '18')!
    expect(negro).toBeDefined()
    expect(negro.hex).toBe('#000000')
    expect(negro.rgb).toEqual([0, 0, 0])
    expect(negro.r).toBe(0)
    expect(negro.g).toBe(0)
    expect(negro.b).toBe(0)
    expect(negro.luminance).toBe(0)

    const blanco = HAMA_PALETTE.find((c) => c.id === '01')!
    expect(blanco).toBeDefined()
    expect(blanco.hex).toBe('#ffffff')
    expect(blanco.rgb).toEqual([255, 255, 255])
    expect(blanco.r).toBe(255)
    expect(blanco.g).toBe(255)
    expect(blanco.b).toBe(255)
    expect(blanco.luminance).toBe(1)
  })

  it('el rgb de cada color es consistente con su hex', () => {
    for (const color of HAMA_PALETTE) {
      const n = parseInt(color.hex.slice(1), 16)
      expect(color.r).toBe((n >> 16) & 0xff)
      expect(color.g).toBe((n >> 8) & 0xff)
      expect(color.b).toBe(n & 0xff)
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
