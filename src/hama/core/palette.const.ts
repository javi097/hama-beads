/**
 * Paleta oficial Hama Beads Midi — 46 colores
 * Fuente: https://myblockstudio.com/es/colors.php (sección Hama Beads)
 * Generado automáticamente — no editar manualmente los valores HEX/RGB/luminance.
 *
 * id        : código numérico oficial con padding de 2 dígitos mínimo (ej. "01", "07", "104")
 * name      : nombre oficial del color en español
 * hex       : código hexadecimal exacto (#RRGGBB)
 * r, g, b   : componentes RGB [0-255] derivadas del hex
 * luminance : luminancia perceptual (0.299*r + 0.587*g + 0.114*b) / 255 ∈ [0, 1]
 */

import type { BeadType, HamaColor } from '@/interfaces/hama.interface'

export type { BeadType }
export type BeadColor = HamaColor

/** Convierte un hex #RRGGBB en componentes r, g, b */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

/** Luminancia perceptual estándar ∈ [0, 1] */
function calcLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Construye un HamaColor a partir de id, name y hex */
function bead(id: string, name: string, hex: string): HamaColor {
  const { r, g, b } = hexToRgb(hex)
  return {
    id,
    name,
    hex,
    r,
    g,
    b,
    rgb: [r, g, b],
    luminance: calcLuminance(r, g, b),
  }
}

export const HAMA_PALETTE: HamaColor[] = [
  bead('01',  'Blanco',          '#ffffff'),
  bead('02',  'Crema',           '#F6E7C1'),
  bead('03',  'Amarillo',        '#FBE122'),
  bead('05',  'Rojo',            '#E1141C'),
  bead('06',  'Rosa',            '#F7A8C4'),
  bead('07',  'Morado',          '#7B3F98'),
  bead('08',  'Cobalto',         '#1C3F94'),
  bead('10',  'Verde oscuro',    '#0A7C3E'),
  bead('11',  'Verde claro',     '#A8DCA0'),
  bead('12',  'Marrón oscuro',   '#4A3122'),
  bead('17',  'Gris',            '#8A8C8E'),
  bead('18',  'Negro',           '#000000'),
  bead('20',  'Óxido',           '#9C4A24'),
  bead('21',  'Marrón claro',    '#B5835A'),
  bead('26',  'Salmón',          '#FF8C7A'),
  bead('27',  'Piel',            '#FBD0A8'),
  bead('31',  'Turquesa',        '#00A99D'),
  bead('32',  'Rosa neón',       '#FF4FA3'),
  bead('34',  'Amarillo neón',   '#EAFF00'),
  bead('37',  'Verde neón',      '#5CFF5C'),
  bead('38',  'Naranja neón',    '#FF7A00'),
  bead('43',  'Amarillo pastel', '#F6EFA6'),
  bead('44',  'Coral intenso',   '#F15F5A'),
  bead('46',  'Azul pastel',     '#A4D4E6'),
  bead('47',  'Verde pastel',    '#BFE6B3'),
  bead('49',  'Celeste',         '#5BC2D6'),
  bead('60',  'Caramelo',        '#F0A93B'),
  bead('61',  'Dorado',          '#C9A227'),
  bead('62',  'Plateado',        '#C0C0C4'),
  bead('64',  'Blanco perla',    '#F4F1EA'),
  bead('71',  'Gris oscuro',     '#58595B'),
  bead('75',  'Canela',          '#D9B380'),
  bead('76',  'Jengibre',        '#7C4A1E'),
  bead('77',  'Gris claro',      '#CFCFCF'),
  bead('78',  'Melocotón',       '#FCD5B5'),
  bead('79',  'Naranja',         '#F36F21'),
  bead('82',  'Ciruela',         '#6C3082'),
  bead('98',  'Menta',           '#8FD9C0'),
  bead('104', 'Lima kiwi',       '#C7E94F'),
  bead('106', 'Lavanda pastel',  '#CBB7E0'),
  bead('107', 'Lavanda',         '#B3A0D4'),
  bead('112', 'Rubor',           '#F4B9C2'),
  bead('115', 'Verde brillante', '#8DC63F'),
  bead('116', 'Azul marino',     '#16224A'),
  bead('118', 'Baya',            '#8C2A4A'),
  bead('119', 'Azul',            '#1B75BB'),
]

// ---------------------------------------------------------------------------
// Tipos de tablero Hama Beads
// ---------------------------------------------------------------------------

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
