import { useState, useEffect } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES, HAMA_PALETTE } from '@/hama/core/palette.const'
import { calcBeadCount } from '@/hama/core/grid-calculator'
import { processImage } from '@/hama/core/image-processor'
import { exportPatternPng } from '@/hama/core/png-exporter'
import { useImageLoader } from '@/hama/hooks/useImageLoader'

import StudioLayout from '@/hama/layouts/StudioLayout'
import ImageDropzone from '@/hama/components/Controls/ImageDropzone'
import DimensionInputs from '@/hama/components/Controls/DimensionInputs'
import BeadTypeSelector from '@/hama/components/Controls/BeadTypeSelector'
import ViewerToolbar from '@/hama/components/Controls/ViewerToolbar'
import Grid2DCanvas from '@/hama/components/Canvas2D/Grid2DCanvas'
import ColorInventoryTable from '@/hama/components/Guide/ColorInventoryTable'
import BoardsSummary from '@/hama/components/Guide/BoardsSummary'
import PaletteModal from '@/hama/components/Guide/PaletteModal'

export default function StudioPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  const imageSrc = useHamaStore((state) => state.imageSrc)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)
  const widthCm = useHamaStore((state) => state.widthCm)
  const heightCm = useHamaStore((state) => state.heightCm)
  const enabledColorIds = useHamaStore((state) => state.enabledColorIds)
  const removeBg = useHamaStore((state) => state.removeBg)
  const gridData = useHamaStore((state) => state.gridData)
  const setGridData = useHamaStore((state) => state.setGridData)

  const { loadPreset } = useImageLoader()
  const beadSpec = BEAD_TYPES[beadTypeId]

  // Sincronizar clase dark en el elemento raíz HTML
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [darkMode])

  // Cargar preset de demostración inicial si no hay imagen en el store (RF-1.6)
  useEffect(() => {
    if (!imageSrc) {
      loadPreset('mushroom')
    }
  }, [imageSrc, loadPreset])

  // Pipeline central de procesamiento de imagen reactivo (RNF-3)
  useEffect(() => {
    if (!imageSrc) return

    let isCancelled = false
    const cols = calcBeadCount(widthCm, beadSpec.diameterMm)
    const rows = calcBeadCount(heightCm, beadSpec.diameterMm)

    const activePalette = HAMA_PALETTE.filter((c) => enabledColorIds.includes(c.id))
    const safePalette = activePalette.length > 0 ? activePalette : HAMA_PALETTE

    processImage(imageSrc, cols, rows, safePalette, removeBg)
      .then((result) => {
        if (!isCancelled) {
          setGridData(result)
        }
      })
      .catch((err) => {
        console.error('Error al procesar la imagen:', err)
      })

    return () => {
      isCancelled = true
    }
  }, [imageSrc, widthCm, heightCm, beadSpec.diameterMm, enabledColorIds, removeBg, setGridData])

  const handleExportPng = () => {
    if (!gridData) return
    exportPatternPng(gridData, beadSpec, widthCm, heightCm)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* 1. Barra superior de navegación y acciones globales */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <div className="w-4 h-4 rounded-full border-4 border-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              HamaStudio{' '}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                2D Studio
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conversor exacto de imágenes a patrones de perlas termofusibles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón de apertura de modal de paleta */}
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <span>
              🎨 Paleta ({enabledColorIds.length}/{HAMA_PALETTE.length})
            </span>
          </button>

          {/* Botón de exportación en PNG */}
          <button
            type="button"
            onClick={handleExportPng}
            disabled={!gridData}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>⬇ Descargar Patrón (PNG)</span>
          </button>

          {/* Toggle de tema claro / oscuro */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-sm cursor-pointer"
            title={darkMode ? 'Cambiar a modo Claro' : 'Cambiar a modo Oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* 2. Sección superior de configuración de entrada */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <ImageDropzone className="md:col-span-4" />
          <DimensionInputs className="md:col-span-4" />
          <BeadTypeSelector className="md:col-span-4" />
        </div>
      </section>

      {/* 3. Layout principal: Visor 2D (izquierda) y Guía de montaje (derecha) */}
      <StudioLayout
        viewer={
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Barra de título y herramientas del visor */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm">
                📐 Vista 2D (Plano)
              </span>

              <ViewerToolbar />
            </div>

            {/* Lienzo Canvas 2D */}
            <div className="flex-1">
              <Grid2DCanvas darkMode={darkMode} />
            </div>
          </div>
        }
        sidebar={
          <div className="space-y-6">
            <ColorInventoryTable />
            <BoardsSummary />

            {/* Guía técnica de montaje y planchado */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-xs space-y-3">
              <h3 className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                2. Consejos de Montaje y Planchado
              </h3>

              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <p>
                  • <strong>Colocación guiada:</strong> Activa el botón <strong>"🆔 Códigos"</strong> en la barra del visor para identificar numéricamente cada color en las coordenadas.
                </p>
                <p>
                  • <strong>Aislamiento por color:</strong> Haz clic en cualquier color de la tabla superior para atenuar los demás y montar cómodamente cuenta por cuenta.
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200">
                  <span className="font-bold block mb-1">
                    🌡️ Temperatura de fusión para {beadSpec.name}:
                  </span>
                  <span>
                    {beadTypeId === 'mini'
                      ? '130°C - 140°C (Plancha suave / Lana), sin vapor durante 5-8 segundos.'
                      : beadTypeId === 'midi'
                        ? '150°C - 160°C (Posición media / Algodón), sin vapor durante 12-20 segundos con papel de horno.'
                        : '170°C - 180°C (Posición alta / Algodón fuerte), movimientos circulares constantes.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Modal de gestión de paleta */}
      <PaletteModal isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </div>
  )
}
