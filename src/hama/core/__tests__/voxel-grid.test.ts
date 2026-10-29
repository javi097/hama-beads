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
  resolveVoxelColor,
  synthesizeRoundedVolume,
  extractStructuralGrid,
} from '../voxel-grid'
import { generateInterlockingPlates, computeModel3D } from '../voxelizer'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell, GridData } from '@/interfaces/hama.interface'
import type { VoxelGrid3D } from '@/interfaces/hama-3d.interface'

const redBead = HAMA_PALETTE.find((c) => c.id === '05')!
const blueBead = HAMA_PALETTE.find((c) => c.id === '08')!
const blackBead = HAMA_PALETTE.find((c) => c.id === '18')!
const yellowBead = HAMA_PALETTE.find((c) => c.id === '03')!
const greenBead = HAMA_PALETTE.find((c) => c.id === '10')!
const peachBead = HAMA_PALETTE.find((c) => c.id === '78')! // Melocotón / Piel
const whiteBead = HAMA_PALETTE.find((c) => c.id === '01')! // Blanco

// Fila representativa de cara o tallo: Borde Negro - Piel - Ojo Negro - Piel - Borde Negro
// Índices: 0=Null, 1=Negro (xStart), 2=Piel, 3=Negro (Ojo), 4=Piel, 5=Piel, 6=Negro (xEnd), 7=Null
const createFaceRow = (): BeadCell[][] => {
  const row: (BeadCell | null)[] = [
    null,
    blackBead, // 1 (xStart)
    peachBead, // 2
    blackBead, // 3 (Ojo)
    peachBead, // 4
    peachBead, // 5
    blackBead, // 6 (xEnd)
    null,
  ]
  return [row as BeadCell[]]
}

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

  describe('Asimetría Cromática Frontal vs. Dorsal (Ojos y Rasgos Faciales)', () => {
    it('en la cara frontal (z >= zCenter), el ojo conserva exactamente el color negro original', () => {
      const grid = createFaceRow()
      const zCenter = 2.0 // depth = 5
      const eyeColor = resolveVoxelColor(grid, 0, 3, 3, zCenter, 1, 6)
      expect(eyeColor?.id).toBe('18') // Sigue siendo negro en el frontal
    })

    it('en la cara dorsal (z < zCenter), el ojo se sustituye por el color base de relleno (piel/melocotón)', () => {
      const grid = createFaceRow()
      const zCenter = 2.0 // depth = 5
      const backHeadColor = resolveVoxelColor(grid, 0, 3, 0, zCenter, 1, 6)
      expect(backHeadColor?.id).toBe('78') // Se convierte en piel/melocotón en la nuca
    })

    it('los bordes exteriores de la silueta (xStart y xEnd) permanecen negros en 360°', () => {
      const grid = createFaceRow()
      const zCenter = 2.0
      // Borde izquierdo en la espalda
      const leftBorderBack = resolveVoxelColor(grid, 0, 1, 0, zCenter, 1, 6)
      expect(leftBorderBack?.id).toBe('18')
      // Borde derecho en la espalda
      const rightBorderBack = resolveVoxelColor(grid, 0, 6, 0, zCenter, 1, 6)
      expect(rightBorderBack?.id).toBe('18')
    })

    it('en el sombrero, las manchas blancas grandes se conservan envolventes en 360°', () => {
      // Fila de sombrero: Borde - Rojo - Blanco (Mancha) - Blanco - Rojo - Borde
      const row: (BeadCell | null)[] = [
        blackBead, // 0 (xStart)
        redBead,   // 1
        whiteBead, // 2 (Mancha blanca)
        whiteBead, // 3 (Mancha blanca)
        redBead,   // 4
        blackBead, // 5 (xEnd)
      ]
      const capGrid = [row as BeadCell[]]
      const zCenter = 2.0
      // En la espalda (z=0), la mancha blanca no se reemplaza porque no es un rasgo oscuro facial
      const spotBack = resolveVoxelColor(capGrid, 0, 2, 0, zCenter, 0, 5)
      expect(spotBack?.id).toBe('01') // Sigue siendo blanco
    })

    it('synthesizeRoundedVolume integra la regla cromática eliminando los ojos de la nuca', () => {
      const grid = createFaceRow()
      const depth = 5
      const volume = synthesizeRoundedVolume(grid, depth, 5.0)

      // En la superficie frontal exterior Z=zMax (Z=4), el vóxel en x=3 es negro (ojo visible)
      expect(getVoxel(volume, 3, 0, 4)?.color.id).toBe('18')

      // En la profundidad y plano central Z=2, el vóxel en x=3 es melocotón (masa estructural)
      expect(getVoxel(volume, 3, 0, 2)?.color.id).toBe('78')

      // En el plano dorsal Z=1, el vóxel en x=3 es melocotón (nuca limpia)
      expect(getVoxel(volume, 3, 0, 1)?.color.id).toBe('78')

      // En el plano dorsal Z=0, si el vóxel existe por la sección elipsoidal, es melocotón
      const voxelZ0 = getVoxel(volume, 3, 0, 0)
      if (voxelZ0) {
        expect(voxelZ0.color.id).toBe('78')
      }
    })
  })

  describe('Cromática y Geometría Continua — Interlocking cross_ribs (Validaciones Obligatorias)', () => {
    describe('Validaciones Cromáticas (frontGrid vs. structuralGrid)', () => {
      it('1. El frontal conserva exactamente el baseGrid original en toda la superficie', () => {
        // Cuadrícula multicolor con detalles pequeños y regiones grandes
        const grid: (BeadCell | null)[][] = [
          [redBead, redBead, blueBead, blueBead],
          [redBead, blackBead, blueBead, yellowBead],
          [redBead, redBead, blueBead, blueBead],
        ]
        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 4; x++) {
            const original = grid[y][x]
            if (original !== null) {
              // Encontrar la cota frontal zMax
              let zMax = -1
              for (let z = 0; z < volume.depth; z++) {
                if (getVoxel(volume, x, y, z) !== null) {
                  if (z > zMax) zMax = z
                }
              }
              expect(zMax).toBeGreaterThanOrEqual(0)
              expect(getVoxel(volume, x, y, zMax)?.color.id).toBe(original.id)
            }
          }
        }
      })

      it('2. Un ojo pequeño negro no se propaga hacia la espalda', () => {
        // Rojo 5x5 con un punto negro central (área 1, rodeado 100% por rojo)
        const grid: (BeadCell | null)[][] = Array.from({ length: 5 }, () =>
          Array.from({ length: 5 }, () => redBead)
        )
        grid[2][2] = blackBead

        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        // Encontrar zMax de la celda central (2, 2)
        let zMax = -1
        let zMin = Infinity
        for (let z = 0; z < volume.depth; z++) {
          if (getVoxel(volume, 2, 2, z) !== null) {
            if (z > zMax) zMax = z
            if (z < zMin) zMin = z
          }
        }

        // Frontal: es negro
        expect(getVoxel(volume, 2, 2, zMax)?.color.id).toBe(blackBead.id)

        // Toda la profundidad y espalda por detrás de zMax: es rojo
        for (let z = zMin; z < zMax; z++) {
          expect(getVoxel(volume, 2, 2, z)?.color.id).toBe(redBead.id)
        }
      })

      it('3. Un detalle pequeño de cualquier otro color tampoco se propaga a la espalda', () => {
        // Verde 5x5 con un botón amarillo central
        const grid: (BeadCell | null)[][] = Array.from({ length: 5 }, () =>
          Array.from({ length: 5 }, () => greenBead)
        )
        grid[2][2] = yellowBead

        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        let zMax = -1
        let zMin = Infinity
        for (let z = 0; z < volume.depth; z++) {
          if (getVoxel(volume, 2, 2, z) !== null) {
            if (z > zMax) zMax = z
            if (z < zMin) zMin = z
          }
        }

        expect(getVoxel(volume, 2, 2, zMax)?.color.id).toBe(yellowBead.id)
        for (let z = zMin; z < zMax; z++) {
          expect(getVoxel(volume, 2, 2, z)?.color.id).toBe(greenBead.id)
        }
      })

      it('4. Una región estructural grande mantiene su color en el volumen', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 4 }, () =>
          Array.from({ length: 4 }, () => redBead)
        )
        const structural = extractStructuralGrid(grid as BeadCell[][])

        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            expect(structural[y][x]?.id).toBe(redBead.id)
          }
        }
      })

      it('5. Dos regiones estructurales grandes mantienen sus respectivos colores', () => {
        // Mitad izquierda roja (3 cols), mitad derecha azul (3 cols)
        const grid: (BeadCell | null)[][] = Array.from({ length: 4 }, () => [
          redBead, redBead, redBead,
          blueBead, blueBead, blueBead,
        ])
        const structural = extractStructuralGrid(grid as BeadCell[][])

        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 3; x++) {
            expect(structural[y][x]?.id).toBe(redBead.id)
          }
          for (let x = 3; x < 6; x++) {
            expect(structural[y][x]?.id).toBe(blueBead.id)
          }
        }
      })

      it('6. Los colores laterales no se convierten en un único color predominante de toda la fila', () => {
        const grid: (BeadCell | null)[][] = [
          [redBead, redBead, redBead, blueBead, blueBead, blueBead],
          [redBead, redBead, redBead, blueBead, blueBead, blueBead],
        ]
        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        // En la mitad izquierda (x=0, lateral izquierdo), todos los vóxeles son rojos
        for (let z = 0; z < volume.depth; z++) {
          const v = getVoxel(volume, 0, 0, z)
          if (v) expect(v.color.id).toBe(redBead.id)
        }

        // En la mitad derecha (x=5, lateral derecho), todos los vóxeles son azules
        for (let z = 0; z < volume.depth; z++) {
          const v = getVoxel(volume, 5, 0, z)
          if (v) expect(v.color.id).toBe(blueBead.id)
        }
      })

      it('7. El color de una región es espacialmente continuo alrededor del volumen', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 4 }, () => [
          redBead, redBead, redBead,
          blueBead, blueBead, blueBead,
        ])
        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        // Verificar que ningún vóxel rojo invade la zona x >= 3 y viceversa
        for (let z = 0; z < volume.depth; z++) {
          for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 3; x++) {
              const v = getVoxel(volume, x, y, z)
              if (v) expect(v.color.id).toBe(redBead.id)
            }
            for (let x = 3; x < 6; x++) {
              const v = getVoxel(volume, x, y, z)
              if (v) expect(v.color.id).toBe(blueBead.id)
            }
          }
        }
      })
    })

    describe('Validaciones Geométricas y Continuidad Espacial', () => {
      it('8. Cada columna válida (x, y) es estrictamente continua en Z (zMin -> zMax)', () => {
        const grid = createFaceRow()
        const depth = 9
        const volume = synthesizeRoundedVolume(grid, depth, 5.0)

        for (let x = 0; x < 8; x++) {
          if (grid[0][x] !== null) {
            const zValues: number[] = []
            for (let z = 0; z < depth; z++) {
              if (getVoxel(volume, x, 0, z) !== null) {
                zValues.push(z)
              }
            }

            expect(zValues.length).toBeGreaterThan(0)
            // Comprobar que no hay saltos (z continuo)
            for (let i = 0; i < zValues.length - 1; i++) {
              expect(zValues[i + 1] - zValues[i]).toBe(1)
            }
          }
        }
      })

      it('9. No existen agujeros accidentales en las superficies X/Y', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 6 }, () =>
          Array.from({ length: 8 }, () => redBead)
        )
        const depth = 7
        const volume = synthesizeRoundedVolume(grid as BeadCell[][], depth, 5.0)

        // En cada capa Z, para cualquier fila, los vóxeles activos en X deben formar un segmento continuo
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < 6; y++) {
            const xActive: number[] = []
            for (let x = 0; x < 8; x++) {
              if (getVoxel(volume, x, y, z) !== null) {
                xActive.push(x)
              }
            }

            if (xActive.length > 0) {
              for (let i = 0; i < xActive.length - 1; i++) {
                expect(xActive[i + 1] - xActive[i]).toBe(1)
              }
            }
          }
        }
      })

      it('10. No aparecen vóxeles fuera de la silueta 2D válida', () => {
        // Figura en cruz (+) con esquinas null
        const grid: (BeadCell | null)[][] = [
          [null, redBead, null],
          [redBead, redBead, redBead],
          [null, redBead, null],
        ]
        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        for (let z = 0; z < volume.depth; z++) {
          expect(getVoxel(volume, 0, 0, z)).toBeNull()
          expect(getVoxel(volume, 2, 0, z)).toBeNull()
          expect(getVoxel(volume, 0, 2, z)).toBeNull()
          expect(getVoxel(volume, 2, 2, z)).toBeNull()
        }
      })

      it('11. Los huecos/concavidades reales del diseño 2D se conservan en todas las capas Z', () => {
        // Anillo (donut) con centro transparente
        const grid: (BeadCell | null)[][] = [
          [redBead, redBead, redBead],
          [redBead, null, redBead],
          [redBead, redBead, redBead],
        ]
        const volume = synthesizeRoundedVolume(grid as BeadCell[][], 5, 5.0)

        for (let z = 0; z < volume.depth; z++) {
          expect(getVoxel(volume, 1, 1, z)).toBeNull()
        }
      })

      it('12. Las superficies exteriores no se perforan durante el ahuecado en cross_ribs', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 6 }, () =>
          Array.from({ length: 6 }, () => redBead)
        )
        const depth = 5
        const grid3D = synthesizeRoundedVolume(grid as BeadCell[][], depth, 5.0)
        const interior3D = identifyInteriorVoxels3D(grid3D, 1)
        const plates = generateInterlockingPlates(grid as BeadCell[][], 'cross_ribs', depth, 5.0)

        // Comprobar que NINGÚN vóxel de superficie exterior (interior3D === false) ha sido eliminado en las placas
        for (let z = 0; z < depth; z++) {
          const plate = plates.find((p) => p.id === `layer_${z + 1}`)!
          expect(plate).toBeDefined()

          for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
              const voxel = grid3D.voxels[z][y][x]
              if (voxel !== null && !interior3D[z]?.[y]?.[x]) {
                // Es superficie exterior: debe estar obligatoriamente presente en la placa (no perforado)
                expect(plate.cells[y][x]).not.toBeNull()
              }
            }
          }
        }
      })

      it('13. El eje interno sigue teniendo su espacio necesario en el núcleo', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => redBead)
        )
        const depth = 5
        const plates = generateInterlockingPlates(grid as BeadCell[][], 'cross_ribs', depth, 5.0)

        const spine = plates.find((p) => p.id === 'spine_1')
        expect(spine).toBeDefined()

        let spineActive = 0
        spine?.cells.forEach((row) => {
          row.forEach((cell) => {
            if (cell !== null) spineActive++
          })
        })
        expect(spineActive).toBeGreaterThan(0)
      })

      it('14. No existen colisiones espaciales entre el eje interno y las placas del cuerpo', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 8 }, () =>
          Array.from({ length: 8 }, () => redBead)
        )
        const depth = 5
        const plates = generateInterlockingPlates(grid as BeadCell[][], 'cross_ribs', depth, 5.0)

        const occupancy = new Set<string>()

        for (const plate of plates) {
          const [posX, posY, posZ] = plate.position3D
          const d = 5.0

          for (let r = 0; r < plate.cells.length; r++) {
            for (let c = 0; c < plate.cells[r].length; c++) {
              if (plate.cells[r][c] !== null) {
                let x = 0
                let y = 0
                let z = 0

                if (plate.orientation === 'xy') {
                  x = Math.round((posX + (c + 0.5) * d - 0.5 * d) / d)
                  y = Math.round(-(posY - (r + 0.5) * d + 0.5 * d) / d)
                  z = Math.round((posZ + 0.5 * d - 0.5 * d) / d)
                } else if (plate.orientation === 'yz') {
                  x = Math.round((posX + 0.5 * d - 0.5 * d) / d)
                  y = Math.round(-(posY - (r + 0.5) * d + 0.5 * d) / d)
                  z = Math.round((posZ + (c + 0.5) * d - 0.5 * d) / d)
                }

                const key = `${x},${y},${z}`
                expect(occupancy.has(key)).toBe(false)
                occupancy.add(key)
              }
            }
          }
        }
      })
    })

    describe('Integridad Global', () => {
      it('15. cross_ribs genera el número esperado de capas y la columna conectora', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 6 }, () =>
          Array.from({ length: 6 }, () => redBead)
        )
        const depth = 5
        const plates = generateInterlockingPlates(grid as BeadCell[][], 'cross_ribs', depth, 5.0)

        const bodyPlates = plates.filter((p) => p.orientation === 'xy')
        expect(bodyPlates).toHaveLength(depth)

        const spinePlate = plates.find((p) => p.orientation === 'yz')
        expect(spinePlate).toBeDefined()
      })

      it('16. El BOM de cuentas coincide con el total de perlas en computeModel3D', () => {
        const grid: (BeadCell | null)[][] = Array.from({ length: 6 }, () =>
          Array.from({ length: 6 }, () => redBead)
        )
        const gridData: GridData = {
          cells: grid as BeadCell[][],
          cols: 6,
          rows: 6,
        }

        const model = computeModel3D(gridData, {
          mode3d: 'interlocking',
          hollowLayersCount: 5,
          hollowWallThickness: 1,
          interlockingType: 'cross_ribs',
          interlockingDepthBeads: 5,
          reliefLevels: 3,
          diameterMm: 5.0,
        })

        expect(model).not.toBeNull()
        expect(model?.mode).toBe('interlocking')

        let platesSum = 0
        model?.plates?.forEach((plate) => {
          plate.cells.forEach((row) => {
            row.forEach((cell) => {
              if (cell !== null) platesSum++
            })
          })
        })

        expect(model?.totalBeads).toBe(platesSum)
      })
    })
  })
})
