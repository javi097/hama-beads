import type { BoardsLayout } from '@/interfaces/hama.interface'

/**
 * Convierte centímetros a número de perlas con clamp [8, 120].
 */
export function calcBeadCount(cm: number, diameterMm: number): number {
  const raw = Math.round(cm / (diameterMm / 10))
  return Math.min(120, Math.max(8, raw))
}

/**
 * Ajusta la segunda dimensión manteniendo la proporción de aspecto.
 */
export function calcLockedDimension(
  primaryCm: number,
  aspectRatio: number,
  decimalPlaces: number = 1
): number {
  const result = primaryCm * aspectRatio
  return parseFloat(result.toFixed(decimalPlaces))
}

/**
 * Limita una dimensión física al rango permitido [4, 100] cm.
 */
export function clampCm(cm: number): number {
  return Math.min(100, Math.max(4, cm))
}

/**
 * Calcula las placas necesarias para cubrir la cuadrícula completa.
 */
export function calcBoardsLayout(
  cols: number,
  rows: number,
  pegboardSize: number
): BoardsLayout {
  const safePegboardSize = Math.max(1, pegboardSize)
  const bCols = Math.ceil(cols / safePegboardSize)
  const bRows = Math.ceil(rows / safePegboardSize)
  return {
    cols: bCols,
    rows: bRows,
    total: bCols * bRows,
  }
}
