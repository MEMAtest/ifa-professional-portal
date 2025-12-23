import type { AssessmentVersionInfo } from '@/types/suitability-version'

import type { ChangeType, ComparisonSummary, SimpleFormData, VersionDifference } from './types'

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    const sorted: Record<string, unknown> = {}
    for (const key of keys) sorted[key] = sortKeysDeep(record[key])
    return sorted
  }
  return value
}

function canonicalString(value: unknown): string {
  try {
    return JSON.stringify(sortKeysDeep(value))
  } catch {
    return String(value)
  }
}

export function compareValues(oldVal: unknown, newVal: unknown): ChangeType {
  if (canonicalString(oldVal) === canonicalString(newVal)) return 'unchanged'
  if (isEmptyValue(oldVal) && !isEmptyValue(newVal)) return 'added'
  if (!isEmptyValue(oldVal) && isEmptyValue(newVal)) return 'removed'
  return 'modified'
}

export function getImportance(section: string, field: string): VersionDifference['importance'] {
  const criticalFields = ['risk_tolerance', 'capacity_for_loss', 'investment_amount', 'vulnerability']
  const importantFields = ['objectives', 'time_horizon', 'knowledge_experience']

  if (criticalFields.some(f => field.includes(f))) return 'critical'
  if (importantFields.some(f => field.includes(f))) return 'important'
  return 'minor'
}

export function calculateDifferences(v1: SimpleFormData, v2: SimpleFormData): VersionDifference[] {
  const diffs: VersionDifference[] = []
  const sections = [
    'personal_information',
    'financial_situation',
    'objectives',
    'risk_assessment',
    'knowledge_experience',
    'existing_arrangements',
    'vulnerability_assessment',
    'regulatory_compliance'
  ]

  for (const section of sections) {
    const oldSection = (v1[section] || {}) as Record<string, unknown>
    const newSection = (v2[section] || {}) as Record<string, unknown>
    const allFields = new Set([...Object.keys(oldSection), ...Object.keys(newSection)])

    for (const field of allFields) {
      const oldValue = oldSection[field]
      const newValue = newSection[field]
      const changeType = compareValues(oldValue, newValue)

      diffs.push({
        section,
        field,
        oldValue,
        newValue,
        changeType,
        importance: getImportance(section, field)
      })
    }
  }

  return diffs
}

export function groupDifferencesBySection(differences: VersionDifference[]): Record<string, VersionDifference[]> {
  const grouped: Record<string, VersionDifference[]> = {}
  for (const diff of differences) {
    if (!grouped[diff.section]) grouped[diff.section] = []
    grouped[diff.section].push(diff)
  }
  return grouped
}

export function summarizeDifferences(args: {
  differences: VersionDifference[]
  versions: AssessmentVersionInfo[]
  selectedVersions: [string | undefined, string | undefined]
}): ComparisonSummary {
  const summary: ComparisonSummary = {
    totalChanges: 0,
    addedFields: 0,
    removedFields: 0,
    modifiedFields: 0,
    completionChange: 0,
    criticalChanges: []
  }

  for (const diff of args.differences) {
    if (diff.changeType === 'unchanged') continue
    summary.totalChanges++
    if (diff.changeType === 'added') summary.addedFields++
    if (diff.changeType === 'removed') summary.removedFields++
    if (diff.changeType === 'modified') summary.modifiedFields++
    if (diff.importance === 'critical') summary.criticalChanges.push(`${diff.section}.${diff.field}`)
  }

  const [fromId, toId] = args.selectedVersions
  if (fromId && toId) {
    const v1 = args.versions.find(v => v.id === fromId)
    const v2 = args.versions.find(v => v.id === toId)
    if (v1 && v2) {
      summary.completionChange = (v2.completion_percentage || 0) - (v1.completion_percentage || 0)
    }
  }

  return summary
}

