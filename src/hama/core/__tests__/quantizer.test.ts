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

  it('contraste de siluetas y entintado: líneas de contorno y cavidades oscuras colapsan a #18 Negro', () => {
    // Sombra con leve tinte azulado (17, 24, 39)
    expect(findClosestColor(17, 24, 39, HAMA_PALETTE).id).toBe('18')
    // Sombras oscuras con RGB < 35
    expect(findClosestColor(20, 20, 20, HAMA_PALETTE).id).toBe('18')
    expect(findClosestColor(30, 30, 30, HAMA_PALETTE).id).toBe('18')
    // Sombra de cavidad oscura tipo Hollow Knight (40, 38, 36)
    expect(findClosestColor(40, 38, 36, HAMA_PALETTE).id).toBe('18')
    // Borde de contorno/entintado anti-aliasing con luminancia < 0.22 y sat < 20 (evita halos grises #62, #71, #77)
    expect(findClosestColor(45, 45, 45, HAMA_PALETTE).id).toBe('18')
    expect(findClosestColor(50, 50, 50, HAMA_PALETTE).id).toBe('18')
    expect(findClosestColor(55, 55, 55, HAMA_PALETTE).id).toBe('18')
  })

  it('restricción acromática: solo se aplica a grises si la saturación es prácticamente nula (sat < 8)', () => {
    // Gris neutro (60, 60, 60): lum >= 0.22 y sat = 0 < 8 -> Gris oscuro (#71)
    const gray60 = findClosestColor(60, 60, 60, HAMA_PALETTE)
    expect(gray60.id).toBe('71')

    // Gris neutro (70, 70, 70) -> Gris oscuro (#71)
    const gray70 = findClosestColor(70, 70, 70, HAMA_PALETTE)
    expect(gray70.id).toBe('71')

    // Gris medio (128, 128, 128) -> Gris (#17)
    const gray128 = findClosestColor(128, 128, 128, HAMA_PALETTE)
    expect(gray128.id).toBe('17')

    // Gris con variación casi nula (120, 120, 124, sat = 4 < 8) -> Gris (#17)
    const subtleGray = findClosestColor(120, 120, 124, HAMA_PALETTE)
    expect(subtleGray.id).toBe('17')
  })

  it('fidelidad cromática en baja saturación (sat >= 8): respeta tono dominante y nunca mapea a gris neutro', () => {
    // Tonos azulados y cianes desaturados (como capa o reflejos de Hollow Knight)
    const mutedBlue = findClosestColor(120, 130, 150, HAMA_PALETTE) // B > R + 10, sat = 30
    expect(mutedBlue.id).not.toBe('17')
    expect(mutedBlue.id).not.toBe('71')
    expect(mutedBlue.id).toBe('119') // Azul

    const pastelBlue = findClosestColor(160, 190, 215, HAMA_PALETTE) // sat = 55
    expect(pastelBlue.id).not.toBe('17')
    expect(pastelBlue.id).not.toBe('71')
    expect(pastelBlue.id).toBe('46') // Azul pastel

    const cyan = findClosestColor(120, 180, 200, HAMA_PALETTE) // sat = 80
    expect(cyan.id).not.toBe('17')
    expect(cyan.id).not.toBe('71')
    expect(cyan.id).toBe('49') // Celeste

    const darkBlueCloak = findClosestColor(90, 105, 130, HAMA_PALETTE) // B dominante
    expect(darkBlueCloak.id).not.toBe('17')
    expect(darkBlueCloak.id).not.toBe('71')
    expect(darkBlueCloak.id).toBe('08') // Cobalto
  })

  it('encuentra el color blanco puro (#01)', () => {
    const color = findClosestColor(255, 255, 255, HAMA_PALETTE)
    expect(color.id).toBe('01')
  })

  it('con paleta de un solo color devuelve siempre ese color', () => {
    const rojo = HAMA_PALETTE.find((c) => c.id === '05')! // #05 Rojo
    const singlePalette: HamaColor[] = [rojo]
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
