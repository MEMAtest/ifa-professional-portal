export type SuitabilityLifecycleStatus = 'not_started' | 'in_progress' | 'completed'

export type SuitabilityCompletionState = {
  completionPercentage: number
  lifecycleStatus: SuitabilityLifecycleStatus
  isFinalLike: boolean
  canGenerateFinalReports: boolean
  statusLabel: string
  resultLabel?: string
}

export function normalizeCompletionPercentage(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
    const floatParsed = parseFloat(trimmed.replace(/,/g, ''))
    return Number.isFinite(floatParsed) ? floatParsed : null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeStatus(status: unknown): string {
  return String(status || '').trim().toLowerCase()
}

export function deriveSuitabilityCompletionState(params: {
  status: unknown
  isFinal: unknown
  isDraft: unknown
  completionPercentage: unknown
}): SuitabilityCompletionState {
  const completionRaw = normalizeCompletionPercentage(params.completionPercentage)
  const completionPercentage = Math.max(0, Math.min(100, Math.round(completionRaw ?? 0)))
  const status = normalizeStatus(params.status)
  const isFinalLike = Boolean(params.isFinal) || status === 'submitted' || status === 'completed'

  const canGenerateFinalReports = isFinalLike && completionPercentage >= 80

  const lifecycleStatus: SuitabilityLifecycleStatus =
    canGenerateFinalReports
      ? 'completed'
      : completionPercentage > 0 || status === 'in_progress' || status === 'draft'
        ? 'in_progress'
        : 'not_started'

  const statusLabel =
    lifecycleStatus === 'completed'
      ? 'Complete'
      : lifecycleStatus === 'in_progress'
        ? 'In Progress'
        : 'Not Started'

  const resultLabel =
    lifecycleStatus === 'completed'
      ? `${completionPercentage}%`
      : completionPercentage > 0
        ? `${completionPercentage}% Complete`
        : undefined

  return {
    completionPercentage,
    lifecycleStatus,
    isFinalLike,
    canGenerateFinalReports,
    statusLabel,
    resultLabel
  }
}

