// =====================================================
// FILE: src/types/suitability-version.ts
// Shared types for suitability assessment versioning
// =====================================================

export interface AssessmentVersionInfo {
  id: string
  client_id: string
  version_number: number | null
  created_at: string | null
  updated_at: string | null
  is_draft: boolean | null
  is_final: boolean | null
  is_current: boolean | null
  status: string | null
  completion_percentage: number | null
  parent_assessment_id: string | null
}

export interface SuitabilityPageState {
  currentVersion: AssessmentVersionInfo | null
  versionHistory: AssessmentVersionInfo[]
  showVersionHistory: boolean
  showVersionComparison: boolean
  compareVersionId: string | null
  isLoadingVersion: boolean
}
