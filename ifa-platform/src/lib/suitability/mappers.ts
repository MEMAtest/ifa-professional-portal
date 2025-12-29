import type { DbRow, DbUpdate } from '@/types/db'
import type { ReportContext } from '@/services/AdvisorContextService'
import type { SuitabilityFormData } from '@/types/suitability'

type SuitabilityAssessmentRow = DbRow<'suitability_assessments'>
type SuitabilityAssessmentUpdate = DbUpdate<'suitability_assessments'>
type ClientRow = DbRow<'clients'>

type JsonObject = Record<string, any>

function asObject(value: unknown): JsonObject {
  if (!value) return {}
  if (typeof value === 'object') return value as JsonObject
  return {}
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    const s = asString(value).trim()
    if (s) return s
  }
  return ''
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function splitLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => asString(v).trim())
      .filter(Boolean)
  }

  return asString(value)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Maps a database row from suitability_assessments table to the form data structure.
 *
 * FIX Issue 1 - COLUMN NAME MAPPING REFERENCE:
 * The database uses different column names than the form section IDs for historical reasons.
 *
 * | Database Column          | Form Section ID          |
 * |--------------------------|--------------------------|
 * | personal_circumstances   | personal_information     |
 * | investment_objectives    | objectives               |
 * | vulnerability            | vulnerability_assessment |
 * | regulatory               | regulatory_compliance    |
 * | recommendations          | recommendation           |
 *
 * FIX Issue 2 - METADATA STORAGE:
 * The following sections are stored in the `metadata` JSONB column rather than dedicated columns:
 * - partner_information
 * - suitability_declaration
 * - documentation
 * - options_considered
 * - disadvantages_risks
 * - ongoing_service
 *
 * This means these sections cannot be queried directly via SQL and have no schema validation
 * at the database level. Consider migrating critical sections to dedicated columns in future.
 */
export function mapSuitabilityAssessmentRowToFormData(row: SuitabilityAssessmentRow): SuitabilityFormData {
  const metadata = asObject(row.metadata)

  const formData: SuitabilityFormData = {
    // Dedicated database columns (see column mapping table above)
    personal_information: asObject(row.personal_circumstances),
    contact_details: asObject(row.contact_details),
    objectives: asObject(row.investment_objectives || row.objectives),
    financial_situation: asObject(row.financial_situation),
    risk_assessment: asObject(row.risk_assessment),
    knowledge_experience: asObject(row.knowledge_experience),
    existing_arrangements: asObject(row.existing_arrangements),
    vulnerability_assessment: asObject(row.vulnerability),
    regulatory_compliance: asObject(row.regulatory),
    costs_charges: asObject(row.costs_charges),
    recommendation: asObject(row.recommendations),
    // Sections stored in metadata JSONB (see Issue 2 note above)
    partner_information: asObject(metadata.partner_information),
    suitability_declaration: asObject(metadata.suitability_declaration),
    documentation: asObject(metadata.documentation),
    options_considered: asObject(metadata.options_considered),
    disadvantages_risks: asObject(metadata.disadvantages_risks),
    ongoing_service: asObject(metadata.ongoing_service),
    // Internal state
    _aiSuggestions: asObject(metadata._aiSuggestions),
    _chartData: asObject(metadata._chartData),
    _metadata: {
      ...(asObject(metadata) as any),
      assessmentId: row.id,
      versionNumber: row.version_number ?? (metadata.versionNumber as any),
      completionPercentage: row.completion_percentage ?? metadata.completionPercentage ?? 0,
      status: row.status ?? metadata.status,
      submittedAt: row.completed_at ?? metadata.submittedAt,
      updatedAt: row.updated_at ?? metadata.updatedAt ?? new Date().toISOString(),
      createdAt: row.created_at ?? metadata.createdAt ?? new Date().toISOString()
    }
  }

  return formData
}

export function mapSuitabilityFormDataToAssessmentUpdate(
  formData: SuitabilityFormData,
  options: {
    completionPercentage?: number
    status?: string
    updatedAt?: string
    completedBy?: string | null
  } = {}
): SuitabilityAssessmentUpdate {
  const updatedAt = options.updatedAt || new Date().toISOString()

  const baseMetadata = asObject(formData._metadata)
  const mergedMetadata = {
    ...baseMetadata,
    completionPercentage: options.completionPercentage ?? baseMetadata.completionPercentage ?? 0,
    status: options.status ?? baseMetadata.status,
    partner_information: asObject(formData.partner_information),
    suitability_declaration: asObject((formData as any).suitability_declaration),
    documentation: asObject((formData as any).documentation),
    options_considered: asObject((formData as any).options_considered),
    disadvantages_risks: asObject((formData as any).disadvantages_risks),
    ongoing_service: asObject((formData as any).ongoing_service),
    _aiSuggestions: asObject(formData._aiSuggestions),
    _chartData: asObject((formData as any)._chartData)
  } as unknown as SuitabilityAssessmentUpdate['metadata']

  return {
    personal_circumstances: (formData.personal_information || {}) as SuitabilityAssessmentUpdate['personal_circumstances'],
    financial_situation: (formData.financial_situation || {}) as SuitabilityAssessmentUpdate['financial_situation'],
    objectives: (formData.objectives || {}) as SuitabilityAssessmentUpdate['objectives'],
    investment_objectives: (formData.objectives || {}) as SuitabilityAssessmentUpdate['investment_objectives'],
    risk_assessment: (formData.risk_assessment || {}) as SuitabilityAssessmentUpdate['risk_assessment'],
    knowledge_experience: (formData.knowledge_experience || {}) as SuitabilityAssessmentUpdate['knowledge_experience'],
    contact_details: (formData.contact_details || {}) as SuitabilityAssessmentUpdate['contact_details'],
    existing_arrangements: (formData.existing_arrangements || {}) as SuitabilityAssessmentUpdate['existing_arrangements'],
    vulnerability: (formData.vulnerability_assessment || {}) as SuitabilityAssessmentUpdate['vulnerability'],
    regulatory: (formData.regulatory_compliance || {}) as SuitabilityAssessmentUpdate['regulatory'],
    costs_charges: (formData.costs_charges || {}) as SuitabilityAssessmentUpdate['costs_charges'],
    recommendations: (formData.recommendation || {}) as SuitabilityAssessmentUpdate['recommendations'],
    completion_percentage: options.completionPercentage ?? baseMetadata.completionPercentage ?? 0,
    status: options.status ?? baseMetadata.status ?? 'in_progress',
    updated_at: updatedAt,
    completed_by: options.completedBy ?? null,
    metadata: mergedMetadata as SuitabilityAssessmentUpdate['metadata']
  }
}

// Risk score mapping using exact matching to avoid order-dependent bugs.
// Previously used includes() which could match incorrectly if order changed.
const RISK_SCORE_MAP: Record<string, number> = {
  'very low': 2,
  'low': 4,
  'medium': 6,
  'moderate': 6,
  'high': 8,
  'very high': 10,
  'aggressive': 10
}

function mapAttitudeToRiskToScore(attitude?: string): number {
  const normalized = (attitude || '').toLowerCase().trim()
  if (!normalized) return 6

  // Try exact match first
  if (RISK_SCORE_MAP[normalized] !== undefined) {
    return RISK_SCORE_MAP[normalized]
  }

  // Fallback to partial matching with explicit order (most specific first)
  if (normalized.includes('very low')) return 2
  if (normalized.includes('very high')) return 10
  if (normalized.includes('low')) return 4
  if (normalized.includes('high')) return 8
  if (normalized.includes('medium') || normalized.includes('moderate')) return 6

  return 6
}

function mapMaxLossToCapacityScore(maxLoss?: string): number {
  const normalized = (maxLoss || '').toLowerCase()
  if (normalized.includes('0-5')) return 2
  if (normalized.includes('5-10')) return 4
  if (normalized.includes('10-20')) return 6
  if (normalized.includes('20-30')) return 8
  if (normalized.includes('more than 30')) return 10
  return 6
}

function scoreToRiskCategory(score: number): 'Very Low' | 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High' | 'Very High' {
  if (score <= 2) return 'Very Low'
  if (score <= 3) return 'Low'
  if (score <= 4) return 'Low-Medium'
  if (score <= 6) return 'Medium'
  if (score <= 7) return 'Medium-High'
  if (score <= 8) return 'High'
  return 'Very High'
}

function parseSimpleAllocation(text: string): { equities: number; bonds: number; cash: number; alternatives: number } | null {
  const lower = text.toLowerCase()
  const parse = (label: string) => {
    const match = lower.match(new RegExp(`${label}\\s*:\\s*(\\d{1,3})\\s*%`))
    return match ? Number(match[1]) : 0
  }

  const equities = parse('equities')
  const bonds = parse('bonds')
  const cash = parse('cash')
  const alternatives = parse('alternatives')

  const total = equities + bonds + cash + alternatives
  if (total <= 0) return null

  return { equities, bonds, cash, alternatives }
}

function defaultAllocationForPortfolio(portfolioName: string): { equities: number; bonds: number; cash: number; alternatives: number } {
  const p = portfolioName.toLowerCase()
  if (p.includes('conservative') || p.includes('cautious')) return { equities: 30, bonds: 55, cash: 10, alternatives: 5 }
  if (p.includes('balanced')) return { equities: 60, bonds: 30, cash: 5, alternatives: 5 }
  if (p.includes('growth')) return { equities: 75, bonds: 15, cash: 5, alternatives: 5 }
  if (p.includes('aggressive')) return { equities: 85, bonds: 10, cash: 2, alternatives: 3 }
  return { equities: 60, bonds: 30, cash: 5, alternatives: 5 }
}

function parseInvestmentTimelineToYears(timeline: string): number | null {
  const normalized = timeline.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('less than 3')) return 2
  if (normalized.includes('3-5')) return 4
  if (normalized.includes('5-10')) return 7
  if (normalized.includes('10-15')) return 12
  if (normalized.includes('more than 15')) return 20
  return null
}

function buildReportRef(clientRef: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SR-${clientRef || 'CLIENT'}-${datePart}-${random}`
}

export function buildSuitabilityReportData(params: {
  client: ClientRow
  formData: SuitabilityFormData
  reportContext: ReportContext
  reportDateISO?: string
  reportRef?: string
  version?: string
}) {
  const { client, formData, reportContext } = params

  const personalDetails = asObject(client.personal_details)
  const contactInfo = asObject(client.contact_info)
  const firmId = asString(client.firm_id)

  const formPI = asObject(formData.personal_information)
  const formContact = asObject(formData.contact_details)
  const formFinancial = asObject(formData.financial_situation)
  const formObjectives = asObject(formData.objectives)
  const formRisk = asObject(formData.risk_assessment)
  const formKnowledge = asObject(formData.knowledge_experience)
  const formVulnerability = asObject(formData.vulnerability_assessment)
  const formRecommendation = asObject(formData.recommendation)
  const formCosts = asObject(formData.costs_charges)

  const firstName = pickFirstString(personalDetails.firstName, personalDetails.first_name, formPI.first_name)
  const lastName = pickFirstString(personalDetails.lastName, personalDetails.last_name, formPI.last_name)

  const fullName = pickFirstString(
    formPI.client_name,
    `${personalDetails.title || ''} ${firstName} ${lastName}`.trim(),
    `${firstName} ${lastName}`.trim()
  )

  const clientRef = pickFirstString(client.client_ref, formPI.client_reference, formPI.clientRef, client.id?.slice(0, 8))

  const annualIncome = asNumber(formFinancial.annual_income ?? formFinancial.annualIncome)
  const essentialExpensesMonthly = asNumber(
    formFinancial.monthly_expenses ??
      formFinancial.monthly_expenditure ??
      formFinancial.monthlyExpenses ??
      formFinancial.monthlyExpenditure
  )

  const emergencyFund = asNumber(formFinancial.emergency_fund ?? formFinancial.emergencyFund)
  const totalAssets = asNumber(formFinancial.net_worth ?? formFinancial.netWorth ?? (asNumber(formFinancial.savings) + asNumber(formFinancial.property_value)))

  const atrScore = mapAttitudeToRiskToScore(asString(formRisk.attitude_to_risk))
  const cflScore = mapMaxLossToCapacityScore(asString(formRisk.max_acceptable_loss))
  const overallRiskScore = Math.min(atrScore, cflScore)
  const riskCategory = scoreToRiskCategory(overallRiskScore)

  const hasVulnerability =
    asString(formVulnerability.health_conditions).toLowerCase() === 'yes' ||
    asString(formVulnerability.health_concerns).toLowerCase().includes('significant') ||
    safeArray(formVulnerability.life_events).some((e) => String(e).toLowerCase() !== 'none') ||
    safeArray(formVulnerability.support_needed).some((e) => String(e).toLowerCase() !== 'none')

  const vulnerabilityFlags = [
    ...safeArray<string>(formVulnerability.life_events).filter((e) => String(e).toLowerCase() !== 'none'),
    asString(formVulnerability.financial_confidence).trim()
  ].filter(Boolean)

  const accommodations = safeArray<string>(formVulnerability.support_needed).filter((e) => String(e).toLowerCase() !== 'none')

  const portfolioName = pickFirstString(formRecommendation.recommended_portfolio, 'Balanced')
  const allocationFromFields = {
    equities: asNumber(formRecommendation.allocation_equities),
    bonds: asNumber(formRecommendation.allocation_bonds),
    cash: asNumber(formRecommendation.allocation_cash),
    alternatives: asNumber(formRecommendation.allocation_alternatives)
  }
  const allocationFromFieldsTotal =
    allocationFromFields.equities +
    allocationFromFields.bonds +
    allocationFromFields.cash +
    allocationFromFields.alternatives

  const allocationText = asString(formRecommendation.asset_allocation)
  const parsedAllocation = allocationText ? parseSimpleAllocation(allocationText) : null

  // FIX Issue 11: Track when using default allocation so reports can show warning
  const usingDefaultAllocation = allocationFromFieldsTotal === 0 && !parsedAllocation
  const assetAllocation =
    allocationFromFieldsTotal > 0 ? allocationFromFields : parsedAllocation || defaultAllocationForPortfolio(portfolioName)

  const products = [
    {
      name: asString(formRecommendation.product_1_name).trim(),
      provider: asString(formRecommendation.product_1_provider).trim(),
      amount: asNumber(formRecommendation.product_1_amount),
      reason: asString(formRecommendation.product_1_reason).trim()
    },
    {
      name: asString(formRecommendation.product_2_name).trim(),
      provider: asString(formRecommendation.product_2_provider).trim(),
      amount: asNumber(formRecommendation.product_2_amount),
      reason: asString(formRecommendation.product_2_reason).trim()
    },
    {
      name: asString(formRecommendation.product_3_name).trim(),
      provider: asString(formRecommendation.product_3_provider).trim(),
      amount: asNumber(formRecommendation.product_3_amount),
      reason: asString(formRecommendation.product_3_reason).trim()
    }
  ].filter((p) => p.name)

  const recommendationRationale = asString(formRecommendation.recommendation_rationale)

  const reportDateISO = params.reportDateISO || new Date().toISOString().slice(0, 10)
  const reportRef = params.reportRef || buildReportRef(clientRef)

  const initialFeePercent = asNumber(formCosts.initial_fee_agreed ?? formCosts.initial_adviser_charge)
  const ongoingFeePercent = asNumber(formCosts.ongoing_fee_agreed ?? formCosts.ongoing_adviser_charge)

  const investmentTimeline = pickFirstString(formObjectives.investment_timeline, formObjectives.investment_horizon, formObjectives.time_horizon)
  const timeHorizon =
    asNumber(formObjectives.time_horizon) ||
    asNumber(formObjectives.investment_horizon) ||
    (investmentTimeline ? parseInvestmentTimelineToYears(asString(investmentTimeline)) || 0 : 0)

  const optionsSection = asObject((formData as any).options_considered)
  const optionCandidates = [
    {
      name: asString(optionsSection.option_1_name).trim(),
      description: asString(optionsSection.option_1_description).trim(),
      pros: splitLines(optionsSection.option_1_pros),
      cons: splitLines(optionsSection.option_1_cons),
      selected: asString(optionsSection.option_1_selected) === 'Yes',
      reason: asString(optionsSection.option_1_reason).trim() || undefined
    },
    {
      name: asString(optionsSection.option_2_name).trim(),
      description: asString(optionsSection.option_2_description).trim(),
      pros: splitLines(optionsSection.option_2_pros),
      cons: splitLines(optionsSection.option_2_cons),
      selected: asString(optionsSection.option_2_selected) === 'Yes',
      reason: asString(optionsSection.option_2_reason).trim() || undefined
    },
    {
      name: asString(optionsSection.option_3_name).trim(),
      description: asString(optionsSection.option_3_description).trim(),
      pros: splitLines(optionsSection.option_3_pros),
      cons: splitLines(optionsSection.option_3_cons),
      selected: asString(optionsSection.option_3_selected) === 'Yes',
      reason: asString(optionsSection.option_3_reason).trim() || undefined
    }
  ].filter((o) => o.name || o.description || o.pros.length || o.cons.length)

  const disadvantagesSection = asObject((formData as any).disadvantages_risks)
  const disadvantages = splitLines(disadvantagesSection.disadvantages)
  const risks = splitLines(disadvantagesSection.risks)
  const mitigations = splitLines(disadvantagesSection.mitigations)

  const ongoingServiceSection = asObject((formData as any).ongoing_service)

  const formatAddress = (address: unknown): string => {
    if (!address) return ''
    if (typeof address === 'string') return address
    if (typeof address !== 'object') return String(address)
    const a = address as any
    const parts = [a.line1, a.line2, a.city, a.county, a.postcode, a.country]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean)
    return parts.join(', ')
  }

  return {
    client: {
      id: client.id,
      clientRef,
      personalDetails: {
        title: asString(personalDetails.title),
        firstName: firstName || fullName,
        lastName: lastName || '',
        dateOfBirth: pickFirstString(personalDetails.dateOfBirth, personalDetails.date_of_birth, formPI.date_of_birth),
        niNumber: pickFirstString(formPI.ni_number, formPI.national_insurance, personalDetails.niNumber, personalDetails.ni_number),
        maritalStatus: pickFirstString(formPI.marital_status, personalDetails.maritalStatus),
        employmentStatus: pickFirstString(formPI.employment_status, personalDetails.employmentStatus),
        retirementAge: asNumber(formPI.target_retirement_age)
      },
      contactDetails: {
        address: pickFirstString(formContact.address, formatAddress(contactInfo.address)),
        phone: pickFirstString(formContact.phone, contactInfo.phone),
        email: pickFirstString(formContact.email, contactInfo.email)
      },
      financialDetails: {
        annualIncome,
        essentialExpenses: essentialExpensesMonthly * 12,
        emergencyFund,
        totalAssets,
        totalLiabilities: 0,
        pensionValue: asNumber((formData as any).existing_arrangements?.pension_value)
      }
    },
    riskAssessment: {
      attitudeToRisk: atrScore,
      capacityForLoss: cflScore,
      riskCategory,
      riskScore: overallRiskScore,
      emotionalReaction: asString(formRisk.reaction_to_loss),
      investmentExperience: pickFirstString(formKnowledge.investment_experience, formKnowledge.investment_knowledge),
      timeHorizon
    },
    vulnerabilityAssessment: {
      hasVulnerability,
      vulnerabilityFlags,
      accommodations
    },
    recommendation: {
      portfolioName,
      assetAllocation,
      // FIX Issue 11: Add flag to indicate when default allocation is being used
      usingDefaultAllocation,
      products: products.length > 0 ? products : [
        { name: 'Managed Portfolio', provider: '', amount: 0, reason: '' }
      ],
      rationale: recommendationRationale || 'Recommendation rationale not provided.'
    },
    optionsConsidered: {
      options: optionCandidates.length
        ? optionCandidates
        : [
            {
              name: portfolioName,
              description: 'Recommended solution',
              pros: ['Aligned to objectives and risk profile'],
              cons: ['Investment values can fall as well as rise'],
              selected: true,
              reason: recommendationRationale || 'Selected based on suitability assessment.'
            }
          ]
    },
    disadvantagesRisks: {
      disadvantages: disadvantages.length ? disadvantages : ['Capital is at risk and investment values may fall.'],
      risks: risks.length ? risks : ['Market risk', 'Inflation risk'],
      mitigations: mitigations.length ? mitigations : ['Diversification', 'Regular reviews']
    },
    costsCharges: {
      initialFee: initialFeePercent || undefined,
      initialFeeType: initialFeePercent ? 'percentage' : undefined,
      ongoingFee: ongoingFeePercent || undefined,
      ongoingFeeType: ongoingFeePercent ? 'percentage' : undefined,
      platformFee: asNumber(formCosts.platform_charge) || undefined,
      fundCharges: asNumber(formCosts.fund_charges) || undefined
    },
    ongoingService: {
      reviewFrequency: pickFirstString(ongoingServiceSection.review_frequency, formRecommendation.review_frequency, 'Annual'),
      servicesIncluded: safeArray<string>(ongoingServiceSection.services_included).length
        ? safeArray<string>(ongoingServiceSection.services_included)
        : ['Annual review meeting', 'Portfolio monitoring'],
      contactMethods: safeArray<string>(ongoingServiceSection.contact_methods).length
        ? safeArray<string>(ongoingServiceSection.contact_methods)
        : ['Email', 'Phone'],
      responseTimes: pickFirstString(ongoingServiceSection.response_times, undefined)
    },
    adviser: {
      name: reportContext?.advisorName || 'Unknown Adviser',
      qualification: reportContext?.advisorQualifications || undefined,
      firmName: reportContext?.firmName || 'Unknown Firm',
      fcaNumber: reportContext?.firmFcaNumber || undefined
    },
    metadata: {
      reportDate: reportDateISO,
      reportRef,
      version: params.version || asString(formData._metadata?.version) || '1.0',
      firmId
    }
  }
}
