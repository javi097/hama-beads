import { describe, it, expect } from 'vitest'
import {
  calcBeadCount,
  calcLockedDimension,
  clampCm,
  calcBoardsLayout,
} from '../grid-calculator'

describe('grid-calculator', () => {
  it('calcula correctamente perlas para Midi 8 cm', () => {
    expect(calcBeadCount(8, 5.0)).toBe(16)
  })

  it('calcula correctamente perlas para Mini 4 cm (límite inf.)', () => {
    expect(calcBeadCount(4, 2.5)).toBe(16)
  })

  it('fuerza mínimo de 8 perlas para Maxi 4 cm', () => {
    expect(calcBeadCount(4, 10.0)).toBe(8)
  })

  it('fuerza mínimo de 8 perlas para Midi 1 cm', () => {
    expect(calcBeadCount(1, 5.0)).toBe(8)
  })

  it('fuerza máximo de 120 perlas para Midi 65 cm', () => {
    expect(calcBeadCount(65, 5.0)).toBe(120)
  })

  it('clampCm limita por debajo a 4 cm', () => {
    expect(clampCm(2)).toBe(4)
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
})
