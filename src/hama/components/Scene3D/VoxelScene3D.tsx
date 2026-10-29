import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import { BEAD_TYPES } from '@/hama/core/palette.const'
import { computeModel3D } from '@/hama/core/voxelizer'
import { useThreeScene } from '@/hama/hooks/useThreeScene'
import LayerStackControls from './LayerStackControls'
import { cn } from '@/lib/utils'

export interface VoxelScene3DHandle {
  captureScreenshot: () => string
  resetCamera: () => void
}

interface Props {
  className?: string
}

const VoxelScene3D = forwardRef<VoxelScene3DHandle, Props>(function VoxelScene3D(
  { className },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const gridData = useHamaStore((state) => state.gridData)
  const beadTypeId = useHamaStore((state) => state.beadTypeId)
  const beadShape = useHamaStore((state) => state.beadShape)

  const mode3d = useHamaStore((state) => state.mode3d)
  const hollowLayersCount = useHamaStore((state) => state.hollowLayersCount)
  const hollowWallThickness = useHamaStore((state) => state.hollowWallThickness)
  const interlockingType = useHamaStore((state) => state.interlockingType)
  const interlockingDepthBeads = useHamaStore((state) => state.interlockingDepthBeads)
  const reliefLevels = useHamaStore((state) => state.reliefLevels)
  const explodedGapMm = useHamaStore((state) => state.explodedGapMm)
  const activeLayerIndex = useHamaStore((state) => state.activeLayerIndex)

  const beadType = BEAD_TYPES[beadTypeId] || BEAD_TYPES.midi

  // Generar modelo 3D unificado
  const model3D = useMemo(() => {
    return computeModel3D(gridData, {
      mode3d,
      hollowLayersCount,
      hollowWallThickness,
      interlockingType,
      interlockingDepthBeads,
      reliefLevels,
      diameterMm: beadType.diameterMm,
    })
  }, [
    gridData,
    mode3d,
    hollowLayersCount,
    hollowWallThickness,
    interlockingType,
    interlockingDepthBeads,
    reliefLevels,
    beadType.diameterMm,
  ])

  // Hook que inicializa y gestiona la escena WebGL
  const { resetCamera, captureScreenshot } = useThreeScene({
    containerRef,
    model3D,
    explodedGapMm,
    activeLayerIndex,
    beadShape,
    diameterMm: beadType.diameterMm,
  })

  // Exponer API imperativa para captura de portada y reencuadre
  useImperativeHandle(
    ref,
    () => ({
      captureScreenshot,
      resetCamera,
    }),
    [captureScreenshot, resetCamera]
  )

  const hasData = model3D !== null && model3D.totalBeads > 0

  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[500px] flex-1 flex flex-col bg-slate-950 overflow-hidden select-none',
        className
      )}
    >
      {/* Contenedor del lienzo WebGL */}
      <div
        ref={containerRef}
        data-scene3d-canvas="true"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Estado vacío si no hay diseño cargado */}
      {!hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center z-10">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-3xl shadow-inner">
            🧊
          </div>
          <h3 className="text-base font-bold text-slate-200">
            Estudio 3D a la espera de diseño
          </h3>
          <p className="mt-1.5 text-xs text-slate-400 max-w-sm">
            Carga una imagen o plantilla en el panel lateral para generar automáticamente la figura volumétrica y su manual de ensamblado.
          </p>
        </div>
      )}

      {/* Barra superior de estado y reencuadre */}
      {hasData && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-200 shadow-md">
              {mode3d === 'hollow' && 'Apilado Hueco'}
              {mode3d === 'interlocking' && 'Ensamblado Interlocking'}
              {mode3d === 'relief' && 'Relieve por Luminancia'}
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-mono font-bold text-indigo-400 shadow-md">
              {model3D.totalBeads.toLocaleString()} perlas
            </span>

            <span className="hidden sm:inline px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 shadow-md">
              {(model3D.dimensionsMm.x / 10).toFixed(1)} × {(model3D.dimensionsMm.y / 10).toFixed(1)} × {(model3D.dimensionsMm.z / 10).toFixed(1)} cm
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={resetCamera}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
              title="Centrar y reencuadrar la cámara 3D"
            >
              <span>🎯</span>
              <span>Reencuadrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Controles de despiece e inspección por capa estrictamente en la esquina inferior derecha */}
      {hasData && (
        <LayerStackControls
          model3D={model3D}
          className="absolute bottom-4 right-4 z-10 max-w-xs w-[calc(100%-2rem)] sm:w-80 pointer-events-auto shadow-2xl"
        />
      )}
    </div>
  )
})

export default VoxelScene3D
