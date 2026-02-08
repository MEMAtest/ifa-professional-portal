import sanitizeHtml from 'sanitize-html'

const DEFAULT_ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags.concat([
  'img',
  'style',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'colgroup',
  'col'
])

const DEFAULT_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  '*': ['style', 'class', 'id'],
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'style', 'loading'],
  td: ['colspan', 'rowspan', 'style'],
  th: ['colspan', 'rowspan', 'style'],
  table: ['style'],
  tr: ['style']
}

// For document templates we want professional styling but must prevent CSS-driven
// external requests (e.g. `url(https://...)`) and legacy script-like constructs.
const INLINE_STYLE_VALUE_FORBIDDEN = /(?:url\s*\(|@import|expression\s*\(|javascript\s*:)/i

const BANNED_STYLE_PROPERTIES = new Set(['behavior', 'behaviour', '-moz-binding'])

function splitStyleDeclarations(input: string): string[] {
  const out: string[] = []
  let buf = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let parenDepth = 0

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      buf += ch
      continue
    }
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      buf += ch
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') parenDepth += 1
      if (ch === ')' && parenDepth > 0) parenDepth -= 1

      if (ch === ';' && parenDepth === 0) {
        out.push(buf)
        buf = ''
        continue
      }
    }

    buf += ch
  }

  if (buf) out.push(buf)
  return out
}

function scrubInlineStyleText(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''

  const withoutComments = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  const declarations = splitStyleDeclarations(withoutComments)

  const kept: string[] = []
  for (const decl of declarations) {
    const trimmed = decl.trim()
    if (!trimmed) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx <= 0) continue

    const prop = trimmed.slice(0, colonIdx).trim()
    const value = trimmed.slice(colonIdx + 1).trim()

    if (!prop || !value) continue
    if (BANNED_STYLE_PROPERTIES.has(prop.toLowerCase())) continue
    if (INLINE_STYLE_VALUE_FORBIDDEN.test(value)) continue

    kept.push(`${prop}:${value}`)
  }

  return kept.join(';')
}

function scrubStyleTagText(input: string): string {
  // CSS in <style> tags is not parsed by sanitize-html. Strip the most important
  // external-fetch vectors to keep templates deterministic and reduce XSS surface.
  let css = input || ''
  css = css.replace(/@import[^;]+;/gi, '')
  css = css.replace(/url\s*\(\s*[^)]+\s*\)/gi, '')
  css = css.replace(/expression\s*\([^)]*\)/gi, '')
  css = css.replace(/-moz-binding\s*:\s*[^;]+;?/gi, '')
  return css
}

function ensureRelNoopener(attribs: Record<string, string>): Record<string, string> {
  const next = { ...attribs }
  if (String(next.target || '').toLowerCase() !== '_blank') return next

  const existing = String(next.rel || '')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const set = new Set(existing)
  set.add('noopener')
  set.add('noreferrer')
  next.rel = Array.from(set).join(' ')
  return next
}

export function sanitizeTemplateHtml(input: string): string {
  const dirty = String(input ?? '')
  const preScrubbed = dirty.replace(
    /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, css: string) => `<style${attrs}>${scrubStyleTagText(css)}</style>`
  )

  return sanitizeHtml(preScrubbed, {
    allowedTags: DEFAULT_ALLOWED_TAGS,
    allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    allowVulnerableTags: true,
    parseStyleAttributes: false,
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: ensureRelNoopener(attribs) }),
      '*': (tagName, attribs) => {
        const next = { ...attribs }
        if (typeof next.style === 'string' && next.style.trim()) {
          const cleaned = scrubInlineStyleText(next.style)
          if (cleaned) {
            next.style = cleaned
          } else {
            delete next.style
          }
        }
        return { tagName, attribs: next }
      }
    }
  })
}
