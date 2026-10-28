import { jsPDF } from 'jspdf'
import type { PdfExportOptions } from '@/interfaces/hama-3d.interface'
import type { HamaColor } from '@/interfaces/hama.interface'

/**
 * Genera el documento jsPDF completo del manual de montaje paso a paso.
 * Es una función pura y síncrona que puede ejecutarse tanto en Node (tests) como en el navegador.
 */
export function buildAssemblyManualPdf(options: PdfExportOptions): jsPDF {
  const {
    projectName,
    beadTypeName,
    dimensionsCm,
    model3D,
    steps,
    coverPreviewDataUrl,
  } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const marginX = 15

  // ==========================================
  // PÁGINA 1: PORTADA Y TABLA BOM GLOBAL
  // ==========================================

  // Barra de acento superior
  doc.setFillColor(79, 70, 229) // Indigo 600
  doc.rect(0, 0, pageWidth, 6, 'F')

  // Encabezado de marca
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(99, 102, 241) // Indigo 500
  doc.text('HAMA BEADS STUDIO · GUÍA TÉCNICA DE MONTAJE', marginX, 16)

  // Título del proyecto
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42) // Slate 900
  const displayTitle = projectName.trim() || 'Proyecto Hama Beads 3D'
  doc.text(displayTitle, marginX, 25)

  // Subtítulo del modo constructivo
  let modeTitle = 'Modo: Apilado Multicapa Hueco (Slicing Inteligente)'
  if (model3D.mode === 'interlocking') {
    modeTitle = 'Modo: Ensamblado Interlocking a 90° (Machihembrado)'
  } else if (model3D.mode === 'relief') {
    modeTitle = 'Modo: Relieve por Capas (Luminancia Acumulativa)'
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text(modeTitle, marginX, 32)

  // Separador horizontal
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(marginX, 36, pageWidth - marginX, 36)

  // --- SECCIÓN PREVIEW 3D & METADATOS ---
  const previewY = 42
  const previewWidth = 85
  const previewHeight = 75

  if (coverPreviewDataUrl && coverPreviewDataUrl.startsWith('data:image/')) {
    try {
      doc.addImage(coverPreviewDataUrl, 'PNG', marginX, previewY, previewWidth, previewHeight)
      doc.setDrawColor(203, 213, 225)
      doc.rect(marginX, previewY, previewWidth, previewHeight, 'S')
    } catch {
      drawPreviewPlaceholder(doc, marginX, previewY, previewWidth, previewHeight)
    }
  } else {
    drawPreviewPlaceholder(doc, marginX, previewY, previewWidth, previewHeight)
  }

  // Tarjeta de Metadatos (a la derecha de la previsualización)
  const metaX = 108
  const metaWidth = pageWidth - marginX - metaX
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.roundedRect(metaX, previewY, metaWidth, previewHeight, 3, 3, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(metaX, previewY, metaWidth, previewHeight, 3, 3, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text('Especificaciones Técnicas', metaX + 5, previewY + 9)

  const metaItems = [
    { label: 'Tipo de Perla', val: beadTypeName },
    { label: 'Dimensiones Totales', val: dimensionsCm },
    { label: 'Total de Perlas', val: `${model3D.totalBeads.toLocaleString()} cuentas` },
    {
      label: 'Piezas / Capas',
      val: `${steps.length} ${model3D.mode === 'interlocking' ? 'placas' : 'capas'}`,
    },
    { label: 'Fecha de Creación', val: new Date().toLocaleDateString('es-ES') },
  ]

  let curMetaY = previewY + 18
  metaItems.forEach((m) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(m.label.toUpperCase(), metaX + 5, curMetaY)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(m.val, metaX + 5, curMetaY + 4.5)
    curMetaY += 11.5
  })

  // --- SECCIÓN TABLA GLOBAL BOM ---
  const bomY = 126
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Inventario Global de Materiales (BOM)', marginX, bomY)

  // Consolidar recuentos de color
  const globalCounts = new Map<string, { color: HamaColor; count: number }>()
  for (const step of steps) {
    for (const item of step.beadCounts) {
      const existing = globalCounts.get(item.color.id)
      if (existing) {
        existing.count += item.count
      } else {
        globalCounts.set(item.color.id, { color: item.color, count: item.count })
      }
    }
  }

  const sortedBOM = Array.from(globalCounts.values()).sort((a, b) => b.count - a.count)

  const colWidth = 86
  const startBomTableY = bomY + 5
  const rowHeight = 6.2
  const maxRowsPerCol = 22

  sortedBOM.forEach((entry, idx) => {
    const colIdx = Math.floor(idx / maxRowsPerCol)
    const rowIdx = idx % maxRowsPerCol
    if (colIdx > 1) return // Máximo 2 columnas para caber holgadamente en la portada

    const rowX = marginX + colIdx * (colWidth + 8)
    const rowY = startBomTableY + rowIdx * rowHeight

    // Muestra de color (cuadro con borde fino)
    doc.setFillColor(entry.color.r, entry.color.g, entry.color.b)
    doc.roundedRect(rowX, rowY - 3.5, 4.5, 4.5, 1, 1, 'F')
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(rowX, rowY - 3.5, 4.5, 4.5, 1, 1, 'S')

    // Código Hama
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text(`#${entry.color.id}`, rowX + 7, rowY)

    // Nombre de color recortado si es largo
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    const truncatedName = entry.color.name.length > 20
      ? `${entry.color.name.slice(0, 19)}…`
      : entry.color.name
    doc.text(truncatedName, rowX + 16, rowY)

    // Cantidad
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(79, 70, 229)
    doc.text(`${entry.count.toLocaleString()} uds.`, rowX + colWidth, rowY, { align: 'right' })
  })

  // Pie de portada
  drawPageFooter(doc, 1, steps.length + 1, projectName)

  // ==========================================
  // PÁGINAS SUBSIGUIENTES: PASO A PASO
  // ==========================================

  steps.forEach((step, sIdx) => {
    doc.addPage()
    const pageNum = sIdx + 2
    const totalPages = steps.length + 1

    // Barra de acento
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, pageWidth, 4, 'F')

    // Encabezado de paso
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(99, 102, 241)
    const typeLabel = step.type === 'layer' ? 'CAPA HORIZONTAL' : 'PLACA ORTOGONAL'
    doc.text(
      `PASO ${step.stepNumber} DE ${steps.length} · ${typeLabel}`,
      marginX,
      13
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(15, 23, 42)
    doc.text(step.title, marginX, 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`${step.totalBeads} perlas necesarias para este paso`, marginX, 25.5)

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(marginX, 28, pageWidth - marginX, 28)

    // --- CUADRÍCULA VECTORIAL DE ALTA DEFINICIÓN ---
    const rows = step.cells.length
    const cols = step.cells[0]?.length || 1

    const maxGridW = 155
    const maxGridH = 135
    const cellSize = Math.max(3.2, Math.min(maxGridW / cols, maxGridH / rows, 9.0))

    const actualGridW = cols * cellSize
    const actualGridH = rows * cellSize
    const gridStartX = marginX + 10 + (maxGridW - actualGridW) / 2
    const gridStartY = 38 + (maxGridH - actualGridH) / 2

    // Reglas métricas numéricas (Columnas superiores)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(Math.max(4.5, Math.min(6.5, cellSize * 0.5)))
    doc.setTextColor(148, 163, 184) // Slate 400

    for (let c = 0; c < cols; c++) {
      const colX = gridStartX + c * cellSize + cellSize / 2
      doc.text(String(c + 1), colX, gridStartY - 2, { align: 'center' })
    }

    // Reglas métricas numéricas (Filas a la izquierda)
    for (let r = 0; r < rows; r++) {
      const rowY = gridStartY + r * cellSize + cellSize / 2 + 1.2
      doc.text(String(r + 1), gridStartX - 2.5, rowY, { align: 'right' })
    }

    // Celdas / Perlas
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = step.cells[r][c]
        const cx = gridStartX + c * cellSize + cellSize / 2
        const cy = gridStartY + r * cellSize + cellSize / 2
        const radius = cellSize * 0.44

        if (cell === null) {
          // Clavija vacía
          doc.setDrawColor(226, 232, 240)
          doc.circle(cx, cy, radius * 0.35, 'S')
        } else {
          // Perla sólida
          doc.setFillColor(cell.r, cell.g, cell.b)
          const edgeR = Math.max(0, cell.r - 40)
          const edgeG = Math.max(0, cell.g - 40)
          const edgeB = Math.max(0, cell.b - 40)
          doc.setDrawColor(edgeR, edgeG, edgeB)
          doc.setLineWidth(0.15)
          doc.circle(cx, cy, radius, 'FD')

          // Código numérico Hama centrado
          const textColor = cell.luminance > 0.5 ? 15 : 255
          doc.setTextColor(textColor, textColor, textColor)
          const fontSize = Math.max(4.5, Math.min(7.5, cellSize * 0.45))
          doc.setFontSize(fontSize)
          doc.setFont('helvetica', 'bold')
          doc.text(cell.id, cx, cy + fontSize * 0.12, { align: 'center' })
        }
      }
    }

    // --- MINI-TABLA BOM ESPECÍFICA DEL PASO ---
    const miniBomY = 188
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(`Colores para este paso (${step.beadCounts.length} colores)`, marginX, miniBomY)

    const stepColors = step.beadCounts
    const chipsPerRow = 3
    const chipWidth = 56
    const chipHeight = 6

    stepColors.forEach((sc, i) => {
      const chipCol = i % chipsPerRow
      const chipRow = Math.floor(i / chipsPerRow)
      if (chipRow >= 4) return // Limitar a las filas disponibles

      const chipX = marginX + chipCol * (chipWidth + 6)
      const chipY = miniBomY + 4 + chipRow * (chipHeight + 2)

      doc.setFillColor(sc.color.r, sc.color.g, sc.color.b)
      doc.roundedRect(chipX, chipY, 4.5, 4.5, 1, 1, 'F')
      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(chipX, chipY, 4.5, 4.5, 1, 1, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`#${sc.color.id}`, chipX + 6.5, chipY + 3.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      const name = sc.color.name.length > 13 ? `${sc.color.name.slice(0, 12)}…` : sc.color.name
      doc.text(name, chipX + 14, chipY + 3.5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(79, 70, 229)
      doc.text(`${sc.count} uds.`, chipX + chipWidth, chipY + 3.5, { align: 'right' })
    })

    // --- CAJA DE CONSEJO DE ENSAMBLAJE ---
    const tipY = 244
    doc.setFillColor(238, 242, 255) // Indigo 50
    doc.roundedRect(marginX, tipY, pageWidth - marginX * 2, 24, 2, 2, 'F')
    doc.setDrawColor(199, 210, 254) // Indigo 200
    doc.setLineWidth(0.3)
    doc.roundedRect(marginX, tipY, pageWidth - marginX * 2, 24, 2, 2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(67, 56, 202) // Indigo 700
    doc.text('CONSEJO DE ENSAMBLADO', marginX + 4, tipY + 6.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(30, 41, 59)
    const splitInstructions = doc.splitTextToSize(step.instructions, pageWidth - marginX * 2 - 8)
    doc.text(splitInstructions, marginX + 4, tipY + 12.5)

    // Pie de página
    drawPageFooter(doc, pageNum, totalPages, projectName)
  })

  return doc
}

/**
 * Genera el documento y activa la descarga automática en el navegador.
 */
export async function exportAssemblyManualPdf(options: PdfExportOptions): Promise<void> {
  const doc = buildAssemblyManualPdf(options)
  const cleanName = (options.projectName || 'hama-beads-3d')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
  doc.save(`${cleanName}-manual-montaje.pdf`)
}

// Helper para placeholder de portada
function drawPreviewPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  doc.setFillColor(241, 245, 249) // Slate 100
  doc.roundedRect(x, y, w, h, 3, 3, 'F')
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(x, y, w, h, 3, 3, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(148, 163, 184)
  doc.text('VISTA 3D DEL MODELO', x + w / 2, y + h / 2, { align: 'center' })
}

// Helper para pie de página
function drawPageFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  projectName: string
): void {
  const footerY = 289
  const marginX = 15
  const pageWidth = 210

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('Hama Beads Studio · Manual de Montaje 3D', marginX, footerY)
  doc.text(projectName || 'Diseño Hama 3D', pageWidth / 2, footerY, { align: 'center' })
  doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - marginX, footerY, {
    align: 'right',
  })
}
