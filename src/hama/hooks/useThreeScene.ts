import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Model3DResult } from '@/interfaces/hama-3d.interface'

export interface BeadInstance {
  colorId: string
  hex: string
  x: number
  y: number
  z: number
  layerIndex: number
  dirX: number
  dirY: number
  dirZ: number
}

export interface UseThreeSceneOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  model3D: Model3DResult | null
  explodedGapMm: number
  activeLayerIndex: number | null
  beadShape?: 'hollow' | 'pixel'
  diameterMm?: number
}

export interface UseThreeSceneReturn {
  resetCamera: () => void
  getCanvasSnapshotUrl: () => string
  isReady: boolean
}

/**
 * Extrae y posiciona todas las perlas tridimensionales a partir de un Model3DResult,
 * centrando el conjunto geométrico en el origen (0, 0, 0).
 */
export function extractBeadInstances(
  model: Model3DResult,
  diameterMm: number
): BeadInstance[] {
  const rawBeads: BeadInstance[] = []

  if (model.mode === 'hollow' || model.mode === 'relief') {
    const layers = model.layers || []
    layers.forEach((layer, layerIdx) => {
      const zOffset = layer.zOffsetMm
      for (let y = 0; y < layer.cells.length; y++) {
        for (let x = 0; x < layer.cells[y].length; x++) {
          const bead = layer.cells[y][x]
          if (bead !== null) {
            rawBeads.push({
              colorId: bead.id,
              hex: bead.hex,
              x: (x + 0.5) * diameterMm,
              y: -((y + 0.5) * diameterMm),
              z: zOffset,
              layerIndex: layer.layerIndex,
              dirX: 0,
              dirY: 0,
              dirZ: layerIdx, // Cada capa se desplaza en +Z en la vista explosionada
            })
          }
        }
      }
    })
  } else if (model.mode === 'interlocking') {
    const plates = model.plates || []
    plates.forEach((plate, plateIdx) => {
      const layerIndex = plateIdx + 1
      let dirX = 0
      let dirY = 0
      let dirZ = 0

      if (plate.id === 'front') dirZ = 1
      else if (plate.id === 'back') dirZ = -1
      else if (plate.id === 'left') dirX = -1
      else if (plate.id === 'right') dirX = 1
      else if (plate.id === 'top') dirY = 1
      else if (plate.id === 'bottom') dirY = -1
      else if (plate.id === 'rib_1') dirZ = 1
      else if (plate.id === 'rib_2') dirZ = -1

      const [posX, posY, posZ] = plate.position3D

      for (let r = 0; r < plate.cells.length; r++) {
        for (let c = 0; c < plate.cells[r].length; c++) {
          const bead = plate.cells[r][c]
          if (bead !== null) {
            let xPos = 0
            let yPos = 0
            let zPos = 0

            if (plate.orientation === 'xy') {
              xPos = posX + (c + 0.5) * diameterMm
              yPos = posY - (r + 0.5) * diameterMm
              zPos = posZ
            } else if (plate.orientation === 'yz') {
              xPos = posX
              yPos = posY - (r + 0.5) * diameterMm
              zPos = posZ + (c + 0.5) * diameterMm
            } else if (plate.orientation === 'xz') {
              xPos = posX + (c + 0.5) * diameterMm
              yPos = posY
              zPos = posZ + (r + 0.5) * diameterMm
            }

            rawBeads.push({
              colorId: bead.id,
              hex: bead.hex,
              x: xPos,
              y: yPos,
              z: zPos,
              layerIndex,
              dirX,
              dirY,
              dirZ,
            })
          }
        }
      }
    })
  }

  if (rawBeads.length === 0) return []

  // Calcular centro y trasladar la figura al origen (0, 0, 0)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const b of rawBeads) {
    if (b.x < minX) minX = b.x
    if (b.x > maxX) maxX = b.x
    if (b.y < minY) minY = b.y
    if (b.y > maxY) maxY = b.y
    if (b.z < minZ) minZ = b.z
    if (b.z > maxZ) maxZ = b.z
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const centerZ = (minZ + maxZ) / 2

  return rawBeads.map((b) => ({
    ...b,
    x: b.x - centerX,
    y: b.y - centerY,
    z: b.z - centerZ,
  }))
}

/**
 * Agrupa las perlas por ID de color para instanciar mallas compartidas (InstancedMesh).
 */
export function groupInstancesByColor(
  instances: BeadInstance[]
): Map<string, { hex: string; beads: BeadInstance[] }> {
  const map = new Map<string, { hex: string; beads: BeadInstance[] }>()
  for (const inst of instances) {
    let group = map.get(inst.colorId)
    if (!group) {
      group = { hex: inst.hex, beads: [] }
      map.set(inst.colorId, group)
    }
    group.beads.push(inst)
  }
  return map
}

/**
 * Calcula la matriz 4x4 de transformación para una perla en tiempo real:
 * - Aplica traslación por vista explosionada: base + dir * gap.
 * - Aplica escala 0 si la capa no coincide con activeLayerIndex (aislamiento).
 */
export function calcInstanceMatrix(
  bead: BeadInstance,
  explodedGapMm: number,
  activeLayerIndex: number | null,
  dummyMatrix: THREE.Matrix4,
  dummyObject: THREE.Object3D
): THREE.Matrix4 {
  const posX = bead.x + bead.dirX * explodedGapMm
  const posY = bead.y + bead.dirY * explodedGapMm
  const posZ = bead.z + bead.dirZ * explodedGapMm

  const isVisible = activeLayerIndex === null || bead.layerIndex === activeLayerIndex
  const scale = isVisible ? 1 : 0

  dummyObject.position.set(posX, posY, posZ)
  dummyObject.scale.set(scale, scale, scale)
  dummyObject.updateMatrix()

  dummyMatrix.copy(dummyObject.matrix)
  return dummyMatrix
}

/**
 * Libera de forma defensiva todos los recursos GPU asociados a la escena WebGL.
 */
export function disposeThreeScene(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer
): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) {
        obj.geometry.dispose()
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    }
  })

  while (scene.children.length > 0) {
    scene.remove(scene.children[0])
  }

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
}

interface MeshGroupData {
  mesh: THREE.InstancedMesh
  beads: BeadInstance[]
}

/**
 * Hook de React para inicializar y gestionar el ciclo de vida del visor WebGL con Three.js.
 */
export function useThreeScene({
  containerRef,
  model3D,
  explodedGapMm,
  activeLayerIndex,
  beadShape = 'hollow',
  diameterMm = 5.0,
}: UseThreeSceneOptions): UseThreeSceneReturn {
  const [isReady, setIsReady] = useState(false)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const meshGroupsRef = useRef<MeshGroupData[]>([])
  const animFrameIdRef = useRef<number | null>(null)

  const dummyMatrix = useRef(new THREE.Matrix4()).current
  const dummyObject = useRef(new THREE.Object3D()).current

  // Inicializar escena WebGL
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Comprobar soporte WebGL
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true, // Requerido para instantáneas en PDF
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.shadowMap.enabled = false
      container.appendChild(renderer.domElement)
    } catch {
      // Fallback si WebGL no está disponible
      return
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / (container.clientHeight || 1),
      0.1,
      2000
    )
    camera.position.set(0, 50, 100)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 1000
    controls.minDistance = 5

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera
    controlsRef.current = controls

    // Loop de renderizado
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
    setIsReady(true)

    // Observador de redimensionamiento
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
        }
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
      controls.dispose()
      disposeThreeScene(scene, renderer)
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      meshGroupsRef.current = []
      setIsReady(false)
    }
  }, [containerRef])

  // Reconstruir InstancedMeshes cuando cambia el modelo o la geometría base
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Limpiar geometrías previas
    disposeThreeScene(scene)
    meshGroupsRef.current = []

    // Iluminación volumétrica
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight1.position.set(100, 150, 100)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
    dirLight2.position.set(-100, -50, -100)
    scene.add(dirLight2)

    if (!model3D || model3D.totalBeads === 0) return

    const instances = extractBeadInstances(model3D, diameterMm)
    if (instances.length === 0) return

    const grouped = groupInstancesByColor(instances)

    // Crear geometría compartida
    let geometry: THREE.BufferGeometry
    if (beadShape === 'pixel') {
      geometry = new THREE.BoxGeometry(
        diameterMm * 0.95,
        diameterMm * 0.95,
        diameterMm * 0.95
      )
    } else {
      geometry = new THREE.CylinderGeometry(
        (diameterMm * 0.92) / 2,
        (diameterMm * 0.92) / 2,
        diameterMm * 0.85,
        16
      )
      // Orientar cilindro hacia el frente (eje Z)
      geometry.rotateX(Math.PI / 2)
    }

    const newGroups: MeshGroupData[] = []

    grouped.forEach(({ hex, beads }) => {
      const material = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.35,
        metalness: 0.05,
      })

      const instancedMesh = new THREE.InstancedMesh(geometry, material, beads.length)

      beads.forEach((bead, i) => {
        calcInstanceMatrix(bead, 0, null, dummyMatrix, dummyObject)
        instancedMesh.setMatrixAt(i, dummyMatrix)
      })

      instancedMesh.instanceMatrix.needsUpdate = true
      scene.add(instancedMesh)

      newGroups.push({
        mesh: instancedMesh,
        beads,
      })
    })

    meshGroupsRef.current = newGroups

    // Reencuadre automático de cámara
    const maxDim = Math.max(
      model3D.dimensionsMm.x,
      model3D.dimensionsMm.y,
      model3D.dimensionsMm.z
    )
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (camera && controls) {
      const dist = Math.max(maxDim * 1.8, 40)
      camera.position.set(dist * 0.7, dist * 0.8, dist * 1.2)
      camera.lookAt(0, 0, 0)
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }, [model3D, beadShape, diameterMm, dummyMatrix, dummyObject])

  // Actualización dinámica sin recreación de mallas (60 FPS para vista explosionada y aislamiento)
  useEffect(() => {
    meshGroupsRef.current.forEach(({ mesh, beads }) => {
      beads.forEach((bead, i) => {
        calcInstanceMatrix(
          bead,
          explodedGapMm,
          activeLayerIndex,
          dummyMatrix,
          dummyObject
        )
        mesh.setMatrixAt(i, dummyMatrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  }, [explodedGapMm, activeLayerIndex, dummyMatrix, dummyObject])

  const resetCamera = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    const model = model3D
    if (!camera || !controls || !model) return

    const maxDim = Math.max(
      model.dimensionsMm.x,
      model.dimensionsMm.y,
      model.dimensionsMm.z
    )
    const dist = Math.max(maxDim * 1.8, 40)
    camera.position.set(dist * 0.7, dist * 0.8, dist * 1.2)
    camera.lookAt(0, 0, 0)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [model3D])

  const getCanvasSnapshotUrl = useCallback(() => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!renderer || !scene || !camera) return ''

    renderer.render(scene, camera)
    return renderer.domElement.toDataURL('image/png')
  }, [])

  return {
    resetCamera,
    getCanvasSnapshotUrl,
    isReady,
  }
}
