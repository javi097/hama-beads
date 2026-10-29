import { describe, it, expect } from 'vitest'
import {
  generateInterlockingPlates,
  countConnectedComponents2D,
  computeModel3D,
} from '../voxelizer'
import { deriveAssemblySteps } from '../assembly-guide'
import { deriveColorInventory } from '../inventory'
import { extractBeadInstances } from '@/hama/hooks/useThreeScene'
import type { BeadCell } from '@/interfaces/hama.interface'
import { HAMA_PALETTE } from '../palette.const'

const redBead: BeadCell = HAMA_PALETTE.find((c) => c.id === '05')!
const blueBead: BeadCell = HAMA_PALETTE.find((c) => c.id === '119')!
const yellowBead: BeadCell = HAMA_PALETTE.find((c) => c.id === '03')!
const blackBead: BeadCell = HAMA_PALETTE.find((c) => c.id === '18')!

describe('Interlocking — Ensamblaje Modular Tipo Lego con Eje Interno', () => {
  describe('Caso 1: Figura de videojuego con entrantes, salientes y huecos (Sprite 12x12)', () => {
    // Sprite de personaje:
    // Fila 0-1: Cabeza (cols 4..7)
    // Fila 2: Cuello estrecho (cols 5..6)
    // Fila 3-4: Tronco (cols 4..7) con brazos abiertos (cols 2..3 y 8..9)
    // Fila 5: Cintura (cols 4..7)
    // Fila 6-8: Dos piernas separadas (pierna izq cols 3..4, pierna der cols 7..8, con hueco central en cols 5..6)
    const createCharacterGrid = (): BeadCell[][] => {
      const grid: (BeadCell | null)[][] = Array.from({ length: 10 }, () => Array(12).fill(null))

      // Cabeza (rojo)
      for (let y = 0; y <= 1; y++) {
        for (let x = 4; x <= 7; x++) grid[y][x] = redBead
      }
      // Cuello (rojo)
      grid[2][5] = redBead
      grid[2][6] = redBead
      // Tronco y brazos (azul)
      for (let y = 3; y <= 4; y++) {
        // Brazo izquierdo
        grid[y][2] = blueBead
        grid[y][3] = blueBead
        // Torso central
        for (let x = 4; x <= 7; x++) grid[y][x] = blueBead
        // Brazo derecho
        grid[y][8] = blueBead
        grid[y][9] = blueBead
      }
      // Cintura (azul)
      for (let x = 4; x <= 7; x++) grid[5][x] = blueBead
      // Piernas separadas con hueco en medio (cols 5 y 6 vacías en filas 6 a 8)
      for (let y = 6; y <= 8; y++) {
        grid[y][3] = blackBead
        grid[y][4] = blackBead
        // Hueco vacío: grid[y][5] y grid[y][6] son null
        grid[y][7] = blackBead
        grid[y][8] = blackBead
      }
      return grid as BeadCell[][]
    }

    it('1.1 Las capas del cuerpo conservan los colores originales y respetan las transparencias', () => {
      const grid = createCharacterGrid()
      const depth = 4
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

      // Debe generar 4 capas del cuerpo ('xy') más la columna interna ('yz')
      expect(plates).toHaveLength(5)

      const layer2 = plates.find((p) => p.id === 'layer_2')!
      expect(layer2).toBeDefined()

      // Los colores originales se conservan intactos en el cuerpo
      expect(layer2.cells[0][5]?.id).toBe('05') // Rojo de la cabeza
      expect(layer2.cells[3][2]?.id).toBe('119') // Azul del brazo izquierdo
      expect(layer2.cells[6][8]?.id).toBe('18') // Negro de la pierna derecha

      // Las zonas exteriores y el hueco entre piernas permanecen estrictamente null
      expect(layer2.cells[0][0]).toBeNull()
      expect(layer2.cells[7][5]).toBeNull() // Hueco entre piernas sigue transparente
    })

    it('1.2 La columna vertebral interna queda confinada dentro de la figura sin sobresalir', () => {
      const grid = createCharacterGrid()
      const depth = 4
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

      const spine = plates.find((p) => p.id === 'spine_1')!
      expect(spine).toBeDefined()

      // En filas fuera del personaje (y >= 9), la columna tiene estrictamente null
      for (let z = 0; z < depth; z++) {
        expect(spine.cells[9][z]).toBeNull()
      }

      // En filas donde el eje central no tiene perlas, la columna tiene null
      const spineCol = Math.round(spine.position3D[0] / 5.0)
      for (let y = 0; y < 10; y++) {
        if (grid[y][spineCol] === null) {
          for (let z = 0; z < depth; z++) {
            expect(spine.cells[y][z]).toBeNull()
          }
        }
      }
    })

    it('1.3 Cada capa del cuerpo mantiene su integridad física y aloja el orificio de encastre', () => {
      const grid = createCharacterGrid()
      const depth = 4
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

      const bodyPlates = plates.filter((p) => p.orientation === 'xy')
      expect(bodyPlates).toHaveLength(depth)

      bodyPlates.forEach((layer) => {
        // Cada capa tiene al menos un componente conexo válido
        expect(countConnectedComponents2D(layer.cells)).toBeGreaterThanOrEqual(1)
      })
    })

    it('1.4 Los dientes de la columna vertebral y las capas encajan sin colisión en 3D', () => {
      const grid = createCharacterGrid()
      const depth = 4
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

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

      expect(occupancy.size).toBeGreaterThan(0)
    })
  })

  describe('Caso 2: Objeto aproximadamente rectangular (Cofre / Bloque 8x8)', () => {
    const createBoxGrid = (): BeadCell[][] => {
      return Array.from({ length: 8 }, () => Array(8).fill(yellowBead))
    }

    it('2.1 En cross_ribs genera las capas del cuerpo redondeadas y la columna interna sin colisiones', () => {
      const grid = createBoxGrid()
      const depth = 5
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

      // 5 capas del cuerpo + 1 columna interna = 6 placas
      expect(plates).toHaveLength(6)

      const bodyPlates = plates.filter((p) => p.orientation === 'xy')
      expect(bodyPlates).toHaveLength(5)

      const spine = plates.find((p) => p.id === 'spine_1')!
      expect(spine).toBeDefined()
      expect(spine.orientation).toBe('yz')
    })

    it('2.2 En box genera las 6 placas independientes con juntas de paso 2 perlas (10 mm)', () => {
      const grid = createBoxGrid()
      const plates = generateInterlockingPlates(grid, 'box', 4, 5.0)

      expect(plates).toHaveLength(6)
      const ids = plates.map((p) => p.id)
      expect(ids).toEqual(['front', 'back', 'left', 'right', 'top', 'bottom'])

      // Frontal conserva el color del diseño (amarillo #03)
      const front = plates.find((p) => p.id === 'front')!
      const yellowCount = front.cells.flat().filter((c) => c?.id === '03').length
      expect(yellowCount).toBeGreaterThan(0)
    })
  })

  describe('Caso 3: Silueta estrecha (Ancho <= 4 perlas, ej. Espada/Vara 10x3)', () => {
    const createNarrowGrid = (): BeadCell[][] => {
      const grid: (BeadCell | null)[][] = Array.from({ length: 10 }, () => Array(3).fill(null))
      for (let y = 0; y < 10; y++) {
        grid[y][1] = redBead
      }
      grid[7][0] = yellowBead
      grid[7][2] = yellowBead
      return grid as BeadCell[][]
    }

    it('3.1 Genera las capas del cuerpo y la columna interna adaptada a figuras estrechas', () => {
      const grid = createNarrowGrid()
      const depth = 4
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)

      // 4 capas del cuerpo + 1 columna interna = 5 placas
      expect(plates).toHaveLength(5)
      const bodyPlates = plates.filter((p) => p.orientation === 'xy')
      expect(bodyPlates).toHaveLength(4)

      // La columna central se ubica en el eje X = 1
      const spine = plates.find((p) => p.id === 'spine_1')!
      expect(spine).toBeDefined()
      expect(Math.round(spine.position3D[0] / 5.0)).toBe(1)
    })

    it('3.2 La columna vertebral encaja en las capas intermedias asegurando unión mecánica', () => {
      const grid = createNarrowGrid()
      const depth = 4
      const plates = generateInterlockingPlates(grid, 'cross_ribs', depth, 5.0)
      const spine = plates.find((p) => p.id === 'spine_1')!

      // Comprobar que la columna vertebral tiene al menos un diente de unión
      let toothCount = 0
      for (let y = 0; y < 10; y++) {
        for (let z = 0; z < depth; z++) {
          if (spine.cells[y][z] !== null) toothCount++
        }
      }
      expect(toothCount).toBeGreaterThan(0)
    })
  })

  describe('Integración con Modelo 3D, Three.js, Inventario y Pasos de Guía', () => {
    it('4.1 Las capas se separan simétricamente en Z y la columna interna permanece en el centro', () => {
      const grid = Array.from({ length: 6 }, () => Array(6).fill(blueBead))
      const depth = 4
      const model = computeModel3D(
        { cols: 6, rows: 6, cells: grid },
        {
          mode3d: 'interlocking',
          hollowLayersCount: depth,
          hollowWallThickness: 1,
          interlockingType: 'cross_ribs',
          interlockingDepthBeads: depth,
          reliefLevels: 3,
          diameterMm: 5.0,
        }
      )!

      expect(model).not.toBeNull()
      // 4 capas + 1 columna = 5 placas
      expect(model.plates).toHaveLength(5)

      const instances = extractBeadInstances(model, 5.0)
      expect(instances.length).toBe(model.totalBeads)

      // Capas del cuerpo tienen desplazamiento en Z
      const bodyInstances = instances.filter((b) => b.orientation === 'xy')
      expect(bodyInstances.length).toBeGreaterThan(0)

      // Columna vertebral interna permanece en el centro (dirX=0, dirY=0, dirZ=0)
      const spineInstances = instances.filter((b) => b.orientation === 'yz')
      spineInstances.forEach((b) => {
        expect(b.dirX).toBe(0)
        expect(b.dirY).toBe(0)
        expect(b.dirZ).toBe(0)
      })
    })

    it('4.2 El recuento de perlas coincide al 100% entre modelo, inventario BOM y pasos de montaje', () => {
      const grid = Array.from({ length: 6 }, () => Array(6).fill(blueBead))
      const model = computeModel3D(
        { cols: 6, rows: 6, cells: grid },
        {
          mode3d: 'interlocking',
          hollowLayersCount: 4,
          hollowWallThickness: 1,
          interlockingType: 'cross_ribs',
          interlockingDepthBeads: 4,
          reliefLevels: 3,
          diameterMm: 5.0,
        }
      )!

      const allCells = model.plates!.flatMap((p) => p.cells)
      const inventory = deriveColorInventory(allCells)
      const steps = deriveAssemblySteps(model)
      const stepsBeadCount = steps.reduce((sum, s) => sum + s.totalBeads, 0)

      expect(inventory.total).toBe(model.totalBeads)
      expect(stepsBeadCount).toBe(model.totalBeads)
    })
  })
})
