import { useHamaStore } from '@/hama/store/hama.store'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function ViewerToolbar({ className }: Props) {
  const zoom = useHamaStore((state) => state.zoom)
  const showGrid = useHamaStore((state) => state.showGrid)
  const showCodes = useHamaStore((state) => state.showCodes)
  const beadShape = useHamaStore((state) => state.beadShape)
  const removeBg = useHamaStore((state) => state.removeBg)

  const setZoom = useHamaStore((state) => state.setZoom)
  const setShowGrid = useHamaStore((state) => state.setShowGrid)
  const setShowCodes = useHamaStore((state) => state.setShowCodes)
  const setBeadShape = useHamaStore((state) => state.setBeadShape)
  const setRemoveBg = useHamaStore((state) => state.setRemoveBg)

  const handleZoomIn = () => {
    setZoom(zoom + 0.25)
  }

  const handleZoomOut = () => {
    setZoom(zoom - 0.25)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      {/* Controles de Zoom */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="px-1.5 font-bold hover:text-indigo-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          title="Reducir zoom"
        >
          −
        </button>
        <span className="px-2 font-mono text-[11px] font-semibold min-w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 3.0}
          className="px-1.5 font-bold hover:text-indigo-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          title="Aumentar zoom"
        >
          +
        </button>
      </div>

      {/* Toggle Cuadrícula */}
      <button
        type="button"
        onClick={() => setShowGrid(!showGrid)}
        className={cn(
          'px-2.5 py-1.5 rounded-lg font-medium border transition cursor-pointer',
          showGrid
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
        )}
      >
        # Cuadrícula
      </button>

      {/* Toggle Códigos */}
      <button
        type="button"
        onClick={() => setShowCodes(!showCodes)}
        className={cn(
          'px-2.5 py-1.5 rounded-lg font-medium border transition cursor-pointer',
          showCodes
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
        )}
      >
        🆔 Códigos
      </button>

      {/* Toggle Forma de Perla */}
      <button
        type="button"
        onClick={() => setBeadShape(beadShape === 'hollow' ? 'pixel' : 'hollow')}
        className="px-2.5 py-1.5 rounded-lg font-medium bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 transition cursor-pointer"
        title="Alternar apariencia de perla / píxel"
      >
        {beadShape === 'hollow' ? '⭕ Perla' : '⬛ Píxel'}
      </button>

      {/* Toggle Eliminación de Fondo (RF-6.2) */}
      <button
        type="button"
        onClick={() => setRemoveBg(!removeBg)}
        className={cn(
          'px-2.5 py-1.5 rounded-lg font-medium border transition cursor-pointer',
          removeBg
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
        )}
        title="Eliminar automáticamente el fondo claro exterior"
      >
        {removeBg ? '🪄 Fondo: Auto' : '🖼️ Fondo: Mantiene'}
      </button>
    </div>
  )
}
