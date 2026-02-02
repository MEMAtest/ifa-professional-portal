// =====================================================
// FILE: tests/unit/fileReviewExport.test.ts
// PURPOSE: Comprehensive unit & integration tests for
//          file review PDF/DOCX export functions
// =====================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  stripInlineMarkdown,
  parseInlineBold,
  parseMarkdownBlocks,
  splitRow,
  generateFileReviewPDF,
  generateFileReviewDOCX,
} from '@/lib/documents/fileReviewExport'
import type { Block, FileReviewMetadata } from '@/lib/documents/fileReviewExport'

// ---------------------------------------------------------------------------
// Sample markdown used across integration tests
// ---------------------------------------------------------------------------
const SAMPLE_MARKDOWN = `# Client File Review - Test Client

## 1. Client Overview

| Category | Detail | Source |
| --- | --- | --- |
| Full Name | John Smith | Application.pdf |
| **Date of Birth** | 01/01/1960 | Application.pdf |
| **Not Found** | Missing data | |

## 2. Documents on File

| # | Document | Classification | Key Contents | Confidence |
| --- | --- | --- | --- | --- |
| 1 | Application.pdf | Application Form | Client application | 95% |
| 2 | Pension_Statement.pdf | Pension Statement | Annual statement | 85% |

## 3. Advice Summary

The client, John Smith, is a retired professional. He has a pension with **significant value**.

- First recommendation point
- Second point with **bold emphasis**
- Third point

1. Ordered item one
2. Ordered item two

## 4. Overall Assessment

The file is **complete** and well-documented.`

const SAMPLE_METADATA: FileReviewMetadata = {
  documentsAnalyzed: 5,
  totalDocuments: 7,
  provider: 'TestProvider',
  generatedAt: '2025-06-15T10:30:00Z',
}

// =====================================================================
// 1. UNIT TESTS: stripInlineMarkdown
// =====================================================================
describe('stripInlineMarkdown', () => {
  it('strips double-asterisk bold markers', () => {
    expect(stripInlineMarkdown('**bold text**')).toBe('bold text')
  })

  it('strips double-underscore bold markers', () => {
    expect(stripInlineMarkdown('__bold__')).toBe('bold')
  })

  it('strips single-asterisk italic markers', () => {
    expect(stripInlineMarkdown('*italic*')).toBe('italic')
  })

  it('strips single-underscore italic markers', () => {
    expect(stripInlineMarkdown('_italic_')).toBe('italic')
  })

  it('strips mixed bold and italic markers', () => {
    expect(stripInlineMarkdown('**bold** and *italic*')).toBe('bold and italic')
  })

  it('returns text with no markdown unchanged', () => {
    expect(stripInlineMarkdown('plain text here')).toBe('plain text here')
  })

  it('returns empty string for empty input', () => {
    expect(stripInlineMarkdown('')).toBe('')
  })

  it('strips multiple bold occurrences', () => {
    expect(stripInlineMarkdown('**first** then **second**')).toBe('first then second')
  })

  it('handles bold text at start and end of string', () => {
    expect(stripInlineMarkdown('**start** middle **end**')).toBe('start middle end')
  })

  it('strips underscores and asterisks in the same string', () => {
    expect(stripInlineMarkdown('__bold__ and _italic_ and **more bold**')).toBe(
      'bold and italic and more bold'
    )
  })
})

// =====================================================================
// 2. UNIT TESTS: parseInlineBold
// =====================================================================
describe('parseInlineBold', () => {
  it('parses a single bold segment', () => {
    const result = parseInlineBold('**bold**')
    expect(result).toEqual([{ text: 'bold', bold: true }])
  })

  it('parses bold surrounded by plain text', () => {
    const result = parseInlineBold('before **bold** after')
    expect(result).toEqual([
      { text: 'before ' },
      { text: 'bold', bold: true },
      { text: ' after' },
    ])
  })

  it('returns single segment for text with no bold markers', () => {
    const result = parseInlineBold('no bold here')
    expect(result).toEqual([{ text: 'no bold here' }])
  })

  it('parses multiple bold segments', () => {
    const result = parseInlineBold('**first** and **second**')
    expect(result).toEqual([
      { text: 'first', bold: true },
      { text: ' and ' },
      { text: 'second', bold: true },
    ])
  })

  it('returns single segment with the text for empty string', () => {
    const result = parseInlineBold('')
    expect(result).toEqual([{ text: '' }])
  })

  it('handles bold at the beginning of string', () => {
    const result = parseInlineBold('**start** then rest')
    expect(result).toEqual([
      { text: 'start', bold: true },
      { text: ' then rest' },
    ])
  })

  it('handles bold at the end of string', () => {
    const result = parseInlineBold('rest then **end**')
    expect(result).toEqual([
      { text: 'rest then ' },
      { text: 'end', bold: true },
    ])
  })

  it('handles three consecutive bold segments', () => {
    const result = parseInlineBold('**a** **b** **c**')
    expect(result).toEqual([
      { text: 'a', bold: true },
      { text: ' ' },
      { text: 'b', bold: true },
      { text: ' ' },
      { text: 'c', bold: true },
    ])
  })
})

// =====================================================================
// 3. UNIT TESTS: splitRow
// =====================================================================
describe('splitRow', () => {
  it('splits a simple pipe-delimited row', () => {
    expect(splitRow('| A | B | C |')).toEqual(['A', 'B', 'C'])
  })

  it('splits row without leading/trailing pipes', () => {
    expect(splitRow('A | B | C')).toEqual(['A', 'B', 'C'])
  })

  it('trims whitespace from each cell', () => {
    expect(splitRow('|  Name  |  Age  |  City  |')).toEqual(['Name', 'Age', 'City'])
  })

  it('filters out empty cells from leading/trailing pipes', () => {
    // Leading and trailing | produce empty strings after split, which get filtered
    const result = splitRow('| Only |')
    expect(result).toEqual(['Only'])
  })

  it('handles cells with markdown bold', () => {
    expect(splitRow('| **Bold** | Normal |')).toEqual(['**Bold**', 'Normal'])
  })

  it('handles row with many columns', () => {
    expect(splitRow('| 1 | 2 | 3 | 4 | 5 |')).toEqual(['1', '2', '3', '4', '5'])
  })
})

// =====================================================================
// 4. UNIT TESTS: parseMarkdownBlocks
// =====================================================================
describe('parseMarkdownBlocks', () => {
  describe('headings', () => {
    it('parses level-1 heading', () => {
      const blocks = parseMarkdownBlocks('# Title')
      expect(blocks).toEqual([{ type: 'heading', level: 1, text: 'Title' }])
    })

    it('parses level-2 heading', () => {
      const blocks = parseMarkdownBlocks('## Subtitle')
      expect(blocks).toEqual([{ type: 'heading', level: 2, text: 'Subtitle' }])
    })

    it('parses level-3 heading', () => {
      const blocks = parseMarkdownBlocks('### Sub-subtitle')
      expect(blocks).toEqual([{ type: 'heading', level: 3, text: 'Sub-subtitle' }])
    })

    it('parses level-6 heading', () => {
      const blocks = parseMarkdownBlocks('###### Deep heading')
      expect(blocks).toEqual([{ type: 'heading', level: 6, text: 'Deep heading' }])
    })

    it('preserves markdown formatting in heading text', () => {
      const blocks = parseMarkdownBlocks('## Section with **bold**')
      expect(blocks).toEqual([{ type: 'heading', level: 2, text: 'Section with **bold**' }])
    })
  })

  describe('paragraphs', () => {
    it('parses a single-line paragraph', () => {
      const blocks = parseMarkdownBlocks('This is a paragraph.')
      expect(blocks).toEqual([{ type: 'paragraph', text: 'This is a paragraph.' }])
    })

    it('joins multi-line paragraphs with space', () => {
      const blocks = parseMarkdownBlocks('Line one\nLine two')
      expect(blocks).toEqual([{ type: 'paragraph', text: 'Line one Line two' }])
    })

    it('separates paragraphs at blank lines', () => {
      const blocks = parseMarkdownBlocks('First paragraph.\n\nSecond paragraph.')
      expect(blocks).toEqual([
        { type: 'paragraph', text: 'First paragraph.' },
        { type: 'paragraph', text: 'Second paragraph.' },
      ])
    })
  })

  describe('unordered lists', () => {
    it('parses a single list item', () => {
      const blocks = parseMarkdownBlocks('- Item one')
      expect(blocks).toEqual([{ type: 'list', ordered: false, items: ['Item one'] }])
    })

    it('parses multiple list items', () => {
      const blocks = parseMarkdownBlocks('- Item one\n- Item two\n- Item three')
      expect(blocks).toEqual([
        { type: 'list', ordered: false, items: ['Item one', 'Item two', 'Item three'] },
      ])
    })

    it('preserves markdown in list items', () => {
      const blocks = parseMarkdownBlocks('- **Bold item**\n- Normal item')
      expect(blocks).toEqual([
        { type: 'list', ordered: false, items: ['**Bold item**', 'Normal item'] },
      ])
    })
  })

  describe('ordered lists', () => {
    it('parses a single ordered list item', () => {
      const blocks = parseMarkdownBlocks('1. First item')
      expect(blocks).toEqual([{ type: 'list', ordered: true, items: ['First item'] }])
    })

    it('parses multiple ordered items', () => {
      const blocks = parseMarkdownBlocks('1. First\n2. Second\n3. Third')
      expect(blocks).toEqual([
        { type: 'list', ordered: true, items: ['First', 'Second', 'Third'] },
      ])
    })
  })

  describe('tables', () => {
    it('parses a basic table with header separator', () => {
      const md = `| Name | Age |
| --- | --- |
| Alice | 30 |
| Bob | 25 |`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toEqual([
        {
          type: 'table',
          headers: ['Name', 'Age'],
          rows: [
            ['Alice', '30'],
            ['Bob', '25'],
          ],
        },
      ])
    })

    it('parses a table with bold headers', () => {
      const md = `| **Name** | **Value** |
| --- | --- |
| Key | 42 |`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'table',
        headers: ['**Name**', '**Value**'],
        rows: [['Key', '42']],
      })
    })

    it('parses a table with many columns', () => {
      const md = `| A | B | C | D | E |
| --- | --- | --- | --- | --- |
| 1 | 2 | 3 | 4 | 5 |`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(1)
      const table = blocks[0] as Extract<Block, { type: 'table' }>
      expect(table.headers).toEqual(['A', 'B', 'C', 'D', 'E'])
      expect(table.rows[0]).toEqual(['1', '2', '3', '4', '5'])
    })

    it('stops table at first non-pipe line', () => {
      const md = `| H1 | H2 |
| --- | --- |
| R1 | R2 |

Some paragraph after table.`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(2)
      expect(blocks[0]).toMatchObject({ type: 'table' })
      expect(blocks[1]).toMatchObject({ type: 'paragraph' })
    })
  })

  describe('mixed content', () => {
    it('parses heading + paragraph + list', () => {
      const md = `# Heading

Some text.

- Item 1
- Item 2`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(3)
      expect(blocks[0]).toMatchObject({ type: 'heading', level: 1, text: 'Heading' })
      expect(blocks[1]).toMatchObject({ type: 'paragraph', text: 'Some text.' })
      expect(blocks[2]).toMatchObject({ type: 'list', ordered: false, items: ['Item 1', 'Item 2'] })
    })

    it('parses heading + table + paragraph + ordered list', () => {
      const md = `## Section

| A | B |
| --- | --- |
| 1 | 2 |

A follow-up.

1. First
2. Second`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(4)
      expect(blocks[0]).toMatchObject({ type: 'heading' })
      expect(blocks[1]).toMatchObject({ type: 'table' })
      expect(blocks[2]).toMatchObject({ type: 'paragraph' })
      expect(blocks[3]).toMatchObject({ type: 'list', ordered: true })
    })

    it('skips empty lines between blocks', () => {
      const md = `# Title\n\n\n\nSome paragraph.\n\n\n\n- Item`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(3)
    })

    it('parses the full sample markdown correctly', () => {
      const blocks = parseMarkdownBlocks(SAMPLE_MARKDOWN)

      // Verify we get a reasonable number of blocks
      expect(blocks.length).toBeGreaterThanOrEqual(8)

      // First block should be a heading
      expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 })

      // There should be tables
      const tables = blocks.filter((b) => b.type === 'table')
      expect(tables.length).toBe(2)

      // There should be unordered and ordered lists
      const lists = blocks.filter((b) => b.type === 'list')
      expect(lists.length).toBe(2)
      expect(lists.some((l) => l.type === 'list' && l.ordered === false)).toBe(true)
      expect(lists.some((l) => l.type === 'list' && l.ordered === true)).toBe(true)

      // There should be paragraphs
      const paragraphs = blocks.filter((b) => b.type === 'paragraph')
      expect(paragraphs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      expect(parseMarkdownBlocks('')).toEqual([])
    })

    it('returns empty array for whitespace-only input', () => {
      expect(parseMarkdownBlocks('   \n\n   \n')).toEqual([])
    })

    it('handles markdown with only headings', () => {
      const md = '# H1\n## H2\n### H3'
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(3)
      blocks.forEach((b) => expect(b.type).toBe('heading'))
    })

    it('handles table separator with colons for alignment', () => {
      const md = `| Left | Center | Right |
| :--- | :---: | ---: |
| L | C | R |`
      const blocks = parseMarkdownBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'table',
        headers: ['Left', 'Center', 'Right'],
        rows: [['L', 'C', 'R']],
      })
    })
  })
})

// =====================================================================
// 5. INTEGRATION TESTS: generateFileReviewPDF
// =====================================================================

// We mock jsPDF at the module level so the factory is hoisted correctly.
// The saveSpy captures all calls to save() so individual tests can inspect them.
// NOTE: jsPDF assigns `save` as an own property inside the constructor, so a simple
// subclass override does not work. We must re-assign `save` after super() completes.
const saveSpy = vi.fn()

vi.mock('jspdf', async () => {
  const originalModule = await vi.importActual<typeof import('jspdf')>('jspdf')
  const OriginalJsPDF = originalModule.default

  class MockJsPDF extends OriginalJsPDF {
    constructor(...args: ConstructorParameters<typeof OriginalJsPDF>) {
      super(...args)
      // Override the own-property `save` that the parent constructor installed
      this.save = ((filename?: string) => {
        saveSpy(filename)
      }) as typeof this.save
    }
  }

  return {
    ...originalModule,
    default: MockJsPDF,
  }
})

describe('generateFileReviewPDF', () => {
  beforeEach(() => {
    saveSpy.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not throw for valid markdown with metadata', async () => {
    await expect(
      generateFileReviewPDF(SAMPLE_MARKDOWN, 'John Smith', SAMPLE_METADATA)
    ).resolves.not.toThrow()
  })

  it('does not throw for valid markdown without metadata', async () => {
    await expect(
      generateFileReviewPDF(SAMPLE_MARKDOWN, 'John Smith')
    ).resolves.not.toThrow()
  })

  it('does not throw with null metadata', async () => {
    await expect(
      generateFileReviewPDF(SAMPLE_MARKDOWN, 'Jane Doe', null)
    ).resolves.not.toThrow()
  })

  it('does not throw for empty markdown', async () => {
    await expect(
      generateFileReviewPDF('', 'Empty Client')
    ).resolves.not.toThrow()
  })

  it('calls save with filename derived from client name', async () => {
    await generateFileReviewPDF('# Test', 'John Smith', SAMPLE_METADATA)
    expect(saveSpy).toHaveBeenCalledWith('File_Review_John_Smith.pdf')
  })

  it('replaces spaces with underscores in the filename', async () => {
    await generateFileReviewPDF('# Test', 'Jane Mary Doe', SAMPLE_METADATA)
    expect(saveSpy).toHaveBeenCalledWith('File_Review_Jane_Mary_Doe.pdf')
  })

  it('handles markdown with tables containing bold text', async () => {
    const md = `| **Header** | Normal |
| --- | --- |
| **Bold cell** | Plain |`
    await expect(generateFileReviewPDF(md, 'Client')).resolves.not.toThrow()
  })

  it('handles markdown with only a heading', async () => {
    await expect(
      generateFileReviewPDF('# Just a heading', 'Client')
    ).resolves.not.toThrow()
  })

  it('handles markdown with only a list', async () => {
    const md = '- Item 1\n- Item 2\n- Item 3'
    await expect(generateFileReviewPDF(md, 'Client')).resolves.not.toThrow()
  })

  it('handles markdown with only an ordered list', async () => {
    const md = '1. First\n2. Second\n3. Third'
    await expect(generateFileReviewPDF(md, 'Client')).resolves.not.toThrow()
  })

  it('handles markdown with only a paragraph', async () => {
    await expect(
      generateFileReviewPDF('This is just a paragraph of text.', 'Client')
    ).resolves.not.toThrow()
  })

  it('handles very long markdown without throwing', async () => {
    // Create a large markdown document
    const lines = ['# Large Document']
    for (let i = 0; i < 100; i++) {
      lines.push(`\n## Section ${i}\n`)
      lines.push(`Paragraph text for section ${i}. This has **bold** and *italic*.`)
      lines.push('')
      lines.push('| Col A | Col B |')
      lines.push('| --- | --- |')
      lines.push(`| Data ${i}a | Data ${i}b |`)
      lines.push('')
      lines.push(`- List item ${i}`)
    }
    const longMarkdown = lines.join('\n')
    await expect(generateFileReviewPDF(longMarkdown, 'Big Client')).resolves.not.toThrow()
  })
})

// =====================================================================
// 6. INTEGRATION TESTS: generateFileReviewDOCX
// =====================================================================
describe('generateFileReviewDOCX', () => {
  let createElementMock: ReturnType<typeof vi.fn>
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let clickMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // The function uses browser APIs: document.createElement, URL.createObjectURL, etc.
    clickMock = vi.fn()
    createElementMock = vi.fn(() => ({
      href: '',
      download: '',
      click: clickMock,
    }))
    createObjectURLMock = vi.fn(() => 'blob:mock-url')
    revokeObjectURLMock = vi.fn()

    // Install global mocks for browser APIs
    vi.stubGlobal('document', { createElement: createElementMock })
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not throw for valid markdown with metadata', async () => {
    await expect(
      generateFileReviewDOCX(SAMPLE_MARKDOWN, 'John Smith', SAMPLE_METADATA)
    ).resolves.not.toThrow()
  })

  it('does not throw for valid markdown without metadata', async () => {
    await expect(
      generateFileReviewDOCX(SAMPLE_MARKDOWN, 'John Smith')
    ).resolves.not.toThrow()
  })

  it('does not throw with null metadata', async () => {
    await expect(
      generateFileReviewDOCX(SAMPLE_MARKDOWN, 'Jane Doe', null)
    ).resolves.not.toThrow()
  })

  it('does not throw for empty markdown', async () => {
    await expect(
      generateFileReviewDOCX('', 'Empty Client')
    ).resolves.not.toThrow()
  })

  it('creates a download link with correct filename', async () => {
    await generateFileReviewDOCX('# Test', 'John Smith', SAMPLE_METADATA)

    expect(createElementMock).toHaveBeenCalledWith('a')
    const anchor = createElementMock.mock.results[0].value
    expect(anchor.download).toBe('File_Review_John_Smith.docx')
  })

  it('replaces spaces with underscores in the filename', async () => {
    await generateFileReviewDOCX('# Test', 'Jane Mary Doe', SAMPLE_METADATA)

    const anchor = createElementMock.mock.results[0].value
    expect(anchor.download).toBe('File_Review_Jane_Mary_Doe.docx')
  })

  it('triggers a click on the download link', async () => {
    await generateFileReviewDOCX('# Test', 'Client')
    expect(clickMock).toHaveBeenCalledOnce()
  })

  it('creates and revokes an object URL', async () => {
    await generateFileReviewDOCX('# Test', 'Client')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })

  it('handles markdown with tables containing bold text', async () => {
    const md = `| **Header** | Normal |
| --- | --- |
| **Bold cell** | Plain |`
    await expect(generateFileReviewDOCX(md, 'Client')).resolves.not.toThrow()
  })

  it('handles markdown with only a heading', async () => {
    await expect(
      generateFileReviewDOCX('# Just a heading', 'Client')
    ).resolves.not.toThrow()
  })

  it('handles markdown with only a list', async () => {
    const md = '- Item 1\n- Item 2\n- Item 3'
    await expect(generateFileReviewDOCX(md, 'Client')).resolves.not.toThrow()
  })

  it('handles markdown with only an ordered list', async () => {
    const md = '1. First\n2. Second\n3. Third'
    await expect(generateFileReviewDOCX(md, 'Client')).resolves.not.toThrow()
  })

  it('handles markdown with only a paragraph', async () => {
    await expect(
      generateFileReviewDOCX('This is just a paragraph of text.', 'Client')
    ).resolves.not.toThrow()
  })

  it('handles the full sample markdown end-to-end', async () => {
    await expect(
      generateFileReviewDOCX(SAMPLE_MARKDOWN, 'Test Client', SAMPLE_METADATA)
    ).resolves.not.toThrow()

    // Verify the download flow completed
    expect(createElementMock).toHaveBeenCalledWith('a')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
    expect(clickMock).toHaveBeenCalledOnce()
    expect(revokeObjectURLMock).toHaveBeenCalledOnce()
  })
})
