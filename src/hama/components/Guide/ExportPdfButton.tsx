import { useState, useCallback } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES } from '@/hama/core/palette.const'
import { computeModel3D } from '@/hama/core/voxelizer'
import { deriveAssemblySteps } from '@/hama/core/assembly-guide'
import { exportAssemblyManualPdf } from '@/hama/core/pdf-exporter'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  getPreviewSnapshot?: () => string
}

export default function ExportPdfButton({ className, getPreviewSnapshot }: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const gridData = useHamaStore((state) => state.gridData)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)
  const widthCm = useHamaStore((state) => state.widthCm)
  const heightCm = useHamaStore((state) => state.heightCm)

  const mode3d = useHamaStore((state) => state.mode3d)
  const hollowLayersCount = useHamaStore((state) => state.hollowLayersCount)
  const hollowWallThickness = useHamaStore((state) => state.hollowWallThickness)
  const interlockingType = useHamaStore((state) => state.interlockingType)
  const interlockingDepthBeads = useHamaStore((state) => state.interlockingDepthBeads)
  const reliefLevels = useHamaStore((state) => state.reliefLevels)

  const beadType = BEAD_TYPES[beadTypeId] || BEAD_TYPES.midi

  // Generar modelo tridimensional
  const model3D = gridData
    ? computeModel3D(gridData, {
        mode3d,
        hollowLayersCount,
        hollowWallThickness,
        interlockingType,
        interlockingDepthBeads,
        reliefLevels,
        diameterMm: beadType.diameterMm,
      })
    : null

  const isAvailable = model3D !== null && model3D.totalBeads > 0

  const handleExport = useCallback(async () => {
    if (!model3D || isExporting) return

    setIsExporting(true)

    // Ceder el hilo para permitir el renderizado inmediato del spinner de carga
    setTimeout(async () => {
      try {
        const steps = deriveAssemblySteps(model3D)
        const coverPreviewDataUrl = getPreviewSnapshot ? getPreviewSnapshot() : ''

        const depthCm = (model3D.dimensionsMm.z / 10).toFixed(1)
        const dimensionsCm = `${widthCm.toFixed(1)} × ${heightCm.toFixed(1)} × ${depthCm} cm`

        await exportAssemblyManualPdf({
          projectName: 'Hama Beads 3D Studio',
          beadTypeName: `${beadType.name} (${beadType.diameterMm} mm)`,
          dimensionsCm,
          model3D,
          steps,
          coverPreviewDataUrl,
        })
      } catch (err) {
        console.error('Error al generar el manual en PDF:', err)
      } finally {
        setIsExporting(false)
      }
    }, 50)
  }, [
    model3D,
    isExporting,
    getPreviewSnapshot,
    widthCm,
    heightCm,
    beadType.name,
    beadType.diameterMm,
  ])

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!isAvailable || isExporting}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer',
        isAvailable && !isExporting
          ? 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white shadow-indigo-500/25'
          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-75 shadow-none',
        className
      )}
      title={
        !isAvailable
          ? 'Carga un diseño para generar el manual de montaje'
          : 'Descarga un manual de instrucciones en PDF con cuadrículas y recuentos'
      }
    >
      {isExporting ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Generando Manual PDF...</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Manual de Montaje PDF</span>
        </>
      )}
    </button>
  )
}
