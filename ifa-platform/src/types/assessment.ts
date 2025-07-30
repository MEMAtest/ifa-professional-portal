// src/types/assessment.ts
// ================================================================
// ELEVATED AND CORRECTED - FULL FILE
// This version preserves the original file structure and all existing
// types. The changes focus on correcting and enriching the
// AssessmentResult interface to resolve project-wide TypeScript errors.
// ================================================================

// ATR (Attitude to Risk) Types (Preserved from original file)
export interface ATRQuestion {
  id: string
  text: string
  options: string[]
  scores: number[]
  category: 'attitude' | 'experience' | 'knowledge' | 'emotional'
  weight: number
}

export interface ATRAnswers {
  [questionId: string]: number
}

// CFL (Capacity for Loss) Types (Preserved from original file)
export interface CFLQuestion {
  id: string
  text: string
  options: string[]
  category: 'financial' | 'timeframe' | 'objectives' | 'circumstances'
  type?: 'radio' | 'number' | 'text'
  validation?: { min?: number; max?: number; required?: boolean }
  explanation: string
  impact?: 'high' | 'medium' | 'low'
}

export interface CFLAnswers {
  [questionId: string]: string | number
}

// ✅ ELEVATION: A new, strongly-typed interface for the risk profile
// within an assessment. This provides better type safety than a generic object.
export interface AssessmentRiskProfile {
  overall: string;
  attitudeToRisk: number;
  riskCapacity: string;
  knowledgeExperience: string;
  volatilityComfort?: string;
  capacityForLoss?: string;
}

// Risk Metrics (Preserved from original file)
export interface RiskMetrics {
  atrScore: number
  atrCategory: string
  cflScore?: number
  cflCategory?: string
  behavioralBias: 'conservative' | 'neutral' | 'aggressive'
  finalRiskProfile: number
  finalRiskCategory?: string
  confidenceLevel: number
  riskCapacity?: string
  riskTolerance?: string
}

// Client Assessment Data (Preserved from original file)
export interface ClientAssessmentData {
  name: string
  email: string
  phone: string
  age: number
  dateOfBirth?: string
  occupation: string
  employmentStatus?: string
  annualIncome: number
  monthlyExpenditure?: number
  netWorth?: number
  liquidAssets?: number
  investmentAmount: number
  investmentExperience: string
  timeHorizon: string
  objectives: string[]
  hasPartner?: boolean
  partnerName?: string
  partnerAge?: number
  dependents?: number
}

// Investor Persona Types (Preserved from original file)
export interface InvestorPersonaType {
  type: string
  avatar: string
  description: string
  motivations: string[]
  fears: string[]
  communicationStyle: string
  suitableStrategies: string[]
  warningTriggers: string[]
  emotionalDrivers: { primary: string; secondary: string; deepFear: string; }
  psychologicalProfile: { decisionMaking: string; stressResponse: string; trustBuilding: string; confidence: string; }
  emotionalTriggers: { positive: string[]; negative: string[]; }
  communicationNeeds: { frequency: string; style: string; format: string; meetingPreference: string; }
  consumerDutyAlignment: { products: string; value: string; outcome: string; support: string; }
  behavioralTraits: string[]
  monitoringNeeds: string
}

/**
 * ✅ THE CORE FIX: The main AssessmentResult interface.
 * This has been elevated to include all missing properties that were
 * causing errors throughout the application (`riskProfile`, `overallScore`,
 * `recommendations`, `completedAt`).
 */
export interface AssessmentResult {
  id: string;
  clientId: string;
  
  clientData: ClientAssessmentData;
  // ✅ FIX: Added missing properties to align with application usage
  riskProfile: AssessmentRiskProfile;
  financialProfile: any; // Preserving flexibility from original code
  objectives: any; // Preserving flexibility
  overallScore: number;
  recommendations: string[];
  
  atrAnswers: ATRAnswers;
  cflAnswers: CFLAnswers;
  
  riskMetrics: RiskMetrics;
  persona?: InvestorPersonaType;
  
  suitabilityScore?: number;
  suitabilityStatus?: 'suitable' | 'review_required' | 'not_suitable';
  suitabilityNotes?: string;
  
  createdAt: string;
  updatedAt: string;
  // ✅ FIX: Ensured 'completedAt' exists, alongside 'completedBy'
  completedAt: string;
  completedBy?: string;
  reviewedBy?: string;
  status: 'draft' | 'completed' | 'approved' | 'archived';
  formData?: any;
}

// All other types and helper functions below are preserved exactly
// as they were in your original file, ensuring no functionality is lost.

// Assessment Summary for Dashboard
export interface AssessmentSummary {
  id: string
  clientId: string
  clientName: string
  assessmentType: 'suitability' | 'risk_profile' | 'annual_review'
  status: 'draft' | 'completed' | 'approved' | 'archived'
  completionPercentage: number
  riskProfile?: string
  suitabilityScore?: number
  createdAt: string
  updatedAt: string
  nextReviewDate?: string
}

// Assessment Step/Section Status
export interface AssessmentStepStatus {
  stepId: string
  stepName: string
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  completionPercentage: number
  requiredFields: number
  completedFields: number
  errors?: string[]
}

// Validation Results
export interface AssessmentValidation {
  isValid: boolean
  errors: AssessmentValidationError[]
  warnings: AssessmentValidationWarning[]
}

export interface AssessmentValidationError {
  field: string
  section: string
  message: string
  type: 'required' | 'format' | 'range' | 'logic' | 'consistency'
}

export interface AssessmentValidationWarning {
  field: string
  section: string
  message: string
  type: 'recommendation' | 'best_practice' | 'regulatory'
}

// Document Generation Types
export interface AssessmentDocument {
  id: string
  assessmentId: string
  documentType: 'suitability_report' | 'risk_profile' | 'recommendation_letter'
  templateId: string
  generatedAt: string
  generatedBy: string
  status: 'draft' | 'final' | 'sent' | 'signed'
  signatureStatus?: 'pending' | 'signed' | 'declined'
  documentUrl?: string
  metadata?: Record<string, any>
}

// Integration Types
export interface AssessmentIntegration {
  integrationType: 'crm' | 'portfolio' | 'compliance' | 'document'
  integrationId: string
  status: 'pending' | 'synced' | 'error'
  lastSyncAt?: string
  errorMessage?: string
}

// Compliance Check Results
export interface ComplianceCheckResult {
  checkType: 'kyc' | 'aml' | 'suitability' | 'consumer_duty'
  status: 'passed' | 'failed' | 'review_required'
  details: string
  checkedAt: string
  checkedBy: string
  requiresAction?: boolean
  actionItems?: string[]
}

// Assessment Configuration
export interface AssessmentConfiguration {
  assessmentType: 'suitability' | 'risk_profile' | 'annual_review'
  sections: AssessmentSection[]
  validationRules: ValidationRule[]
  scoringMethod: 'weighted' | 'simple' | 'custom'
  complianceRequirements: string[]
}

export interface AssessmentSection {
  id: string
  title: string
  description?: string
  order: number
  required: boolean
  fields: AssessmentField[]
  conditionalLogic?: ConditionalLogic[]
}

export interface AssessmentField {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'textarea'
  required: boolean
  validation?: FieldValidation
  options?: FieldOption[]
  helpText?: string
  defaultValue?: any
  dependsOn?: FieldDependency
}

export interface FieldValidation {
  type: 'email' | 'phone' | 'ni' | 'postcode' | 'custom'
  pattern?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  customValidator?: (value: any) => boolean
}

export interface FieldOption {
  value: string | number
  label: string
  score?: number
  helpText?: string
}

export interface FieldDependency {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface ConditionalLogic {
  conditions: FieldDependency[]
  operator: 'AND' | 'OR'
  action: 'show' | 'hide' | 'require' | 'calculate'
  targetFields: string[]
}

export interface ValidationRule {
  id: string
  name: string
  type: 'field' | 'section' | 'cross_field' | 'business_logic'
  condition: string
  errorMessage: string
  severity: 'error' | 'warning' | 'info'
}

// Assessment Templates
export interface AssessmentTemplate {
  id: string
  name: string
  description: string
  type: 'suitability' | 'risk_profile' | 'annual_review'
  version: string
  isActive: boolean
  configuration: AssessmentConfiguration
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Utility Types
export type AssessmentStatus = 'draft' | 'in_progress' | 'completed' | 'approved' | 'archived'
export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
export type SuitabilityStatus = 'suitable' | 'review_required' | 'not_suitable'

// Helper Functions
export const getRiskLevelFromScore = (score: number): RiskLevel => {
  if (score <= 20) return 'very_low'
  if (score <= 40) return 'low'
  if (score <= 60) return 'medium'
  if (score <= 80) return 'high'
  return 'very_high'
}

export const getSuitabilityStatusFromScore = (score: number): SuitabilityStatus => {
  if (score >= 80) return 'suitable'
  if (score >= 60) return 'review_required'
  return 'not_suitable'
}

export const calculateCompletionPercentage = (completedFields: number, totalRequiredFields: number): number => {
  if (totalRequiredFields === 0) return 100
  return Math.round((completedFields / totalRequiredFields) * 100)
}

// Export type guards
export const isValidAssessmentStatus = (status: any): status is AssessmentStatus => {
  const validStatuses: AssessmentStatus[] = ['draft', 'in_progress', 'completed', 'approved', 'archived']
  return typeof status === 'string' && validStatuses.includes(status as AssessmentStatus)
}

export const isValidRiskLevel = (level: any): level is RiskLevel => {
  const validLevels: RiskLevel[] = ['very_low', 'low', 'medium', 'high', 'very_high']
  return typeof level === 'string' && validLevels.includes(level as RiskLevel)
}

// Constants
export const RISK_CATEGORIES = {
  VERY_CONSERVATIVE: { min: 0, max: 20, label: 'Very Conservative' },
  CONSERVATIVE: { min: 21, max: 40, label: 'Conservative' },
  BALANCED: { min: 41, max: 60, label: 'Balanced' },
  GROWTH: { min: 61, max: 80, label: 'Growth' },
  AGGRESSIVE_GROWTH: { min: 81, max: 100, label: 'Aggressive Growth' }
} as const

export const SUITABILITY_THRESHOLDS = {
  HIGHLY_SUITABLE: 80,
  SUITABLE: 60,
  REVIEW_REQUIRED: 40,
  NOT_SUITABLE: 0
} as const