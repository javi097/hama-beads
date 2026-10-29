import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES } from '@/hama/core/palette.const'
import { calcBeadCount, getMinCm } from '@/hama/core/grid-calculator'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function DimensionInputs({ className }: Props) {
  const widthCm = useHamaStore((state) => state.widthCm)
  const heightCm = useHamaStore((state) => state.heightCm)
  const lockAspect = useHamaStore((state) => state.lockAspect)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)

  const setWidthCm = useHamaStore((state) => state.setWidthCm)
  const setHeightCm = useHamaStore((state) => state.setHeightCm)
  const setLockAspect = useHamaStore((state) => state.setLockAspect)

  const beadSpec = BEAD_TYPES[beadTypeId] || BEAD_TYPES.midi
  const cols = calcBeadCount(widthCm, beadSpec.diameterMm)
  const rows = calcBeadCount(heightCm, beadSpec.diameterMm)
  const minCm = getMinCm(beadSpec.diameterMm)
  const isLowResolution = cols < 16 || rows < 16

  return (
    <div
      className={cn(
        'bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {/* Ancho */}
        <div>
          <label
            htmlFor="dimension-width"
            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Ancho (cm)
          </label>
          <input
            id="dimension-width"
            type="number"
            step="0.5"
            min={minCm}
            max="100"
            value={widthCm}
            onChange={(e) => setWidthCm(Number(e.target.value))}
            className="mt-1 w-20 px-2.5 py-1.5 text-sm font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Botón Candado Proporción */}
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => setLockAspect(!lockAspect)}
            className={cn(
              'mt-5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer',
              lockAspect
                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30 dark:bg-indigo-950/40'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-transparent hover:text-slate-900 dark:hover:text-white'
            )}
            title={lockAspect ? 'Proporción bloqueada (proporcional)' : 'Proporción libre (desbloqueada)'}
          >
            {lockAspect ? '🔒 Proporción' : '🔓 Libre'}
          </button>
        </div>

        {/* Alto */}
        <div>
          <label
            htmlFor="dimension-height"
            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Alto (cm)
          </label>
          <input
            id="dimension-height"
            type="number"
            step="0.5"
            min={minCm}
            max="100"
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            className="mt-1 w-20 px-2.5 py-1.5 text-sm font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Resumen de resolución calculada */}
      <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-800">
        <span className="block text-[11px] text-slate-400 font-medium">Cuadrícula calculada</span>
        <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
          {cols} × {rows} <span className="text-xs font-normal">cuentas</span>
        </span>
        <span className="block text-[10px] text-slate-500">
          ({widthCm} cm × {heightCm} cm)
        </span>
      </div>

      {/* Alerta de baja resolución (menos de 16 perlas en algún eje) */}
      {isLowResolution && (
        <div className="w-full mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          <span>⚠️ Resolución baja: detalles pequeños pueden simplificarse</span>
        </div>
      )}
    </div>
  )
}
