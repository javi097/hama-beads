import { describe, it, expect } from 'vitest'
import {
  findClosestColor,
  isBackgroundPixel,
  processPixel,
  detectBackgroundColor,
} from '../quantizer'
import { HAMA_PALETTE } from '../palette.const'
import type { HamaColor } from '@/interfaces/hama.interface'

describe('quantizer', () => {
  it('encuentra el color negro puro (#18)', () => {
    const color = findClosestColor(0, 0, 0, HAMA_PALETTE)
    expect(color.id).toBe('18')
  })

  it('encuentra el color blanco puro (#01)', () => {
    const color = findClosestColor(255, 255, 255, HAMA_PALETTE)
    expect(color.id).toBe('01')
  })

  it('con paleta de un solo color devuelve siempre ese color', () => {
    const singlePalette: HamaColor[] = [HAMA_PALETTE[4]] // #05 Rojo
    const color = findClosestColor(0, 0, 255, singlePalette)
    expect(color.id).toBe('05')
  })

  it('processPixel descarta píxeles con alpha < 120 (retorna null)', () => {
    const bg = { r: 255, g: 255, b: 255 }
    const cell = processPixel(255, 0, 0, 100, bg, true, HAMA_PALETTE)
    expect(cell).toBeNull()
  })

  it('processPixel con removeBg=false mapea fondo blanco a perla Hama', () => {
    const bg = { r: 255, g: 255, b: 255 }
    const cell = processPixel(255, 255, 255, 255, bg, false, HAMA_PALETTE)
    expect(cell).not.toBeNull()
    expect(cell?.id).toBe('01')
  })

  it('isBackgroundPixel identifica fondo blanco dentro del umbral de 20', () => {
    expect(isBackgroundPixel(252, 252, 252, 255, 255, 255)).toBe(true)
  })

  it('isBackgroundPixel no descarta colores fuera del umbral como Crema (#F3E5AB)', () => {
    expect(isBackgroundPixel(220, 190, 171, 255, 255, 255)).toBe(false)
  })

  it('isBackgroundPixel no se activa si el fondo no es claro (<= 240)', () => {
    expect(isBackgroundPixel(50, 50, 50, 50, 50, 50)).toBe(false)
  })

  it('detectBackgroundColor promedia correctamente las cuatro esquinas', () => {
    // 2x2 pixels = 4 pixels, cada uno es una esquina:
    // (0,0)=blanco, (1,0)=blanco, (0,1)=blanco, (1,1)=blanco
    const data = new Uint8ClampedArray([
      255, 255, 255, 255, // (0,0)
      253, 253, 253, 255, // (1,0)
      251, 251, 251, 255, // (0,1)
      249, 249, 249, 255, // (1,1)
    ])
    const bg = detectBackgroundColor(data, 2, 2)
    expect(bg.r).toBe(252)
    expect(bg.g).toBe(252)
    expect(bg.b).toBe(252)
  })
})
