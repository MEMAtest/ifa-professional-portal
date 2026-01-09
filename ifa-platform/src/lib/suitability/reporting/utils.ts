export type JsonObject = Record<string, any>

export function asObject(value: unknown): JsonObject {
  if (!value) return {}
  if (typeof value === 'object') return value as JsonObject
  return {}
}

export function asTrimmedString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const str = typeof value === 'string' ? value : String(value)
  const trimmed = str.trim()
  return trimmed ? trimmed : undefined
}

export function pickFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const str = asTrimmedString(value)
    if (str) return str
  }
  return undefined
}

export function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function splitLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
      .filter(Boolean)
  }

  const str = asTrimmedString(value)
  if (!str) return []
  return str
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function calculateNextReviewDateISO(
  reviewFrequency: string | undefined,
  baseISO: string
): string | undefined {
  const base = new Date(baseISO)
  if (Number.isNaN(base.getTime())) return undefined

  const normalized = (reviewFrequency || '').toLowerCase()
  if (!normalized) return undefined

  const monthMatch = normalized.match(/(\d+)\s*month/)
  if (monthMatch) {
    const months = Number(monthMatch[1])
    if (Number.isFinite(months) && months > 0) {
      return addMonths(base, months).toISOString().slice(0, 10)
    }
  }

  if (normalized.includes('quarter')) return addMonths(base, 3).toISOString().slice(0, 10)
  if (normalized.includes('semi')) return addMonths(base, 6).toISOString().slice(0, 10)
  if (normalized.includes('annual')) return addMonths(base, 12).toISOString().slice(0, 10)
  if (normalized.includes('year')) return addMonths(base, 12).toISOString().slice(0, 10)
  return undefined
}

export function buildReportRef(clientRef: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SR-${clientRef || 'CLIENT'}-${datePart}-${random}`
}

export function formatAddress(address: unknown): string | undefined {
  if (!address) return undefined
  if (typeof address === 'string') return address.trim() || undefined
  if (typeof address !== 'object') return String(address)
  const a = address as any
  const parts = [a.line1, a.line2, a.city, a.county, a.postcode, a.country]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
  return parts.join(', ') || undefined
}

export function normalizeArrangementTypeLabel(raw: unknown): string | undefined {
  const str = asTrimmedString(raw)
  if (!str) return undefined
  // e.g. "defined_benefit" -> "Defined Benefit"
  return str
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function calculateAge(dateValue: string | undefined): number | undefined {
  if (!dateValue) return undefined
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return undefined

  const today = new Date()
  let age = today.getFullYear() - parsed.getFullYear()
  const monthDiff = today.getMonth() - parsed.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : undefined
}
