import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { useImageLoader } from '@/hama/hooks/useImageLoader'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function ImageDropzone({ className }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageSrc = useHamaStore((state) => state.imageSrc)
  const { loadFile, loadPreset, error, clearError } = useImageLoader()

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      loadFile(file)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadFile(file)
    }
    // Resetear valor para permitir seleccionar el mismo archivo si se desea
    e.target.value = ''
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition',
          'bg-slate-50/70 dark:bg-slate-950/40',
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
        )}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Vista previa"
            className="w-12 h-12 rounded-lg object-contain bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xl shrink-0">
            🖼️
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearError()
                fileInputRef.current?.click()
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer truncate"
            >
              Subir imagen (PNG, JPG, WEBP, SVG)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            O arrastra aquí · Prueba un modelo rápido:
          </p>

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={() => loadPreset('mushroom')}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
            >
              🍄 Seta
            </button>
            <button
              type="button"
              onClick={() => loadPreset('heart')}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
            >
              ❤️ Corazón
            </button>
            <button
              type="button"
              onClick={() => loadPreset('duck')}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
            >
              🦆 Patito
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
