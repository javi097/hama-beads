import type { BeadType, GridData } from '@/interfaces/hama.interface'

/**
 * Genera un archivo PNG de alta resolución con el patrón numerado, reglas en los ejes
 * y cabecera de metadatos, disparando la descarga directa en el navegador.
 */
export function exportPatternPng(
  gridData: GridData,
  beadType: BeadType,
  widthCm: number,
  heightCm: number
): void {
  if (typeof document === 'undefined') {
    return
  }

  const { cols, rows, cells } = gridData
  const cellSize = 32
  const rulerOffset = 36
  const headerHeight = 80
  const margin = 20

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(600, cols * cellSize + rulerOffset + margin * 2)
  canvas.height = rows * cellSize + rulerOffset + headerHeight + margin * 2

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D para exportar PNG')
  }

  // 1. Fondo blanco limpio (impresión y contraste universal)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Encabezado con metadatos del patrón
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`Patrón HamaStudio (${beadType.name})`, margin, margin)

  ctx.font = '14px sans-serif'
  ctx.fillStyle = '#475569'
  ctx.fillText(
    `Dimensiones: ${widthCm} cm x ${heightCm} cm | Cuadrícula: ${cols} x ${rows} cuentas`,
    margin,
    margin + 32
  )

  const startX = margin + rulerOffset
  const startY = headerHeight + rulerOffset

  // 3. Reglas numéricas superiores (columnas) y laterales (filas)
  ctx.fillStyle = '#334155'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let x = 0; x < cols; x++) {
    const cx = startX + x * cellSize + cellSize / 2
    const cy = headerHeight + rulerOffset / 2
    ctx.fillText(String(x + 1), cx, cy)
  }

  for (let y = 0; y < rows; y++) {
    const cx = margin + rulerOffset / 2
    const cy = startY + y * cellSize + cellSize / 2
    ctx.fillText(String(y + 1), cx, cy)
  }

  // 4. Dibujar celdas y cuentas con código oficial centrado
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = startX + x * cellSize
      const py = startY + y * cellSize
      const cell = cells[y]?.[x]

      // Borde de la celda
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.strokeRect(px, py, cellSize, cellSize)

      if (cell) {
        const cx = px + cellSize / 2
        const cy = py + cellSize / 2

        // Perla circular con borde
        ctx.fillStyle = cell.hex
        ctx.beginPath()
        ctx.arc(cx, cy, cellSize * 0.44, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#64748b'
        ctx.stroke()

        // Código oficial Hama con contraste adaptado por luminancia
        ctx.fillStyle = cell.luminance > 0.55 ? '#000000' : '#ffffff'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cell.id, cx, cy)
      }
    }
  }

  // 5. Descarga automática mediante enlace temporal
  const link = document.createElement('a')
  link.download = `Patron_Hama_${cols}x${rows}_${widthCm}cm.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
