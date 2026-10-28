import type { Mode3DType, InterlockingStructureType } from './hama-3d.interface'

export interface HamaColor {
  id: string
  name: string
  hex: string
  r: number
  g: number
  b: number
  rgb: [number, number, number]
  luminance: number
}

export interface BeadType {
  id: 'mini' | 'midi' | 'maxi'
  name: string
  diameterMm: number
  pegboardSize: number
}

export type BeadCell = HamaColor | null

export interface GridData {
  cols: number
  rows: number
  cells: BeadCell[][]
}

export interface ColorCount {
  color: HamaColor
  count: number
}

export interface BoardsLayout {
  cols: number
  rows: number
  total: number
}

export interface HamaStoreState {
  // Configuración
  beadTypeId: 'mini' | 'midi' | 'maxi'
  widthCm: number
  heightCm: number
  lockAspect: boolean
  removeBg: boolean
  enabledColorIds: string[]
  // Imagen
  imageSrc: string | null
  imageAspectRatio: number | null
  // Resultado del procesamiento
  gridData: GridData | null
  // Preferencias de vista
  zoom: number
  showGrid: boolean
  showCodes: boolean
  beadShape: 'hollow' | 'pixel'
  highlightedColorId: string | null
  // Estudio 3D
  activeView: '2d' | '3d'
  mode3d: Mode3DType
  hollowLayersCount: number
  hollowWallThickness: 1 | 2
  interlockingType: InterlockingStructureType
  interlockingDepthBeads: number
  reliefLevels: number
  explodedGapMm: number
  activeLayerIndex: number | null
}
