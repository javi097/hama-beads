import { useState, useEffect, useMemo } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES, HAMA_PALETTE } from '@/hama/core/palette.const'
import { calcBeadCount } from '@/hama/core/grid-calculator'
import { processImage } from '@/hama/core/image-processor'
import { exportPatternPng } from '@/hama/core/png-exporter'
import { computeModel3D } from '@/hama/core/voxelizer'
import { useImageLoader } from '@/hama/hooks/useImageLoader'
import { cn } from '@/lib/utils'

import StudioLayout from '@/hama/layouts/StudioLayout'
import ImageDropzone from '@/hama/components/Controls/ImageDropzone'
import DimensionInputs from '@/hama/components/Controls/DimensionInputs'
import BeadTypeSelector from '@/hama/components/Controls/BeadTypeSelector'
import ViewerToolbar from '@/hama/components/Controls/ViewerToolbar'
import Grid2DCanvas from '@/hama/components/Canvas2D/Grid2DCanvas'
import ColorInventoryTable from '@/hama/components/Guide/ColorInventoryTable'
import BoardsSummary from '@/hama/components/Guide/BoardsSummary'
import PaletteModal from '@/hama/components/Guide/PaletteModal'
import VoxelScene3D from '@/hama/components/Scene3D/VoxelScene3D'
import Mode3DSelector from '@/hama/components/Controls/Mode3DSelector'
import ExportPdfButton from '@/hama/components/Guide/ExportPdfButton'

export default function StudioPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  const activeView = useHamaStore((state) => state.activeView)
  const setActiveView = useHamaStore((state) => state.setActiveView)

  const imageSrc = useHamaStore((state) => state.imageSrc)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)
  const widthCm = useHamaStore((state) => state.widthCm)
  const heightCm = useHamaStore((state) => state.heightCm)
  const enabledColorIds = useHamaStore((state) => state.enabledColorIds)
  const removeBg = useHamaStore((state) => state.removeBg)
  const gridData = useHamaStore((state) => state.gridData)
  const setGridData = useHamaStore((state) => state.setGridData)

  const mode3d = useHamaStore((state) => state.mode3d)
  const hollowLayersCount = useHamaStore((state) => state.hollowLayersCount)
  const hollowWallThickness = useHamaStore((state) => state.hollowWallThickness)
  const interlockingType = useHamaStore((state) => state.interlockingType)
  const interlockingDepthBeads = useHamaStore((state) => state.interlockingDepthBeads)
  const reliefLevels = useHamaStore((state) => state.reliefLevels)

  const { loadPreset } = useImageLoader()
  const beadSpec = BEAD_TYPES[beadTypeId] || BEAD_TYPES.midi

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

  // Generación reactiva del modelo 3D unificado
  const model3D = useMemo(() => {
    return computeModel3D(gridData, {
      mode3d,
      hollowLayersCount,
      hollowWallThickness,
      interlockingType,
      interlockingDepthBeads,
      reliefLevels,
      diameterMm: beadSpec.diameterMm,
    })
  }, [
    gridData,
    mode3d,
    hollowLayersCount,
    hollowWallThickness,
    interlockingType,
    interlockingDepthBeads,
    reliefLevels,
    beadSpec.diameterMm,
  ])

  // Desglose de todas las celdas 3D para sincronizar inventario BOM
  const all3DCells = useMemo(() => {
    if (!model3D) return []
    if (model3D.layers) return model3D.layers.flatMap((l) => l.cells)
    if (model3D.plates) return model3D.plates.flatMap((p) => p.cells)
    return []
  }, [model3D])

  const dimensions3DCm = useMemo(() => {
    if (!model3D) return undefined
    const x = (model3D.dimensionsMm.x / 10).toFixed(1)
    const y = (model3D.dimensionsMm.y / 10).toFixed(1)
    const z = (model3D.dimensionsMm.z / 10).toFixed(1)
    return `${x} × ${y} × ${z} cm`
  }, [model3D])

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
                {activeView === '2d' ? 'Estudio 2D' : 'Estudio 3D'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conversor exacto de imágenes a figuras Hama Beads 2D y 3D
            </p>
          </div>
        </div>

        {/* Selector de Vista Estudio 2D / Estudio 3D */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveView('2d')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeView === '2d'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <span>📐</span>
            <span>Estudio 2D</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('3d')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeView === '3d'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <span>🧊</span>
            <span>Estudio 3D</span>
          </button>
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

          {/* Acción principal según vista activa */}
          {activeView === '2d' ? (
            <button
              type="button"
              onClick={handleExportPng}
              disabled={!gridData}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>⬇ Descargar Patrón (PNG)</span>
            </button>
          ) : (
            <ExportPdfButton />
          )}

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

      {/* 3. Layout principal: Visor (izquierda) y Panel lateral (derecha) */}
      <StudioLayout
        viewer={
          activeView === '2d' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
              {/* Barra de título y herramientas del visor 2D */}
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
          ) : (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[580px]">
              <VoxelScene3D />
            </div>
          )
        }
        sidebar={
          activeView === '3d' ? (
            <div className="space-y-6">
              {/* Selector de Modo 3D y parámetros */}
              <Mode3DSelector />

              {/* Botón y tarjeta de descarga del manual PDF */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Manual de Montaje 3D
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Descarga en PDF la guía paso a paso con cuadrículas vectoriales
                  </p>
                </div>
                <ExportPdfButton />
              </div>

              {/* Inventario 3D sincronizado con el modelo activo */}
              <ColorInventoryTable
                cells={all3DCells}
                title="1. Inventario Total 3D (BOM)"
                subtitle="Cuentas necesarias para ensamblar toda la figura volumétrica"
              />

              <BoardsSummary
                totalBeadsOverride={model3D?.totalBeads}
                dimensionsOverride={dimensions3DCm}
              />

              {/* Guía técnica de ensamblado 3D */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-xs space-y-3">
                <h3 className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  2. Consejos de Ensamblado 3D
                </h3>
                <div className="space-y-2 text-slate-600 dark:text-slate-300">
                  {mode3d === 'hollow' && (
                    <>
                      <p>
                        • <strong>Apilado por capas:</strong> Construye y plancha cada capa individualmente cuidando que el calor no cierre excesivamente los bordes de unión.
                      </p>
                      <p>
                        • <strong>Unión térmica o adhesivo:</strong> Une las capas comenzando por la Capa 1 (base sólida) hacia arriba aplicando una pasada suave de plancha o adhesivo térmico.
                      </p>
                    </>
                  )}
                  {mode3d === 'interlocking' && (
                    <>
                      <p>
                        • <strong>Planchado controlado:</strong> Plancha las placas a 90° solo lo suficiente para fusionar las cuentas sin aplastar los dientes machihembrados.
                      </p>
                      <p>
                        • <strong>Ensamblaje a presión:</strong> Encastra las placas perpendiculares con una suave presión manual. La fricción mecánica mantendrá la figura firme sin pegamento.
                      </p>
                    </>
                  )}
                  {mode3d === 'relief' && (
                    <>
                      <p>
                        • <strong>Fusión de bajorrelieve:</strong> La base sólida (Nivel 1) aporta el soporte general. Fusiónala firmemente con las capas elevadas para un acabado escultural.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <ColorInventoryTable />
              <BoardsSummary />

              {/* Guía técnica de montaje y planchado 2D */}
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
          )
        }
      />

      {/* Modal de gestión de paleta */}
      <PaletteModal isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </div>
  )
}
