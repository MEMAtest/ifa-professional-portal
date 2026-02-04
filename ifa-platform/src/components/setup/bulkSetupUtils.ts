import type { ReviewedClient } from '@/types/bulk-setup'

export const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB - match server limit
export const EXTRACT_BATCH_SIZE = 5
export const ANALYSIS_POLL_INTERVAL_MS = 1500
export const MAX_ANALYSIS_WAIT_MS = 3 * 60 * 1000

export type ProfilePopulationStatus = 'running' | 'success' | 'failed'

export interface ProfilePopulationEntry {
  status: ProfilePopulationStatus
  error?: string
}

export type ReuploadStatus = 'idle' | 'uploading' | 'success' | 'failed'

export interface ReuploadEntry {
  status: ReuploadStatus
  error?: string
}

export function getAutoTags(fileName: string): string[] {
  const tags: string[] = []
  const lower = fileName.toLowerCase()
  const ext = lower.slice(lower.lastIndexOf('.'))

  const extTags: Record<string, string[]> = {
    '.pdf': ['pdf'],
    '.doc': ['word-document'],
    '.docx': ['word-document'],
    '.xls': ['spreadsheet'],
    '.xlsx': ['spreadsheet'],
    '.msg': ['email', 'correspondence'],
    '.eml': ['email', 'correspondence'],
    '.png': ['image'],
    '.jpg': ['image'],
    '.jpeg': ['image'],
    '.gif': ['image'],
    '.txt': ['text'],
    '.csv': ['text'],
  }
  if (extTags[ext]) tags.push(...extTags[ext])

  const nameWithoutExt = lower.replace(/\.[^.]+$/, '')
  const patterns: [RegExp, string][] = [
    [/\b(?:passport|driving[\s_-]?licen[cs]e|identity|photo[\s_-]?id)\b/i, 'identification'],
    [/\b(?:tax|hmrc|sa302|p60|p45)\b/i, 'tax'],
    [/\b(?:pension|sipp|annuity)\b/i, 'pension'],
    [/\b(?:insurance|policy|life[\s_-]?cover)\b/i, 'insurance'],
    [/\b(?:bank|statement|account)\b/i, 'bank-statement'],
    [/\b(?:will|trust|estate)\b/i, 'estate-planning'],
    [/\b(?:mortgage|property)\b/i, 'property'],
    [/\b(?:investment|portfolio|fund)\b/i, 'investment'],
  ]
  for (const [regex, tag] of patterns) {
    if (regex.test(nameWithoutExt)) tags.push(tag)
  }

  return [...new Set(tags)]
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function isValidEmail(email: string): boolean {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

export function validateClient(
  client: ReviewedClient,
  allClients: ReviewedClient[]
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!client.lastName.trim()) errors.lastName = 'Last name is required'
  if (!client.firstName.trim()) errors.firstName = 'First name is required'
  if (client.email && !isValidEmail(client.email))
    errors.email = 'Invalid email format'
  if (!client.clientRef.trim()) errors.clientRef = 'Client ref is required'

  const duplicates = allClients.filter(
    (c) =>
      c.id !== client.id &&
      c.clientRef.trim().toLowerCase() === client.clientRef.trim().toLowerCase()
  )
  if (duplicates.length > 0) errors.clientRef = 'Duplicate client reference'

  return errors
}
