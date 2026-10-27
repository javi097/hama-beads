import type { BeadCell, GridData, HamaColor } from '@/interfaces/hama.interface'
import { detectBackgroundColor, processPixel } from './quantizer'

/**
 * Procesa una imagen a partir de una URL o dataURL y genera la cuadrícula GridData
 * escalada a cols × rows con colores cuantizados a la paleta activa.
 */
export async function processImage(
  imageSrc: string,
  cols: number,
  rows: number,
  activePalette: HamaColor[],
  removeBg: boolean
): Promise<GridData> {
  if (cols <= 0 || rows <= 0) {
    throw new Error('Las dimensiones de la cuadrícula deben ser mayores a cero')
  }

  // 1. Cargar imagen de forma asíncrona
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = (err) =>
      reject(new Error(`No se pudo cargar la imagen para procesar: ${String(err)}`))
    image.src = imageSrc
  })

  // 2. Crear canvas offscreen para escalado pixel-perfect
  let canvas: OffscreenCanvas | HTMLCanvasElement
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(cols, rows)
  } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const el = document.createElement('canvas')
    el.width = cols
    el.height = rows
    canvas = el
  } else {
    throw new Error('El entorno no soporta Canvas ni OffscreenCanvas')
  }

  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null

  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas offscreen')
  }

  // Desactivar suavizado para preservar bordes nítidos de píxeles
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, cols, rows)

  const imgData = ctx.getImageData(0, 0, cols, rows).data

  // 3. Detectar color de fondo muestreando esquinas de la imagen escalada
  const bg = detectBackgroundColor(imgData, cols, rows)

  // 4. Mapear cada píxel a su color Hama correspondiente
  const cells: BeadCell[][] = []
  for (let y = 0; y < rows; y++) {
    const row: BeadCell[] = []
    for (let x = 0; x < cols; x++) {
      const idx = (y * cols + x) * 4
      const r = imgData[idx]
      const g = imgData[idx + 1]
      const b = imgData[idx + 2]
      const a = imgData[idx + 3]

      const cell = processPixel(r, g, b, a, bg, removeBg, activePalette)
      row.push(cell)
    }
    cells.push(row)
  }

  return {
    cols,
    rows,
    cells,
  }
}
