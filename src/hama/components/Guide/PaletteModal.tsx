import { useHamaStore } from '@/hama/store/hama.store'
import { HAMA_PALETTE } from '@/hama/core/palette.const'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const BASIC_COLOR_IDS = ['01', '03', '05', '08', '10', '18']

export default function PaletteModal({ isOpen, onClose }: Props) {
  const enabledColorIds = useHamaStore((state) => state.enabledColorIds)
  const setEnabledColorIds = useHamaStore((state) => state.setEnabledColorIds)

  if (!isOpen) return null

  const handleSelectAll = () => {
    setEnabledColorIds(HAMA_PALETTE.map((c) => c.id))
  }

  const handleSelectBasics = () => {
    setEnabledColorIds(BASIC_COLOR_IDS)
  }

  const handleToggleColor = (id: string, isChecked: boolean) => {
    if (isChecked) {
      if (!enabledColorIds.includes(id)) {
        setEnabledColorIds([...enabledColorIds, id])
      }
    } else {
      // No permitir desmarcar si solo queda 1 color activo (RF-8.3)
      if (enabledColorIds.length > 1) {
        setEnabledColorIds(enabledColorIds.filter((colorId) => colorId !== id))
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera del modal */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Paleta Oficial Hama Beads Midi ({HAMA_PALETTE.length} Colores)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Activa o desactiva los colores disponibles en tu inventario ({enabledColorIds.length}/{HAMA_PALETTE.length})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Cerrar ✕
          </button>
        </div>

        {/* Barra de preselecciones rápidas (RF-8.4) */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-950/50 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
          >
            Seleccionar Todos ({HAMA_PALETTE.length})
          </button>
          <button
            type="button"
            onClick={handleSelectBasics}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition cursor-pointer"
          >
            Solo Colores Básicos (6)
          </button>
        </div>

        {/* Rejilla de colores de la paleta */}
        <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          {HAMA_PALETTE.map((color) => {
            const isChecked = enabledColorIds.includes(color.id)
            const isLastActive = isChecked && enabledColorIds.length === 1

            return (
              <label
                key={color.id}
                className={cn(
                  'p-2 rounded-xl border flex items-center gap-2.5 transition select-none',
                  isLastActive
                    ? 'border-indigo-400 bg-indigo-50/20 opacity-80 cursor-not-allowed'
                    : 'cursor-pointer',
                  isChecked
                    ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-80'
                )}
                title={isLastActive ? 'No se puede desactivar: la paleta debe tener al menos 1 color activo' : undefined}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isLastActive}
                  onChange={(e) => handleToggleColor(color.id, e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed"
                />

                <span
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm shrink-0"
                  style={{ backgroundColor: color.hex }}
                />

                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                  <strong className="font-bold">#{color.id}</strong> {color.name.split(' (')[0]}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
