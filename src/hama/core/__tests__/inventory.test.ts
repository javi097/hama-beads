import { describe, it, expect } from 'vitest'
import { deriveColorInventory } from '../inventory'
import { HAMA_PALETTE } from '../palette.const'
import type { BeadCell } from '@/interfaces/hama.interface'

describe('inventory / deriveColorInventory', () => {
  it('agrupa y cuenta las perlas por color ordenadas de mayor a menor frecuencia', () => {
    // Cuadrícula 2x2:
    // [Rojo #05, Blanco #01]
    // [Rojo #05, null]
    const rojo = HAMA_PALETTE.find((c) => c.id === '05')!
    const blanco = HAMA_PALETTE.find((c) => c.id === '01')!
    const cells: BeadCell[][] = [
      [rojo, blanco], // Rojo, Blanco
      [rojo, null],   // Rojo, Vacío
    ]

    const inventory = deriveColorInventory(cells)

    expect(inventory.total).toBe(3)
    expect(inventory.items.length).toBe(2)

    // El color más frecuente es Rojo (2 unidades)
    expect(inventory.items[0].color.id).toBe('05')
    expect(inventory.items[0].count).toBe(2)

    // El segundo es Blanco (1 unidad)
    expect(inventory.items[1].color.id).toBe('01')
    expect(inventory.items[1].count).toBe(1)
  })

  it('devuelve total 0 y lista vacía si todas las celdas son transparentes (null)', () => {
    const cells: BeadCell[][] = [
      [null, null],
      [null, null],
    ]

    const inventory = deriveColorInventory(cells)

    expect(inventory.total).toBe(0)
    expect(inventory.items).toEqual([])
  })

  it('devuelve total 0 si la matriz de celdas está vacía', () => {
    const inventory = deriveColorInventory([])
    expect(inventory.total).toBe(0)
    expect(inventory.items).toEqual([])
  })
})
