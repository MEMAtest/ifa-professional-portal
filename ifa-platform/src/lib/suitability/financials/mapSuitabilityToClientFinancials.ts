// ===================================================================
// FILE: src/lib/suitability/financials/mapSuitabilityToClientFinancials.ts
// Maps suitability assessment financial data to client financialProfile
// ===================================================================

import type { SuitabilityFormData } from '@/types/suitability'
import type { FinancialProfile, Investment, PensionArrangement, InsurancePolicy } from '@/types/client'

/**
 * Parses a value to a number, handling strings with commas and currency symbols
 */
function parseNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const cleaned = value.replace(/[£$€,\s]/g, '').trim()
    if (!cleaned) return 0
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/**
 * Safely gets a string value
 */
function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * Generates a unique ID for new entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Parses investment type from suitability data
 */
function parseInvestmentType(typeStr: string): Investment['type'] {
  const normalized = typeStr.toLowerCase()
  if (normalized.includes('isa')) return 'isa'
  if (normalized.includes('pension')) return 'pension'
  if (normalized.includes('property')) return 'property'
  if (normalized.includes('saving')) return 'savings'
  return 'general_investment'
}

/**
 * Parses pension type from suitability data
 */
function parsePensionType(typeStr: string): PensionArrangement['type'] {
  const normalized = typeStr.toLowerCase()
  if (normalized.includes('defined benefit') || normalized.includes('db') || normalized.includes('final salary')) {
    return 'defined_benefit'
  }
  if (normalized.includes('sipp')) return 'sipp'
  if (normalized.includes('ssas')) return 'ssas'
  if (normalized.includes('state')) return 'state_pension'
  return 'defined_contribution'
}

/**
 * Parses insurance type from suitability data
 */
function parseInsuranceType(typeStr: string): InsurancePolicy['type'] {
  const normalized = typeStr.toLowerCase()
  if (normalized.includes('life')) return 'life'
  if (normalized.includes('critical') || normalized.includes('illness')) return 'critical_illness'
  if (normalized.includes('income') || normalized.includes('protection')) return 'income_protection'
  if (normalized.includes('medical') || normalized.includes('health')) return 'private_medical'
  return 'other'
}

export interface ClientFinancialProfileUpdate {
  annualIncome: number
  monthlyExpenses: number
  netWorth: number
  liquidAssets: number
  propertyValue: number
  mortgageOutstanding: number
  otherLiabilities: number
  emergencyFund: number
  disposableIncome: number
  totalAssets: number
  investmentAmount: number
  existingInvestments: Investment[]
  pensionArrangements: PensionArrangement[]
  insurancePolicies: InsurancePolicy[]
  investmentTimeframe: string
  investmentObjectives: string[]
}

/**
 * Maps suitability assessment form data to client financial profile structure.
 *
 * Field Mapping from Suitability:
 * - financial_situation.annual_income → annualIncome
 * - financial_situation.monthly_expenses → monthlyExpenses
 * - financial_situation.savings → liquidAssets
 * - financial_situation.property_value → propertyValue
 * - financial_situation.mortgage_outstanding → mortgageOutstanding
 * - financial_situation.other_debts → otherLiabilities
 * - financial_situation.emergency_fund → emergencyFund
 * - existing_arrangements.pension_value → pensionArrangements[]
 * - existing_arrangements.investment_value → existingInvestments[]
 * - existing_arrangements.life_cover_amount → insurancePolicies[]
 */
export function mapSuitabilityToClientFinancials(params: {
  formData: SuitabilityFormData
  existingProfile?: Partial<FinancialProfile> | null
  nowISO?: string
}): ClientFinancialProfileUpdate {
  const { formData, existingProfile } = params
  const now = params.nowISO || new Date().toISOString()

  const financial = (formData.financial_situation || {}) as any
  const arrangements = (formData.existing_arrangements || {}) as any
  const objectives = (formData.objectives || {}) as any

  const incomeBreakdown = [
    parseNumber(financial.income_employment ?? financial.incomeEmployment),
    parseNumber(financial.income_state_pension ?? financial.incomeStatePension),
    parseNumber(financial.income_defined_benefit ?? financial.incomeDefinedBenefit),
    parseNumber(financial.income_rental ?? financial.incomeRental),
    parseNumber(financial.income_dividends ?? financial.incomeDividends),
    parseNumber(financial.income_other ?? financial.incomeOther)
  ].filter((value) => value > 0)
  const incomeBreakdownTotal = incomeBreakdown.length > 0 ? incomeBreakdown.reduce((sum, value) => sum + value, 0) : 0
  const incomeTotal = parseNumber(financial.income_total ?? financial.incomeTotal)

  // Parse core financial values
  const annualIncomeValue = parseNumber(financial.annual_income ?? financial.annualIncome)

  const monthlyExpensesValue = parseNumber(
    financial.monthly_expenses ?? financial.monthlyExpenses ?? financial.monthly_expenditure ?? financial.monthlyExpenditure
  )
  const essentialAnnualTotal = parseNumber(financial.exp_total_essential ?? financial.expTotalEssential)
  const discretionaryAnnualTotal = parseNumber(financial.exp_total_discretionary ?? financial.expTotalDiscretionary)
  const annualExpenseBreakdown = [
    parseNumber(financial.exp_housing ?? financial.expHousing),
    parseNumber(financial.exp_utilities ?? financial.expUtilities),
    parseNumber(financial.exp_food ?? financial.expFood),
    parseNumber(financial.exp_transport ?? financial.expTransport),
    parseNumber(financial.exp_healthcare ?? financial.expHealthcare),
    parseNumber(financial.exp_childcare ?? financial.expChildcare),
    parseNumber(financial.exp_leisure ?? financial.expLeisure),
    parseNumber(financial.exp_holidays ?? financial.expHolidays),
    parseNumber(financial.exp_other ?? financial.expOther)
  ].filter((value) => value > 0)
  const annualExpenseTotal =
    essentialAnnualTotal + discretionaryAnnualTotal > 0
      ? essentialAnnualTotal + discretionaryAnnualTotal
      : annualExpenseBreakdown.reduce((sum, value) => sum + value, 0)

  const annualIncome =
    annualIncomeValue > 0
      ? annualIncomeValue
      : incomeTotal > 0
        ? incomeTotal
        : incomeBreakdownTotal > 0
          ? incomeBreakdownTotal
          : 0

  const monthlyExpenses =
    monthlyExpensesValue > 0
      ? monthlyExpensesValue
      : annualExpenseTotal > 0
        ? Math.round(annualExpenseTotal / 12)
        : 0
  const savings = parseNumber(financial.savings ?? financial.liquid_assets ?? financial.liquidAssets)
  const propertyValue = parseNumber(financial.property_value ?? financial.propertyValue)
  const mortgageOutstanding = parseNumber(financial.mortgage_outstanding ?? financial.mortgageOutstanding ?? financial.mortgage_balance)
  const otherDebts = parseNumber(financial.other_debts ?? financial.otherDebts ?? financial.other_liabilities)
  const emergencyFund = parseNumber(financial.emergency_fund ?? financial.emergencyFund)
  const investmentAmount = parseNumber(
    financial.investment_amount ??
      financial.investmentAmount ??
      objectives.investment_amount ??
      objectives.investmentAmount
  )

  // Parse existing arrangements values
  const pensionValue = parseNumber(arrangements.pension_value ?? arrangements.pensionValue ?? arrangements.total_pension_value)
  const investmentValue = parseNumber(arrangements.investment_value ?? arrangements.investmentValue ?? arrangements.total_investment_value)
  const lifeCoverAmount = parseNumber(arrangements.life_cover_amount ?? arrangements.lifeCoverAmount ?? arrangements.life_insurance_amount)
  const criticalIllnessAmount = parseNumber(arrangements.critical_illness_amount ?? arrangements.criticalIllnessAmount)
  const incomeProtectionAmount = parseNumber(arrangements.income_protection_amount ?? arrangements.incomeProtectionAmount)

  // Parse pension details if available
  const pensionProvider = asString(arrangements.pension_provider ?? arrangements.pensionProvider)
  const pensionType = asString(arrangements.pension_type ?? arrangements.pensionType)

  // Parse investment details if available
  const investmentProvider = asString(arrangements.investment_provider ?? arrangements.investmentProvider)
  const investmentType = asString(arrangements.investment_type ?? arrangements.investmentType)

  // Parse insurance provider if available
  const lifeInsuranceProvider = asString(arrangements.life_insurance_provider ?? arrangements.lifeInsuranceProvider)
  const lifeInsurancePremium = parseNumber(arrangements.life_insurance_premium ?? arrangements.lifeInsurancePremium)

  // Build pension arrangements array
  const pensionArrangements: PensionArrangement[] = [...(existingProfile?.pensionArrangements || [])]

  if (pensionValue > 0) {
    // Check if we already have this pension (by matching provider and approximate value)
    const existingPension = pensionArrangements.find(p =>
      p.provider?.toLowerCase() === pensionProvider.toLowerCase() &&
      Math.abs((p.currentValue || 0) - pensionValue) < 1000
    )

    if (!existingPension) {
      pensionArrangements.push({
        id: generateId(),
        type: parsePensionType(pensionType),
        provider: pensionProvider || 'Existing Provider',
        currentValue: pensionValue,
        description: `Synced from suitability assessment on ${now.split('T')[0]}`
      })
    }
  }

  // Handle multiple pensions if provided as array
  const pensionsList = Array.isArray(arrangements.pensions) ? arrangements.pensions : []
  for (const pension of pensionsList) {
    const value = parseNumber(pension.value ?? pension.currentValue)
    if (value > 0) {
      pensionArrangements.push({
        id: generateId(),
        type: parsePensionType(asString(pension.type)),
        provider: asString(pension.provider) || 'Existing Provider',
        currentValue: value,
        monthlyContribution: parseNumber(pension.contribution) || undefined,
        expectedRetirementAge: parseNumber(pension.retirement_age) || undefined,
        description: asString(pension.description) || `Synced from suitability assessment`
      })
    }
  }

  // Build investments array
  const existingInvestments: Investment[] = [...(existingProfile?.existingInvestments || [])]

  if (investmentValue > 0) {
    // Check if we already have this investment
    const existingInv = existingInvestments.find(i =>
      i.provider?.toLowerCase() === investmentProvider.toLowerCase() &&
      Math.abs(i.currentValue - investmentValue) < 1000
    )

    if (!existingInv) {
      existingInvestments.push({
        id: generateId(),
        type: parseInvestmentType(investmentType),
        provider: investmentProvider || 'Existing Provider',
        currentValue: investmentValue,
        description: `Synced from suitability assessment on ${now.split('T')[0]}`
      })
    }
  }

  // Handle multiple investments if provided as array
  const investmentsList = Array.isArray(arrangements.investments) ? arrangements.investments : []
  for (const investment of investmentsList) {
    const value = parseNumber(investment.value ?? investment.currentValue)
    if (value > 0) {
      existingInvestments.push({
        id: generateId(),
        type: parseInvestmentType(asString(investment.type)),
        provider: asString(investment.provider) || 'Existing Provider',
        currentValue: value,
        monthlyContribution: parseNumber(investment.contribution) || undefined,
        description: asString(investment.description) || `Synced from suitability assessment`
      })
    }
  }

  // Handle ISA separately if provided
  const isaValue = parseNumber(arrangements.isa_value ?? arrangements.isaValue)
  if (isaValue > 0) {
    existingInvestments.push({
      id: generateId(),
      type: 'isa',
      provider: asString(arrangements.isa_provider) || 'ISA Provider',
      currentValue: isaValue,
      description: `Synced from suitability assessment on ${now.split('T')[0]}`
    })
  }

  // Build insurance policies array
  const insurancePolicies: InsurancePolicy[] = [...(existingProfile?.insurancePolicies || [])]

  if (lifeCoverAmount > 0) {
    const existingPolicy = insurancePolicies.find(p => p.type === 'life' && Math.abs(p.coverAmount - lifeCoverAmount) < 1000)
    if (!existingPolicy) {
      insurancePolicies.push({
        id: generateId(),
        type: 'life',
        provider: lifeInsuranceProvider || 'Life Insurance Provider',
        coverAmount: lifeCoverAmount,
        monthlyPremium: lifeInsurancePremium,
        description: `Synced from suitability assessment on ${now.split('T')[0]}`
      })
    }
  }

  if (criticalIllnessAmount > 0) {
    insurancePolicies.push({
      id: generateId(),
      type: 'critical_illness',
      provider: asString(arrangements.critical_illness_provider) || 'Critical Illness Provider',
      coverAmount: criticalIllnessAmount,
      monthlyPremium: parseNumber(arrangements.critical_illness_premium),
      description: `Synced from suitability assessment on ${now.split('T')[0]}`
    })
  }

  if (incomeProtectionAmount > 0) {
    insurancePolicies.push({
      id: generateId(),
      type: 'income_protection',
      provider: asString(arrangements.income_protection_provider) || 'Income Protection Provider',
      coverAmount: incomeProtectionAmount,
      monthlyPremium: parseNumber(arrangements.income_protection_premium),
      description: `Synced from suitability assessment on ${now.split('T')[0]}`
    })
  }

  // Calculate totals
  const totalInvestments = existingInvestments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const totalPensions = pensionArrangements.reduce((sum, p) => sum + (p.currentValue || 0), 0)
  const liquidAssets = savings > 0 ? savings : (existingProfile?.liquidAssets || 0)
  const totalAssets = totalInvestments + totalPensions + liquidAssets + propertyValue
  const totalLiabilities = mortgageOutstanding + otherDebts
  const netWorth = totalAssets - totalLiabilities
  const monthlyGross = annualIncome / 12
  const disposableIncome = monthlyGross - monthlyExpenses

  // Parse investment objectives
  const investmentTimeframe = asString(objectives.investment_timeline ?? objectives.time_horizon ?? objectives.investment_horizon)
  const rawObjectives = objectives.investment_objectives ?? objectives.objectives ?? []
  const investmentObjectives = Array.isArray(rawObjectives)
    ? rawObjectives.map(o => asString(o)).filter(Boolean)
    : asString(rawObjectives).split(',').map(s => s.trim()).filter(Boolean)

  return {
    annualIncome: annualIncome > 0 ? annualIncome : (existingProfile?.annualIncome || 0),
    monthlyExpenses: monthlyExpenses > 0 ? monthlyExpenses : (existingProfile?.monthlyExpenses || 0),
    netWorth,
    liquidAssets,
    propertyValue: propertyValue > 0 ? propertyValue : (existingProfile?.propertyValue || 0),
    mortgageOutstanding: mortgageOutstanding > 0 ? mortgageOutstanding : (existingProfile?.mortgageOutstanding || 0),
    otherLiabilities: otherDebts > 0 ? otherDebts : (existingProfile?.otherLiabilities || 0),
    emergencyFund: emergencyFund > 0 ? emergencyFund : (existingProfile?.emergencyFund || 0),
    investmentAmount: investmentAmount > 0 ? investmentAmount : (existingProfile?.investmentAmount || 0),
    disposableIncome,
    totalAssets,
    existingInvestments,
    pensionArrangements,
    insurancePolicies,
    investmentTimeframe: investmentTimeframe || (existingProfile?.investmentTimeframe || ''),
    investmentObjectives: investmentObjectives.length > 0 ? investmentObjectives : (existingProfile?.investmentObjectives || [])
  }
}

/**
 * Merges synced financial data with existing profile, preserving user-entered data
 */
export function mergeFinancialProfiles(
  existingProfile: Partial<FinancialProfile> | null,
  syncedData: ClientFinancialProfileUpdate
): FinancialProfile {
  const existing = existingProfile || {}

  return {
    // Use synced values if they're greater than 0, otherwise keep existing
    annualIncome: syncedData.annualIncome > 0 ? syncedData.annualIncome : (existing.annualIncome || 0),
    monthlyExpenses: syncedData.monthlyExpenses > 0 ? syncedData.monthlyExpenses : (existing.monthlyExpenses || 0),
    netWorth: syncedData.netWorth,
    liquidAssets: syncedData.liquidAssets > 0 ? syncedData.liquidAssets : (existing.liquidAssets || 0),

    // Property and liabilities
    propertyValue: syncedData.propertyValue > 0 ? syncedData.propertyValue : existing.propertyValue,
    mortgageOutstanding: syncedData.mortgageOutstanding > 0 ? syncedData.mortgageOutstanding : existing.mortgageOutstanding,
    otherLiabilities: syncedData.otherLiabilities > 0 ? syncedData.otherLiabilities : existing.otherLiabilities,
    emergencyFund: syncedData.emergencyFund > 0 ? syncedData.emergencyFund : existing.emergencyFund,
    disposableIncome: syncedData.disposableIncome,
    totalAssets: syncedData.totalAssets,
    investmentAmount: syncedData.investmentAmount > 0 ? syncedData.investmentAmount : existing.investmentAmount,

    // Arrays - merge synced with existing
    existingInvestments: syncedData.existingInvestments,
    pensionArrangements: syncedData.pensionArrangements,
    insurancePolicies: syncedData.insurancePolicies,

    // Investment preferences
    investmentTimeframe: syncedData.investmentTimeframe || (existing.investmentTimeframe || ''),
    investmentObjectives: syncedData.investmentObjectives.length > 0
      ? syncedData.investmentObjectives
      : (existing.investmentObjectives || [])
  }
}
