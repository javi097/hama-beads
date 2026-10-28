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
 * Determina si un color de la paleta es neutro / acromático (escala de grises: saturación <= 15).
 * Abarca Blanco, Negro, Grises y Plateado.
 */
export function isNeutralColor(color: HamaColor): boolean {
  const sat = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
  return sat <= 15
}

/**
 * Determina si un color es un gris neutro intermedio (#17, #71, #77, #62).
 * Excluye los extremos puros blanco (#01) y negro (#18).
 */
export function isNeutralGray(color: HamaColor): boolean {
  return isNeutralColor(color) && color.id !== '01' && color.id !== '18'
}

/**
 * Calcula el tono (Hue) en grados [0, 360) a partir de componentes RGB.
 * Devuelve -1 si el color es perfectamente acromático (saturación = 0).
 */
export function getHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return -1

  let h = 0
  if (max === r) {
    h = ((g - b) / d) % 6
  } else if (max === g) {
    h = (b - r) / d + 2
  } else {
    h = (r - g) / d + 4
  }
  h = Math.round(h * 60)
  if (h < 0) h += 360
  return h
}

/**
 * Calcula la menor diferencia angular entre dos tonos en grados [0, 180].
 */
export function hueDiff(h1: number, h2: number): number {
  if (h1 < 0 || h2 < 0) return 180
  const diff = Math.abs(h1 - h2)
  return Math.min(diff, 360 - diff)
}

/**
 * Encuentra el color más cercano en la paleta activa aplicando Redmean
 * con protecciones acromáticas para negros profundos y escala de grises.
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

  const maxVal = Math.max(r, g, b)
  const minVal = Math.min(r, g, b)
  const sat = maxVal - minVal
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // 2. Contraste de siluetas y entintado (Ojos y contornos negros):
  // Todo píxel de línea de contorno o cavidad oscura con luminancia < 0.22 y saturación baja (< 20)
  // debe colapsar limpiamente a #18 Negro (#000000), evitando halos grises (#62, #71, #77) en los bordes.
  // Incluye también sombras profundas (luminancia < 0.12 o RGB < 35 con sat < 25).
  const isContourOrDeepShadow =
    (luminance < 0.22 && sat < 20) ||
    (luminance < 0.12 && sat < 25) ||
    (r < 35 && g < 35 && b < 35 && sat < 25)

  if (isContourOrDeepShadow) {
    const black = palette.find((c) => c.id === '18')
    if (black) {
      return black
    }
  }

  // 1. Corrección del sesgo a grises en colores de baja saturación:
  // La restricción acromática (#18, #71, #17, #01) SOLO debe aplicarse si la saturación es prácticamente nula:
  // Math.max(r, g, b) - Math.min(r, g, b) < 8.
  let candidatePalette = palette
  if (sat < 8) {
    const neutralPalette = palette.filter(isNeutralColor)
    if (neutralPalette.length > 0) {
      candidatePalette = neutralPalette
    }
  }

  // Si sat >= 8 y existe un canal dominante o tendencia cromática,
  // se debe respetar el tono cromático evitando que se elijan grises neutros (#17, #71, #62, #77).
  const hasDominantChannel = sat >= 8
  const pixelHue = getHue(r, g, b)
  const hasChromaticBeads = candidatePalette.some((c) => !isNeutralColor(c))

  let minDistance = Infinity
  let closest = candidatePalette[0]

  for (let i = 0; i < candidatePalette.length; i++) {
    const color = candidatePalette[i]
    const colorIsNeutralGray = isNeutralGray(color)

    // Si el píxel tiene información cromática (sat >= 8) y existen perlas cromáticas en la paleta,
    // se descartan o penalizan fuertemente los grises neutros (#17, #71, #62, #77)
    if (hasDominantChannel && colorIsNeutralGray && hasChromaticBeads) {
      const penaltyDistance = redmeanDistance(r, g, b, color) + 500
      if (penaltyDistance < minDistance) {
        minDistance = penaltyDistance
        closest = color
      }
      continue
    }

    let distance = redmeanDistance(r, g, b, color)

    // 3. Ponderación perceptual del tono dominante (Hue):
    // Pondera con mayor peso la coherencia del tono para evitar que un color desaturado
    // prefiera un color de tono opuesto o un gris.
    if (pixelHue >= 0 && !isNeutralColor(color)) {
      const cHue = getHue(color.r, color.g, color.b)
      const hDiff = hueDiff(pixelHue, cHue) // [0, 180]
      distance += (hDiff / 180) * 120
    }

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
