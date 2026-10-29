import { useRef, useEffect } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES } from '@/hama/core/palette.const'
import { useCanvasRenderer } from '@/hama/hooks/useCanvasRenderer'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  darkMode?: boolean
}

export default function Grid2DCanvas({ className, darkMode = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const gridData = useHamaStore((state) => state.gridData)
  const zoom = useHamaStore((state) => state.zoom)
  const showGrid = useHamaStore((state) => state.showGrid)
  const showCodes = useHamaStore((state) => state.showCodes)
  const beadShape = useHamaStore((state) => state.beadShape)
  const highlightedColorId = useHamaStore((state) => state.highlightedColorId)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)

  const setZoom = useHamaStore((state) => state.setZoom)
  const setHighlightedColorId = useHamaStore((state) => state.setHighlightedColorId)

  const beadType = BEAD_TYPES[beadTypeId] || BEAD_TYPES.midi

  // Hook que redibuja el canvas con compensación DPR en cada actualización
  useCanvasRenderer(canvasRef, gridData, {
    zoom,
    showGrid,
    showCodes,
    beadShape,
    highlightedColorId,
    beadType,
    darkMode,
  })

  // Listener para zoom mediante Ctrl + rueda del ratón exclusivo de escritorio (RF-10.3)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Comprobar si el dispositivo es escritorio (sin pantalla táctil pura)
    const isDesktop = typeof navigator !== 'undefined' && navigator.maxTouchPoints === 0

    if (!isDesktop) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.25 : -0.25
        setZoom(zoom + delta)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [zoom, setZoom])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Contenedor desplazable con scroll nativo (RF-10.2) */}
      <div
        ref={containerRef}
        className="flex-1 p-4 flex items-center justify-center bg-slate-100/70 dark:bg-slate-950/60 min-h-[480px] overflow-auto select-none"
      >
        <div className="max-w-full overflow-auto p-2 rounded-xl bg-white dark:bg-slate-900 shadow-inner border border-slate-200 dark:border-slate-800">
          <canvas ref={canvasRef} className="block mx-auto" />
        </div>
      </div>

      {/* Pie informativo del visor (RF-11.3) */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Las líneas rojas indican el límite de placa estándar ({beadType.pegboardSize}×{beadType.pegboardSize} clavijas para {beadType.name}).
        </div>

        {highlightedColorId && (
          <button
            type="button"
            onClick={() => setHighlightedColorId(null)}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Mostrar todos los colores (Quitar filtro #{highlightedColorId})</span>
            <span className="font-bold">✕</span>
          </button>
        )}
      </div>
    </div>
  )
}
