export type PresetId = 'mushroom' | 'heart' | 'duck'

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const

/**
 * Comprueba si un archivo o tipo MIME es compatible con el motor de Hama.
 */
export function isSupportedImageType(mimeType: string, filename?: string): boolean {
  if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number])) {
    return true
  }

  if (filename) {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext && ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      return true
    }
  }

  return false
}

const PRESET_PALETTES: Record<PresetId, Record<string, string>> = {
  mushroom: {
    K: '#111827',
    R: '#D90429',
    W: '#FFFFFF',
    S: '#FFDBAC',
    Y: '#F7D000',
  },
  heart: {
    K: '#111827',
    R: '#D90429',
    P: '#FCA5A5',
    W: '#FFFFFF',
    D: '#800020',
  },
  duck: {
    K: '#111827',
    Y: '#F7D000',
    L: '#FEF08A',
    O: '#E85D04',
    W: '#FFFFFF',
    B: '#38BDF8',
  },
}

const PRESET_GRIDS: Record<PresetId, string[]> = {
  mushroom: [
    '.....KKKKKK.....',
    '...KKRRRRRRKK...',
    '..KRRWWWRRRRWWK.',
    '.KRRWWWWWRRRWWWK',
    '.KRRWWWWWRRRRRRK',
    'KRRRRWWWRRRRRRRK',
    'KRRRRRRRRRRWWWRK',
    'KWWWRRRRRRWWWWWK',
    'KWWWRRRRRRWWWWWK',
    '.KKKKKKKKKKKKKK.',
    '...KSSSSSSSSK...',
    '..KSSKSSSSKSSK..',
    '..KSSKSSSSKSSK..',
    '..KSSSSSSSSSSK..',
    '...KSSSSSSSSK...',
    '....KKKKKKKK....',
  ],
  heart: [
    '................',
    '..KKKK....KKKK..',
    '.KRRRRK..KRRRRK.',
    'KRWWWRRKKRRRRRRK',
    'KRWWRRRRRRRRRRDK',
    'KRRRRRRRRRRRRDDK',
    'KRRRRRRRRRRRRDDK',
    '.KRRRRRRRRRRDDK.',
    '..KRRRRRRRRDDK..',
    '...KRRRRRRDDK...',
    '....KRRRRDDK....',
    '.....KRRDDK.....',
    '......KDDK......',
    '.......KK.......',
    '................',
    '................',
  ],
  duck: [
    '.....KKKKKK.....',
    '...KKYYYYYYKK...',
    '..KYYLLLLYYYYK..',
    '..KYLLYYYYKWWYK.',
    '..KYYYYYYYKKWYK.',
    '..KYYYYYYYYYYYK.',
    'KKKKOYYYYYYYYK..',
    'KOOOOOYYYYYYK...',
    '.KKKKKYYYYYYKKKK',
    '....KYYYYYYYYYYK',
    '...KYYLLLLYYYYYK',
    '...KYYLLLLLLYYYK',
    '...KYYYYYYYYYYK.',
    '..BBBBBBBBBBBBBB',
    '.BBBBBBBBBBBBBBB',
    '................',
  ],
}

/**
 * Genera un DataURL a partir de los patrones de píxeles predefinidos.
 * Compatible con Canvas en navegador y con fallback SVG inline para Node/tests.
 */
export function createPresetDataUrl(type: PresetId = 'mushroom'): string {
  const palette = PRESET_PALETTES[type] || PRESET_PALETTES.mushroom
  const grid = PRESET_GRIDS[type] || PRESET_GRIDS.mushroom

  // Si existe soporte de Canvas en el entorno (navegador)
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, 16, 16)
      grid.forEach((row, y) => {
        for (let x = 0; x < 16; x++) {
          const char = row[x]
          if (char !== '.' && palette[char]) {
            ctx.fillStyle = palette[char]
            ctx.fillRect(x, y, 1, 1)
          }
        }
      })
      return canvas.toDataURL('image/png')
    }
  }

  // Fallback universal: SVG data URL de 16x16
  const rects: string[] = []
  grid.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const char = row[x]
      if (char !== '.' && palette[char]) {
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[char]}"/>`)
      }
    }
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${rects.join('')}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
