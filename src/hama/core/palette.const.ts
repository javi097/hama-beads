import type { BeadType, HamaColor } from '@/interfaces/hama.interface'

interface RawHamaColor {
  id: string
  name: string
  hex: string
}

const RAW_HAMA_PALETTE: readonly RawHamaColor[] = [
  { id: '01', name: 'Blanco (White)', hex: '#FFFFFF' },
  { id: '02', name: 'Crema (Cream)', hex: '#F3E5AB' },
  { id: '03', name: 'Amarillo (Yellow)', hex: '#F7D000' },
  { id: '04', name: 'Naranja (Orange)', hex: '#E85D04' },
  { id: '05', name: 'Rojo (Red)', hex: '#D90429' },
  { id: '06', name: 'Rosa (Pink)', hex: '#F472B6' },
  { id: '07', name: 'Morado (Purple)', hex: '#7209B7' },
  { id: '08', name: 'Azul (Blue)', hex: '#1D4ED8' },
  { id: '09', name: 'Azul Claro (Light Blue)', hex: '#38BDF8' },
  { id: '10', name: 'Verde (Green)', hex: '#15803D' },
  { id: '11', name: 'Verde Claro (Light Green)', hex: '#4ADE80' },
  { id: '12', name: 'Marrón (Brown)', hex: '#5C3D2E' },
  { id: '17', name: 'Gris (Grey)', hex: '#94A3B8' },
  { id: '18', name: 'Negro (Black)', hex: '#111827' },
  { id: '20', name: 'Marrón Rojizo (Reddish Brown)', hex: '#8B4513' },
  { id: '21', name: 'Marrón Claro (Light Brown)', hex: '#C49A6C' },
  { id: '22', name: 'Rojo Oscuro (Dark Red)', hex: '#800020' },
  { id: '26', name: 'Piel / Carne (Flesh)', hex: '#FFDBAC' },
  { id: '27', name: 'Beige (Beige)', hex: '#E3C29B' },
  { id: '28', name: 'Verde Oliva (Olive Green)', hex: '#556B2F' },
  { id: '29', name: 'Rojo Vino (Wine Red)', hex: '#581845' },
  { id: '30', name: 'Burdeos (Burgundy)', hex: '#4A0E17' },
  { id: '43', name: 'Amarillo Pastel (Pastel Yellow)', hex: '#FEF08A' },
  { id: '44', name: 'Rojo Pastel (Pastel Red)', hex: '#FCA5A5' },
  { id: '45', name: 'Morado Pastel (Pastel Purple)', hex: '#DDD6FE' },
  { id: '46', name: 'Azul Pastel (Pastel Blue)', hex: '#BAE6FD' },
  { id: '47', name: 'Verde Pastel (Pastel Green)', hex: '#BBF7D0' },
  { id: '48', name: 'Rosa Pastel (Pastel Pink)', hex: '#FBCFE8' },
  { id: '70', name: 'Gris Claro (Light Grey)', hex: '#CBD5E1' },
  { id: '71', name: 'Gris Oscuro (Dark Grey)', hex: '#475569' },
]

export const HAMA_PALETTE: HamaColor[] = RAW_HAMA_PALETTE.map((c) => {
  const hex = c.hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return {
    id: c.id,
    name: c.name,
    hex: c.hex,
    r,
    g,
    b,
    luminance,
  }
})

export const BEAD_TYPES: Record<'mini' | 'midi' | 'maxi', BeadType> = {
  mini: {
    id: 'mini',
    name: 'Hama Mini (2.5 mm)',
    diameterMm: 2.5,
    pegboardSize: 28,
  },
  midi: {
    id: 'midi',
    name: 'Hama Midi (5.0 mm)',
    diameterMm: 5.0,
    pegboardSize: 29,
  },
  maxi: {
    id: 'maxi',
    name: 'Hama Maxi (10.0 mm)',
    diameterMm: 10.0,
    pegboardSize: 15,
  },
}
