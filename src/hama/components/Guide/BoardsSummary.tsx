import { useMemo } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES } from '@/hama/core/palette.const'
import { calcBoardsLayout } from '@/hama/core/grid-calculator'
import { deriveColorInventory } from '@/hama/core/inventory'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function BoardsSummary({ className }: Props) {
  const widthCm = useHamaStore((state) => state.widthCm)
  const heightCm = useHamaStore((state) => state.heightCm)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)
  const gridData = useHamaStore((state) => state.gridData)

  const beadType = BEAD_TYPES[beadTypeId]

  const boards = useMemo(() => {
    return calcBoardsLayout(
      gridData?.cols ?? 0,
      gridData?.rows ?? 0,
      beadType.pegboardSize
    )
  }, [gridData?.cols, gridData?.rows, beadType.pegboardSize])

  const { total: totalBeads } = useMemo(() => {
    return deriveColorInventory(gridData?.cells ?? [])
  }, [gridData?.cells])

  const estimatedMinutes = Math.max(5, Math.ceil(totalBeads / 35))

  return (
    <div
      className={cn(
        'grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 bg-slate-100/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center py-2.5 text-xs',
        className
      )}
    >
      <div>
        <span className="text-slate-400 block text-[11px]">Tamaño Final</span>
        <span className="font-bold text-slate-800 dark:text-slate-100">
          {widthCm} × {heightCm} cm
        </span>
      </div>

      <div>
        <span className="text-slate-400 block text-[11px]">Placas Base</span>
        <span className="font-bold text-slate-800 dark:text-slate-100">
          {boards.total} ({boards.cols}×{boards.rows})
        </span>
      </div>

      <div>
        <span className="text-slate-400 block text-[11px]">Tiempo Estimado</span>
        <span className="font-bold text-slate-800 dark:text-slate-100">
          ~{estimatedMinutes} min
        </span>
      </div>
    </div>
  )
}
