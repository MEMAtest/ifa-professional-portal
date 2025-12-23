// =====================================================
// FILE: src/types/suitability/index.ts
// COMPLETE UPDATED VERSION WITH ALL FIXES
// =====================================================

import type { LucideIcon } from 'lucide-react'

// Re-export centralized status types for convenience
export type {
  AssessmentStatus,
  SaveStatus,
  ProgressStatus
} from '@/types/assessment-status'

export {
  VALID_TRANSITIONS,
  isValidTransition,
  getNextValidStatuses,
  isEditable,
  isTerminal,
  isSubmitted,
  getStatusLabel,
  getStatusColor,
  normalizeLegacyStatus,
  isAssessmentStatus,
  isSaveStatus,
  isProgressStatus
} from '@/types/assessment-status'

// ===== SECTION DATA TYPES - COMPLETE DEFINITIONS =====
export interface InvestmentObjectives {
  advice_scope?: string[]
  primary_objective?: string
  secondary_objectives?: string[]
  time_horizon?: number
  investment_amount?: number
  additional_contributions?: number
  target_return?: number
  requires_investment_income?: string
  required_monthly_income?: number
  income_frequency?: string
  // Legacy field name (historically used for multiple meanings)
  income_requirement?: number | string
  specific_goals?: string
  retirement_income_target?: number
  state_pension_forecast?: number
  other_pension_income?: number
  retirement_lifestyle?: string
  number_of_children?: number
  education_timeline?: number
  education_fund_target?: number
}

export interface FinancialSituation {
  annual_income?: number
  monthly_expenditure?: number
  disposable_income?: number
  liquid_assets?: number
  property_value?: number
  outstanding_mortgage?: number
  other_liabilities?: number
  net_worth?: number
  emergency_fund?: number
  emergency_months?: string
  partner_annual_income?: number
  joint_monthly_expenditure?: number
  partner_assets?: number
  partner_liabilities?: number
  expense_categories?: any[]
  income_employment?: number
  income_state_pension?: number
  income_defined_benefit?: number
  income_rental?: number
  income_dividends?: number
  income_other?: number
  income_total?: number
  exp_housing?: number
  exp_utilities?: number
  exp_food?: number
  exp_transport?: number
  exp_healthcare?: number
  exp_leisure?: number
  exp_holidays?: number
  exp_other?: number
  exp_total_essential?: number
  exp_total_discretionary?: number
}

export interface RiskAssessment {
  attitude_to_risk?: string
  max_acceptable_loss?: number
  risk_experience?: string
  volatility_comfort?: string
  previous_losses?: string
  risk_capacity_score?: string
  risk_reconciliation?: string
  loss_amount?: number
  loss_impact?: string
  loss_learning?: string
}

export interface KnowledgeExperience {
  investment_knowledge?: string
  investment_types_known?: string[]
  current_investments?: string
  professional_qualifications?: string
  information_sources?: string[]
  education_needs?: string
  portfolio_value?: number
  portfolio_composition?: string
  investment_performance?: string
  current_adviser?: string
}

export interface ExistingArrangements {
  has_pension?: string
  has_protection?: string
  has_mortgage_protection?: string
  has_will?: string
  has_lpa?: string
  estate_planning_needs?: string
  pension_providers?: string
  total_pension_value?: number
  pension_contributions?: number
  pension_review_needed?: string
  life_cover_amount?: number
  critical_illness_cover?: number
  income_protection?: number
  protection_review_needed?: string
}

export interface VulnerabilityAssessment {
  // Current field set (used in section config)
  health_conditions?: string
  support_needed?: string[]
  life_events?: string[]
  financial_confidence?: string
  third_party_authority?: string

  // Conditional follow-ups / additional detail fields
  cognitive_ability?: string
  power_of_attorney?: string
  communication_preferences?: string[]
  support_person?: string
  cooling_off_period?: string
  emotional_support?: string[]
  vulnerability_notes?: string
  other_life_event?: string

  // Legacy aliases (older drafts / earlier iterations)
  health_concerns?: string
  support_network?: string
}

export interface RegulatoryCompliance {
  advice_scope?: string
  service_level?: string
  politically_exposed?: string
  source_of_wealth?: string
  data_protection_consent?: string
  marketing_consent?: string
  complaints_acknowledged?: string
  pep_position?: string
  pep_country?: string
  pep_date_from?: string
  pep_date_to?: string
  // Legacy field name (free-text date range)
  pep_dates?: string
  wealth_source_details?: string
  pts_confirmation?: boolean
}

export interface Recommendation {
  // Preferred structured fields (used for FCA suitability report generation)
  recommended_portfolio?: string
  allocation_equities?: number
  allocation_bonds?: number
  allocation_cash?: number
  allocation_alternatives?: number
  product_1_name?: string
  product_1_provider?: string
  product_1_amount?: number
  product_1_reason?: string
  product_2_name?: string
  product_2_provider?: string
  product_2_amount?: number
  product_2_reason?: string
  product_3_name?: string
  product_3_provider?: string
  product_3_amount?: number
  product_3_reason?: string
  recommendation_rationale?: string
  next_review_date?: string
  advisor_declaration?: string[] | string

  // Legacy/compat fields (kept for backwards compatibility)
  recommendation_summary?: string
  product_selection?: string[]
  platform_recommendation?: string
  asset_allocation?: string
  implementation_timeline?: string
  review_frequency?: string
}

export interface SuitabilityDeclaration {
  meets_objectives?: string
  objectives_explanation?: string
  suitable_risk?: string
  risk_explanation?: string
  affordable?: string
  affordability_explanation?: string
  consumer_duty_met?: string
  best_interests_declaration?: string[] | string
}

export interface OptionsConsidered {
  option_1_name?: string
  option_1_description?: string
  option_1_pros?: string
  option_1_cons?: string
  option_1_selected?: string
  option_1_reason?: string
  option_2_name?: string
  option_2_description?: string
  option_2_pros?: string
  option_2_cons?: string
  option_2_selected?: string
  option_2_reason?: string
  option_3_name?: string
  option_3_description?: string
  option_3_pros?: string
  option_3_cons?: string
  option_3_selected?: string
  option_3_reason?: string
}

export interface DisadvantagesRisks {
  disadvantages?: string
  risks?: string
  mitigations?: string
}

export interface OngoingService {
  review_frequency?: string
  services_included?: string[]
  contact_methods?: string[]
  response_times?: string
}

export interface CostsCharges {
  initial_adviser_charge?: number
  initial_adviser_charge_amount?: number
  ongoing_adviser_charge?: number
  platform_charge?: number
  fund_charges?: number
  total_ongoing_charges?: number | string
  transaction_costs?: number
  value_assessment?: string
}

export interface Documentation {
  documents_to_provide?: string[]
  client_actions_required?: string
  adviser_actions?: string
  next_review_date?: string
  special_instructions?: string
  assessment_completed_by?: string
  assessment_date?: string
}

export interface PersonalInformation {
  client_name?: string
  client_reference?: string
  date_of_birth?: string
  age?: number
  national_insurance?: string
  marital_status?: string
  dependents?: number
  employment_status?: string
  target_retirement_age?: number
  occupation?: string
  employer?: string
  employment_duration?: number
  employment_sector?: string
  business_name?: string
  business_type?: string
  years_trading?: number
  business_structure?: string
  retirement_date?: string
  previous_occupation?: string
  pension_income?: number
  partner_name?: string
  partner_date_of_birth?: string
  partner_age?: number
  partner_ni?: string
  partner_employment_status?: string
  joint_assessment?: string
}

export interface PartnerInformation {
  partner_name?: string
  partner_date_of_birth?: string
  partner_age?: number
  partner_ni?: string
  partner_employment_status?: string
  joint_assessment?: string
  partner_annual_income?: number
  partner_assets?: number
  partner_liabilities?: number
}

export interface ContactDetails {
  address?: string
  phone?: string
  email?: string
  preferred_contact?: string
  best_contact_time?: string
  postcode?: string
  latitude?: number
  longitude?: number
  addressComponents?: {
    line1?: string
    line2?: string
    city?: string
    county?: string
    country?: string
  }
}

/**
 * All valid section IDs in the suitability form
 */
export type SuitabilitySectionId =
  | '_metadata'
  | '_aiSuggestions'
  | '_chartData'
  | 'personal_information'
  | 'partner_information'
  | 'contact_details'
  | 'objectives'
  | 'financial_situation'
  | 'risk_assessment'
  | 'knowledge_experience'
  | 'existing_arrangements'
  | 'vulnerability_assessment'
  | 'regulatory_compliance'
  | 'recommendation'
  | 'options_considered'
  | 'disadvantages_risks'
  | 'suitability_declaration'
  | 'costs_charges'
  | 'ongoing_service'
  | 'documentation'

/**
 * Section data union type for type-safe dynamic access
 */
export type SuitabilitySectionData =
  | SuitabilityMetadata
  | Record<string, AISuggestion>
  | Record<string, ChartData>
  | PersonalInformation
  | PartnerInformation
  | ContactDetails
  | InvestmentObjectives
  | FinancialSituation
  | RiskAssessment
  | KnowledgeExperience
  | ExistingArrangements
  | VulnerabilityAssessment
  | RegulatoryCompliance
  | Recommendation
  | OptionsConsidered
  | DisadvantagesRisks
  | SuitabilityDeclaration
  | CostsCharges
  | OngoingService
  | Documentation
  | undefined

export interface SuitabilityFormData {
  _metadata: SuitabilityMetadata
  _aiSuggestions: Record<string, AISuggestion>
  _chartData: Record<string, ChartData>
  personal_information?: PersonalInformation
  partner_information?: PartnerInformation
  contact_details?: ContactDetails
  objectives?: InvestmentObjectives
  financial_situation?: FinancialSituation
  risk_assessment?: RiskAssessment
  knowledge_experience?: KnowledgeExperience
  existing_arrangements?: ExistingArrangements
  vulnerability_assessment?: VulnerabilityAssessment
  regulatory_compliance?: RegulatoryCompliance
  recommendation?: Recommendation
  options_considered?: OptionsConsidered
  disadvantages_risks?: DisadvantagesRisks
  suitability_declaration?: SuitabilityDeclaration
  costs_charges?: CostsCharges
  ongoing_service?: OngoingService
  documentation?: Documentation
  // Dynamic fields for conditional visibility and other runtime state
  _conditionalFields?: {
    requiredFields?: Record<string, boolean>
    visibilityState?: Record<string, boolean>
  }
  // Index signature for dynamic section access
  // NOTE: This is kept for backward compatibility with existing codebase
  // New code should prefer explicit typed access where possible
  // Note: using any type here for flexibility
  [key: string]: any
}

/**
 * Type-safe section accessor for SuitabilityFormData
 * Use this instead of dynamic indexing to maintain type safety
 */
export function getSectionData(
  formData: SuitabilityFormData,
  sectionId: SuitabilitySectionId
): SuitabilitySectionData {
  return formData[sectionId]
}

// ✅ UPDATED: Added all missing properties to fix TypeScript errors
export interface SuitabilityMetadata {
  version: string
  createdAt: string
  updatedAt: string
  completionPercentage: number
  aiEnabled: boolean
  pulledData: PulledPlatformData
  parentAssessmentId?: string
  syncEnabled?: boolean
  lastSyncedAt?: string
  isDirty?: boolean
  // ✅ ADDED: Missing properties used in page.tsx
  lastSaved?: string  // Used in line 610 of page.tsx
  isComplete?: boolean  // Used in line 703 of page.tsx
  status?: import('@/types/assessment-status').AssessmentStatus
  submittedAt?: string  // When assessment was submitted
  missingFields?: Array<{
    sectionId: string
    sectionName: string
    missingFields: Array<{
      fieldId: string
      fieldName: string
      required: boolean
    }>
  }>  // For tracking incomplete submissions
}

export interface PulledPlatformData {
  atrScore?: number
  atrCategory?: string
  cflScore?: number
  cflCategory?: string
  vulnerabilityScore?: string
  vulnerabilityFactors?: string[]
  clientMetrics?: {
    totalAssets?: number
    totalLiabilities?: number
    investmentExperience?: string
  }
  lastAssessmentDates?: {
    atr?: string
    cfl?: string
    persona?: string
  }
  marketData?: {
    ftse100?: number
    gilts10Y?: number
    inflationRate?: number
  }
}

export interface AISuggestion {
  insights: string[]
  warnings?: string[]
  fieldSuggestions?: Record<string, any>
  confidence: number
  sources: string[]
  timestamp: string
}

export interface ChartData {
  type: 'pie' | 'bar' | 'line' | 'radar'
  data: any
  options?: any
}

export interface SuitabilityField {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'email' | 'tel' | 'address'
  required?: boolean
  options?: string[]
  placeholder?: string
  validation?: string
  autoGenerate?: boolean
  calculate?: string
  dependsOn?: FieldDependency
  smartDefault?: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => any
  helpText?: string
  pullFrom?: string
  aiSuggested?: boolean
  validateWith?: (value: any, formData: SuitabilityFormData, pulledData: PulledPlatformData) => string | null
  asyncValidation?: boolean
  realTimeSync?: boolean
  trackChanges?: boolean
}

export interface FieldDependency {
  field: string
  value: any
  operator?: 'equals' | 'includes' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists'
}

export interface SuitabilitySection {
  id: string
  title: string
  icon: LucideIcon
  status: 'complete' | 'partial' | 'incomplete' | 'error'
  fields: SuitabilityField[]
  conditionalFields?: ConditionalFieldGroup[]
  aiEnabled?: boolean
  chartEnabled?: boolean
  pulledDataFields?: string[]
  validationRules?: SectionValidationRule[]
  smartFeatures?: {
    autoSave?: boolean
    realTimeValidation?: boolean
    collaborationEnabled?: boolean
    voiceInputEnabled?: boolean
  }
}

export interface ConditionalFieldGroup {
  condition: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => boolean
  fields: SuitabilityField[]
  aiReason?: string
}

export interface SectionValidationRule {
  id: string
  validate: (sectionData: any, formData: SuitabilityFormData, pulledData: PulledPlatformData) => ValidationResult
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions?: string[]
}

export interface ValidationError {
  sectionId: string
  fieldId: string
  message: string
  severity: 'error' | 'critical'
  code?: string
}

export interface ValidationWarning {
  sectionId: string
  fieldId: string
  message: string
  type: 'bestPractice' | 'compliance' | 'dataQuality'
}

export interface CrossSectionValidation {
  rule: string
  sections: string[]
  validate: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => ValidationResult
}

export interface SmartAddressLookupResult {
  addresses: Array<{
    formatted: string
    components: {
      line1: string
      line2?: string
      city: string
      county?: string
      postcode: string
      country: string
    }
    coordinates?: {
      lat: number
      lng: number
    }
  }>
}

export interface RealtimeSyncEvent {
  type: 'field_update' | 'section_complete' | 'assessment_complete' | 'external_update'
  source: 'user' | 'system' | 'ai' | 'external'
  sectionId?: string
  fieldId?: string
  value?: any
  timestamp: string
  userId: string
}

export interface AssessmentSession {
  id: string
  clientId: string
  adviserId: string
  startedAt: string
  lastActivityAt: string
  device: string
  location?: {
    lat: number
    lng: number
    accuracy: number
  }
  collaborators?: string[]
  status: 'active' | 'paused' | 'completed' | 'abandoned'
}

// =====================================================
// REFACTORED TYPES - Remove `any` from critical files
// =====================================================

/**
 * Client address structure used in form auto-population
 */
export interface ClientAddress {
  line1?: string
  line2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
}

/**
 * Client financial profile structure for mapping to form data
 */
export interface ClientFinancialProfile {
  annualIncome?: number
  monthlyExpenses?: number
  liquidAssets?: number
  netWorth?: number
  existingInvestments?: Array<{ currentValue?: number; type?: string }>
  pensionArrangements?: Array<{ currentValue?: number; provider?: string }>
  properties?: Array<{ value?: number; mortgage?: number }>
  liabilities?: Array<{ amount?: number; type?: string }>
}

/**
 * Mapped financial data structure returned from mapClientFinancialData
 */
export interface MappedFinancialData {
  annual_income: number
  monthly_expenditure: number
  liquid_assets: number
  property_value: number
  outstanding_mortgage: number
  other_liabilities: number
  net_worth: number
}

/**
 * Client objectives structure
 */
export interface ClientObjectives {
  primaryObjective?: string
  primary_objective?: string
  timeHorizon?: number
  time_horizon?: number
  investmentAmount?: number
  investment_amount?: number
  targetReturn?: number
  incomeRequirement?: number
}

/**
 * Client risk profile structure
 */
export interface ClientRiskProfile {
  attitudeToRisk?: string
  attitude_to_risk?: string
  maxLoss?: number
  maxAcceptableLoss?: number
  max_acceptable_loss?: number
  riskTolerance?: string
  risk_tolerance?: string
  riskCapacity?: string
  risk_capacity?: string
}

/**
 * Client personal details structure
 */
export interface ClientPersonalDetails {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  date_of_birth?: string
  maritalStatus?: string
  dependents?: number
  employmentStatus?: string
  occupation?: string
  targetRetirementAge?: number
  target_retirement_age?: number
}

/**
 * Client contact info structure
 */
export interface ClientContactInfo {
  address?: ClientAddress
  phone?: string
  email?: string
  preferredContact?: string
  preferredContactMethod?: string
  postcode?: string
}

/**
 * Full client data structure used throughout the app
 */
export interface ClientData {
  id?: string
  clientRef?: string
  personalDetails?: ClientPersonalDetails
  contactInfo?: ClientContactInfo
  financialProfile?: ClientFinancialProfile
  objectives?: ClientObjectives
  investmentObjectives?: ClientObjectives
  riskProfile?: ClientRiskProfile
  risk_profile?: ClientRiskProfile
  preferences?: {
    retirementAge?: number
    communicationPreferences?: string[]
  }
  assessment?: {
    objectives?: ClientObjectives
  }
}

/**
 * Suitability update payload for database operations
 * Matches the column names in the suitability_assessments table
 */
export interface SuitabilityUpdatePayload {
  client_id?: string
  // JSON column fields (matching DB column names)
  objectives?: Record<string, unknown> | null
  personal_circumstances?: Record<string, unknown> | null
  financial_situation?: Record<string, unknown> | null
  investment_objectives?: Record<string, unknown> | null
  risk_assessment?: Record<string, unknown> | null
  knowledge_experience?: Record<string, unknown> | null
  contact_details?: Record<string, unknown> | null
  existing_arrangements?: Record<string, unknown> | null
  vulnerability?: Record<string, unknown> | null
  regulatory?: Record<string, unknown> | null
  costs_charges?: Record<string, unknown> | null
  recommendations?: Record<string, unknown> | null
  risk_profile?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  // Scalar fields
  completion_percentage?: number
  status?: string
  is_draft?: boolean
  is_final?: boolean
  updated_at?: string
  completed_by?: string | null
  completed_at?: string | null
  assessment_date?: string
  version_number?: number
  parent_assessment_id?: string | null
  assessment_reason?: string | null
}
