import { useEffect, type RefObject } from 'react'
import type { BeadType, GridData } from '@/interfaces/hama.interface'

export interface CanvasRendererOptions {
  zoom: number
  showGrid: boolean
  showCodes: boolean
  beadShape: 'hollow' | 'pixel'
  highlightedColorId: string | null
  beadType: BeadType
  darkMode: boolean
  dpr?: number
}

const RULER_OFFSET = 26

/**
 * Calcula el tamaño en píxeles de cada celda a partir de la resolución y el factor de zoom.
 */
export function calcCellSize(cols: number, rows: number, zoom: number): number {
  const maxDim = Math.max(1, cols, rows)
  const baseCellSize = Math.max(14, Math.min(34, Math.floor(560 / maxDim)))
  return Math.round(baseCellSize * zoom)
}

/**
 * Calcula las dimensiones lógicas en píxeles del canvas (área de dibujo + reglas).
 */
export function calcCanvasDimensions(
  cols: number,
  rows: number,
  cellSize: number,
  rulerOffset: number = RULER_OFFSET
): { width: number; height: number } {
  return {
    width: cols * cellSize + rulerOffset,
    height: rows * cellSize + rulerOffset,
  }
}

/**
 * Dibuja la cuadrícula 2D completa compensando Device Pixel Ratio (DPR) para nitidez.
 */
export function renderGrid2D(
  canvas: HTMLCanvasElement,
  gridData: GridData | null,
  options: CanvasRendererOptions
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (!gridData || gridData.cols <= 0 || gridData.rows <= 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    return
  }

  const { cols, rows, cells } = gridData
  const {
    zoom,
    showGrid,
    showCodes,
    beadShape,
    highlightedColorId,
    beadType,
    darkMode,
  } = options

  const dpr = options.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  const cellSize = calcCellSize(cols, rows, zoom)
  const rulerOffset = RULER_OFFSET
  const { width: displayWidth, height: displayHeight } = calcCanvasDimensions(
    cols,
    rows,
    cellSize,
    rulerOffset
  )

  // Ajustar tamaño físico para nitidez HiDPI / Retina (Principio 7 de la Constitución)
  canvas.width = Math.round(displayWidth * dpr)
  canvas.height = Math.round(displayHeight * dpr)
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, displayWidth, displayHeight)

  // 1. Fondo de reglas superior e izquierda
  ctx.fillStyle = darkMode ? '#1e293b' : '#e2e8f0'
  ctx.fillRect(0, 0, displayWidth, rulerOffset)
  ctx.fillRect(0, 0, rulerOffset, displayHeight)

  // 2. Numeración de coordenadas de reglas
  ctx.fillStyle = darkMode ? '#94a3b8' : '#475569'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let x = 0; x < cols; x++) {
    if (cellSize >= 16 || (x + 1) % 5 === 0 || x === 0) {
      ctx.fillText(String(x + 1), rulerOffset + x * cellSize + cellSize / 2, rulerOffset / 2)
    }
  }

  for (let y = 0; y < rows; y++) {
    if (cellSize >= 16 || (y + 1) % 5 === 0 || y === 0) {
      ctx.fillText(String(y + 1), rulerOffset / 2, rulerOffset + y * cellSize + cellSize / 2)
    }
  }

  // 3. Dibujar celdas, fondo ajedrezado, clavijas y perlas
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = rulerOffset + x * cellSize
      const py = rulerOffset + y * cellSize
      const color = cells[y]?.[x]

      // Fondo ajedrezado sutil
      ctx.fillStyle =
        (x + y) % 2 === 0
          ? darkMode
            ? '#0f172a'
            : '#f8fafc'
          : darkMode
            ? '#131c31'
            : '#f1f5f9'
      ctx.fillRect(px, py, cellSize, cellSize)

      // Clavija central de la placa base
      ctx.fillStyle = darkMode ? '#334155' : '#cbd5e1'
      ctx.beginPath()
      ctx.arc(
        px + cellSize / 2,
        py + cellSize / 2,
        Math.max(1.5, cellSize * 0.08),
        0,
        Math.PI * 2
      )
      ctx.fill()

      if (color) {
        const isDimmed = highlightedColorId !== null && highlightedColorId !== color.id
        ctx.save()

        // Atenuación de color según RF-11.1
        if (isDimmed) {
          ctx.globalAlpha = 0.18
        }

        const cx = px + cellSize / 2
        const cy = py + cellSize / 2

        if (beadShape === 'hollow') {
          // Perla cilíndrica: disco sólido si showCodes activo (el hueco solaparía el texto),
          // cilíndrica con hueco interior si showCodes está desactivado.
          const outerRadius = cellSize * 0.45

          ctx.beginPath()
          ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2)
          ctx.fillStyle = color.hex
          ctx.fill()

          ctx.lineWidth = Math.max(1, cellSize * 0.04)
          ctx.strokeStyle = 'rgba(0,0,0,0.28)'
          ctx.stroke()

          if (!showCodes) {
            // Hueco central oscuro (solo cuando no se muestran códigos)
            const innerRadius = cellSize * 0.18
            ctx.beginPath()
            ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
            ctx.fillStyle = darkMode ? '#0f172a' : '#e2e8f0'
            ctx.fill()
          }
        } else {
          // Cuadrado sólido (Modo Pixel Art)
          ctx.fillStyle = color.hex
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2)
        }

        // El texto del código se dibuja SIEMPRE al final (última capa) para que
        // nada lo solape. Color calculado exclusivamente por luminancia intrínseca
        // de la perla; nunca depende del tema (darkMode).
        if (showCodes) {
          ctx.fillStyle = color.luminance > 0.5 ? '#000000' : '#ffffff'
          ctx.font = `bold ${Math.max(8, Math.floor(cellSize * 0.45))}px monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(color.id, cx, cy)
        }

        ctx.restore()
      }
    }
  }

  // 4. Dibujar líneas de cuadrícula y divisiones de placas estándar
  if (showGrid) {
    const pegSize = beadType.pegboardSize

    // Líneas verticales
    for (let x = 0; x <= cols; x++) {
      const px = rulerOffset + x * cellSize
      const isPegBorder = x > 0 && x % pegSize === 0

      ctx.beginPath()
      ctx.moveTo(px, rulerOffset)
      ctx.lineTo(px, displayHeight)
      ctx.strokeStyle = isPegBorder
        ? '#ef4444'
        : darkMode
          ? 'rgba(148,163,184,0.22)'
          : 'rgba(71,85,105,0.22)'
      ctx.lineWidth = isPegBorder ? 2 : 1
      ctx.stroke()
    }

    // Líneas horizontales
    for (let y = 0; y <= rows; y++) {
      const py = rulerOffset + y * cellSize
      const isPegBorder = y > 0 && y % pegSize === 0

      ctx.beginPath()
      ctx.moveTo(rulerOffset, py)
      ctx.lineTo(displayWidth, py)
      ctx.strokeStyle = isPegBorder
        ? '#ef4444'
        : darkMode
          ? 'rgba(148,163,184,0.22)'
          : 'rgba(71,85,105,0.22)'
      ctx.lineWidth = isPegBorder ? 2 : 1
      ctx.stroke()
    }
  }

  ctx.restore()
}

/**
 * Hook para sincronizar el dibujo en el elemento canvas con los cambios de estado.
 */
export function useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  gridData: GridData | null,
  options: CanvasRendererOptions
): void {
  const {
    zoom,
    showGrid,
    showCodes,
    beadShape,
    highlightedColorId,
    beadType,
    darkMode,
    dpr,
  } = options

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderGrid2D(canvas, gridData, {
      zoom,
      showGrid,
      showCodes,
      beadShape,
      highlightedColorId,
      beadType,
      darkMode,
      dpr,
    })
  }, [
    canvasRef,
    gridData,
    zoom,
    showGrid,
    showCodes,
    beadShape,
    highlightedColorId,
    beadType,
    darkMode,
    dpr,
  ])
}
