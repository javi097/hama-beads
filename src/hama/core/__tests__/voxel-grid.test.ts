// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  createEmptyVoxelGrid,
  isInsideGrid,
  getVoxel,
  setVoxel,
  cloneVoxelGrid,
  countActiveVoxels,
  computeDistanceTransform2D,
  extrudeFrom2D,
  checkConnectivity6,
  identifyInteriorVoxels3D,
  erodeVoxelGrid,
  findConnected2DRegion,
  createCavityMaskByColor,
  createCavityMaskBySeed,
  applyCavity,
  extractZSlice,
  sliceGridToLayers,
  extractSlicePlane,
} from '../voxel-grid'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell } from '@/interfaces/hama.interface'
import type { VoxelGrid3D } from '@/interfaces/hama-3d.interface'

const redBead = HAMA_PALETTE.find((c) => c.id === '05')!
const blueBead = HAMA_PALETTE.find((c) => c.id === '08')!
const blackBead = HAMA_PALETTE.find((c) => c.id === '18')!

/** Helper para crear una cuadrícula bidimensional sólida */
function createSolid2DGrid(cols: number, rows: number, bead = redBead): BeadCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => bead))
}

/** Helper para crear un cubo 3D sólido en VoxelGrid3D */
function createSolidVoxelCube(size: number, bead = redBead): VoxelGrid3D {
  const grid = createEmptyVoxelGrid(size, size, size)
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        setVoxel(grid, x, y, z, { x, y, z, color: bead })
      }
    }
  }
  return grid
}

describe('VoxelGrid3D — Fase 1: Infraestructura Canónica', () => {
  describe('Inicialización y Operaciones Básicas', () => {
    it('crea un VoxelGrid3D vacío con dimensiones y diámetro correctos', () => {
      const grid = createEmptyVoxelGrid(5, 4, 3, 5.0)

      expect(grid.cols).toBe(5)
      expect(grid.rows).toBe(4)
      expect(grid.depth).toBe(3)
      expect(grid.diameterMm).toBe(5.0)
      expect(grid.voxels).toHaveLength(3)
      expect(grid.voxels[0]).toHaveLength(4)
      expect(grid.voxels[0][0]).toHaveLength(5)
      expect(countActiveVoxels(grid)).toBe(0)
    })

    it('gestiona correctamente comprobación de límites y getters/setters seguros', () => {
      const grid = createEmptyVoxelGrid(3, 3, 3)

      expect(isInsideGrid(grid, 0, 0, 0)).toBe(true)
      expect(isInsideGrid(grid, 2, 2, 2)).toBe(true)
      expect(isInsideGrid(grid, -1, 0, 0)).toBe(false)
      expect(isInsideGrid(grid, 3, 0, 0)).toBe(false)
      expect(isInsideGrid(grid, 0, 3, 0)).toBe(false)
      expect(isInsideGrid(grid, 0, 0, 3)).toBe(false)

      setVoxel(grid, 1, 1, 1, { x: 1, y: 1, z: 1, color: redBead })
      expect(getVoxel(grid, 1, 1, 1)).toEqual({ x: 1, y: 1, z: 1, color: redBead })
      expect(getVoxel(grid, 0, 0, 0)).toBeNull()
      expect(getVoxel(grid, 99, 99, 99)).toBeNull()

      // Intento de set fuera de rango no lanza error
      setVoxel(grid, 99, 99, 99, { x: 99, y: 99, z: 99, color: redBead })
      expect(countActiveVoxels(grid)).toBe(1)
    })

    it('clona en profundidad un VoxelGrid3D asegurando inmutabilidad', () => {
      const original = createEmptyVoxelGrid(3, 3, 3)
      setVoxel(original, 1, 1, 1, { x: 1, y: 1, z: 1, color: redBead })

      const clone = cloneVoxelGrid(original)
      expect(clone).toEqual(original)
      expect(clone).not.toBe(original)
      expect(clone.voxels).not.toBe(original.voxels)

      // Modificar el clon no afecta al original
      setVoxel(clone, 1, 1, 1, { x: 1, y: 1, z: 1, color: blueBead })
      expect(getVoxel(original, 1, 1, 1)?.color.id).toBe('05') // Sigue siendo redBead
      expect(getVoxel(clone, 1, 1, 1)?.color.id).toBe('08') // Es blueBead
    })
  })

  describe('Extrusión Volumétrica desde 2D (extrudeFrom2D)', () => {
    it('perfil "prismatic" extruye la silueta 2D de forma idéntica en todas las capas Z', () => {
      const base2D = createSolid2DGrid(4, 3, redBead)
      base2D[0][0] = null // Un hueco en la esquina superior izquierda

      const grid = extrudeFrom2D(base2D, { depth: 5, profile: 'prismatic', diameterMm: 5.0 })

      expect(grid.depth).toBe(5)
      expect(grid.rows).toBe(3)
      expect(grid.cols).toBe(4)

      // Cada una de las 5 capas debe tener exactamente 11 perlas (12 - 1)
      for (let z = 0; z < 5; z++) {
        expect(getVoxel(grid, 0, 0, z)).toBeNull()
        expect(getVoxel(grid, 1, 0, z)?.color.id).toBe('05')
      }
      expect(countActiveVoxels(grid)).toBe(11 * 5)
    })

    it('perfil "rounded" aplica contracción morfológica suave preservando el núcleo central', () => {
      const base2D = createSolid2DGrid(7, 7, redBead)
      const grid = extrudeFrom2D(base2D, { depth: 5, profile: 'rounded', diameterMm: 5.0 })

      expect(grid.depth).toBe(5)
      const centerZ = 2

      // La capa central (Z=2) tiene la silueta completa (49 perlas)
      const midSliceCount = grid.voxels[centerZ].flat().filter((c) => c !== null).length
      expect(midSliceCount).toBe(49)

      // Las capas extremas (Z=0 y Z=4) se contraen simétricamente respecto al centro
      const bottomCapCount = grid.voxels[0].flat().filter((c) => c !== null).length
      const topCapCount = grid.voxels[4].flat().filter((c) => c !== null).length

      expect(bottomCapCount).toBe(topCapCount)
      expect(bottomCapCount).toBeLessThan(midSliceCount)
      expect(bottomCapCount).toBeGreaterThan(0) // No queda vacía
    })

    it('computeDistanceTransform2D calcula distancias crecientes hacia el centro', () => {
      const base2D = createSolid2DGrid(5, 5, redBead)
      const { distMap, maxDist } = computeDistanceTransform2D(base2D)

      expect(maxDist).toBe(3)
      expect(distMap[0][0]).toBe(1) // Esquina exterior
      expect(distMap[2][2]).toBe(3) // Centro exacto
    })
  })

  describe('Conectividad Tridimensional 6-Vecinos (checkConnectivity6)', () => {
    it('detecta un bloque sólido como un único componente conexo', () => {
      const cube = createSolidVoxelCube(3)
      const res = checkConnectivity6(cube)

      expect(res.isConnected).toBe(true)
      expect(res.componentCount).toBe(1)
      expect(res.sizes).toEqual([27])
    })

    it('detecta dos cubos desconectados en el espacio como componentes separados', () => {
      const grid = createEmptyVoxelGrid(10, 10, 10)
      // Cubo 1 en (0..1, 0..1, 0..1) -> 8 vóxeles
      for (let z = 0; z < 2; z++) {
        for (let y = 0; y < 2; y++) {
          for (let x = 0; x < 2; x++) {
            setVoxel(grid, x, y, z, { x, y, z, color: redBead })
          }
        }
      }
      // Cubo 2 en (5..6, 5..6, 5..6) -> 8 vóxeles
      for (let z = 5; z < 7; z++) {
        for (let y = 5; y < 7; y++) {
          for (let x = 5; x < 7; x++) {
            setVoxel(grid, x, y, z, { x, y, z, color: blueBead })
          }
        }
      }

      const res = checkConnectivity6(grid)
      expect(res.isConnected).toBe(false)
      expect(res.componentCount).toBe(2)
      expect(res.sizes).toEqual([8, 8])
    })

    it('vóxeles que solo se tocan en diagonal (vértice o arista) NO están 6-conectados', () => {
      const grid = createEmptyVoxelGrid(3, 3, 3)
      setVoxel(grid, 0, 0, 0, { x: 0, y: 0, z: 0, color: redBead })
      setVoxel(grid, 1, 1, 0, { x: 1, y: 1, z: 0, color: redBead }) // Diagonal en plano XY

      const res = checkConnectivity6(grid)
      expect(res.isConnected).toBe(false)
      expect(res.componentCount).toBe(2)
      expect(res.sizes).toEqual([1, 1])
    })
  })

  describe('Identificación de Vóxeles Interiores 3D y Erosión (identifyInteriorVoxels3D & erodeVoxelGrid)', () => {
    it('en un cubo 3x3x3 con grosor de pared 1, solo el centro exacto (1,1,1) es interior', () => {
      const cube = createSolidVoxelCube(3)
      const interior = identifyInteriorVoxels3D(cube, 1)

      let interiorCount = 0
      for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            if (interior[z][y][x]) {
              interiorCount++
              expect(x).toBe(1)
              expect(y).toBe(1)
              expect(z).toBe(1)
            }
          }
        }
      }
      expect(interiorCount).toBe(1)
    })

    it('en un cubo 3x3x3 con grosor de pared 2, ningún vóxel es interior (permanece 100% sólido)', () => {
      const cube = createSolidVoxelCube(3)
      const interior = identifyInteriorVoxels3D(cube, 2)
      expect(interior.flat(2).every((v) => v === false)).toBe(true)
    })

    it('en un cubo 5x5x5 con grosor de pared 1, el núcleo central 3x3x3 (27 vóxeles) es interior', () => {
      const cube = createSolidVoxelCube(5)
      const interior = identifyInteriorVoxels3D(cube, 1)

      let count = 0
      for (let z = 0; z < 5; z++) {
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 5; x++) {
            const isBorder =
              x === 0 || x === 4 || y === 0 || y === 4 || z === 0 || z === 4
            if (isBorder) {
              expect(interior[z][y][x]).toBe(false)
            } else {
              expect(interior[z][y][x]).toBe(true)
              count++
            }
          }
        }
      }
      expect(count).toBe(27)
    })

    it('erodeVoxelGrid elimina la capa superficial exterior de vóxeles en 3D', () => {
      const cube3x3x3 = createSolidVoxelCube(3)
      const eroded = erodeVoxelGrid(cube3x3x3, 1)

      expect(countActiveVoxels(eroded)).toBe(1)
      expect(getVoxel(eroded, 1, 1, 1)).not.toBeNull()
    })
  })

  describe('Cavidades Selectivas (Máscaras y Aplicación)', () => {
    it('findConnected2DRegion extrae la región contigua según color semilla', () => {
      // 5x5 con un bloque central 3x3 de perlas azules y marco rojo
      const grid2D: BeadCell[][] = Array.from({ length: 5 }, (_, y) =>
        Array.from({ length: 5 }, (_, x) => {
          if (x >= 1 && x <= 3 && y >= 1 && y <= 3) return blueBead
          return redBead
        })
      )

      const blueRegion = findConnected2DRegion(grid2D, 2, 2, true)
      let blueCount = 0
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          if (blueRegion[y][x]) {
            blueCount++
            expect(grid2D[y][x]?.id).toBe('08')
          }
        }
      }
      expect(blueCount).toBe(9)
    })

    it('createCavityMaskByColor selecciona columnas del color objetivo en el rango Z especificado', () => {
      const grid2D: BeadCell[][] = [
        [redBead, blueBead],
        [redBead, redBead],
      ]
      const mask = createCavityMaskByColor(grid2D, 4, ['08'], [1, 2])

      // En Z=0 y Z=3 no debe haber cavidad
      expect(mask[0][0][1]).toBe(false)
      expect(mask[3][0][1]).toBe(false)

      // En Z=1 y Z=2 la columna del azul (x=1, y=0) está marcada
      expect(mask[1][0][1]).toBe(true)
      expect(mask[2][0][1]).toBe(true)

      // Columnas rojas nunca se marcan
      expect(mask[1][0][0]).toBe(false)
    })

    it('createCavityMaskBySeed genera máscara 3D proyectada de un componente conexo', () => {
      const grid2D: BeadCell[][] = [
        [redBead, blueBead],
        [redBead, blueBead],
      ]
      const mask = createCavityMaskBySeed(grid2D, 5, 1, 0, [1, 3])

      expect(mask[1][0][1]).toBe(true)
      expect(mask[1][1][1]).toBe(true)
      expect(mask[1][0][0]).toBe(false)
      expect(mask[0][0][1]).toBe(false) // Z=0 fuera del rango
    })

    it('applyCavity vacía los vóxeles objetivo, respeta tapas sólidas y marca paredes adyacentes', () => {
      // Crear prisma 5x5x5 sólido rojo
      const base2D = createSolid2DGrid(5, 5, redBead)
      // Definir una cavidad central 1x1 en (2,2)
      base2D[2][2] = blackBead // El negro representa el objetivo o cavidad

      const cube = extrudeFrom2D(base2D, { depth: 5, profile: 'prismatic' })
      expect(countActiveVoxels(cube)).toBe(125)

      // Crear máscara de cavidad para el color negro (#18) en capas intermedias [1, 3]
      const cavityMask = createCavityMaskByColor(base2D, 5, ['18'], [1, 3])
      const hollowed = applyCavity(cube, cavityMask, { preserveCapBottom: true, preserveCapTop: true })

      // Capa Z=0 (base) se mantiene sólida incluyendo (2, 2)
      expect(getVoxel(hollowed, 2, 2, 0)).not.toBeNull()
      // Capa Z=4 (tapa) se mantiene sólida
      expect(getVoxel(hollowed, 2, 2, 4)).not.toBeNull()

      // Capas Z=1, 2, 3 tienen la celda (2, 2) vaciada
      expect(getVoxel(hollowed, 2, 2, 1)).toBeNull()
      expect(getVoxel(hollowed, 2, 2, 2)).toBeNull()
      expect(getVoxel(hollowed, 2, 2, 3)).toBeNull()

      // Exactamente 3 vóxeles vaciados
      expect(countActiveVoxels(hollowed)).toBe(125 - 3)

      // Las perlas colindantes a la cavidad tienen flag isCavityWall = true
      const wallNeighbor = getVoxel(hollowed, 2, 1, 2) // Vecino en Y-1
      expect(wallNeighbor).not.toBeNull()
      expect(wallNeighbor?.isCavityWall).toBe(true)

      // Perlas lejanas en las esquinas NO son pared de la cavidad
      const cornerBead = getVoxel(hollowed, 0, 0, 2)
      expect(cornerBead?.isCavityWall).toBeFalsy()
    })
  })

  describe('Extracción de Planos y Slicing (extractZSlice & extractSlicePlane)', () => {
    it('extractZSlice extrae una capa Z horizontal específica como BeadCell[][]', () => {
      const base2D = createSolid2DGrid(3, 2, redBead)
      const grid = extrudeFrom2D(base2D, { depth: 3 })
      setVoxel(grid, 0, 0, 1, { x: 0, y: 0, z: 1, color: blueBead })

      const layer1 = extractZSlice(grid, 1)
      expect(layer1[0][0]).toEqual(blueBead)
      expect(layer1[0][1]).toEqual(redBead)

      // Fuera de rango devuelve capa vacía
      const outOfBounds = extractZSlice(grid, 99)
      expect(outOfBounds[0][0]).toBeNull()
    })

    it('sliceGridToLayers descompone el VoxelGrid3D en capas 2D compatibles con BeadCell[][]', () => {
      const base2D = createSolid2DGrid(3, 2, redBead)
      const grid = extrudeFrom2D(base2D, { depth: 3 })

      const layers = sliceGridToLayers(grid)
      expect(layers).toHaveLength(3)
      expect(layers[0]).toHaveLength(2)
      expect(layers[0][0]).toHaveLength(3)
      expect(layers[0][0][0]).toEqual(redBead)
    })

    it('extractSlicePlane extrae planos ortogonales en las 3 orientaciones cartesianas', () => {
      const grid = createEmptyVoxelGrid(3, 4, 5) // cols=3, rows=4, depth=5
      setVoxel(grid, 1, 2, 3, { x: 1, y: 2, z: 3, color: blueBead })

      // Plano XY a elevación Z=3 (dimensiones cols x rows = 3 x 4)
      const sliceXY = extractSlicePlane(grid, 'xy', 3)
      expect(sliceXY).toHaveLength(4)
      expect(sliceXY[0]).toHaveLength(3)
      expect(sliceXY[2][1]).toEqual(blueBead)

      // Plano YZ a columna X=1 (dimensiones depth x rows = 5 x 4)
      const sliceYZ = extractSlicePlane(grid, 'yz', 1)
      expect(sliceYZ).toHaveLength(4)
      expect(sliceYZ[0]).toHaveLength(5)
      expect(sliceYZ[2][3]).toEqual(blueBead)

      // Plano XZ a fila Y=2 (dimensiones cols x depth = 3 x 5)
      const sliceXZ = extractSlicePlane(grid, 'xz', 2)
      expect(sliceXZ).toHaveLength(5)
      expect(sliceXZ[0]).toHaveLength(3)
      expect(sliceXZ[3][1]).toEqual(blueBead)
    })
  })
})
