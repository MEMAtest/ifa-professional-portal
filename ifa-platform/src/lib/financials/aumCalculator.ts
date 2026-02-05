/**
 * AUM (Assets Under Management) Calculator
 *
 * Calculates AUM from client financial profiles by summing:
 * - Existing investments (ISAs, GIAs, etc.)
 * - Pension arrangements (DC, SIPP, SSAS - not DB pensions)
 * - Liquid assets under management
 */

import type { Client, Investment, PensionArrangement, FinancialProfile } from '@/types/client'

export interface AUMBreakdown {
  totalAUM: number
  investments: number
  pensions: number
  liquidAssets: number
  breakdown: {
    category: string
    value: number
    percentage: number
  }[]
}

export interface ClientAUM {
  clientId: string
  clientName: string
  aum: number
  breakdown: AUMBreakdown
  lastUpdated: string
}

export interface FirmAUM {
  totalAUM: number
  clientCount: number
  averageAUM: number
  byClient: ClientAUM[]
}

/**
 * Calculate total investment value from investments array
 */
export function calculateInvestmentTotal(investments: Investment[] | unknown = []): number {
  const safeInvestments = Array.isArray(investments) ? investments : []
  return safeInvestments.reduce((total, inv) => {
    return total + (inv.currentValue || 0)
  }, 0)
}

/**
 * Calculate total pension value (excluding DB pensions which are income-based)
 * Only includes DC, SIPP, SSAS which have actual fund values
 */
export function calculatePensionTotal(pensions: PensionArrangement[] | unknown = []): number {
  const safePensions = Array.isArray(pensions) ? pensions : []
  const valuablePensionTypes = ['defined_contribution', 'sipp', 'ssas']

  return safePensions.reduce((total, pension) => {
    if (valuablePensionTypes.includes(pension.type) && pension.currentValue) {
      return total + pension.currentValue
    }
    return total
  }, 0)
}

/**
 * Calculate AUM breakdown for a single client
 */
export function calculateClientAUM(client: Client): AUMBreakdown {
  const fp = client.financialProfile || {} as FinancialProfile

  const investments = calculateInvestmentTotal(fp.existingInvestments)
  const pensions = calculatePensionTotal(fp.pensionArrangements)
  const liquidAssets = fp.liquidAssets || 0

  const totalAUM = investments + pensions + liquidAssets

  const breakdown: AUMBreakdown['breakdown'] = []

  if (investments > 0) {
    breakdown.push({
      category: 'Investments',
      value: investments,
      percentage: totalAUM > 0 ? (investments / totalAUM) * 100 : 0
    })
  }

  if (pensions > 0) {
    breakdown.push({
      category: 'Pensions',
      value: pensions,
      percentage: totalAUM > 0 ? (pensions / totalAUM) * 100 : 0
    })
  }

  if (liquidAssets > 0) {
    breakdown.push({
      category: 'Liquid Assets',
      value: liquidAssets,
      percentage: totalAUM > 0 ? (liquidAssets / totalAUM) * 100 : 0
    })
  }

  return {
    totalAUM,
    investments,
    pensions,
    liquidAssets,
    breakdown
  }
}

/**
 * Calculate AUM for a single client with full details
 */
export function getClientAUMDetails(client: Client): ClientAUM {
  const breakdown = calculateClientAUM(client)
  const name = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unknown'

  return {
    clientId: client.id,
    clientName: name,
    aum: breakdown.totalAUM,
    breakdown,
    lastUpdated: client.updatedAt || new Date().toISOString()
  }
}

/**
 * Calculate firm-wide AUM from array of clients
 */
export function calculateFirmAUM(clients: Client[]): FirmAUM {
  const byClient = clients.map(client => getClientAUMDetails(client))
  const totalAUM = byClient.reduce((sum, c) => sum + c.aum, 0)
  const clientCount = clients.length

  return {
    totalAUM,
    clientCount,
    averageAUM: clientCount > 0 ? totalAUM / clientCount : 0,
    byClient: byClient.sort((a, b) => b.aum - a.aum) // Sort by AUM descending
  }
}

/**
 * Get investment breakdown by type
 */
export function getInvestmentBreakdown(investments: Investment[] | unknown = []): { type: string; value: number; count: number }[] {
  const safeInvestments = Array.isArray(investments) ? investments : []
  const byType: Record<string, { value: number; count: number }> = {}

  safeInvestments.forEach(inv => {
    const type = inv.type || 'other'
    if (!byType[type]) {
      byType[type] = { value: 0, count: 0 }
    }
    byType[type].value += inv.currentValue || 0
    byType[type].count += 1
  })

  return Object.entries(byType).map(([type, data]) => ({
    type: formatInvestmentType(type),
    value: data.value,
    count: data.count
  })).sort((a, b) => b.value - a.value)
}

/**
 * Get pension breakdown by type
 */
export function getPensionBreakdown(pensions: PensionArrangement[] | unknown = []): { type: string; value: number; count: number }[] {
  const safePensions = Array.isArray(pensions) ? pensions : []
  const byType: Record<string, { value: number; count: number }> = {}

  safePensions.forEach(pension => {
    const type = pension.type || 'other'
    if (!byType[type]) {
      byType[type] = { value: 0, count: 0 }
    }
    byType[type].value += pension.currentValue || 0
    byType[type].count += 1
  })

  return Object.entries(byType).map(([type, data]) => ({
    type: formatPensionType(type),
    value: data.value,
    count: data.count
  })).sort((a, b) => b.value - a.value)
}

/**
 * Format investment type for display
 */
function formatInvestmentType(type: string): string {
  const labels: Record<string, string> = {
    isa: 'ISA',
    pension: 'Pension',
    general_investment: 'General Investment',
    property: 'Property',
    savings: 'Savings',
    other: 'Other'
  }
  return labels[type] || type
}

/**
 * Format pension type for display
 */
function formatPensionType(type: string): string {
  const labels: Record<string, string> = {
    defined_benefit: 'Defined Benefit',
    defined_contribution: 'Defined Contribution',
    sipp: 'SIPP',
    ssas: 'SSAS',
    state_pension: 'State Pension'
  }
  return labels[type] || type
}

/**
 * Calculate financial health metrics
 */
export function calculateFinancialHealth(client: Client): {
  savingsRate: number
  liquidityRatio: number
  wealthRatio: number
  debtToIncomeRatio: number
} {
  const fp = client.financialProfile || {} as FinancialProfile

  const annualIncome = fp.annualIncome || 0
  const monthlyExpenses = fp.monthlyExpenses || 0
  const annualExpenses = monthlyExpenses * 12
  const liquidAssets = fp.liquidAssets || 0
  const netWorth = fp.netWorth || 0
  const totalDebt = (fp.mortgageOutstanding || 0) + (fp.otherLiabilities || 0)

  // Savings Rate: % of income saved
  const savingsRate = annualIncome > 0
    ? ((annualIncome - annualExpenses) / annualIncome) * 100
    : 0

  // Liquidity Ratio: months of expenses covered by liquid assets
  const liquidityRatio = monthlyExpenses > 0
    ? liquidAssets / monthlyExpenses
    : 0

  // Wealth Ratio: net worth as multiple of annual income
  const wealthRatio = annualIncome > 0
    ? netWorth / annualIncome
    : 0

  // Debt-to-Income Ratio: total debt as multiple of annual income
  const debtToIncomeRatio = annualIncome > 0
    ? totalDebt / annualIncome
    : 0

  return {
    savingsRate: Math.round(savingsRate * 10) / 10,
    liquidityRatio: Math.round(liquidityRatio * 10) / 10,
    wealthRatio: Math.round(wealthRatio * 10) / 10,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100
  }
}
