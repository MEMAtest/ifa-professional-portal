// =====================================================
// FILE: src/domain/converters/index.ts
// PURPOSE: Convert between database and domain models
// Priority 1: Architectural Unification
// =====================================================

import type {
  ClientProfile,
  AssessmentVersion,
  SuitabilityDraft,
  Document,
  AssessmentProgress,
  SnapshotReferences
} from '../models'

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function keysToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = keysToCamel(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        item !== null && typeof item === 'object'
          ? keysToCamel(item as Record<string, unknown>)
          : item
      )
    } else {
      result[camelKey] = value
    }
  }

  return result
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function keysToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key)

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = keysToSnake(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        item !== null && typeof item === 'object'
          ? keysToSnake(item as Record<string, unknown>)
          : item
      )
    } else {
      result[snakeKey] = value
    }
  }

  return result
}

/**
 * Safely parse JSON with default value
 */
export function safeParseJson<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue
  }

  if (typeof value === 'object') {
    return value as T
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return defaultValue
    }
  }

  return defaultValue
}

// =====================================================
// DATABASE -> DOMAIN CONVERTERS
// =====================================================

/**
 * Convert database client row to ClientProfile
 */
export function toClientProfile(row: Record<string, unknown>): ClientProfile {
  const personalDetails = safeParseJson<Record<string, unknown>>(
    row.personal_details,
    {}
  )

  const firstName = (personalDetails.firstName || personalDetails.first_name || '') as string
  const lastName = (personalDetails.lastName || personalDetails.last_name || '') as string

  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    clientReference: row.client_reference as string || '',
    firmId: row.firm_id as string || '',
    advisorId: row.advisor_id as string || '',
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || 'Unknown Client',
    email: (personalDetails.email || row.email) as string | undefined,
    phone: personalDetails.phone as string | undefined,
    dateOfBirth: personalDetails.dateOfBirth as string | undefined,
    age: personalDetails.age as number | undefined,
    address: personalDetails.address as ClientProfile['address'],
    status: (row.status as ClientProfile['status']) || 'active',
    tags: row.tags as string[] | undefined,
    financialSummary: safeParseJson(row.financial_summary, undefined),
    dependents: personalDetails.dependents as number | undefined,
    maritalStatus: personalDetails.maritalStatus as string | undefined,
    employmentStatus: personalDetails.employmentStatus as string | undefined,
    occupation: personalDetails.occupation as string | undefined
  }
}

/**
 * Convert database assessment row to AssessmentVersion
 */
export function toAssessmentVersion(
  row: Record<string, unknown>,
  type: AssessmentVersion['assessmentType']
): AssessmentVersion {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    clientId: row.client_id as string,
    assessmentType: type,
    versionNumber: (row.version_number || row.version || 1) as number,
    isCurrent: (row.is_current ?? true) as boolean,
    status: (row.status as AssessmentVersion['status']) || 'completed',
    completedAt: row.completed_at as string | undefined,
    completedBy: row.completed_by as string | undefined,
    scores: extractScores(row, type),
    data: safeParseJson(row.assessment_data || row.data, {}),
    source: row.source as AssessmentVersion['source'],
    notes: row.notes as string | undefined
  }
}

/**
 * Extract scores based on assessment type
 */
function extractScores(
  row: Record<string, unknown>,
  type: AssessmentVersion['assessmentType']
): AssessmentVersion['scores'] {
  switch (type) {
    case 'atr':
      return {
        riskScore: row.risk_score as number | undefined,
        riskCategory: row.risk_category as string | undefined
      }
    case 'cfl':
      return {
        capacityScore: row.capacity_score as number | undefined,
        capacityRating: row.capacity_rating as string | undefined
      }
    case 'persona':
      return {
        personaType: row.persona_type as string | undefined
      }
    default:
      return undefined
  }
}

/**
 * Convert database suitability row to SuitabilityDraft
 */
export function toSuitabilityDraft(row: Record<string, unknown>): SuitabilityDraft {
  const formData = safeParseJson<Record<string, unknown>>(row.form_data, {})

  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    clientId: row.client_id as string,
    advisorId: row.advisor_id as string || '',
    firmId: row.firm_id as string | undefined,
    completionPercentage: (row.completion_percentage || 0) as number,
    status: (row.status as SuitabilityDraft['status']) || 'draft',
    versionNumber: (row.version_number || 1) as number,
    isCurrent: (row.is_current ?? true) as boolean,
    sections: {
      clientDetails: formData.clientDetails as SuitabilityDraft['sections']['clientDetails'],
      objectives: formData.objectives as SuitabilityDraft['sections']['objectives'],
      riskProfile: formData.riskProfile as SuitabilityDraft['sections']['riskProfile'],
      recommendations: formData.recommendations as SuitabilityDraft['sections']['recommendations'],
      ...formData
    },
    linkedAssessments: safeParseJson(row.linked_assessments, undefined),
    lastSavedAt: row.last_saved_at as string | undefined,
    submittedAt: row.submitted_at as string | undefined,
    finalizedAt: row.finalized_at as string | undefined
  }
}

/**
 * Convert database document row to Document
 */
export function toDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    clientId: row.client_id as string | undefined,
    firmId: row.firm_id as string,
    advisorId: row.advisor_id as string | undefined,
    name: row.name as string,
    description: row.description as string | undefined,
    documentType: row.document_type as string,
    category: row.category as string | undefined,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    fileSize: row.file_size as number | undefined,
    mimeType: row.mime_type as string | undefined,
    status: (row.status as Document['status']) || 'draft',
    signatureRequestId: row.signature_request_id as string | undefined,
    version: (row.version || 1) as number,
    parentDocumentId: row.parent_document_id as string | undefined,
    isArchived: (row.is_archived ?? false) as boolean,
    archivedAt: row.archived_at as string | undefined,
    archivedBy: row.archived_by as string | undefined
  }
}

/**
 * Convert database progress row to AssessmentProgress
 */
export function toAssessmentProgress(row: Record<string, unknown>): AssessmentProgress {
  return {
    clientId: row.client_id as string,
    assessmentType: row.assessment_type as AssessmentProgress['assessmentType'],
    status: (row.status as AssessmentProgress['status']) || 'not_started',
    completionPercentage: (row.completion_percentage || 0) as number,
    lastUpdated: (row.updated_at || row.last_updated) as string,
    currentVersion: row.current_version as number | undefined
  }
}

// =====================================================
// DOMAIN -> DATABASE CONVERTERS
// =====================================================

/**
 * Convert ClientProfile to database insert/update format
 */
export function fromClientProfile(
  profile: Partial<ClientProfile>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (profile.id) result.id = profile.id
  if (profile.firmId) result.firm_id = profile.firmId
  if (profile.advisorId) result.advisor_id = profile.advisorId
  if (profile.clientReference) result.client_reference = profile.clientReference
  if (profile.status) result.status = profile.status
  if (profile.tags) result.tags = profile.tags

  // Combine personal details into JSON
  const personalDetails: Record<string, unknown> = {}
  if (profile.firstName) personalDetails.firstName = profile.firstName
  if (profile.lastName) personalDetails.lastName = profile.lastName
  if (profile.email) personalDetails.email = profile.email
  if (profile.phone) personalDetails.phone = profile.phone
  if (profile.dateOfBirth) personalDetails.dateOfBirth = profile.dateOfBirth
  if (profile.age) personalDetails.age = profile.age
  if (profile.address) personalDetails.address = profile.address
  if (profile.dependents) personalDetails.dependents = profile.dependents
  if (profile.maritalStatus) personalDetails.maritalStatus = profile.maritalStatus
  if (profile.employmentStatus) personalDetails.employmentStatus = profile.employmentStatus
  if (profile.occupation) personalDetails.occupation = profile.occupation

  if (Object.keys(personalDetails).length > 0) {
    result.personal_details = personalDetails
  }

  if (profile.financialSummary) {
    result.financial_summary = profile.financialSummary
  }

  return result
}

/**
 * Convert SuitabilityDraft to database format
 */
export function fromSuitabilityDraft(
  draft: Partial<SuitabilityDraft>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (draft.id) result.id = draft.id
  if (draft.clientId) result.client_id = draft.clientId
  if (draft.advisorId) result.advisor_id = draft.advisorId
  if (draft.firmId) result.firm_id = draft.firmId
  if (draft.completionPercentage !== undefined) {
    result.completion_percentage = draft.completionPercentage
  }
  if (draft.status) result.status = draft.status
  if (draft.versionNumber) result.version_number = draft.versionNumber
  if (draft.isCurrent !== undefined) result.is_current = draft.isCurrent
  if (draft.sections) result.form_data = draft.sections
  if (draft.linkedAssessments) result.linked_assessments = draft.linkedAssessments

  return result
}

/**
 * Create snapshot references for report reproducibility
 */
export function createSnapshotRefs(assessments: {
  atr?: AssessmentVersion
  cfl?: AssessmentVersion
  persona?: AssessmentVersion
  suitability?: SuitabilityDraft
}): SnapshotReferences {
  return {
    suitabilityAssessmentId: assessments.suitability?.id,
    suitabilityVersion: assessments.suitability?.versionNumber,
    atrAssessmentId: assessments.atr?.id,
    atrVersion: assessments.atr?.versionNumber,
    cflAssessmentId: assessments.cfl?.id,
    cflVersion: assessments.cfl?.versionNumber,
    personaAssessmentId: assessments.persona?.id,
    personaVersion: assessments.persona?.versionNumber,
    capturedAt: new Date().toISOString()
  }
}
