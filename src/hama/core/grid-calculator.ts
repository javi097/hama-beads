import type { BoardsLayout } from '@/interfaces/hama.interface'

/**
 * Calcula el tamaño mínimo en cm para un diámetro de perla dado (mínimo 12 cuentas).
 * En Midi (5 mm) = 6.0 cm, en Mini (2.5 mm) = 4.0 cm, en Maxi (10 mm) = 12.0 cm.
 */
export function getMinCm(diameterMm: number): number {
  return Math.max(4.0, (12 * diameterMm) / 10)
}

/**
 * Convierte centímetros a número de perlas con clamp [12, 120].
 * Garantiza un mínimo de 12 perlas para evitar cuadrículas inviables (ej. 8x8) que deformen ilustraciones.
 */
export function calcBeadCount(cm: number, diameterMm: number): number {
  const raw = Math.round(cm / (diameterMm / 10))
  return Math.min(120, Math.max(12, raw))
}

/**
 * Ajusta la segunda dimensión manteniendo la proporción de aspecto.
 */
export function calcLockedDimension(
  primaryCm: number,
  ratio: number,
  decimalPlaces: number = 1
): number {
  const result = primaryCm * ratio
  return parseFloat(result.toFixed(decimalPlaces))
}

/**
 * Limita una dimensión física al rango permitido [minCm(diameterMm), 100] cm.
 */
export function clampCm(cm: number, diameterMm: number = 5.0): number {
  const minCm = getMinCm(diameterMm)
  return Math.min(100, Math.max(minCm, cm))
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

/**
 * Calcula dimensiones iniciales adaptativas (widthCm, heightCm) para que la dimensión mayor
 * cubra aproximadamente 1 placa estándar (~28-29 cuentas: 14.5 cm en Midi 5 mm, 7.0-7.5 cm en Mini),
 * y la dimensión menor se calcule proporcionalmente según aspectRatio (width / height).
 */
export function calcAdaptiveDimensions(
  aspectRatio: number,
  diameterMm: number = 5.0,
  pegboardSize: number = 29
): { widthCm: number; heightCm: number; aspectRatio: number } {
  const ratio = aspectRatio > 0 ? aspectRatio : 1

  // 1 placa estándar en cm según el tipo de perla
  const targetMajorCm = parseFloat(((pegboardSize * diameterMm) / 10).toFixed(1))

  let widthCm: number
  let heightCm: number

  if (ratio >= 1) {
    // Imagen apaisada o cuadrada: el ancho cubre 1 placa estándar
    widthCm = targetMajorCm
    heightCm = parseFloat((targetMajorCm / ratio).toFixed(1))
  } else {
    // Imagen vertical (portrait, ej. Hollow Knight): el alto cubre 1 placa estándar
    heightCm = targetMajorCm
    widthCm = parseFloat((targetMajorCm * ratio).toFixed(1))
  }

  // Clampear respetando el límite inferior por diámetro
  widthCm = clampCm(widthCm, diameterMm)
  heightCm = clampCm(heightCm, diameterMm)

  return { widthCm, heightCm, aspectRatio: ratio }
}
