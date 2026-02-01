export interface FileReviewMetadata {
  documentsAnalyzed?: number
  totalDocuments?: number
  provider?: string
  generatedAt?: string
}

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }

/** Strip markdown bold/italic markers for plain-text contexts (PDF). */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
}

/** Parse inline **bold** and *italic* into segments for DOCX TextRun rendering. */
export function parseInlineBold(text: string): Array<{ text: string; bold?: boolean; italics?: boolean }> {
  const segments: Array<{ text: string; bold?: boolean; italics?: boolean }> = []
  const boldMatches = [...text.matchAll(/\*\*([^*]+)\*\*/g)]
  let lastIndex = 0

  for (const match of boldMatches) {
    const idx = match.index!
    if (idx > lastIndex) {
      // Process non-bold text for italic markers
      segments.push(...parseItalicSegments(text.slice(lastIndex, idx)))
    }
    segments.push({ text: match[1], bold: true })
    lastIndex = idx + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push(...parseItalicSegments(text.slice(lastIndex)))
  }
  return segments.length > 0 ? segments : [{ text }]
}

function parseItalicSegments(text: string): Array<{ text: string; italics?: boolean }> {
  const segments: Array<{ text: string; italics?: boolean }> = []
  const matches = [...text.matchAll(/\*([^*]+)\*/g)]
  let lastIndex = 0

  for (const match of matches) {
    const idx = match.index!
    if (idx > lastIndex) {
      segments.push({ text: text.slice(lastIndex, idx) })
    }
    segments.push({ text: match[1], italics: true })
    lastIndex = idx + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) })
  }
  return segments
}

export function splitRow(line: string) {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0)
}

export function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n')
  const blocks: Block[] = []
  let i = 0

  const consumeParagraph = () => {
    const parts: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      const line = lines[i]
      if (/^#{1,6}\s+/.test(line) || /^\s*[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        break
      }
      if (line.includes('|') && i + 1 < lines.length) {
        const separator = lines[i + 1]
        if (/^\s*\|?\s*:?-{3,}/.test(separator)) break
      }
      parts.push(line)
      i++
    }
    if (parts.length > 0) {
      blocks.push({ type: 'paragraph', text: parts.join(' ') })
    }
  }

  const consumeList = (ordered: boolean) => {
    const items: string[] = []
    while (i < lines.length) {
      const line = lines[i]
      if (ordered) {
        const match = line.match(/^\d+\.\s+(.*)/)
        if (!match) break
        items.push(match[1])
      } else {
        const ulMatch = line.trim().match(/^[-*]\s+(.*)/)
        if (!ulMatch) break
        items.push(ulMatch[1])
      }
      i++
    }
    blocks.push({ type: 'list', ordered, items })
  }

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] })
      i++
      continue
    }

    if (line.includes('|') && i + 1 < lines.length) {
      const separator = lines[i + 1]
      if (/^\s*\|?\s*:?-{3,}/.test(separator)) {
        const headers = splitRow(line)
        const rows: string[][] = []
        i += 2
        while (i < lines.length && lines[i].includes('|')) {
          const row = splitRow(lines[i])
          if (row.length > 0) rows.push(row)
          i++
        }
        blocks.push({ type: 'table', headers, rows })
        continue
      }
    }

    if (/^\s*[-*]\s+/.test(line)) {
      consumeList(false)
      continue
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      consumeList(true)
      continue
    }

    consumeParagraph()
  }

  return blocks
}

export async function generateFileReviewPDF(
  markdown: string,
  clientName: string,
  metadata?: FileReviewMetadata | null
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 50
  const marginBottom = 60
  let cursorY = 70
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - marginBottom) {
      doc.addPage()
      cursorY = 50
    }
  }

  doc.setFontSize(18)
  doc.text(`Client File Review - ${clientName}`, marginX, cursorY)
  cursorY += 22

  doc.setFontSize(10)
  const dateLabel = metadata?.generatedAt
    ? new Date(metadata.generatedAt).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB')
  doc.text(`Generated: ${dateLabel}`, marginX, cursorY)
  cursorY += 18

  const blocks = parseMarkdownBlocks(markdown)
  doc.setFontSize(11)

  blocks.forEach((block) => {
    if (block.type === 'heading') {
      ensureSpace(30)
      doc.setFontSize(block.level <= 2 ? 14 : 12)
      doc.setFont('helvetica', 'bold')
      const lines = doc.splitTextToSize(block.text, pageWidth - marginX * 2)
      doc.text(lines, marginX, cursorY)
      cursorY += lines.length * 16 + 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      return
    }

    if (block.type === 'paragraph') {
      const cleaned = stripInlineMarkdown(block.text)
      const lines = doc.splitTextToSize(cleaned, pageWidth - marginX * 2)
      ensureSpace(lines.length * 14 + 6)
      doc.text(lines, marginX, cursorY)
      cursorY += lines.length * 14 + 6
      return
    }

    if (block.type === 'list') {
      block.items.forEach((item, idx) => {
        const prefix = block.ordered ? `${idx + 1}. ` : '\u2022 '
        const cleaned = stripInlineMarkdown(item)
        const lines = doc.splitTextToSize(`${prefix}${cleaned}`, pageWidth - marginX * 2)
        ensureSpace(lines.length * 14 + 4)
        doc.text(lines, marginX, cursorY)
        cursorY += lines.length * 14 + 4
      })
      cursorY += 4
      return
    }

    if (block.type === 'table') {
      ensureSpace(40)
      const colCount = block.headers.length
      const cleanHeaders = block.headers.map(stripInlineMarkdown)
      const cleanRows = block.rows.map((row) => {
        const cleaned = row.map(stripInlineMarkdown)
        while (cleaned.length < colCount) cleaned.push('')
        cleaned.length = colCount
        return cleaned
      })
      autoTable(doc, {
        startY: cursorY,
        head: [cleanHeaders],
        body: cleanRows,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [243, 244, 246] as [number, number, number], textColor: 40 },
        theme: 'grid',
        margin: { left: marginX, right: marginX },
      })
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      cursorY = (finalY ? finalY + 10 : cursorY + 10)
      return
    }
  })

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.text('Confidential', marginX, pageHeight - 30)
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 30,
      { align: 'right' }
    )
  }

  doc.save(`File_Review_${clientName.replace(/\s+/g, '_')}.pdf`)
}

export async function generateFileReviewDOCX(
  markdown: string,
  clientName: string,
  metadata?: FileReviewMetadata | null
) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    BorderStyle,
    AlignmentType,
  } = await import('docx')

  const blocks = parseMarkdownBlocks(markdown)
  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = []

  // A4 usable width in twips: 210mm page - 2 × 25.4mm margins ≈ 9026 twips
  const USABLE_WIDTH = 9026

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Client File Review - ${clientName}`, bold: true, size: 32 })],
      spacing: { after: 100 },
    })
  )

  const dateLabel = metadata?.generatedAt
    ? new Date(metadata.generatedAt).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB')
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${dateLabel}`, size: 20, color: '666666' })],
      spacing: { after: 200 },
    })
  )

  /** Convert text with **bold** and *italic* markers into an array of TextRun instances. */
  const toRuns = (text: string, fontSize?: number) =>
    parseInlineBold(text).map((seg) => new TextRun({ text: seg.text, bold: seg.bold, italics: seg.italics, size: fontSize }))

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: 'CCCCCC',
  }
  const tableBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
    insideHorizontal: thinBorder,
    insideVertical: thinBorder,
  }

  blocks.forEach((block) => {
    if (block.type === 'heading') {
      const level = Math.min(block.level, 3)
      children.push(
        new Paragraph({
          children: toRuns(block.text),
          heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      )
      return
    }

    if (block.type === 'paragraph') {
      children.push(
        new Paragraph({
          children: toRuns(block.text, 22),
          spacing: { after: 120 },
        })
      )
      return
    }

    if (block.type === 'list') {
      block.items.forEach((item, idx) => {
        const prefix = block.ordered ? `${idx + 1}. ` : '\u2022 '
        children.push(
          new Paragraph({
            children: [new TextRun({ text: prefix, size: 22 }), ...toRuns(item, 22)],
            spacing: { after: 60 },
            indent: { left: 360 },
          })
        )
      })
      return
    }

    if (block.type === 'table') {
      const colCount = block.headers.length
      const colWidth = Math.floor(USABLE_WIDTH / colCount)

      const rows: InstanceType<typeof TableRow>[] = []

      // Header row with shading
      rows.push(
        new TableRow({
          tableHeader: true,
          children: block.headers.map((header) =>
            new TableCell({
              width: { size: colWidth, type: WidthType.DXA },
              shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: stripInlineMarkdown(header), bold: true, size: 18 })],
                  spacing: { before: 40, after: 40 },
                }),
              ],
            })
          ),
        })
      )

      // Data rows
      block.rows.forEach((row) => {
        // Normalise row to exactly match header column count
        const normalisedRow = [...row]
        while (normalisedRow.length < colCount) normalisedRow.push('')
        normalisedRow.length = colCount

        rows.push(
          new TableRow({
            children: normalisedRow.map((cell) =>
              new TableCell({
                width: { size: colWidth, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: stripInlineMarkdown(cell), size: 18 })],
                    spacing: { before: 40, after: 40 },
                  }),
                ],
              })
            ),
          })
        )
      })

      const table = new Table({
        width: { size: USABLE_WIDTH, type: WidthType.DXA },
        columnWidths: Array.from({ length: colCount }, () => colWidth),
        borders: tableBorders,
        rows,
      })
      children.push(table)

      // Spacer after table
      children.push(new Paragraph({ spacing: { after: 120 } }))
    }
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `File_Review_${clientName.replace(/\s+/g, '_')}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
