import { asTrimmedString, normalizeArrangementTypeLabel, parseOptionalNumber, safeArray } from '../utils'

export function buildProfileArrangements(clientFinancialProfile: Record<string, unknown>) {
  const profilePensionsRaw = safeArray<any>(
    (clientFinancialProfile as any).pensionArrangements ?? (clientFinancialProfile as any).pension_arrangements
  )
  const profileInvestmentsRaw = safeArray<any>(
    (clientFinancialProfile as any).existingInvestments ?? (clientFinancialProfile as any).existing_investments
  )
  const profileInsuranceRaw = safeArray<any>(
    (clientFinancialProfile as any).insurancePolicies ?? (clientFinancialProfile as any).insurance_policies
  )

  const pensionArrangements = profilePensionsRaw
    .map((row) => {
      const provider = asTrimmedString(row.provider)
      const type = normalizeArrangementTypeLabel(row.type)
      const currentValue = parseOptionalNumber(row.currentValue ?? row.current_value)
      const monthlyContribution = parseOptionalNumber(row.monthlyContribution ?? row.monthly_contribution)
      const expectedRetirementAge = parseOptionalNumber(row.expectedRetirementAge ?? row.expected_retirement_age)
      const description = asTrimmedString(row.description)

      if (!provider && !type && currentValue === undefined && !description) return null
      return { provider, type, currentValue, monthlyContribution, expectedRetirementAge, description }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  const investmentArrangements = profileInvestmentsRaw
    .map((row) => {
      const provider = asTrimmedString(row.provider)
      const type = normalizeArrangementTypeLabel(row.type)
      const currentValue = parseOptionalNumber(row.currentValue ?? row.current_value)
      const monthlyContribution = parseOptionalNumber(row.monthlyContribution ?? row.monthly_contribution)
      const description = asTrimmedString(row.description)

      if (!provider && !type && currentValue === undefined && !description) return null
      return { provider, type, currentValue, monthlyContribution, description }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  const insurancePolicies = profileInsuranceRaw
    .map((row) => {
      const provider = asTrimmedString(row.provider)
      const type = normalizeArrangementTypeLabel(row.type)
      const coverAmount = parseOptionalNumber(row.coverAmount ?? row.cover_amount)
      const monthlyPremium = parseOptionalNumber(row.monthlyPremium ?? row.monthly_premium)
      const expiryDate = asTrimmedString(row.expiryDate ?? row.expiry_date)
      const description = asTrimmedString(row.description)

      if (!provider && !type && coverAmount === undefined && monthlyPremium === undefined && !description) return null
      return { provider, type, coverAmount, monthlyPremium, expiryDate, description }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  return { pensionArrangements, investmentArrangements, insurancePolicies }
}
