import { describe, it, expect, beforeEach, vi } from 'vitest'

const memoryStorage = vi.hoisted(() => {
  const store: Record<string, string> = {}
  // @ts-expect-error Mocking global localStorage
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
  }
  return store
})

import { useHamaStore } from '../hama.store'
import { HAMA_PALETTE } from '@/hama/core/palette.const'

describe('hama.store', () => {
  beforeEach(() => {
    memoryStorage['hama-storage'] = ''
    // Resetear store al estado inicial antes de cada test
    useHamaStore.setState({
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
      activeView: '2d',
      mode3d: 'hollow',
      hollowLayersCount: 5,
      hollowWallThickness: 1,
      interlockingType: 'cross_ribs',
      interlockingDepthBeads: 5,
      reliefLevels: 3,
      explodedGapMm: 0,
      activeLayerIndex: null,
    })
  })

  it('setEnabledColorIds no permite vaciar la paleta (mínimo 1 color activo)', () => {
    const initialColors = useHamaStore.getState().enabledColorIds
    useHamaStore.getState().setEnabledColorIds([])
    expect(useHamaStore.getState().enabledColorIds).toEqual(initialColors)

    // Pero sí permite establecer 1 solo color
    useHamaStore.getState().setEnabledColorIds(['01'])
    expect(useHamaStore.getState().enabledColorIds).toEqual(['01'])
  })

  it('setWidthCm actualiza heightCm proporcionalmente si lockAspect es true y hay aspectRatio', () => {
    // aspectRatio = width / height = 2 (ancho = 2 * alto)
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 2)
    useHamaStore.getState().setWidthCm(16)

    expect(useHamaStore.getState().widthCm).toBe(16)
    expect(useHamaStore.getState().heightCm).toBe(8)
  })

  it('setHeightCm actualiza widthCm proporcionalmente si lockAspect es true y hay aspectRatio', () => {
    // aspectRatio = width / height = 0.5 (alto = 2 * ancho)
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 0.5)
    useHamaStore.getState().setHeightCm(16)

    expect(useHamaStore.getState().heightCm).toBe(16)
    expect(useHamaStore.getState().widthCm).toBe(8)
  })

  it('setImageSrc calcula dimensiones adaptativas cubriendo 1 placa estándar en la dimensión mayor', () => {
    // Vertical (Hollow Knight, portrait ratio 0.5 en Midi 5 mm): alto = 14.5 cm (29 cuentas), ancho proporcional
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 0.5)
    const state = useHamaStore.getState()
    expect(state.heightCm).toBe(14.5)
    expect(state.widthCm).toBe(7.3)
    expect(state.lockAspect).toBe(true)

    // Apaisada (ratio 2.0 en Midi 5 mm): ancho = 14.5 cm, alto proporcional
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 2.0)
    const state2 = useHamaStore.getState()
    expect(state2.widthCm).toBe(14.5)
    expect(state2.heightCm).toBe(7.3)
    expect(state2.lockAspect).toBe(true)
  })

  it('setHighlightedColorId hace toggle al recibir el mismo id', () => {
    useHamaStore.getState().setHighlightedColorId('05')
    expect(useHamaStore.getState().highlightedColorId).toBe('05')

    // Mismo id -> se desactiva (pasa a null)
    useHamaStore.getState().setHighlightedColorId('05')
    expect(useHamaStore.getState().highlightedColorId).toBeNull()

    // Puede fijarse directamente a null
    useHamaStore.getState().setHighlightedColorId('01')
    useHamaStore.getState().setHighlightedColorId(null)
    expect(useHamaStore.getState().highlightedColorId).toBeNull()
  })

  it('setZoom clampea los valores entre 0.5 y 3.0', () => {
    useHamaStore.getState().setZoom(5)
    expect(useHamaStore.getState().zoom).toBe(3.0)

    useHamaStore.getState().setZoom(0.1)
    expect(useHamaStore.getState().zoom).toBe(0.5)

    useHamaStore.getState().setZoom(1.5)
    expect(useHamaStore.getState().zoom).toBe(1.5)
  })

  it('clampCm se aplica al ancho y al alto respetando límites según diámetro de perla', () => {
    useHamaStore.setState({ lockAspect: false })
    useHamaStore.getState().setWidthCm(2)
    // En Midi (5.0 mm), el mínimo viable es 6.0 cm (12 cuentas)
    expect(useHamaStore.getState().widthCm).toBe(6)

    useHamaStore.getState().setHeightCm(150)
    expect(useHamaStore.getState().heightCm).toBe(100)
  })

  it('persiste en localStorage bajo hama-storage excluyendo imageSrc y gridData', () => {
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 1)
    useHamaStore.getState().setGridData({ cols: 2, rows: 2, cells: [[null, null], [null, null]] })
    useHamaStore.getState().setBeadTypeId('maxi')

    const storedRaw = memoryStorage['hama-storage']
    expect(storedRaw).toBeDefined()
    const parsed = JSON.parse(storedRaw)
    expect(parsed.state.beadTypeId).toBe('maxi')
    expect(parsed.state.imageSrc).toBeUndefined()
    expect(parsed.state.gridData).toBeUndefined()
  })

  describe('Estudio 3D (Zustand state & actions)', () => {
    it('setActiveView alterna entre 2d y 3d', () => {
      expect(useHamaStore.getState().activeView).toBe('2d')
      useHamaStore.getState().setActiveView('3d')
      expect(useHamaStore.getState().activeView).toBe('3d')
      useHamaStore.getState().setActiveView('2d')
      expect(useHamaStore.getState().activeView).toBe('2d')
    })

    it('setMode3d cambia el modo 3D y resetea activeLayerIndex', () => {
      useHamaStore.getState().setActiveLayerIndex(3)
      expect(useHamaStore.getState().activeLayerIndex).toBe(3)

      useHamaStore.getState().setMode3d('interlocking')
      expect(useHamaStore.getState().mode3d).toBe('interlocking')
      expect(useHamaStore.getState().activeLayerIndex).toBeNull()

      useHamaStore.getState().setMode3d('relief')
      expect(useHamaStore.getState().mode3d).toBe('relief')
    })

    it('setHollowLayersCount clampea entre 3 y 30', () => {
      useHamaStore.getState().setHollowLayersCount(1)
      expect(useHamaStore.getState().hollowLayersCount).toBe(3)

      useHamaStore.getState().setHollowLayersCount(50)
      expect(useHamaStore.getState().hollowLayersCount).toBe(30)

      useHamaStore.getState().setHollowLayersCount(8)
      expect(useHamaStore.getState().hollowLayersCount).toBe(8)
    })

    it('setHollowWallThickness alterna entre 1 y 2', () => {
      useHamaStore.getState().setHollowWallThickness(2)
      expect(useHamaStore.getState().hollowWallThickness).toBe(2)

      useHamaStore.getState().setHollowWallThickness(1)
      expect(useHamaStore.getState().hollowWallThickness).toBe(1)
    })

    it('setInterlockingType alterna entre box y cross_ribs', () => {
      useHamaStore.getState().setInterlockingType('cross_ribs')
      expect(useHamaStore.getState().interlockingType).toBe('cross_ribs')

      useHamaStore.getState().setInterlockingType('box')
      expect(useHamaStore.getState().interlockingType).toBe('box')
    })

    it('setInterlockingDepthBeads clampea entre 3 y 30', () => {
      useHamaStore.getState().setInterlockingDepthBeads(1)
      expect(useHamaStore.getState().interlockingDepthBeads).toBe(3)

      useHamaStore.getState().setInterlockingDepthBeads(40)
      expect(useHamaStore.getState().interlockingDepthBeads).toBe(30)
    })

    it('setReliefLevels clampea entre 2 y 6', () => {
      useHamaStore.getState().setReliefLevels(1)
      expect(useHamaStore.getState().reliefLevels).toBe(2)

      useHamaStore.getState().setReliefLevels(10)
      expect(useHamaStore.getState().reliefLevels).toBe(6)

      useHamaStore.getState().setReliefLevels(4)
      expect(useHamaStore.getState().reliefLevels).toBe(4)
    })

    it('setExplodedGapMm clampea entre 0 y 50 mm', () => {
      useHamaStore.getState().setExplodedGapMm(-5)
      expect(useHamaStore.getState().explodedGapMm).toBe(0)

      useHamaStore.getState().setExplodedGapMm(80)
      expect(useHamaStore.getState().explodedGapMm).toBe(50)

      useHamaStore.getState().setExplodedGapMm(15.5)
      expect(useHamaStore.getState().explodedGapMm).toBe(15.5)
    })

    it('setActiveLayerIndex establece la capa activa o null', () => {
      useHamaStore.getState().setActiveLayerIndex(2)
      expect(useHamaStore.getState().activeLayerIndex).toBe(2)

      useHamaStore.getState().setActiveLayerIndex(null)
      expect(useHamaStore.getState().activeLayerIndex).toBeNull()
    })

    it('persiste la configuración 3D en localStorage', () => {
      useHamaStore.getState().setActiveView('3d')
      useHamaStore.getState().setMode3d('interlocking')
      useHamaStore.getState().setExplodedGapMm(20)

      const storedRaw = memoryStorage['hama-storage']
      const parsed = JSON.parse(storedRaw)
      expect(parsed.state.activeView).toBe('3d')
      expect(parsed.state.mode3d).toBe('interlocking')
      expect(parsed.state.explodedGapMm).toBe(20)
    })
  })
})
