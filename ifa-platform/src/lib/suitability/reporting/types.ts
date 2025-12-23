export type SuitabilityAdviceScopeOption =
  | 'Pension Planning'
  | 'Investment Planning'
  | 'Protection Review'
  | 'Estate Planning'
  | 'Tax Planning'

export type ReportFieldStatus = 'provided' | 'not_provided' | 'not_applicable'

export type ReportFieldSource =
  | 'suitability_form'
  | 'client_profile'
  | 'atr_assessment'
  | 'cfl_assessment'
  | 'system'

export type ReportProvenance = Record<
  string,
  {
    status: ReportFieldStatus
    source: ReportFieldSource
    path?: string
    note?: string
  }
>

export type RiskCategory =
  | 'Not assessed'
  | 'Very Low'
  | 'Low'
  | 'Low-Medium'
  | 'Medium'
  | 'Medium-High'
  | 'High'
  | 'Very High'

export type CapacityCategory = 'Not assessed' | 'Low' | 'Medium' | 'High'

export interface SuitabilityReportScope {
  selected: SuitabilityAdviceScopeOption[]
  includePensions: boolean
  includeInvestments: boolean
  includeProtection: boolean
  includeEstatePlanning: boolean
  includeTaxPlanning: boolean
}

export interface SuitabilityReportFacts {
  hasPartner: boolean
  hasDependants: boolean
  hasPensions: boolean | null
  hasDbPension: boolean | null
  hasProtection: boolean | null
  dbTransferConsidered: boolean | null
}

export interface SuitabilityReportConditionality {
  showPartnerDetails: boolean
  showPensionDetails: boolean
  showProtectionDetails: boolean
  showDbTransferQuestion: boolean
  showDbTransferDetails: boolean
}

export interface SuitabilityReportDataQuality {
  mode: 'draft' | 'final'
  warnings: string[]
  missing: Array<{
    key: string
    message: string
  }>
}

export interface SuitabilityClientDetails {
  title?: string
  firstName?: string
  lastName?: string
  fullName?: string
  dateOfBirth?: string
  niNumber?: string
  maritalStatus?: string
  employmentStatus?: string
  retirementAge?: number
  dependants?: number
  partnerName?: string
  partnerDateOfBirth?: string
  jointAssessment?: string
}

export interface SuitabilityContactDetails {
  address?: string
  phone?: string
  email?: string
}

export interface SuitabilityFinancialDetails {
  annualIncome?: number
  essentialExpenses?: number
  discretionaryIncome?: number
  totalAssets?: number
  totalLiabilities?: number
  emergencyFund?: number
  investmentAmount?: number
  pensionValue?: number
}

export interface SuitabilityObjectivesSummary {
  primaryObjective?: string
  investmentTimeline?: string
  incomeRequirement?: string
  incomeFrequency?: string
  ethicalInvesting?: string
}

export interface SuitabilityExistingArrangementsSummary {
  pensionTypes: string[]
  protectionTypes: string[]
  pensionArrangements?: Array<{
    provider?: string
    type?: string
    currentValue?: number
    monthlyContribution?: number
    expectedRetirementAge?: number
    description?: string
  }>
  investmentArrangements?: Array<{
    provider?: string
    type?: string
    currentValue?: number
    monthlyContribution?: number
    description?: string
  }>
  insurancePolicies?: Array<{
    provider?: string
    type?: string
    coverAmount?: number
    monthlyPremium?: number
    expiryDate?: string
    description?: string
  }>
  willInPlace?: string
  dbTransferConsidered?: boolean | null
  transferValue?: number
  dbWarningAcknowledged?: boolean
}

export interface SuitabilityIncomeAnalysisRow {
  label: string
  current?: number
  atRetirement?: number
}

export interface SuitabilityExpenditureAnalysisRow {
  label: string
  essential?: number
  discretionary?: number
}

export interface SuitabilityFinancialAnalysis {
  income: {
    rows: SuitabilityIncomeAnalysisRow[]
    totalCurrent?: number
    totalAtRetirement?: number
  }
  expenditure: {
    rows: SuitabilityExpenditureAnalysisRow[]
    totalEssential?: number
    totalDiscretionary?: number
  }
}

export interface SuitabilityRiskAssessment {
  attitudeToRisk?: number // 1-10
  capacityForLoss?: number // 1-10
  // Summary risk category (used in summaries): prefers combined score when available, otherwise uses whichever score exists.
  riskCategory: RiskCategory
  // Combined risk profile derived from both ATR + CFL (e.g. min score). Only present when both scores exist.
  riskScore?: number
  combinedRiskCategory: RiskCategory
  attitudeCategory: RiskCategory
  capacityCategory: CapacityCategory
  emotionalReaction?: string
  investmentExperience?: string
  timeHorizonYears?: number
  atrSource?: 'atr_assessment' | 'suitability_form' | 'none'
  cflSource?: 'cfl_assessment' | 'suitability_form' | 'none'
}

export interface SuitabilityVulnerabilityAssessment {
  hasVulnerability: boolean
  vulnerabilityFlags?: string[]
  texasAssessment?: {
    thinking?: string
    emotions?: string
    experience?: string
    action?: string
    support?: string
  }
  accommodations?: string[]
}

export interface SuitabilityRecommendationProduct {
  name: string
  provider?: string
  amount?: number
  reason?: string
}

export interface SuitabilityRecommendation {
  portfolioName?: string
  assetAllocation?: {
    equities: number
    bonds: number
    cash: number
    alternatives: number
  }
  products: SuitabilityRecommendationProduct[]
  rationale?: string
}

export interface SuitabilityOptionConsidered {
  name: string
  description?: string
  pros: string[]
  cons: string[]
  selected: boolean
  reason?: string
}

export interface SuitabilityOptionsConsidered {
  options: SuitabilityOptionConsidered[]
}

export interface SuitabilityDisadvantagesRisks {
  disadvantages: string[]
  risks: string[]
  mitigations: string[]
  notes?: string
}

export interface SuitabilityCostsCharges {
  initialFee?: number
  initialFeeType?: 'percentage' | 'fixed'
  ongoingFee?: number
  ongoingFeeType?: 'percentage' | 'fixed'
  platformFee?: number
  fundCharges?: number
  totalFirstYearCost?: number
  projectedCosts5Years?: number
  projectedCosts10Years?: number
}

export interface SuitabilityOngoingService {
  reviewFrequency?: string
  nextReviewDateISO?: string
  servicesIncluded: string[]
  contactMethods: string[]
  responseTimes?: string
}

export interface SuitabilityInvestorPersona {
  personaType?: string
  personaLevel?: string
  confidence?: number
  motivations: string[]
  fears: string[]
  assessedAtISO?: string
}

export interface SuitabilityReportData {
  scope: SuitabilityReportScope
  facts: SuitabilityReportFacts
  conditionality: SuitabilityReportConditionality
  dataQuality: SuitabilityReportDataQuality
  provenance: ReportProvenance
  financialAnalysis: SuitabilityFinancialAnalysis
  objectives: SuitabilityObjectivesSummary
  existingArrangements: SuitabilityExistingArrangementsSummary
  investorPersona?: SuitabilityInvestorPersona
  client: {
    id: string
    clientRef: string
    personalDetails: SuitabilityClientDetails
    contactDetails: SuitabilityContactDetails
    financialDetails: SuitabilityFinancialDetails
  }
  riskAssessment: SuitabilityRiskAssessment
  vulnerabilityAssessment: SuitabilityVulnerabilityAssessment
  recommendation: SuitabilityRecommendation
  optionsConsidered: SuitabilityOptionsConsidered
  disadvantagesRisks: SuitabilityDisadvantagesRisks
  costsCharges: SuitabilityCostsCharges
  ongoingService: SuitabilityOngoingService
  adviser: {
    name: string
    qualification?: string
    firmName: string
    fcaNumber?: string
  }
  metadata: {
    reportDate: string
    reportRef: string
    version: string
    firmId?: string
  }
}
