import { describe, it, expect } from 'vitest'
import {
  calcBeadCount,
  calcLockedDimension,
  clampCm,
  getMinCm,
  calcBoardsLayout,
  calcAdaptiveDimensions,
} from '../grid-calculator'

describe('grid-calculator', () => {
  it('calcula correctamente perlas para Midi 8 cm', () => {
    expect(calcBeadCount(8, 5.0)).toBe(16)
  })

  it('calcula correctamente perlas para Mini 4 cm (límite inf.)', () => {
    expect(calcBeadCount(4, 2.5)).toBe(16)
  })

  it('fuerza mínimo de 12 perlas para Maxi 4 cm para evitar cuadrículas inviables', () => {
    expect(calcBeadCount(4, 10.0)).toBe(12)
  })

  it('fuerza mínimo de 12 perlas para Midi 1 cm', () => {
    expect(calcBeadCount(1, 5.0)).toBe(12)
  })

  it('fuerza máximo de 120 perlas para Midi 65 cm', () => {
    expect(calcBeadCount(65, 5.0)).toBe(120)
  })

  it('getMinCm calcula el límite inferior según diámetro (mínimo 12 cuentas o 4.0 cm)', () => {
    expect(getMinCm(5.0)).toBe(6.0) // 12 cuentas * 0.5 cm = 6.0 cm
    expect(getMinCm(2.5)).toBe(4.0) // 12 * 0.25 = 3.0 -> clamp min 4.0 cm
    expect(getMinCm(10.0)).toBe(12.0) // 12 * 1.0 = 12.0 cm
  })

  it('clampCm limita por debajo según el diámetro de perla (mínimo 12 cuentas)', () => {
    expect(clampCm(2, 5.0)).toBe(6.0)
    expect(clampCm(2, 2.5)).toBe(4.0)
    expect(clampCm(2, 10.0)).toBe(12.0)
    expect(clampCm(2)).toBe(6.0) // default Midi 5.0 mm
  })

  it('clampCm limita por arriba a 100 cm', () => {
    expect(clampCm(150)).toBe(100)
  })

  it('calcLockedDimension calcula la proporción con 1 decimal por defecto', () => {
    expect(calcLockedDimension(10, 0.5)).toBe(5.0)
    expect(calcLockedDimension(10, 0.333333)).toBe(3.3)
  })

  it('calcBoardsLayout calcula placas para cuadrícula que excede el tamaño de una placa', () => {
    expect(calcBoardsLayout(30, 29, 29)).toEqual({
      cols: 2,
      rows: 1,
      total: 2,
    })
  })

  it('calcBoardsLayout calcula placas cuando coincide exactamente con una placa', () => {
    expect(calcBoardsLayout(29, 29, 29)).toEqual({
      cols: 1,
      rows: 1,
      total: 1,
    })
  })

  it('calcAdaptiveDimensions adapta dimensiones cubriendo 1 placa estándar en la dimensión mayor', () => {
    // Vertical (Hollow Knight, portrait ratio 0.5 en Midi 5 mm): alto cubre 14.5 cm (29 cuentas)
    const portrait = calcAdaptiveDimensions(0.5, 5.0, 29)
    expect(portrait.heightCm).toBe(14.5)
    expect(portrait.widthCm).toBe(7.3)
    expect(portrait.aspectRatio).toBe(0.5)

    // Apaisada (ratio 2.0 en Midi 5 mm): ancho cubre 14.5 cm (29 cuentas)
    const landscape = calcAdaptiveDimensions(2.0, 5.0, 29)
    expect(landscape.widthCm).toBe(14.5)
    expect(landscape.heightCm).toBe(7.3)
    expect(landscape.aspectRatio).toBe(2.0)

    // Cuadrada (ratio 1.0 en Midi 5 mm)
    const square = calcAdaptiveDimensions(1.0, 5.0, 29)
    expect(square.widthCm).toBe(14.5)
    expect(square.heightCm).toBe(14.5)
    expect(square.aspectRatio).toBe(1.0)
  })
})
