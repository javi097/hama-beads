import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { GridData, HamaStoreState } from '@/interfaces/hama.interface'
import type { Mode3DType, InterlockingStructureType } from '@/interfaces/hama-3d.interface'
import { BEAD_TYPES, HAMA_PALETTE } from '@/hama/core/palette.const'
import { calcAdaptiveDimensions, calcLockedDimension, clampCm } from '@/hama/core/grid-calculator'

export interface HamaStoreActions {
  setImageSrc: (src: string | null, aspectRatio?: number | null) => void
  setBeadTypeId: (id: 'mini' | 'midi' | 'maxi') => void
  setWidthCm: (cm: number) => void
  setHeightCm: (cm: number) => void
  setLockAspect: (lock: boolean) => void
  setRemoveBg: (removeBg: boolean) => void
  setEnabledColorIds: (ids: string[]) => void
  setGridData: (gridData: GridData | null) => void
  setZoom: (zoom: number) => void
  setShowGrid: (show: boolean) => void
  setShowCodes: (show: boolean) => void
  setBeadShape: (shape: 'hollow' | 'pixel') => void
  setHighlightedColorId: (id: string | null) => void
  // Estudio 3D
  setActiveView: (view: '2d' | '3d') => void
  setMode3d: (mode: Mode3DType) => void
  setHollowLayersCount: (count: number) => void
  setHollowWallThickness: (thickness: 1 | 2) => void
  setInterlockingType: (type: InterlockingStructureType) => void
  setInterlockingDepthBeads: (depth: number) => void
  setReliefLevels: (levels: number) => void
  setExplodedGapMm: (gap: number) => void
  setActiveLayerIndex: (index: number | null) => void
}

export type HamaStore = HamaStoreState & HamaStoreActions

const DEFAULT_STATE: HamaStoreState = {
  beadTypeId: 'midi',
  widthCm: 14.5,
  heightCm: 14.5,
  lockAspect: true,
  removeBg: true,
  enabledColorIds: HAMA_PALETTE.map((c) => c.id),
  imageSrc: null,
  imageAspectRatio: null,
  gridData: null,
  zoom: 1,
  showGrid: true,
  showCodes: false,
  beadShape: 'hollow',
  highlightedColorId: null,
  // Estudio 3D
  activeView: '2d',
  mode3d: 'hollow',
  hollowLayersCount: 5,
  hollowWallThickness: 1,
  interlockingType: 'box',
  interlockingDepthBeads: 5,
  reliefLevels: 3,
  explodedGapMm: 0,
  activeLayerIndex: null,
}

export const useHamaStore = create<HamaStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setImageSrc: (imageSrc, aspectRatio = null) => {
        set((state) => {
          if (!imageSrc) {
            return { imageSrc: null, imageAspectRatio: null }
          }

          const beadSpec = BEAD_TYPES[state.beadTypeId] || BEAD_TYPES.midi
          const ratio =
            aspectRatio !== null && aspectRatio !== undefined && aspectRatio > 0
              ? aspectRatio
              : 1

          const dims = calcAdaptiveDimensions(
            ratio,
            beadSpec.diameterMm,
            beadSpec.pegboardSize
          )

          return {
            imageSrc,
            imageAspectRatio: ratio,
            widthCm: dims.widthCm,
            heightCm: dims.heightCm,
            lockAspect: true,
          }
        })
      },

      setBeadTypeId: (beadTypeId) => {
        set((state) => {
          const newBeadSpec = BEAD_TYPES[beadTypeId] || BEAD_TYPES.midi
          return {
            beadTypeId,
            widthCm: clampCm(state.widthCm, newBeadSpec.diameterMm),
            heightCm: clampCm(state.heightCm, newBeadSpec.diameterMm),
          }
        })
      },

      setWidthCm: (cm) => {
        set((state) => {
          const beadSpec = BEAD_TYPES[state.beadTypeId] || BEAD_TYPES.midi
          const widthCm = clampCm(cm, beadSpec.diameterMm)
          let heightCm = state.heightCm
          if (state.lockAspect && state.imageAspectRatio && state.imageAspectRatio > 0) {
            heightCm = clampCm(
              calcLockedDimension(widthCm, 1 / state.imageAspectRatio),
              beadSpec.diameterMm
            )
          }
          return { widthCm, heightCm }
        })
      },

      setHeightCm: (cm) => {
        set((state) => {
          const beadSpec = BEAD_TYPES[state.beadTypeId] || BEAD_TYPES.midi
          const heightCm = clampCm(cm, beadSpec.diameterMm)
          let widthCm = state.widthCm
          if (state.lockAspect && state.imageAspectRatio && state.imageAspectRatio > 0) {
            widthCm = clampCm(
              calcLockedDimension(heightCm, state.imageAspectRatio),
              beadSpec.diameterMm
            )
          }
          return { widthCm, heightCm }
        })
      },

      setLockAspect: (lockAspect) => set({ lockAspect }),

      setRemoveBg: (removeBg) => set({ removeBg }),

      setEnabledColorIds: (enabledColorIds) => {
        if (enabledColorIds.length === 0) {
          return // Garantía innegociable de paleta mínima con al menos 1 color (RF-8.3)
        }
        set({ enabledColorIds })
      },

      setGridData: (gridData) => set({ gridData }),

      setZoom: (zoom) => {
        const clamped = Math.min(3.0, Math.max(0.5, Number(zoom.toFixed(2))))
        set({ zoom: clamped })
      },

      setShowGrid: (showGrid) => set({ showGrid }),

      setShowCodes: (showCodes) => set({ showCodes }),

      setBeadShape: (beadShape) => set({ beadShape }),

      setHighlightedColorId: (id) => {
        set((state) => ({
          highlightedColorId: state.highlightedColorId === id ? null : id,
        }))
      },

      setActiveView: (activeView) => set({ activeView }),

      setMode3d: (mode3d) => set({ mode3d, activeLayerIndex: null }),

      setHollowLayersCount: (count) => {
        const clamped = Math.max(3, Math.min(30, Math.round(count)))
        set({ hollowLayersCount: clamped })
      },

      setHollowWallThickness: (thickness) => {
        set({ hollowWallThickness: thickness === 2 ? 2 : 1 })
      },

      setInterlockingType: (interlockingType) => set({ interlockingType }),

      setInterlockingDepthBeads: (depth) => {
        const clamped = Math.max(3, Math.min(30, Math.round(depth)))
        set({ interlockingDepthBeads: clamped })
      },

      setReliefLevels: (levels) => {
        const clamped = Math.max(2, Math.min(6, Math.round(levels)))
        set({ reliefLevels: clamped })
      },

      setExplodedGapMm: (gap) => {
        const clamped = Math.max(0, Math.min(50, Number(gap.toFixed(1))))
        set({ explodedGapMm: clamped })
      },

      setActiveLayerIndex: (index) => {
        const activeLayerIndex = index !== null ? Math.max(1, Math.round(index)) : null
        set({ activeLayerIndex })
      },
    }),
    {
      name: 'hama-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage
        }
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
          return globalThis.localStorage
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
      partialize: (state) => {
        // Exclusión de campos voluminosos para evitar saturar el límite de localStorage
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { imageSrc, gridData, ...persisted } = state
        return persisted
      },
    }
  )
)
