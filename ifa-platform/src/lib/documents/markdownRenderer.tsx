import React from 'react'

function renderInline(text: string) {
  // Split on **bold** first, then handle *italic* in remaining text
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g)
  const elements: JSX.Element[] = []
  let keyIdx = 0

  for (const part of boldParts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      elements.push(<strong key={keyIdx++}>{part.slice(2, -2)}</strong>)
    } else {
      // Within non-bold text, split on *italic*
      const italicParts = part.split(/(\*[^*]+\*)/g)
      for (const iPart of italicParts) {
        if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) {
          elements.push(<em key={keyIdx++}>{iPart.slice(1, -1)}</em>)
        } else if (iPart) {
          elements.push(<span key={keyIdx++}>{iPart}</span>)
        }
      }
    }
  }

  return elements
}

function parseTable(lines: string[], startIndex: number) {
  const headerLine = lines[startIndex]
  const separatorLine = lines[startIndex + 1]
  if (!headerLine || !separatorLine) return null

  const isSeparator = /^\s*\|?\s*:?-{3,}/.test(separatorLine)
  if (!isSeparator) return null

  const splitRow = (line: string) =>
    line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)

  const headers = splitRow(headerLine)
  const rows: string[][] = []
  let i = startIndex + 2
  while (i < lines.length && lines[i].includes('|')) {
    const row = splitRow(lines[i])
    if (row.length > 0) rows.push(row)
    i++
  }

  return { headers, rows, nextIndex: i }
}

export function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const blocks: JSX.Element[] = []
  let i = 0

  const consumeParagraph = () => {
    const parts: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      const line = lines[i]
      if (/^#{1,6}\s+/.test(line) || /^\s*[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        break
      }
      if (line.includes('|') && i + 1 < lines.length) {
        const tableCheck = parseTable(lines, i)
        if (tableCheck) break
      }
      parts.push(line)
      i++
    }
    if (parts.length > 0) {
      blocks.push(
        <p key={`p-${i}`} className="text-sm text-gray-700 leading-6">
          {renderInline(parts.join(' '))}
        </p>
      )
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
        const match = line.trim().match(/^[-*]\s+(.*)/)
        if (!match) break
        items.push(match[1])
      }
      i++
    }
    blocks.push(
      ordered ? (
        <ol key={`ol-${i}`} className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`ul-${i}`} className="list-disc list-inside text-sm text-gray-700 space-y-1">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      )
    )
  }

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const Tag = `h${Math.min(level, 4)}` as keyof JSX.IntrinsicElements
      blocks.push(
        <Tag key={`h-${i}`} className="mt-4 mb-2 text-gray-900 font-semibold">
          {renderInline(text)}
        </Tag>
      )
      i++
      continue
    }

    if (line.includes('|') && i + 1 < lines.length) {
      const table = parseTable(lines, i)
      if (table) {
        blocks.push(
          <div key={`table-${i}`} className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {table.headers.map((header, idx) => (
                    <th key={idx} className="px-2 py-1.5 text-left font-semibold text-gray-600 border-b border-gray-200">
                      {renderInline(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-100">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-2 py-1.5 text-gray-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        i = table.nextIndex
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

