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
const STYLE_VALUE_SAFE = /^(?!.*(?:url\s*\(|@import|expression\s*\(|behaviou?r\s*:|-moz-binding\s*:)).*$/i

const ALLOWED_STYLE_PROPERTIES = [
  'align-items',
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-collapse',
  'border-color',
  'border-left',
  'border-radius',
  'border-right',
  'border-spacing',
  'border-style',
  'border-top',
  'border-width',
  'box-shadow',
  'color',
  'column-gap',
  'display',
  'flex',
  'flex-direction',
  'flex-wrap',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'gap',
  'grid-column',
  'grid-row',
  'grid-template-columns',
  'grid-template-rows',
  'height',
  'justify-content',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'object-fit',
  'opacity',
  'overflow',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'page-break-after',
  'page-break-before',
  'page-break-inside',
  'row-gap',
  'text-align',
  'text-decoration',
  'text-shadow',
  'text-transform',
  'vertical-align',
  'white-space',
  'width'
]

const DEFAULT_ALLOWED_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': Object.fromEntries(ALLOWED_STYLE_PROPERTIES.map((p) => [p, [STYLE_VALUE_SAFE]]))
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
    parseStyleAttributes: true,
    allowedStyles: DEFAULT_ALLOWED_STYLES,
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: ensureRelNoopener(attribs) })
    }
  })
}
