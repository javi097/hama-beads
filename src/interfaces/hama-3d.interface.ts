import type { BeadCell, HamaColor } from './hama.interface'

export type Mode3DType = 'hollow' | 'interlocking' | 'relief'
export type InterlockingStructureType = 'box' | 'cross_ribs'

export interface VoxelPosition {
  x: number // Columna en cuadrícula (eje X)
  y: number // Fila en cuadrícula (eje Y)
  z: number // Capa o elevación (eje Z)
}

export interface VoxelBead {
  position: VoxelPosition
  color: HamaColor
}

export interface VoxelCell {
  x: number
  y: number
  z: number
  color: HamaColor
  isStructural?: boolean
  isCavityWall?: boolean
}

export interface VoxelGrid3D {
  cols: number // Tamaño en X (ancho en perlas)
  rows: number // Tamaño en Y (alto en perlas)
  depth: number // Tamaño en Z (profundidad en perlas)
  voxels: (VoxelCell | null)[][][] // Matriz tridimensional [z][y][x]
  diameterMm: number // Diámetro de perla en mm
  cavityMask?: boolean[][][] // Máscara tridimensional de cavidades [z][y][x]
}

export type VolumeProfile = 'prismatic' | 'rounded'

export interface ExtrusionOptions {
  depth: number
  profile?: VolumeProfile
  diameterMm?: number
  minWallThickness?: number
}

export interface CavityOptions {
  targetColorIds?: string[]
  seedCoords?: [number, number][]
  zRange?: [number, number]
  wallThickness?: 1 | 2
  preserveCapBottom?: boolean
  preserveCapTop?: boolean
}

export interface VoxelLayer {
  layerIndex: number
  name: string
  cells: BeadCell[][]
  beadCount: number
  zOffsetMm: number
}

export interface InterlockingPlate {
  id: string
  name: string // ej. 'Frontal', 'Lateral Izquierda', 'Tapa'
  orientation: 'xy' | 'xz' | 'yz'
  cells: BeadCell[][]
  widthBeads: number
  heightBeads: number
  position3D: [number, number, number] // Desplazamiento inicial en mm
}

export interface AssemblyStep {
  stepNumber: number
  title: string
  type: 'layer' | 'plate'
  cells: BeadCell[][]
  beadCounts: { color: HamaColor; count: number }[]
  totalBeads: number
  instructions: string
}

export interface Model3DResult {
  mode: Mode3DType
  layers?: VoxelLayer[]
  plates?: InterlockingPlate[]
  totalBeads: number
  dimensionsMm: { x: number; y: number; z: number }
}

export interface HollowConfig {
  totalLayers: number
  wallThickness: 1 | 2
  profile?: VolumeProfile
  cavityColorIds?: string[]
  cavitySeedCoords?: [number, number][]
  preserveCapBottom?: boolean
  preserveCapTop?: boolean
  enforceVerticalSupport?: boolean
}

export type GenerateHollowLayersOptions = Partial<Omit<HollowConfig, 'totalLayers' | 'wallThickness'>>

export interface InterlockingConfig {
  structureType: InterlockingStructureType
  depthBeads: number
}

export interface ReliefConfig {
  levels: number
}

export interface PdfExportOptions {
  projectName: string
  beadTypeName: string
  dimensionsCm: string
  model3D: Model3DResult
  steps: AssemblyStep[]
  coverPreviewDataUrl: string
}
