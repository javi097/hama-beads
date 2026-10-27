import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { GridData, HamaStoreState } from '@/interfaces/hama.interface'
import { HAMA_PALETTE } from '@/hama/core/palette.const'
import { calcLockedDimension, clampCm } from '@/hama/core/grid-calculator'

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
}

export type HamaStore = HamaStoreState & HamaStoreActions

const DEFAULT_STATE: HamaStoreState = {
  beadTypeId: 'midi',
  widthCm: 8,
  heightCm: 8,
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
}

export const useHamaStore = create<HamaStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setImageSrc: (imageSrc, aspectRatio = null) => {
        set((state) => {
          let heightCm = state.heightCm
          if (aspectRatio !== null && aspectRatio !== undefined && state.lockAspect) {
            heightCm = clampCm(calcLockedDimension(state.widthCm, aspectRatio))
          }
          return {
            imageSrc,
            imageAspectRatio: aspectRatio !== undefined ? aspectRatio : state.imageAspectRatio,
            heightCm,
          }
        })
      },

      setBeadTypeId: (beadTypeId) => set({ beadTypeId }),

      setWidthCm: (cm) => {
        set((state) => {
          const widthCm = clampCm(cm)
          let heightCm = state.heightCm
          if (state.lockAspect && state.imageAspectRatio && state.imageAspectRatio > 0) {
            heightCm = clampCm(calcLockedDimension(widthCm, state.imageAspectRatio))
          }
          return { widthCm, heightCm }
        })
      },

      setHeightCm: (cm) => {
        set((state) => {
          const heightCm = clampCm(cm)
          let widthCm = state.widthCm
          if (state.lockAspect && state.imageAspectRatio && state.imageAspectRatio > 0) {
            widthCm = clampCm(calcLockedDimension(heightCm, 1 / state.imageAspectRatio))
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
