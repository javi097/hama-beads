import type { Model3DResult, AssemblyStep } from '@/interfaces/hama-3d.interface'
import type { HamaColor } from '@/interfaces/hama.interface'

/**
 * Convierte un resultado tridimensional (capas horizontales o placas ortogonales)
 * en una secuencia estructurada y ordenada de pasos de montaje para la guía técnica.
 *
 * Cada paso detalla la cuadrícula a montar, el desglose de inventario BOM parcial
 * requerido y consejos de ensamblaje.
 *
 * @param model Resultado 3D generado por el motor de voxelización
 * @returns Array ordenado de AssemblyStep[]
 */
export function deriveAssemblySteps(model: Model3DResult): AssemblyStep[] {
  const steps: AssemblyStep[] = []

  if (model.mode === 'interlocking') {
    const plates = model.plates || []
    plates.forEach((plate, index) => {
      const stepNumber = index + 1
      const countsMap = new Map<string, { color: HamaColor; count: number }>()
      let totalBeads = 0

      for (let y = 0; y < plate.cells.length; y++) {
        for (let x = 0; x < plate.cells[y].length; x++) {
          const bead = plate.cells[y][x]
          if (bead !== null) {
            totalBeads++
            const existing = countsMap.get(bead.id)
            if (existing) {
              existing.count++
            } else {
              countsMap.set(bead.id, { color: bead, count: 1 })
            }
          }
        }
      }

      const beadCounts = Array.from(countsMap.values()).sort((a, b) => b.count - a.count)

      let instructions = `Construye y plancha la placa ${plate.name}. Asegura que los dientes y ranuras queden perfectamente alineados para el encaje a 90°.`
      if (index === 0) {
        instructions = `Comienza construyendo la placa ${plate.name}. Esta pieza servirá como referencia principal de encastre.`
      } else if (index === plates.length - 1) {
        instructions = `Monta la placa final ${plate.name} y ensambla a presión suavemente las uniones machihembradas para completar la estructura.`
      }

      steps.push({
        stepNumber,
        title: `Paso ${stepNumber}: Placa ${plate.name}`,
        type: 'plate',
        cells: plate.cells,
        beadCounts,
        totalBeads,
        instructions,
      })
    })

    return steps
  }

  // Para modos 'hollow' y 'relief'
  const layers = model.layers || []
  layers.forEach((layer, index) => {
    const stepNumber = index + 1
    const countsMap = new Map<string, { color: HamaColor; count: number }>()
    let totalBeads = 0

    for (let y = 0; y < layer.cells.length; y++) {
      for (let x = 0; x < layer.cells[y].length; x++) {
        const bead = layer.cells[y][x]
        if (bead !== null) {
          totalBeads++
          const existing = countsMap.get(bead.id)
          if (existing) {
            existing.count++
          } else {
            countsMap.set(bead.id, { color: bead, count: 1 })
          }
        }
      }
    }

    const beadCounts = Array.from(countsMap.values()).sort((a, b) => b.count - a.count)

    let instructions: string
    if (index === 0) {
      instructions =
        'Coloca las perlas sobre la placa base según el diagrama de cuadrícula. Esta capa servirá como cimiento sólido.'
    } else if (index === layers.length - 1) {
      instructions =
        'Coloca la última capa de cierre y aplica calor uniforme con papel de planchado para consolidar la figura.'
    } else {
      if (model.mode === 'relief') {
        instructions = `Coloca las perlas del nivel ${layer.layerIndex} elevando el relieve según la cuadrícula.`
      } else {
        instructions = `Coloca las perlas perimetrales de la capa ${layer.layerIndex} preservando el hueco interior según las coordenadas numéricas.`
      }
    }

    steps.push({
      stepNumber,
      title: `Paso ${stepNumber}: ${layer.name}`,
      type: 'layer',
      cells: layer.cells,
      beadCounts,
      totalBeads,
      instructions,
    })
  })

  return steps
}
