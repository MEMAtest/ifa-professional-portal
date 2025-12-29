import type { DbRow } from '@/types/db'
import type { ReportContext } from '@/services/AdvisorContextService'
import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'
import type { SuitabilityReportData, SuitabilityReportFacts } from './types'
import { buildCostsCharges } from './builders/costsCharges'
import { buildDisadvantagesRisks } from './builders/disadvantagesRisks'
import { buildInvestorPersona } from './builders/investorPersona'
import { buildOptionsConsidered } from './builders/optionsConsidered'
import { buildProfileArrangements } from './builders/profileArrangements'
import { buildVulnerabilitySummary } from './builders/vulnerability'
import { buildConditionalVisibilityIndex } from './conditionalVisibility'
import { detectFacts } from './facts'
import { inferLegacyScope, normalizeScope } from './scope'
import {
  mapAttitudeToRiskToScore,
  mapMaxLossToCapacityScore,
  normalizeRiskLevelFromPulledScore,
  parseInvestmentTimelineToYears,
  parseSimpleAllocation,
  scoreToRiskCategory
} from './risk'
import { buildFinancialSummary } from './builders/financial'
import {
  asObject,
  asTrimmedString,
  buildReportRef,
  calculateNextReviewDateISO,
  formatAddress,
  parseOptionalNumber,
  pickFirstString,
  safeArray,
  splitLines
} from './utils'

type ClientRow = DbRow<'clients'>
type PersonaRow = DbRow<'persona_assessments'>

function addMissing(
  target: SuitabilityReportData['dataQuality'],
  key: string,
  message: string
) {
  target.missing.push({ key, message })
}

export function buildSuitabilityReportModel(params: {
  client: ClientRow
  formData: SuitabilityFormData
  reportContext: ReportContext
  reportDateISO?: string
  reportRef?: string
  version?: string
  mode?: 'draft' | 'final'
  pulledDataOverride?: PulledPlatformData
  persona?: PersonaRow | null
}): SuitabilityReportData {
  const { client, formData, reportContext } = params
  const mode = params.mode || 'draft'

  const personalDetails = asObject(client.personal_details)
  const contactInfo = asObject(client.contact_info)
  const clientFinancialProfile = asObject((client as any).financial_profile)
  const firmId = pickFirstString(client.firm_id)

  const formPI = asObject(formData.personal_information)
  const formContact = asObject(formData.contact_details)
  const formFinancial = asObject(formData.financial_situation)
  const formObjectives = asObject(formData.objectives)
  const formRisk = asObject(formData.risk_assessment)
  const formKnowledge = asObject(formData.knowledge_experience)
  const formRecommendation = asObject(formData.recommendation)
  const formCosts = asObject(formData.costs_charges)
  const formExistingArrangements = asObject(formData.existing_arrangements)

  const pulledData =
    params.pulledDataOverride ||
    (asObject((formData as any)?._metadata?.pulledData) as PulledPlatformData) ||
    {}

  const conditionalVisibility = buildConditionalVisibilityIndex(formData, pulledData)
  const isConditionallyShown = (sectionId: string, fieldId: string) =>
    Boolean(conditionalVisibility[sectionId]?.has(fieldId))

  const detectedFacts = detectFacts(formData)
  const rawScope = safeArray<string>(formObjectives.advice_scope)
  const inferredScope =
    rawScope.length === 0
      ? inferLegacyScope({
          objectives: formObjectives,
          facts: detectedFacts,
          existingArrangements: formExistingArrangements
        })
      : []
  const scopeWasInferred = rawScope.length === 0 && inferredScope.length > 0

  const scope = normalizeScope(rawScope.length ? rawScope : inferredScope)

  const investorPersona = buildInvestorPersona(params.persona)

  const { pensionArrangements, investmentArrangements, insurancePolicies } =
    buildProfileArrangements(clientFinancialProfile)

  const facts: SuitabilityReportFacts = {
    ...detectedFacts,
    // Only infer presence from the client profile when the form hasn't answered.
    hasPensions: detectedFacts.hasPensions ?? (pensionArrangements.length > 0 ? true : null),
    hasProtection: detectedFacts.hasProtection ?? (insurancePolicies.length > 0 ? true : null)
  }

  const firstName = pickFirstString(personalDetails.firstName, personalDetails.first_name, formPI.first_name)
  const lastName = pickFirstString(personalDetails.lastName, personalDetails.last_name, formPI.last_name)

  const fullName = pickFirstString(
    formPI.client_name,
    `${pickFirstString(personalDetails.title) || ''} ${firstName || ''} ${lastName || ''}`.trim(),
    `${firstName || ''} ${lastName || ''}`.trim()
  )

  const clientRef = pickFirstString(
    client.client_ref,
    formPI.client_reference,
    formPI.clientRef,
    client.id?.slice(0, 8)
  ) || client.id?.slice(0, 8) || 'CLIENT'

  const {
    incomeTotal,
    essentialAnnual,
    discretionaryIncome,
    totalAssets,
    totalLiabilities,
    emergencyFund,
    pensionValue,
    investmentAmountFromForm,
    financialAnalysis
  } = buildFinancialSummary({
    formFinancial,
    formExistingArrangements,
    pensionArrangements
  })

  // Risk assessment (prefer ATR/CFL assessments if present)
  const atrLevelFromPulled = normalizeRiskLevelFromPulledScore(pulledData.atrScore)
  const cflLevelFromPulled = normalizeRiskLevelFromPulledScore(pulledData.cflScore)
  const atrLevelFromForm = mapAttitudeToRiskToScore(asTrimmedString(formRisk.attitude_to_risk))
  const cflLevelFromForm = mapMaxLossToCapacityScore(asTrimmedString(formRisk.max_acceptable_loss))

  const atrLevel = atrLevelFromPulled ?? atrLevelFromForm
  const cflLevel = cflLevelFromPulled ?? cflLevelFromForm

  const combinedRiskScore =
    atrLevel !== undefined && cflLevel !== undefined ? Math.min(atrLevel, cflLevel) : undefined

  const combinedRiskCategory = scoreToRiskCategory(combinedRiskScore)
  const attitudeCategory = scoreToRiskCategory(atrLevel)
  const capacityCategory =
    cflLevel === undefined ? 'Not assessed' : cflLevel >= 7 ? 'High' : cflLevel >= 4 ? 'Medium' : 'Low'

  const riskCategory = scoreToRiskCategory(combinedRiskScore ?? atrLevel ?? cflLevel)

  // Time horizon (years)
  const timeHorizonYears =
    parseOptionalNumber(formObjectives.time_horizon) ??
    parseOptionalNumber(formObjectives.investment_horizon) ??
    parseInvestmentTimelineToYears(asTrimmedString(formObjectives.investment_timeline))

  // Recommendation
  const allocationFromFields = {
    equities: parseOptionalNumber(formRecommendation.allocation_equities),
    bonds: parseOptionalNumber(formRecommendation.allocation_bonds),
    cash: parseOptionalNumber(formRecommendation.allocation_cash),
    alternatives: parseOptionalNumber(formRecommendation.allocation_alternatives)
  }

  const allocationNumbers = Object.values(allocationFromFields).filter((v) => v !== undefined) as number[]
  const allocationTotal = allocationNumbers.reduce((sum, v) => sum + v, 0)

  const parsedAllocation = parseSimpleAllocation(asTrimmedString(formRecommendation.asset_allocation) || '')

  const assetAllocation =
    allocationNumbers.length === 4 && Math.round(allocationTotal) === 100
      ? {
          equities: allocationFromFields.equities || 0,
          bonds: allocationFromFields.bonds || 0,
          cash: allocationFromFields.cash || 0,
          alternatives: allocationFromFields.alternatives || 0
        }
      : parsedAllocation

  const products = [
    {
      name: asTrimmedString(formRecommendation.product_1_name),
      provider: asTrimmedString(formRecommendation.product_1_provider),
      amount: parseOptionalNumber(formRecommendation.product_1_amount),
      reason: asTrimmedString(formRecommendation.product_1_reason)
    },
    {
      name: asTrimmedString(formRecommendation.product_2_name),
      provider: asTrimmedString(formRecommendation.product_2_provider),
      amount: parseOptionalNumber(formRecommendation.product_2_amount),
      reason: asTrimmedString(formRecommendation.product_2_reason)
    },
    {
      name: asTrimmedString(formRecommendation.product_3_name),
      provider: asTrimmedString(formRecommendation.product_3_provider),
      amount: parseOptionalNumber(formRecommendation.product_3_amount),
      reason: asTrimmedString(formRecommendation.product_3_reason)
    }
  ]
    .filter((p) => Boolean(p.name))
    .map((p) => ({
      name: p.name!,
      provider: p.provider,
      amount: p.amount,
      reason: p.reason
    }))

  const portfolioName = asTrimmedString(formRecommendation.recommended_portfolio)
  const recommendationRationale = asTrimmedString(formRecommendation.recommendation_rationale)

  // Investment amount (prefer explicit form field; fall back to sum of products if available)
  const investmentAmountFromProducts = products
    .map((p) => p.amount)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    .reduce((sum, n) => sum + n, 0)
  const investmentAmount =
    investmentAmountFromForm !== undefined
      ? investmentAmountFromForm
      : investmentAmountFromProducts > 0
        ? investmentAmountFromProducts
        : undefined

  const optionsConsidered = buildOptionsConsidered(formData)
  const disadvantagesRisks = buildDisadvantagesRisks(formData)
  const costsCharges = buildCostsCharges({ formCosts, investmentAmount })

  // Ongoing service
  const ongoingServiceSection = asObject((formData as any).ongoing_service)
  const reviewFrequency = pickFirstString(ongoingServiceSection.review_frequency, formRecommendation.review_frequency)
  const reportDateISO = params.reportDateISO || new Date().toISOString().slice(0, 10)
  const nextReviewDateISO = calculateNextReviewDateISO(reviewFrequency, reportDateISO)

  const { hasVulnerability, vulnerabilityFlags, accommodations } = buildVulnerabilitySummary(formData)

  const reportRef = params.reportRef || buildReportRef(clientRef)

  const dataQuality: SuitabilityReportData['dataQuality'] = {
    mode,
    warnings: [],
    missing: []
  }

  const provenance: SuitabilityReportData['provenance'] = {}

  const setProvenance = (
    key: string,
    status: SuitabilityReportData['provenance'][string]['status'],
    source: SuitabilityReportData['provenance'][string]['source'],
    path?: string,
    note?: string
  ) => {
    provenance[key] = { status, source, path, note }
  }

  // Scope is mandatory for robust reporting
  if (scope.selected.length === 0) {
    dataQuality.warnings.push('Advice scope has not been selected; report content may be incomplete.')
    addMissing(dataQuality, 'objectives.advice_scope', 'Select the scope of advice (e.g., Investment Planning).')
    setProvenance('scope.selected', 'not_provided', 'suitability_form', 'objectives.advice_scope')
  } else if (scopeWasInferred) {
    dataQuality.warnings.push('Advice scope was inferred for this legacy assessment.')
    setProvenance(
      'scope.selected',
      'provided',
      'system',
      'objectives.advice_scope',
      `Inferred scope: ${scope.selected.join(', ')}`
    )

    // Tighten final report readiness: inferred scope is not acceptable evidence for a "Final" FCA-ready report.
    if (mode === 'final') {
      addMissing(
        dataQuality,
        'objectives.advice_scope',
        'Confirm the advice scope explicitly (legacy scope was inferred).'
      )
      setProvenance(
        'scope.selected',
        'not_provided',
        'suitability_form',
        'objectives.advice_scope',
        `Legacy scope inferred: ${scope.selected.join(', ')}`
      )
    }
  } else {
    setProvenance('scope.selected', 'provided', 'suitability_form', 'objectives.advice_scope')
  }

  // Risk evidence
  if (!atrLevel) {
    dataQuality.warnings.push('Attitude to Risk is not assessed or not available.')
    addMissing(dataQuality, 'riskAssessment.attitudeToRisk', 'Complete ATR (or capture attitude to risk in the suitability form).')
    setProvenance('riskAssessment.attitudeToRisk', 'not_provided', 'atr_assessment', 'pulledData.atrScore')
  } else {
    setProvenance(
      'riskAssessment.attitudeToRisk',
      'provided',
      atrLevelFromPulled ? 'atr_assessment' : 'suitability_form',
      atrLevelFromPulled ? 'pulledData.atrScore' : 'risk_assessment.attitude_to_risk'
    )
  }

  if (!cflLevel) {
    dataQuality.warnings.push('Capacity for Loss is not assessed or not available.')
    addMissing(dataQuality, 'riskAssessment.capacityForLoss', 'Complete CFL (or capture capacity for loss in the suitability form).')
    setProvenance('riskAssessment.capacityForLoss', 'not_provided', 'cfl_assessment', 'pulledData.cflScore')
  } else {
    setProvenance(
      'riskAssessment.capacityForLoss',
      'provided',
      cflLevelFromPulled ? 'cfl_assessment' : 'suitability_form',
      cflLevelFromPulled ? 'pulledData.cflScore' : 'risk_assessment.max_acceptable_loss'
    )
  }

  // Recommendation completeness (only warn if in-scope investments/pensions)
  if ((scope.includeInvestments || scope.includePensions) && products.length === 0) {
    dataQuality.warnings.push('No recommended products have been recorded.')
    addMissing(dataQuality, 'recommendation.products', 'Add at least one recommended product.')
    setProvenance('recommendation.products', 'not_provided', 'suitability_form', 'recommendation.product_*')
  } else {
    setProvenance(
      'recommendation.products',
      products.length ? 'provided' : 'not_applicable',
      'suitability_form',
      'recommendation.product_*'
    )
  }

  if ((scope.includeInvestments || scope.includePensions) && !recommendationRationale) {
    dataQuality.warnings.push('Recommendation rationale has not been completed.')
    addMissing(dataQuality, 'recommendation.rationale', 'Complete the recommendation rationale.')
    setProvenance('recommendation.rationale', 'not_provided', 'suitability_form', 'recommendation.recommendation_rationale')
  } else {
    setProvenance(
      'recommendation.rationale',
      recommendationRationale ? 'provided' : 'not_applicable',
      'suitability_form',
      'recommendation.recommendation_rationale'
    )
  }

  // Financial totals
  if (incomeTotal === undefined) {
    dataQuality.warnings.push('Income data is incomplete.')
    addMissing(dataQuality, 'financial.income_total', 'Enter annual income or complete the income breakdown.')
    setProvenance('client.financialDetails.annualIncome', 'not_provided', 'suitability_form', 'financial_situation.income_total')
  } else {
    setProvenance('client.financialDetails.annualIncome', 'provided', 'suitability_form', 'financial_situation.income_total')
  }

  if (essentialAnnual === undefined) {
    dataQuality.warnings.push('Essential expenditure data is incomplete.')
    addMissing(dataQuality, 'financial.exp_total_essential', 'Enter essential expenses (monthly or via expenditure breakdown).')
    setProvenance('client.financialDetails.essentialExpenses', 'not_provided', 'suitability_form', 'financial_situation.exp_total_essential')
  } else {
    setProvenance('client.financialDetails.essentialExpenses', 'provided', 'suitability_form', 'financial_situation.exp_total_essential')
  }

  // Facts
  if (facts.hasPensions === null) {
    setProvenance('facts.hasPensions', 'not_provided', 'suitability_form', 'existing_arrangements.has_pension')
  } else {
    setProvenance('facts.hasPensions', 'provided', 'suitability_form', 'existing_arrangements.has_pension')
  }

  if (facts.hasProtection === null) {
    setProvenance('facts.hasProtection', 'not_provided', 'suitability_form', 'existing_arrangements.has_protection')
  } else {
    setProvenance('facts.hasProtection', 'provided', 'suitability_form', 'existing_arrangements.has_protection')
  }

  const conditionality: SuitabilityReportData['conditionality'] = {
    showPartnerDetails: facts.hasPartner || isConditionallyShown('personal_information', 'partner_name'),
    showPensionDetails: facts.hasPensions === true,
    showProtectionDetails: facts.hasProtection === true,
    showDbTransferQuestion:
      facts.hasPensions === true && isConditionallyShown('existing_arrangements', 'db_transfer_considered'),
    showDbTransferDetails:
      facts.hasPensions === true &&
      isConditionallyShown('existing_arrangements', 'db_transfer_considered') &&
      facts.dbTransferConsidered === true
  }

  return {
    scope,
    facts,
    conditionality,
    dataQuality,
    provenance,
	    financialAnalysis,
	    objectives: {
	      primaryObjective: asTrimmedString(formObjectives.primary_objective),
	      investmentTimeline: asTrimmedString(formObjectives.investment_timeline),
	      incomeRequirement: (() => {
	        const requiresIncome = asTrimmedString((formObjectives as any).requires_investment_income)
	        const requiredMonthly =
	          parseOptionalNumber((formObjectives as any).required_monthly_income) ??
	          (typeof (formObjectives as any).income_requirement === 'number'
	            ? (formObjectives as any).income_requirement
	            : undefined)
	        if (typeof requiredMonthly === 'number' && !Number.isNaN(requiredMonthly)) {
	          return `£${requiredMonthly.toLocaleString()}/month`
	        }
	        const legacy = (formObjectives as any).income_requirement
	        if (!requiresIncome && (legacy === 'Yes' || legacy === 'No')) return legacy
	        return requiresIncome || asTrimmedString(legacy)
	      })(),
	      incomeFrequency: asTrimmedString((formObjectives as any).income_frequency),
	      ethicalInvesting: asTrimmedString(formObjectives.ethical_investing)
	    },
	    existingArrangements: {
	      pensionTypes: splitLines(formExistingArrangements.pension_type),
	      protectionTypes: splitLines(formExistingArrangements.has_protection).filter(
	        (v) => v.toLowerCase() !== 'none'
	      ),
	      pensionArrangements: pensionArrangements.length ? pensionArrangements : undefined,
	      investmentArrangements: investmentArrangements.length ? investmentArrangements : undefined,
	      insurancePolicies: insurancePolicies.length ? insurancePolicies : undefined,
	      willInPlace: asTrimmedString(formExistingArrangements.will_in_place),
	      dbTransferConsidered: facts.dbTransferConsidered,
	      transferValue: parseOptionalNumber(formExistingArrangements.transfer_value),
	      dbWarningAcknowledged: splitLines(formExistingArrangements.db_warning_acknowledged).some(
	        (v) => v.toLowerCase() === 'acknowledged'
	      )
	    },
	    investorPersona,
	    client: {
	      id: client.id,
	      clientRef,
	      personalDetails: {
	        title: asTrimmedString(personalDetails.title),
        firstName: firstName,
        lastName: lastName,
        fullName,
        dateOfBirth: pickFirstString(personalDetails.dateOfBirth, personalDetails.date_of_birth, formPI.date_of_birth),
        niNumber: pickFirstString(formPI.ni_number, formPI.national_insurance, personalDetails.niNumber, personalDetails.ni_number),
        maritalStatus: pickFirstString(formPI.marital_status, personalDetails.maritalStatus),
        employmentStatus: pickFirstString(formPI.employment_status, personalDetails.employmentStatus),
        retirementAge: parseOptionalNumber(formPI.target_retirement_age),
        dependants: parseOptionalNumber(formPI.dependents),
        partnerName: asTrimmedString(formPI.partner_name),
        partnerDateOfBirth: asTrimmedString(formPI.partner_date_of_birth),
        jointAssessment: asTrimmedString(formPI.joint_assessment)
      },
      contactDetails: {
        address: pickFirstString(formContact.address, formatAddress(contactInfo.address)),
        phone: pickFirstString(formContact.phone, contactInfo.phone, contactInfo.mobile),
        email: pickFirstString(formContact.email, contactInfo.email)
      },
      financialDetails: {
        annualIncome: incomeTotal,
        essentialExpenses: essentialAnnual,
        discretionaryIncome,
        totalAssets,
        totalLiabilities,
        emergencyFund,
        investmentAmount,
        pensionValue
      }
    },
    riskAssessment: {
      attitudeToRisk: atrLevel,
      capacityForLoss: cflLevel,
      riskCategory,
      riskScore: combinedRiskScore,
      combinedRiskCategory,
      attitudeCategory,
      capacityCategory,
      emotionalReaction: asTrimmedString(formRisk.reaction_to_loss),
      investmentExperience: pickFirstString(formKnowledge.investment_experience, formKnowledge.investment_knowledge),
      timeHorizonYears,
      atrSource: atrLevelFromPulled ? 'atr_assessment' : atrLevelFromForm ? 'suitability_form' : 'none',
      cflSource: cflLevelFromPulled ? 'cfl_assessment' : cflLevelFromForm ? 'suitability_form' : 'none'
    },
    vulnerabilityAssessment: {
      hasVulnerability,
      vulnerabilityFlags,
      accommodations
    },
    recommendation: {
      portfolioName,
      assetAllocation,
      products,
      rationale: recommendationRationale
    },
    optionsConsidered,
    disadvantagesRisks,
    costsCharges,
    ongoingService: {
      reviewFrequency,
      nextReviewDateISO,
      servicesIncluded: safeArray<string>(ongoingServiceSection.services_included),
      contactMethods: safeArray<string>(ongoingServiceSection.contact_methods),
      responseTimes: asTrimmedString(ongoingServiceSection.response_times)
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
      version: params.version || asTrimmedString(formData._metadata?.version) || '1.0',
      firmId
    }
  }
}
