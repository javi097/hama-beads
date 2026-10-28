import { useMemo } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { deriveColorInventory } from '@/hama/core/inventory'
import { cn } from '@/lib/utils'

import type { BeadCell } from '@/interfaces/hama.interface'

interface Props {
  className?: string
  cells?: BeadCell[][]
  title?: string
  subtitle?: string
}

export default function ColorInventoryTable({
  className,
  cells: cellsProp,
  title = '1. Lista de Materiales y Colores Hama',
  subtitle = 'Haz clic en un color para resaltarlo en el visor',
}: Props) {
  const storeCells = useHamaStore((state) => state.gridData?.cells)
  const highlightedColorId = useHamaStore((state) => state.highlightedColorId)
  const setHighlightedColorId = useHamaStore((state) => state.setHighlightedColorId)

  const { items, total } = useMemo(() => {
    const activeCells = cellsProp ?? storeCells ?? []
    return deriveColorInventory(activeCells)
  }, [cellsProp, storeCells])

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Cabecera del inventario */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Total de cuentas</span>
          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
            {total.toLocaleString()} uds.
          </span>
        </div>
      </div>

      {/* Lista de colores ordenados de mayor a menor */}
      {items.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No hay cuentas en la cuadrícula actual o la imagen es transparente.
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
          {items.map(({ color, count }) => {
            const isSelected = highlightedColorId === color.id

            return (
              <div
                key={color.id}
                role="button"
                tabIndex={0}
                onClick={() => setHighlightedColorId(color.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setHighlightedColorId(color.id)
                  }
                }}
                className={cn(
                  'px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer transition select-none',
                  isSelected
                    ? 'bg-indigo-500/15 dark:bg-indigo-500/20 font-semibold border-l-4 border-indigo-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Muestra circular con código Hama centrado */}
                  <span
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm shrink-0 flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: color.hex,
                      color: color.luminance > 0.55 ? '#0f172a' : '#ffffff',
                    }}
                  >
                    {color.id}
                  </span>

                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      #{color.id} - {color.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      HEX: {color.hex}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full font-extrabold text-xs border transition',
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    )}
                  >
                    {count} {count === 1 ? 'cuenta' : 'cuentas'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
