// ===================================================================
// FILE: src/lib/financials/insightsEngine.ts
// Generates actionable financial insights and alerts for advisors
// ===================================================================

import type { Client, FinancialProfile, Investment, PensionArrangement } from '@/types/client'

export type InsightCategory =
  | 'review_due'
  | 'concentration_risk'
  | 'protection_gap'
  | 'rebalancing'
  | 'cash_drag'
  | 'retirement_planning'
  | 'fee_optimization'
  | 'vulnerability'

export type InsightPriority = 'high' | 'medium' | 'low'

export interface FinancialInsight {
  id: string
  category: InsightCategory
  priority: InsightPriority
  title: string
  description: string
  actionRequired: string
  clientId?: string
  clientName?: string
  metric?: {
    label: string
    value: string | number
    threshold?: string | number
  }
  createdAt: string
}

export interface InsightsSummary {
  totalInsights: number
  byPriority: {
    high: number
    medium: number
    low: number
  }
  byCategory: Record<InsightCategory, number>
  insights: FinancialInsight[]
}

function generateId(): string {
  return `insight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getClientName(client: Client): string {
  const pd = client.personalDetails || {}
  const parts = [pd.title, pd.firstName, pd.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : client.clientRef || 'Unknown Client'
}

/**
 * Check if client is due for annual review
 */
function checkReviewDue(client: Client): FinancialInsight | null {
  const riskProfile = client.riskProfile || {}
  const lastAssessment = riskProfile.lastAssessment || riskProfile.lastAssessmentDate

  if (!lastAssessment) {
    return {
      id: generateId(),
      category: 'review_due',
      priority: 'high',
      title: 'No Assessment on Record',
      description: `${getClientName(client)} has no recorded risk assessment. A comprehensive review is recommended.`,
      actionRequired: 'Schedule a suitability assessment',
      clientId: client.id,
      clientName: getClientName(client),
      createdAt: new Date().toISOString()
    }
  }

  const lastDate = new Date(lastAssessment)
  const monthsAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

  if (monthsAgo >= 12) {
    return {
      id: generateId(),
      category: 'review_due',
      priority: 'high',
      title: 'Annual Review Due',
      description: `${getClientName(client)}'s last assessment was ${monthsAgo} months ago. Annual review is overdue.`,
      actionRequired: 'Schedule annual review meeting',
      clientId: client.id,
      clientName: getClientName(client),
      metric: {
        label: 'Months Since Review',
        value: monthsAgo,
        threshold: 12
      },
      createdAt: new Date().toISOString()
    }
  }

  if (monthsAgo >= 10) {
    return {
      id: generateId(),
      category: 'review_due',
      priority: 'medium',
      title: 'Review Coming Due',
      description: `${getClientName(client)}'s annual review is due in ${12 - monthsAgo} months.`,
      actionRequired: 'Plan upcoming annual review',
      clientId: client.id,
      clientName: getClientName(client),
      metric: {
        label: 'Months Until Due',
        value: 12 - monthsAgo,
        threshold: 2
      },
      createdAt: new Date().toISOString()
    }
  }

  return null
}

/**
 * Check for concentration risk in investments
 */
function checkConcentrationRisk(client: Client): FinancialInsight | null {
  const fp = client.financialProfile || {}
  const investments = fp.existingInvestments || []

  if (investments.length < 2) return null

  const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0)
  if (totalValue === 0) return null

  // Check if any single holding exceeds 30% of portfolio
  for (const inv of investments) {
    const percentage = ((inv.currentValue || 0) / totalValue) * 100
    if (percentage > 30) {
      return {
        id: generateId(),
        category: 'concentration_risk',
        priority: 'medium',
        title: 'Concentration Risk Detected',
        description: `${getClientName(client)} has ${percentage.toFixed(1)}% in a single holding (${inv.provider || inv.type}).`,
        actionRequired: 'Review portfolio diversification',
        clientId: client.id,
        clientName: getClientName(client),
        metric: {
          label: 'Single Holding %',
          value: `${percentage.toFixed(1)}%`,
          threshold: '30%'
        },
        createdAt: new Date().toISOString()
      }
    }
  }

  return null
}

/**
 * Check for protection gaps (high earners without life cover)
 */
function checkProtectionGap(client: Client): FinancialInsight | null {
  const fp = client.financialProfile || {}
  const annualIncome = fp.annualIncome || 0
  const policies = fp.insurancePolicies || []
  const pd = client.personalDetails || {}
  const dependents = pd.dependents || 0

  // Only check if income > £50k and has dependents
  if (annualIncome < 50000 || dependents === 0) return null

  const hasLifeCover = policies.some(p => p.type === 'life')

  if (!hasLifeCover) {
    return {
      id: generateId(),
      category: 'protection_gap',
      priority: 'high',
      title: 'Life Cover Gap',
      description: `${getClientName(client)} has income of £${annualIncome.toLocaleString()} and ${dependents} dependent(s) but no life insurance.`,
      actionRequired: 'Discuss life insurance needs',
      clientId: client.id,
      clientName: getClientName(client),
      metric: {
        label: 'Annual Income',
        value: `£${annualIncome.toLocaleString()}`,
        threshold: '> £50k'
      },
      createdAt: new Date().toISOString()
    }
  }

  // Check if life cover is adequate (at least 10x income)
  const totalLifeCover = policies
    .filter(p => p.type === 'life')
    .reduce((sum, p) => sum + (p.coverAmount || 0), 0)

  if (totalLifeCover < annualIncome * 10) {
    return {
      id: generateId(),
      category: 'protection_gap',
      priority: 'medium',
      title: 'Insufficient Life Cover',
      description: `${getClientName(client)}'s life cover of £${totalLifeCover.toLocaleString()} may be insufficient for income of £${annualIncome.toLocaleString()}.`,
      actionRequired: 'Review life cover adequacy',
      clientId: client.id,
      clientName: getClientName(client),
      metric: {
        label: 'Cover Multiple',
        value: `${(totalLifeCover / annualIncome).toFixed(1)}x`,
        threshold: '10x income'
      },
      createdAt: new Date().toISOString()
    }
  }

  return null
}

/**
 * Check for cash drag (too much in cash relative to portfolio)
 */
function checkCashDrag(client: Client): FinancialInsight | null {
  const fp = client.financialProfile || {}
  const liquidAssets = fp.liquidAssets || 0
  const investments = (fp.existingInvestments || []).reduce((sum, inv) => sum + (inv.currentValue || 0), 0)
  const pensions = (fp.pensionArrangements || []).reduce((sum, p) => sum + (p.currentValue || 0), 0)

  const totalAUM = investments + pensions + liquidAssets
  if (totalAUM < 50000) return null // Only for significant portfolios

  const cashPercentage = (liquidAssets / totalAUM) * 100

  // Emergency fund should be 3-6 months expenses, excess could be invested
  const monthlyExpenses = fp.monthlyExpenses || 0
  const recommendedEmergency = monthlyExpenses * 6
  const excessCash = liquidAssets - recommendedEmergency

  if (cashPercentage > 20 && excessCash > 25000) {
    return {
      id: generateId(),
      category: 'cash_drag',
      priority: 'low',
      title: 'Potential Cash Drag',
      description: `${getClientName(client)} holds ${cashPercentage.toFixed(1)}% in cash. £${excessCash.toLocaleString()} above emergency fund could be invested.`,
      actionRequired: 'Discuss investment of excess cash',
      clientId: client.id,
      clientName: getClientName(client),
      metric: {
        label: 'Cash %',
        value: `${cashPercentage.toFixed(1)}%`,
        threshold: '20%'
      },
      createdAt: new Date().toISOString()
    }
  }

  return null
}

/**
 * Check for retirement planning needs
 */
function checkRetirementPlanning(client: Client): FinancialInsight | null {
  const pd = client.personalDetails || {}
  const fp = client.financialProfile || {}

  if (!pd.dateOfBirth) return null

  const dob = new Date(pd.dateOfBirth)
  const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))

  // Check people aged 50-60 without adequate pension
  if (age >= 50 && age <= 60) {
    const pensions = fp.pensionArrangements || []
    const totalPension = pensions.reduce((sum, p) => sum + (p.currentValue || 0), 0)
    const annualIncome = fp.annualIncome || 0

    // Rule of thumb: should have 10-12x salary saved by retirement
    const targetMultiple = Math.max(0, 12 - (65 - age) * 0.5) // Adjust for years to retirement
    const targetPension = annualIncome * targetMultiple

    if (annualIncome > 30000 && totalPension < targetPension * 0.5) {
      return {
        id: generateId(),
        category: 'retirement_planning',
        priority: 'high',
        title: 'Retirement Savings Review',
        description: `${getClientName(client)} is ${age} with pension of £${totalPension.toLocaleString()}. Consider retirement planning review.`,
        actionRequired: 'Schedule retirement planning discussion',
        clientId: client.id,
        clientName: getClientName(client),
        metric: {
          label: 'Pension Value',
          value: `£${totalPension.toLocaleString()}`,
          threshold: `£${targetPension.toLocaleString()} target`
        },
        createdAt: new Date().toISOString()
      }
    }
  }

  return null
}

/**
 * Check for vulnerability concerns
 */
function checkVulnerability(client: Client): FinancialInsight | null {
  const va = client.vulnerabilityAssessment || {}

  const isVulnerable = va.is_vulnerable ||
    (va.vulnerabilityFactors && va.vulnerabilityFactors.length > 0)

  if (!isVulnerable) return null

  // Check if review is overdue
  if (va.reviewDate) {
    const reviewDate = new Date(va.reviewDate)
    if (reviewDate < new Date()) {
      return {
        id: generateId(),
        category: 'vulnerability',
        priority: 'high',
        title: 'Vulnerability Review Overdue',
        description: `${getClientName(client)} is flagged as vulnerable and review is overdue.`,
        actionRequired: 'Complete vulnerability reassessment',
        clientId: client.id,
        clientName: getClientName(client),
        createdAt: new Date().toISOString()
      }
    }
  }

  return null
}

/**
 * Generate all insights for a single client
 */
export function generateClientInsights(client: Client): FinancialInsight[] {
  const insights: FinancialInsight[] = []

  const checks = [
    checkReviewDue,
    checkConcentrationRisk,
    checkProtectionGap,
    checkCashDrag,
    checkRetirementPlanning,
    checkVulnerability
  ]

  for (const check of checks) {
    const insight = check(client)
    if (insight) {
      insights.push(insight)
    }
  }

  return insights
}

/**
 * Generate insights summary for all clients (firm-wide)
 */
export function generateFirmInsights(clients: Client[]): InsightsSummary {
  const allInsights: FinancialInsight[] = []

  for (const client of clients) {
    const clientInsights = generateClientInsights(client)
    allInsights.push(...clientInsights)
  }

  // Sort by priority (high first) then by date
  allInsights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Count by priority
  const byPriority = {
    high: allInsights.filter(i => i.priority === 'high').length,
    medium: allInsights.filter(i => i.priority === 'medium').length,
    low: allInsights.filter(i => i.priority === 'low').length
  }

  // Count by category
  const categories: InsightCategory[] = [
    'review_due', 'concentration_risk', 'protection_gap',
    'rebalancing', 'cash_drag', 'retirement_planning',
    'fee_optimization', 'vulnerability'
  ]

  const byCategory: Record<InsightCategory, number> = {} as any
  for (const cat of categories) {
    byCategory[cat] = allInsights.filter(i => i.category === cat).length
  }

  return {
    totalInsights: allInsights.length,
    byPriority,
    byCategory,
    insights: allInsights
  }
}

/**
 * Get icon name for insight category
 */
export function getInsightCategoryIcon(category: InsightCategory): string {
  const icons: Record<InsightCategory, string> = {
    review_due: 'Calendar',
    concentration_risk: 'AlertTriangle',
    protection_gap: 'Shield',
    rebalancing: 'Scale',
    cash_drag: 'Wallet',
    retirement_planning: 'Clock',
    fee_optimization: 'Calculator',
    vulnerability: 'Heart'
  }
  return icons[category] || 'Info'
}

/**
 * Get color for insight priority
 */
export function getInsightPriorityColor(priority: InsightPriority): string {
  const colors: Record<InsightPriority, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200'
  }
  return colors[priority]
}

/**
 * Get readable label for insight category
 */
export function getInsightCategoryLabel(category: InsightCategory): string {
  const labels: Record<InsightCategory, string> = {
    review_due: 'Review Due',
    concentration_risk: 'Concentration Risk',
    protection_gap: 'Protection Gap',
    rebalancing: 'Rebalancing',
    cash_drag: 'Cash Drag',
    retirement_planning: 'Retirement',
    fee_optimization: 'Fee Optimization',
    vulnerability: 'Vulnerability'
  }
  return labels[category] || category
}
