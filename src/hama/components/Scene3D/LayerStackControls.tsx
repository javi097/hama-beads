import { useHamaStore } from '@/hama/store/hama.store'
import type { Model3DResult } from '@/interfaces/hama-3d.interface'
import { cn } from '@/lib/utils'

interface Props {
  model3D: Model3DResult | null
  className?: string
}

export default function LayerStackControls({ model3D, className }: Props) {
  const explodedGapMm = useHamaStore((state) => state.explodedGapMm)
  const setExplodedGapMm = useHamaStore((state) => state.setExplodedGapMm)

  const activeLayerIndex = useHamaStore((state) => state.activeLayerIndex)
  const setActiveLayerIndex = useHamaStore((state) => state.setActiveLayerIndex)

  const mode3d = useHamaStore((state) => state.mode3d)

  // Opciones de capas o placas según el modelo activo
  const items: { index: number; name: string }[] = []
  if (model3D) {
    if (model3D.layers) {
      model3D.layers.forEach((l) => {
        items.push({ index: l.layerIndex, name: l.name })
      })
    } else if (model3D.plates) {
      model3D.plates.forEach((p, idx) => {
        items.push({ index: idx + 1, name: p.name })
      })
    }
  }

  return (
    <div
      className={cn(
        'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-lg text-slate-800 dark:text-slate-100 space-y-3.5',
        className
      )}
    >
      {/* Control de Vista Explosionada */}
      <div>
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <span>💥 Vista Explosionada</span>
            {explodedGapMm > 0 && (
              <button
                type="button"
                onClick={() => setExplodedGapMm(0)}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                title="Volver a ensamblado compacto (0 mm)"
              >
                (Compactar)
              </button>
            )}
          </div>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
            {explodedGapMm} mm
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={explodedGapMm}
          onChange={(e) => setExplodedGapMm(Number(e.target.value))}
          className="mt-1.5 w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
        />

        <div className="flex justify-between text-[10px] text-slate-400">
          <span>0 mm (Ensamblado)</span>
          <span>50 mm (Despiece)</span>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-800" />

      {/* Selector de Capa / Placa Activa */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {mode3d === 'interlocking' ? 'Placa Activa' : 'Capa Activa'}
          </span>
          {activeLayerIndex !== null ? (
            <button
              type="button"
              onClick={() => setActiveLayerIndex(null)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 cursor-pointer transition-colors"
            >
              Aislamiento activo · Mostrar todo
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">
              Mostrando modelo completo
            </span>
          )}
        </div>

        <select
          value={activeLayerIndex === null ? 'all' : String(activeLayerIndex)}
          onChange={(e) => {
            const val = e.target.value
            setActiveLayerIndex(val === 'all' ? null : Number(val))
          }}
          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">
            ✨ {mode3d === 'interlocking' ? 'Todas las placas (Ensambladas)' : 'Todas las capas (Apiladas)'}
          </option>
          {items.map((item) => (
            <option key={item.index} value={String(item.index)}>
              🔍 {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
