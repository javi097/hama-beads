import type { BeadCell, HamaColor } from '@/interfaces/hama.interface'

export interface RgbColor {
  r: number
  g: number
  b: number
}

/**
 * Calcula la distancia Redmean entre un píxel y un color de la paleta.
 * Distancia euclidiana RGB ponderada perceptualmente según luminancia.
 */
export function redmeanDistance(
  r1: number,
  g1: number,
  b1: number,
  color: HamaColor
): number {
  const rmean = (r1 + color.r) / 2
  const dr = r1 - color.r
  const dg = g1 - color.g
  const db = b1 - color.b
  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db
  )
}

/**
 * Encuentra el color más cercano en la paleta activa aplicando Redmean.
 */
export function findClosestColor(
  r: number,
  g: number,
  b: number,
  palette: HamaColor[]
): HamaColor {
  if (palette.length === 0) {
    throw new Error('La paleta activa no puede estar vacía')
  }

  let minDistance = Infinity
  let closest = palette[0]

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i]
    const distance = redmeanDistance(r, g, b, color)
    if (distance < minDistance) {
      minDistance = distance
      closest = color
    }
  }

  return closest
}

/**
 * Determina si un píxel de fondo debe descartarse según RF-6.3.
 * Solo activo si el fondo detectado es claro (R, G, B > 240) y distancia RGB <= 20.
 */
export function isBackgroundPixel(
  r: number,
  g: number,
  b: number,
  bgR: number,
  bgG: number,
  bgB: number
): boolean {
  if (bgR > 240 && bgG > 240 && bgB > 240) {
    const dr = r - bgR
    const dg = g - bgG
    const db = b - bgB
    const distance = Math.sqrt(dr * dr + dg * dg + db * db)
    return distance <= 20
  }
  return false
}

/**
 * Detecta el color predominante del fondo muestreando las 4 esquinas de la imagen.
 */
export function detectBackgroundColor(
  imageData: Uint8ClampedArray,
  cols: number,
  rows: number
): RgbColor {
  if (cols <= 0 || rows <= 0 || imageData.length < 4) {
    return { r: 255, g: 255, b: 255 }
  }

  const corners = [
    0, // Top-left (0, 0)
    (cols - 1) * 4, // Top-right (cols - 1, 0)
    (rows - 1) * cols * 4, // Bottom-left (0, rows - 1)
    ((rows - 1) * cols + (cols - 1)) * 4, // Bottom-right (cols - 1, rows - 1)
  ]

  let sumR = 0
  let sumG = 0
  let sumB = 0
  let validPoints = 0

  for (const idx of corners) {
    if (idx + 2 < imageData.length) {
      sumR += imageData[idx]
      sumG += imageData[idx + 1]
      sumB += imageData[idx + 2]
      validPoints++
    }
  }

  if (validPoints === 0) {
    return { r: 255, g: 255, b: 255 }
  }

  return {
    r: Math.round(sumR / validPoints),
    g: Math.round(sumG / validPoints),
    b: Math.round(sumB / validPoints),
  }
}

/**
 * Procesa un píxel individual y devuelve la celda correspondiente (color o null).
 */
export function processPixel(
  r: number,
  g: number,
  b: number,
  alpha: number,
  bg: RgbColor,
  removeBg: boolean,
  palette: HamaColor[]
): BeadCell {
  if (alpha < 120) {
    return null
  }

  if (removeBg && isBackgroundPixel(r, g, b, bg.r, bg.g, bg.b)) {
    return null
  }

  return findClosestColor(r, g, b, palette)
}
