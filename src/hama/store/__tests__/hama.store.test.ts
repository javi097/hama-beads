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
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 0.5) // height = 0.5 * width
    useHamaStore.getState().setWidthCm(10)

    expect(useHamaStore.getState().widthCm).toBe(10)
    expect(useHamaStore.getState().heightCm).toBe(5)
  })

  it('setHeightCm actualiza widthCm proporcionalmente si lockAspect es true y hay aspectRatio', () => {
    useHamaStore.getState().setImageSrc('data:image/png;base64,mock', 2) // height = 2 * width (aspectRatio = height/width = 2)
    useHamaStore.getState().setHeightCm(10)

    expect(useHamaStore.getState().heightCm).toBe(10)
    expect(useHamaStore.getState().widthCm).toBe(5)
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

  it('clampCm se aplica al ancho y al alto respetando límites de 4 a 100 cm', () => {
    useHamaStore.setState({ lockAspect: false })
    useHamaStore.getState().setWidthCm(2)
    expect(useHamaStore.getState().widthCm).toBe(4)

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
})
