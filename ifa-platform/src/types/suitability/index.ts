// =====================================================
// FILE: src/types/suitability/index.ts
// COMPLETE UPDATED VERSION WITH ALL FIXES
// =====================================================

import type { LucideIcon } from 'lucide-react'

// ===== SECTION DATA TYPES - COMPLETE DEFINITIONS =====
export interface InvestmentObjectives {
  primary_objective?: string
  secondary_objectives?: string[]
  time_horizon?: number
  investment_amount?: number
  additional_contributions?: number
  target_return?: number
  income_requirement?: number
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
  health_concerns?: string
  cognitive_ability?: string
  life_events?: string[]
  support_network?: string
  communication_preferences?: string[]
  vulnerability_notes?: string
  other_life_event?: string
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
  pep_dates?: string
  wealth_source_details?: string
}

export interface Recommendation {
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
  best_interests_declaration?: string
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
  suitability_declaration?: SuitabilityDeclaration
  costs_charges?: CostsCharges
  documentation?: Documentation
  [key: string]: any // Allow index signature for dynamic access
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
  status?: 'draft' | 'in_progress' | 'completed' | 'submitted_partial' | 'archived'
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