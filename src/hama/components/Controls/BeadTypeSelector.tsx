import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES } from '@/hama/core/palette.const'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function BeadTypeSelector({ className }: Props) {
  const beadTypeId = useHamaStore((state) => state.beadTypeId)
  const setBeadTypeId = useHamaStore((state) => state.setBeadTypeId)

  return (
    <div className={cn('bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800', className)}>
      <label
        htmlFor="bead-type-select"
        className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
      >
        Tipo de Perla (Diámetro)
      </label>
      <select
        id="bead-type-select"
        value={beadTypeId}
        onChange={(e) => setBeadTypeId(e.target.value as 'mini' | 'midi' | 'maxi')}
        className="mt-1 w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      >
        {Object.values(BEAD_TYPES).map((type) => (
          <option key={type.id} value={type.id}>
            {type.name} · Placa {type.pegboardSize}×{type.pegboardSize}
          </option>
        ))}
      </select>
    </div>
  )
}
