// =====================================================
// FILE: src/domain/models/index.ts
// PURPOSE: Canonical domain model types
// Priority 1: Architectural Unification
// =====================================================

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

/**
 * Client Profile - Canonical type for client data
 */
export interface ClientProfile extends BaseEntity {
  // Core identification
  clientReference: string
  firmId: string
  advisorId: string

  // Personal details
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  age?: number

  // Address
  address?: {
    line1?: string
    line2?: string
    city?: string
    county?: string
    postcode?: string
    country?: string
  }

  // Status
  status: 'active' | 'inactive' | 'prospect' | 'archived'
  tags?: string[]

  // Financial overview
  financialSummary?: {
    totalAssets?: number
    totalLiabilities?: number
    netWorth?: number
    annualIncome?: number
    monthlyExpenditure?: number
  }

  // Relationships
  dependents?: number
  maritalStatus?: string
  employmentStatus?: string
  occupation?: string
}

/**
 * Assessment Version - Tracks versions of any assessment type
 */
export interface AssessmentVersion extends BaseEntity {
  clientId: string
  assessmentType: 'atr' | 'cfl' | 'persona' | 'suitability' | 'vulnerability'
  versionNumber: number
  isCurrent: boolean
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  completedAt?: string
  completedBy?: string

  // Scores (type-specific)
  scores?: {
    riskScore?: number
    riskCategory?: string
    capacityScore?: number
    capacityRating?: string
    personaType?: string
  }

  // Raw assessment data
  data: Record<string, unknown>

  // Metadata
  source?: 'advisor' | 'client_portal' | 'import'
  notes?: string
}

/**
 * Suitability Draft - Work in progress suitability assessment
 */
export interface SuitabilityDraft extends BaseEntity {
  clientId: string
  advisorId: string
  firmId?: string

  // Progress tracking
  completionPercentage: number
  status: 'draft' | 'in_progress' | 'pending_review' | 'completed'
  versionNumber: number
  isCurrent: boolean

  // Form sections
  sections: {
    clientDetails?: SuitabilityClientDetails
    objectives?: SuitabilityObjectives
    riskProfile?: SuitabilityRiskProfile
    recommendations?: SuitabilityRecommendations
    [key: string]: unknown
  }

  // Linked assessments (by version ID for reproducibility)
  linkedAssessments?: {
    atrAssessmentId?: string
    atrVersion?: number
    cflAssessmentId?: string
    cflVersion?: number
    personaAssessmentId?: string
    personaVersion?: number
  }

  // Workflow
  lastSavedAt?: string
  submittedAt?: string
  finalizedAt?: string
}

/**
 * Suitability section types
 */
export interface SuitabilityClientDetails {
  personalDetails?: Record<string, unknown>
  financialDetails?: Record<string, unknown>
  employmentDetails?: Record<string, unknown>
}

export interface SuitabilityObjectives {
  primaryObjective?: string
  secondaryObjectives?: string[]
  timeHorizon?: string
  investmentAmount?: number
  incomeRequirements?: Record<string, unknown>
}

export interface SuitabilityRiskProfile {
  attitudeToRisk?: number
  capacityForLoss?: number
  riskCategory?: string
  riskNotes?: string
}

export interface SuitabilityRecommendations {
  summary?: string
  productRecommendations?: Array<{
    type: string
    provider?: string
    amount?: number
    rationale?: string
  }>
  actionItems?: string[]
}

/**
 * Report Model - For generating PDF/document reports
 */
export interface ReportModel extends BaseEntity {
  clientId: string
  clientProfile: ClientProfile
  reportType: 'suitability' | 'atr' | 'cfl' | 'annual_review' | 'client_dossier'

  // Snapshot references for reproducibility
  snapshotRefs: SnapshotReferences

  // Generated content
  sections: ReportSection[]

  // Metadata
  generatedAt: string
  generatedBy: string
  version: string
}

export interface SnapshotReferences {
  suitabilityAssessmentId?: string
  suitabilityVersion?: number
  atrAssessmentId?: string
  atrVersion?: number
  cflAssessmentId?: string
  cflVersion?: number
  personaAssessmentId?: string
  personaVersion?: number
  capturedAt: string
}

export interface ReportSection {
  id: string
  title: string
  content: string | Record<string, unknown>
  order: number
}

/**
 * Document - Stored/generated document
 */
export interface Document extends BaseEntity {
  clientId?: string
  firmId: string
  advisorId?: string

  // Document info
  name: string
  description?: string
  documentType: string
  category?: string

  // File info
  fileName: string
  filePath: string
  fileSize?: number
  mimeType?: string

  // Status
  status: 'draft' | 'pending_signature' | 'signed' | 'archived'
  signatureRequestId?: string

  // Versioning
  version: number
  parentDocumentId?: string

  // Audit
  isArchived: boolean
  archivedAt?: string
  archivedBy?: string
}

/**
 * Assessment Progress - Tracks completion status
 */
export interface AssessmentProgress {
  clientId: string
  assessmentType: 'atr' | 'cfl' | 'persona' | 'suitability'
  status: 'not_started' | 'in_progress' | 'completed'
  completionPercentage: number
  lastUpdated: string
  currentVersion?: number
}
