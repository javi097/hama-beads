import type { BeadCell, ColorCount, HamaColor } from '@/interfaces/hama.interface'

export interface InventoryResult {
  items: ColorCount[]
  total: number
}

/**
 * Deriva el inventario de materiales (BOM) agrupando por color y ordenando
 * descendentemente por número de cuentas (RF-12).
 */
export function deriveColorInventory(cells: BeadCell[][]): InventoryResult {
  const countsMap = new Map<string, { color: HamaColor; count: number }>()
  let total = 0

  for (let y = 0; y < cells.length; y++) {
    const row = cells[y]
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]
      if (cell) {
        total++
        const existing = countsMap.get(cell.id)
        if (existing) {
          existing.count++
        } else {
          countsMap.set(cell.id, { color: cell, count: 1 })
        }
      }
    }
  }

  const items = Array.from(countsMap.values()).sort((a, b) => b.count - a.count)

  return {
    items,
    total,
  }
}
