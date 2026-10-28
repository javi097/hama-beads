// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import {
  extractBeadInstances,
  groupInstancesByColor,
  calcInstanceMatrix,
  disposeThreeScene,
} from '../useThreeScene'
import { generateHollowLayers, generateInterlockingPlates } from '@/hama/core/voxelizer'
import { HAMA_PALETTE } from '@/hama/core/palette.const'
import type { BeadCell } from '@/interfaces/hama.interface'
import type { Model3DResult } from '@/interfaces/hama-3d.interface'

const redBead = HAMA_PALETTE.find((c) => c.id === '05')!

function createSolidGrid(cols: number, rows: number, bead = redBead): BeadCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => bead))
}

describe('useThreeScene — Core 3D Geometry and GPU Lifecycle', () => {
  describe('extractBeadInstances', () => {
    it('extrae todas las perlas y las centra en el origen (0, 0, 0) para modelos apilados', () => {
      const grid = createSolidGrid(3, 3, redBead)
      const layers = generateHollowLayers(grid, 3, 1, 5.0)
      const totalBeads = layers.reduce((sum, l) => sum + l.beadCount, 0)

      const model: Model3DResult = {
        mode: 'hollow',
        layers,
        totalBeads,
        dimensionsMm: { x: 15, y: 15, z: 15 },
      }

      const instances = extractBeadInstances(model, 5.0)

      expect(instances).toHaveLength(totalBeads)

      // Comprobar centrado en X e Y
      const xs = instances.map((b) => b.x)
      const ys = instances.map((b) => b.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      expect((minX + maxX) / 2).toBeCloseTo(0, 1)
      expect((minY + maxY) / 2).toBeCloseTo(0, 1)

      // Comprobar vector de dirección para vista explosionada (desplazamiento vertical en Z)
      instances.forEach((inst) => {
        expect(inst.dirX).toBe(0)
        expect(inst.dirY).toBe(0)
        // La capa 1 tiene dirZ = 0, capa 2 tiene dirZ = 1, capa 3 tiene dirZ = 2
        expect(inst.dirZ).toBe(inst.layerIndex - 1)
      })
    })

    it('asigna vectores de desplazamiento normales a cada cara en modelos Interlocking (Box)', () => {
      const grid = createSolidGrid(4, 4, redBead)
      const plates = generateInterlockingPlates(grid, 'box', 4, 5.0)
      const totalBeads = plates.reduce((sum, p) => {
        let count = 0
        p.cells.forEach((row) => row.forEach((c) => c && count++))
        return sum + count
      }, 0)

      const model: Model3DResult = {
        mode: 'interlocking',
        plates,
        totalBeads,
        dimensionsMm: { x: 20, y: 20, z: 20 },
      }

      const instances = extractBeadInstances(model, 5.0)
      expect(instances).toHaveLength(totalBeads)

      // Frontal debe proyectar hacia +Z
      const frontBeads = instances.filter((b) => b.layerIndex === 1)
      expect(frontBeads.length).toBeGreaterThan(0)
      frontBeads.forEach((b) => {
        expect(b.dirZ).toBe(1)
        expect(b.dirX).toBe(0)
        expect(b.dirY).toBe(0)
      })

      // Trasera debe proyectar hacia -Z
      const backBeads = instances.filter((b) => b.layerIndex === 2)
      expect(backBeads.length).toBeGreaterThan(0)
      backBeads.forEach((b) => {
        expect(b.dirZ).toBe(-1)
      })
    })
  })

  describe('groupInstancesByColor', () => {
    it('agrupa las perlas correctamente por ID de color oficial Hama', () => {
      const instances = [
        {
          colorId: '05',
          hex: '#ff0000',
          x: 0,
          y: 0,
          z: 0,
          layerIndex: 1,
          dirX: 0,
          dirY: 0,
          dirZ: 0,
        },
        {
          colorId: '05',
          hex: '#ff0000',
          x: 5,
          y: 0,
          z: 0,
          layerIndex: 1,
          dirX: 0,
          dirY: 0,
          dirZ: 0,
        },
        {
          colorId: '18',
          hex: '#000000',
          x: 10,
          y: 0,
          z: 0,
          layerIndex: 1,
          dirX: 0,
          dirY: 0,
          dirZ: 0,
        },
      ]

      const grouped = groupInstancesByColor(instances)
      expect(grouped.size).toBe(2)
      expect(grouped.get('05')?.beads).toHaveLength(2)
      expect(grouped.get('18')?.beads).toHaveLength(1)
      expect(grouped.get('05')?.hex).toBe('#ff0000')
    })
  })

  describe('calcInstanceMatrix', () => {
    const dummyMatrix = new THREE.Matrix4()
    const dummyObject = new THREE.Object3D()

    it('aplica la separación métrica de la vista explosionada', () => {
      const bead = {
        colorId: '05',
        hex: '#ff0000',
        x: 10,
        y: 20,
        z: 30,
        layerIndex: 2,
        dirX: 0,
        dirY: 0,
        dirZ: 1,
      }

      // Gap 15 mm -> nueva Z = 30 + 1 * 15 = 45
      const matrix = calcInstanceMatrix(bead, 15, null, dummyMatrix, dummyObject)

      const position = new THREE.Vector3()
      const scale = new THREE.Vector3()
      const quaternion = new THREE.Quaternion()
      matrix.decompose(position, quaternion, scale)

      expect(position.x).toBe(10)
      expect(position.y).toBe(20)
      expect(position.z).toBe(45)
      expect(scale.x).toBe(1)
      expect(scale.y).toBe(1)
      expect(scale.z).toBe(1)
    })

    it('escala a 0 (oculta) las perlas que no coincidan con activeLayerIndex', () => {
      const bead = {
        colorId: '05',
        hex: '#ff0000',
        x: 0,
        y: 0,
        z: 0,
        layerIndex: 2,
        dirX: 0,
        dirY: 0,
        dirZ: 0,
      }

      // Si activeLayerIndex es 1, la perla de capa 2 debe tener escala 0 (oculta en GPU)
      const matrixHidden = calcInstanceMatrix(bead, 0, 1, dummyMatrix, dummyObject)
      expect(matrixHidden.getMaxScaleOnAxis()).toBe(0)

      // Si activeLayerIndex es 2, la perla de capa 2 debe tener escala 1 (visible)
      const matrixVisible = calcInstanceMatrix(bead, 0, 2, dummyMatrix, dummyObject)
      expect(matrixVisible.getMaxScaleOnAxis()).toBe(1)
    })
  })

  describe('disposeThreeScene (Defensive GPU Cleanup)', () => {
    it('libera geometrías, materiales y fuerza la pérdida de contexto de WebGL', () => {
      const scene = new THREE.Scene()
      const geom = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 })
      const mesh = new THREE.Mesh(geom, mat)
      scene.add(mesh)

      const geomDisposeSpy = vi.spyOn(geom, 'dispose')
      const matDisposeSpy = vi.spyOn(mat, 'dispose')

      const mockRenderer = {
        dispose: vi.fn(),
        forceContextLoss: vi.fn(),
      } as unknown as THREE.WebGLRenderer

      disposeThreeScene(scene, mockRenderer)

      expect(geomDisposeSpy).toHaveBeenCalled()
      expect(matDisposeSpy).toHaveBeenCalled()
      expect(mockRenderer.dispose).toHaveBeenCalled()
      expect(mockRenderer.forceContextLoss).toHaveBeenCalled()
      expect(scene.children).toHaveLength(0)
    })
  })
})
