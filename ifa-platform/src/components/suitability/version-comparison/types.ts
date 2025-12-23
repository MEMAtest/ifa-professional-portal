export type VersionComparisonProps = {
  clientId: string
  currentVersionId?: string
  onVersionSelect?: (versionId: string) => void
  className?: string
  showFullComparison?: boolean
  autoLoad?: boolean
}

export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged'
export type Importance = 'critical' | 'important' | 'minor'

export type VersionDifference = {
  section: string
  field: string
  oldValue: unknown
  newValue: unknown
  changeType: ChangeType
  importance: Importance
}

export type ComparisonSummary = {
  totalChanges: number
  addedFields: number
  removedFields: number
  modifiedFields: number
  completionChange: number
  criticalChanges: string[]
}

export type SimpleFormData = Record<string, unknown> & {
  id?: string
  client_id?: string
  personal_information?: Record<string, unknown>
  financial_situation?: Record<string, unknown>
  objectives?: Record<string, unknown>
  risk_assessment?: Record<string, unknown>
  knowledge_experience?: Record<string, unknown>
  existing_arrangements?: Record<string, unknown>
  vulnerability_assessment?: Record<string, unknown>
  regulatory_compliance?: Record<string, unknown>
  recommendations?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type ComparisonTab = 'summary' | 'details'

