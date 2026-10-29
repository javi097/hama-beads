import { useHamaStore } from '@/hama/store/hama.store'
import type { Mode3DType } from '@/interfaces/hama-3d.interface'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

interface ModeOption {
  id: Mode3DType
  title: string
  subtitle: string
  badge: string
}

const MODES: ModeOption[] = [
  {
    id: 'hollow',
    title: 'Apilado Hueco',
    subtitle: 'Capas apiladas con núcleo vacío',
    badge: 'Ahorro',
  },
  {
    id: 'interlocking',
    title: 'Interlocking 90°',
    subtitle: 'Placas machihembradas sin adhesivo',
    badge: 'Cajas',
  },
  {
    id: 'relief',
    title: 'Relieve',
    subtitle: 'Escultura por luminancia acumulativa',
    badge: '3D Art',
  },
]

export default function Mode3DSelector({ className }: Props) {
  const mode3d = useHamaStore((state) => state.mode3d)
  const setMode3d = useHamaStore((state) => state.setMode3d)

  const hollowLayersCount = useHamaStore((state) => state.hollowLayersCount)
  const setHollowLayersCount = useHamaStore((state) => state.setHollowLayersCount)

  const hollowWallThickness = useHamaStore((state) => state.hollowWallThickness)
  const setHollowWallThickness = useHamaStore((state) => state.setHollowWallThickness)

  const interlockingType = useHamaStore((state) => state.interlockingType)
  const setInterlockingType = useHamaStore((state) => state.setInterlockingType)

  const interlockingDepthBeads = useHamaStore((state) => state.interlockingDepthBeads)
  const setInterlockingDepthBeads = useHamaStore((state) => state.setInterlockingDepthBeads)

  const reliefLevels = useHamaStore((state) => state.reliefLevels)
  const setReliefLevels = useHamaStore((state) => state.setReliefLevels)

  return (
    <div
      className={cn(
        'bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4',
        className
      )}
    >
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Modo de Ingeniería 3D
        </label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODES.map((m) => {
            const isSelected = mode3d === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode3d(m.id)}
                className={cn(
                  'relative p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{m.title}</span>
                    <span
                      className={cn(
                        'text-[9px] font-semibold px-1.5 py-0.5 rounded-md uppercase',
                        isSelected
                          ? 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {m.subtitle}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Parámetros específicos para Apilado Hueco */}
      {mode3d === 'hollow' && (
        <div className="p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Capas de apilado (Grosor Z)
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {hollowLayersCount} capas
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={hollowLayersCount}
              onChange={(e) => setHollowLayersCount(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>3 capas (Mínimo)</span>
              <span>30 capas (Máximo)</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pared exterior perimetral
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHollowWallThickness(1)}
                className={cn(
                  'py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-colors',
                  hollowWallThickness === 1
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                1 Perla (Máx. Ahorro)
              </button>
              <button
                type="button"
                onClick={() => setHollowWallThickness(2)}
                className={cn(
                  'py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-colors',
                  hollowWallThickness === 2
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                2 Perlas (Reforzado)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parámetros específicos para Ensamblado Interlocking */}
      {mode3d === 'interlocking' && (
        <div className="p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Estructura Machihembrada
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInterlockingType('box')}
                className={cn(
                  'py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-colors',
                  interlockingType === 'box'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                Estructura Cruzada (2 placas)
              </button>
              <button
                type="button"
                onClick={() => setInterlockingType('cross_ribs')}
                className={cn(
                  'py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-colors',
                  interlockingType === 'cross_ribs'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                Costillas Soporte
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Profundidad de placas (Fondo Z)
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {interlockingDepthBeads} perlas
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={interlockingDepthBeads}
              onChange={(e) => setInterlockingDepthBeads(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>3 perlas (Mín.)</span>
              <span>30 perlas (Máx.)</span>
            </div>
          </div>
        </div>
      )}

      {/* Parámetros específicos para Relieve por Luminancia */}
      {mode3d === 'relief' && (
        <div className="p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Niveles de elevación (Altura acumulativa)
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {reliefLevels} niveles
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={reliefLevels}
              onChange={(e) => setReliefLevels(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>2 niveles (Sutil)</span>
              <span>6 niveles (Alto contraste)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            💡 Las zonas brillantes se elevan a mayor altura. Las capas inferiores se
            rellenan de forma sólida para asegurar estabilidad estructural.
          </p>
        </div>
      )}
    </div>
  )
}
