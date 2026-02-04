/**
 * FirmAnalyticsService - Firm-wide analytics and market intelligence
 *
 * Provides aggregate analytics across all clients for practice management.
 * Uses real client data from Supabase - no mock/hardcoded data.
 */

import { createClient } from '@/lib/supabase/client'
import { calculateFirmAUM, calculateClientAUM, type FirmAUM, type ClientAUM } from '@/lib/financials/aumCalculator'
import { normalizeFinancialProfile, createVulnerabilityAssessment, isValidClientStatus } from '@/types/client'
import type { Client } from '@/types/client'
import clientLogger from '@/lib/logging/clientLogger'

export interface RiskDistribution {
  profile1: number  // Cautious
  profile2: number  // Conservative
  profile3: number  // Balanced
  profile4: number  // Growth
  profile5: number  // Aggressive
  unassigned: number
}

export interface AssetAllocation {
  equities: number
  bonds: number
  cash: number
  alternatives: number
  property: number
  other: number
}

export interface DataPointMeta {
  source: string
  lastUpdated: string
  isStale?: boolean
  error?: string
}

export interface MarketConditions {
  ftse100: {
    value: number
    change: number
    changePercent: number
  } & DataPointMeta
  boeRate: {
    value: number
  } & DataPointMeta
  inflation: {
    value: number
  } & DataPointMeta
  forex?: {
    gbpUsd: number
    gbpEur: number
  } & DataPointMeta
  gold?: {
    value: number
  } & DataPointMeta
  // Global Context Data (from Yahoo Finance)
  ftse250?: {
    value: number
    change: number
    changePercent: number
  } & DataPointMeta
  sp500?: {
    value: number
    change: number
    changePercent: number
  } & DataPointMeta
  vix?: {
    value: number
  } & DataPointMeta
  us10yr?: {
    value: number
  } & DataPointMeta
  brentOil?: {
    value: number
  } & DataPointMeta
  fetchedAt: string
}

export interface ClientReviewFlag {
  clientId: string
  clientName: string
  riskProfile: number
  reason: string
  priority: 'high' | 'medium' | 'low'
  aum: number
}

export interface FirmAnalytics {
  firmAUM: FirmAUM
  riskDistribution: RiskDistribution
  assetAllocation: AssetAllocation
  marketConditions: MarketConditions
  clientsNeedingReview: ClientReviewFlag[]
  lastUpdated: string
}

export class FirmAnalyticsService {
  private static getSupabaseClient() {
    return createClient()
  }

  /**
   * Get all clients from database
   */
  static async getAllClients(): Promise<Client[]> {
    const supabase = this.getSupabaseClient()

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      clientLogger.error('Error fetching clients:', error)
      return []
    }

    // Transform snake_case to camelCase
    return (data || []).map((client: Record<string, any>) => {
      const financialProfile = normalizeFinancialProfile({
        ...(client.financial_profile || {}),
        investmentObjectives: Array.isArray(client.financial_profile?.investmentObjectives)
          ? client.financial_profile.investmentObjectives
          : Array.isArray(client.investment_objectives)
            ? client.investment_objectives
            : []
      });

      return {
        id: client.id,
        clientRef: client.client_ref,
        personalDetails: client.personal_details,
        contactInfo: client.contact_info,
        financialProfile,
        riskProfile: client.risk_profile,
        vulnerabilityAssessment: client.vulnerability_assessment || createVulnerabilityAssessment(false),
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        status: isValidClientStatus(client.status) ? client.status : 'active'
      };
    }) as Client[]
  }

  /**
   * Get firm-wide AUM data
   */
  static async getFirmAUM(): Promise<FirmAUM> {
    const clients = await this.getAllClients()
    return calculateFirmAUM(clients)
  }

  /**
   * Get risk profile distribution across all clients
   */
  static async getRiskDistribution(): Promise<RiskDistribution> {
    const clients = await this.getAllClients()

    const distribution: RiskDistribution = {
      profile1: 0,
      profile2: 0,
      profile3: 0,
      profile4: 0,
      profile5: 0,
      unassigned: 0
    }

    clients.forEach(client => {
      const riskLevel = client.riskProfile?.attitudeToRisk ||
                        client.riskProfile?.assessmentScore ||
                        null

      if (riskLevel === null || riskLevel === undefined) {
        distribution.unassigned++
      } else if (riskLevel <= 1) {
        distribution.profile1++
      } else if (riskLevel <= 2) {
        distribution.profile2++
      } else if (riskLevel <= 3) {
        distribution.profile3++
      } else if (riskLevel <= 4) {
        distribution.profile4++
      } else {
        distribution.profile5++
      }
    })

    return distribution
  }

  /**
   * Get aggregate asset allocation across all clients
   */
  static async getAssetAllocation(): Promise<AssetAllocation> {
    const clients = await this.getAllClients()

    const allocation: AssetAllocation = {
      equities: 0,
      bonds: 0,
      cash: 0,
      alternatives: 0,
      property: 0,
      other: 0
    }

    clients.forEach(client => {
      const fp = client.financialProfile
      if (!fp) return

      // Sum up investments by type
      const investments = fp.existingInvestments || []
      investments.forEach(inv => {
        const value = inv.currentValue || 0
        const type = (inv.type || '').toLowerCase()

        if (type.includes('equity') || type.includes('stock') || type === 'isa') {
          allocation.equities += value
        } else if (type.includes('bond') || type.includes('gilt')) {
          allocation.bonds += value
        } else if (type.includes('cash') || type.includes('savings')) {
          allocation.cash += value
        } else if (type.includes('property') || type.includes('real estate')) {
          allocation.property += value
        } else if (type.includes('alternative') || type.includes('hedge')) {
          allocation.alternatives += value
        } else {
          allocation.other += value
        }
      })

      // Add liquid assets as cash
      allocation.cash += fp.liquidAssets || 0

      // Add pensions (assume balanced allocation)
      const pensions = fp.pensionArrangements || []
      pensions.forEach(pension => {
        const value = pension.currentValue || 0
        // Pensions typically have mixed allocation - split 60/40
        allocation.equities += value * 0.6
        allocation.bonds += value * 0.4
      })
    })

    return allocation
  }

  /**
   * Get current market conditions (live data)
   * Uses server-side API route to avoid CORS issues
   * Returns full source metadata for transparency
   */
  static async getMarketConditions(): Promise<MarketConditions> {
    try {
      // Use the new server-side API route to fetch market data
      const response = await fetch('/api/market-data')

      if (!response.ok) {
        throw new Error(`Market data API error: ${response.status}`)
      }

      const data = await response.json()

      // Transform API response to MarketConditions format
      return {
        ftse100: {
          value: data.ftse100?.value?.price || 0,
          change: data.ftse100?.value?.change || 0,
          changePercent: data.ftse100?.value?.changePercent || 0,
          source: data.ftse100?.source || 'Unknown',
          lastUpdated: data.ftse100?.lastUpdated || '',
          isStale: data.ftse100?.isStale,
          error: data.ftse100?.error
        },
        boeRate: {
          value: data.boeRate?.value || 0,
          source: data.boeRate?.source || 'Unknown',
          lastUpdated: data.boeRate?.lastUpdated || '',
          isStale: data.boeRate?.isStale,
          error: data.boeRate?.error
        },
        inflation: {
          value: data.cpi?.value || 0,
          source: data.cpi?.source || 'Unknown',
          lastUpdated: data.cpi?.lastUpdated || '',
          isStale: data.cpi?.isStale,
          error: data.cpi?.error
        },
        forex: data.forex ? {
          gbpUsd: data.forex.value?.gbpUsd || 0,
          gbpEur: data.forex.value?.gbpEur || 0,
          source: data.forex.source || 'Unknown',
          lastUpdated: data.forex.lastUpdated || '',
          isStale: data.forex.isStale,
          error: data.forex.error
        } : undefined,
        gold: data.gold ? {
          value: data.gold.value || 0,
          source: data.gold.source || 'Unknown',
          lastUpdated: data.gold.lastUpdated || '',
          isStale: data.gold.isStale,
          error: data.gold.error
        } : undefined,
        // Global Context Data
        ftse250: data.ftse250 ? {
          value: data.ftse250.value?.price || 0,
          change: data.ftse250.value?.change || 0,
          changePercent: data.ftse250.value?.changePercent || 0,
          source: data.ftse250.source || 'Unknown',
          lastUpdated: data.ftse250.lastUpdated || '',
          isStale: data.ftse250.isStale,
          error: data.ftse250.error
        } : undefined,
        sp500: data.sp500 ? {
          value: data.sp500.value?.price || 0,
          change: data.sp500.value?.change || 0,
          changePercent: data.sp500.value?.changePercent || 0,
          source: data.sp500.source || 'Unknown',
          lastUpdated: data.sp500.lastUpdated || '',
          isStale: data.sp500.isStale,
          error: data.sp500.error
        } : undefined,
        vix: data.vix ? {
          value: data.vix.value || 0,
          source: data.vix.source || 'Unknown',
          lastUpdated: data.vix.lastUpdated || '',
          isStale: data.vix.isStale,
          error: data.vix.error
        } : undefined,
        us10yr: data.us10yr ? {
          value: data.us10yr.value || 0,
          source: data.us10yr.source || 'Unknown',
          lastUpdated: data.us10yr.lastUpdated || '',
          isStale: data.us10yr.isStale,
          error: data.us10yr.error
        } : undefined,
        brentOil: data.brentOil ? {
          value: data.brentOil.value || 0,
          source: data.brentOil.source || 'Unknown',
          lastUpdated: data.brentOil.lastUpdated || '',
          isStale: data.brentOil.isStale,
          error: data.brentOil.error
        } : undefined,
        fetchedAt: data.fetchedAt || new Date().toISOString()
      }
    } catch (error) {
      clientLogger.error('Error fetching market conditions:', error)
      // Return error state - no hardcoded fallbacks
      const errorState = {
        value: 0,
        source: 'Error',
        lastUpdated: '',
        error: String(error)
      }
      return {
        ftse100: { ...errorState, value: 0, change: 0, changePercent: 0 },
        boeRate: errorState,
        inflation: errorState,
        fetchedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Identify clients that may need review based on market conditions
   */
  static async getClientsNeedingReview(marketConditions: MarketConditions): Promise<ClientReviewFlag[]> {
    const clients = await this.getAllClients()
    const flags: ClientReviewFlag[] = []

    clients.forEach(client => {
      const riskLevel = client.riskProfile?.attitudeToRisk ||
                        client.riskProfile?.assessmentScore || 3
      const clientAUM = calculateClientAUM(client)
      const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unknown'

      // High inflation + conservative clients = may need inflation protection
      if (marketConditions.inflation.value > 3 && riskLevel <= 2) {
        flags.push({
          clientId: client.id,
          clientName,
          riskProfile: riskLevel,
          reason: 'High inflation may erode conservative portfolio returns. Consider inflation-linked bonds.',
          priority: 'high',
          aum: clientAUM.totalAUM
        })
      }

      // High interest rates + growth clients with low bond allocation
      if (marketConditions.boeRate.value > 5 && riskLevel >= 4) {
        flags.push({
          clientId: client.id,
          clientName,
          riskProfile: riskLevel,
          reason: 'High interest rates offer attractive fixed income yields. Review bond allocation.',
          priority: 'medium',
          aum: clientAUM.totalAUM
        })
      }

      // Market volatility (large FTSE change) + cautious clients
      if (Math.abs(marketConditions.ftse100.changePercent) > 2 && riskLevel <= 2) {
        flags.push({
          clientId: client.id,
          clientName,
          riskProfile: riskLevel,
          reason: 'Market volatility detected. Review client comfort with current allocation.',
          priority: marketConditions.ftse100.changePercent < -2 ? 'high' : 'low',
          aum: clientAUM.totalAUM
        })
      }
    })

    // Sort by priority and AUM
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return flags.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.aum - a.aum
    })
  }

  /**
   * Get complete firm analytics (all data in one call)
   */
  static async getFirmAnalytics(): Promise<FirmAnalytics> {
    const [firmAUM, riskDistribution, assetAllocation, marketConditions] = await Promise.all([
      this.getFirmAUM(),
      this.getRiskDistribution(),
      this.getAssetAllocation(),
      this.getMarketConditions()
    ])

    const clientsNeedingReview = await this.getClientsNeedingReview(marketConditions)

    return {
      firmAUM,
      riskDistribution,
      assetAllocation,
      marketConditions,
      clientsNeedingReview,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get analytics for a specific client (with detailed impact calculations)
   */
  static async getClientAnalytics(clientId: string): Promise<{
    client: Client | null
    aum: ClientAUM | null
    marketImpact: {
      inflationImpact: string
      rateImpact: string
      equityImpact: string
      recommendations: string[]
    }
    detailedImpact: {
      rateDetails: ImpactDetails
      inflationDetails: ImpactDetails
      equityDetails: ImpactDetails
      portfolio: { equities: number; bonds: number; cash: number; total: number }
    } | null
    marketConditions: MarketConditions | null
  }> {
    const supabase = this.getSupabaseClient()

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error || !data) {
      return {
        client: null,
        aum: null,
        marketImpact: { inflationImpact: '', rateImpact: '', equityImpact: '', recommendations: [] },
        detailedImpact: null,
        marketConditions: null
      }
    }

    // Transform to Client type
    const client: Client = {
      id: data.id,
      clientRef: data.client_ref,
      personalDetails: data.personal_details,
      contactInfo: data.contact_info,
      financialProfile: normalizeFinancialProfile({
        ...(data.financial_profile || {}),
        investmentObjectives: Array.isArray(data.financial_profile?.investmentObjectives)
          ? data.financial_profile.investmentObjectives
          : Array.isArray(data.investment_objectives)
            ? data.investment_objectives
            : []
      }),
      riskProfile: data.risk_profile,
      vulnerabilityAssessment: data.vulnerability_assessment || createVulnerabilityAssessment(false),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      status: isValidClientStatus(data.status) ? data.status : 'active'
    }

    const clientAUM = calculateClientAUM(client)
    const aum = {
      clientId: client.id,
      clientName: `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim(),
      aum: clientAUM.totalAUM,
      breakdown: clientAUM,
      lastUpdated: client.updatedAt || new Date().toISOString()
    }

    const marketConditions = await this.getMarketConditions()
    const riskLevel = client.riskProfile?.attitudeToRisk || client.riskProfile?.assessmentScore || 3

    // Generate personalized market impact analysis (simple strings)
    const marketImpact = this.analyzeMarketImpact(riskLevel, marketConditions, aum.breakdown)

    // Calculate detailed impact breakdown
    const fp = client.financialProfile
    let equities = 0, bonds = 0, cash = 0

    // From investments
    const investments = fp?.existingInvestments || []
    investments.forEach(inv => {
      const value = inv.currentValue || 0
      const type = (inv.type || '').toLowerCase()
      if (type.includes('equity') || type.includes('stock') || type === 'isa') {
        equities += value
      } else if (type.includes('bond') || type.includes('gilt')) {
        bonds += value
      }
    })

    // Liquid assets are cash
    cash = fp?.liquidAssets || 0

    // Pensions (assume 60/40 split)
    const pensions = fp?.pensionArrangements || []
    pensions.forEach(pension => {
      const value = pension.currentValue || 0
      equities += value * 0.6
      bonds += value * 0.4
    })

    const totalAUM = clientAUM.totalAUM

    const detailedImpact = {
      rateDetails: this.calculateRateImpact(bonds, totalAUM, marketConditions.boeRate.value, riskLevel),
      inflationDetails: this.calculateInflationImpact(cash, totalAUM, marketConditions.inflation.value, riskLevel),
      equityDetails: this.calculateEquityImpact(equities, totalAUM, marketConditions.ftse100.changePercent, riskLevel),
      portfolio: { equities, bonds, cash, total: totalAUM }
    }

    return { client, aum, marketImpact, detailedImpact, marketConditions }
  }

  /**
   * Analyze market impact for a specific client
   */
  private static analyzeMarketImpact(
    riskLevel: number,
    market: MarketConditions,
    aumBreakdown: { totalAUM: number; investments: number; pensions: number; liquidAssets: number }
  ): {
    inflationImpact: string
    rateImpact: string
    equityImpact: string
    recommendations: string[]
  } {
    const recommendations: string[] = []

    // Inflation impact
    let inflationImpact = 'Low'
    if (market.inflation.value > 3) {
      inflationImpact = riskLevel <= 2 ? 'High - Conservative portfolios at risk' : 'Moderate'
      if (riskLevel <= 2) {
        recommendations.push('Consider increasing allocation to inflation-linked bonds or real assets')
      }
    } else if (market.inflation.value > 2.5) {
      inflationImpact = 'Moderate'
    }

    // Interest rate impact
    let rateImpact = 'Neutral'
    if (market.boeRate.value > 5) {
      rateImpact = 'Positive for fixed income'
      if (riskLevel >= 4 && aumBreakdown.investments > 0) {
        recommendations.push('High rates offer attractive bond yields - review fixed income allocation')
      }
    } else if (market.boeRate.value < 2) {
      rateImpact = 'Challenging for income seekers'
      if (riskLevel <= 2) {
        recommendations.push('Low rates may require diversification beyond traditional bonds')
      }
    }

    // Equity market impact
    let equityImpact = 'Stable'
    if (market.ftse100.changePercent > 1) {
      equityImpact = 'Positive momentum'
    } else if (market.ftse100.changePercent < -1) {
      equityImpact = riskLevel <= 2 ? 'Volatility concern' : 'Potential buying opportunity'
      if (riskLevel <= 2 && market.ftse100.changePercent < -2) {
        recommendations.push('Market volatility - review if current allocation matches risk tolerance')
      }
    }

    // Add general recommendations based on risk profile
    if (riskLevel >= 4 && recommendations.length === 0) {
      recommendations.push('Growth-oriented portfolio aligned with current market conditions')
    } else if (riskLevel <= 2 && recommendations.length === 0) {
      recommendations.push('Conservative allocation appropriate for current environment')
    }

    return {
      inflationImpact,
      rateImpact,
      equityImpact,
      recommendations
    }
  }

  /**
   * Calculate detailed impact for all clients (for heat map)
   */
  static async calculateAllClientImpacts(marketConditions?: MarketConditions): Promise<DetailedClientImpact[]> {
    const clients = await this.getAllClients()
    const market = marketConditions || await this.getMarketConditions()

    return clients.map(client => {
      const clientAUM = calculateClientAUM(client)
      const riskLevel = client.riskProfile?.attitudeToRisk || client.riskProfile?.assessmentScore || 3
      const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unknown'

      // Calculate portfolio breakdown
      const fp = client.financialProfile
      const totalAUM = clientAUM.totalAUM

      // Estimate asset allocation
      let equities = 0, bonds = 0, cash = 0

      // From investments
      const investments = fp?.existingInvestments || []
      investments.forEach(inv => {
        const value = inv.currentValue || 0
        const type = (inv.type || '').toLowerCase()
        if (type.includes('equity') || type.includes('stock') || type === 'isa') {
          equities += value
        } else if (type.includes('bond') || type.includes('gilt')) {
          bonds += value
        }
      })

      // Liquid assets are cash
      cash = fp?.liquidAssets || 0

      // Pensions (assume 60/40 split)
      const pensions = fp?.pensionArrangements || []
      pensions.forEach(pension => {
        const value = pension.currentValue || 0
        equities += value * 0.6
        bonds += value * 0.4
      })

      // Calculate detailed impacts
      const rateDetails = this.calculateRateImpact(bonds, totalAUM, market.boeRate.value, riskLevel)
      const inflationDetails = this.calculateInflationImpact(cash, totalAUM, market.inflation.value, riskLevel)
      const equityDetails = this.calculateEquityImpact(equities, totalAUM, market.ftse100.changePercent, riskLevel)

      const initials = clientName.split(' ')
        .map(n => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')

      return {
        clientId: client.id,
        clientName,
        initials: initials || 'UN',
        aum: totalAUM,
        riskProfile: riskLevel,
        rateImpact: rateDetails.level,
        inflationImpact: inflationDetails.level,
        equityImpact: equityDetails.level,
        rateDetails,
        inflationDetails,
        equityDetails,
        portfolio: {
          equities,
          bonds,
          cash,
          total: totalAUM
        }
      }
    })
  }

  /**
   * Calculate detailed rate impact
   */
  private static calculateRateImpact(
    bondValue: number,
    totalAUM: number,
    boeRate: number,
    riskLevel: number
  ): ImpactDetails {
    const bondExposure = totalAUM > 0 ? bondValue / totalAUM : 0
    const bondDuration = 5 // Average assumed duration

    // Estimate impact of 1% rate change
    const rateChangeScenario = 0.01 // 1% change
    const estimatedImpact = -bondDuration * rateChangeScenario * bondValue

    let level: 'high' | 'medium' | 'low' = 'low'
    let explanation = ''
    let recommendation = ''

    if (bondExposure > 0.5 && boeRate > 4) {
      level = 'high'
      explanation = `Your ${(bondExposure * 100).toFixed(0)}% bond allocation (${formatCurrency(bondValue)}) is significantly exposed to rate changes. With the current ${boeRate.toFixed(2)}% base rate, bond values are sensitive to rate movements.`
      recommendation = 'Consider shorter-duration bonds or inflation-linked securities to reduce rate sensitivity.'
    } else if (bondExposure > 0.3 || (bondExposure > 0.2 && boeRate > 4.5)) {
      level = 'medium'
      explanation = `Your ${(bondExposure * 100).toFixed(0)}% bond allocation has moderate rate sensitivity. A 1% rate change could affect bond values by approximately ${formatCurrency(Math.abs(estimatedImpact))}.`
      recommendation = 'Monitor rate movements and consider laddered bond maturities for better flexibility.'
    } else {
      explanation = `Your portfolio has ${bondExposure > 0 ? `${(bondExposure * 100).toFixed(0)}% in bonds` : 'limited bond exposure'}, providing natural protection against rate volatility.`
      recommendation = bondExposure > 0
        ? 'Current allocation is well-positioned for rate changes.'
        : 'Consider adding some fixed income for diversification benefits.'
    }

    return {
      level,
      exposure: bondValue,
      exposurePercent: bondExposure * 100,
      estimatedImpact: Math.abs(estimatedImpact),
      explanation,
      recommendation
    }
  }

  /**
   * Calculate detailed inflation impact
   */
  private static calculateInflationImpact(
    cashValue: number,
    totalAUM: number,
    inflationRate: number,
    riskLevel: number
  ): ImpactDetails {
    const cashExposure = totalAUM > 0 ? cashValue / totalAUM : 0
    const inflationLoss = cashValue * (inflationRate / 100)

    let level: 'high' | 'medium' | 'low' = 'low'
    let explanation = ''
    let recommendation = ''

    if (cashExposure > 0.3 && inflationRate > 2.5) {
      level = 'high'
      explanation = `Your ${(cashExposure * 100).toFixed(0)}% cash allocation (${formatCurrency(cashValue)}) is losing purchasing power. At ${inflationRate.toFixed(1)}% inflation, you're losing approximately ${formatCurrency(inflationLoss)} per year in real terms.`
      recommendation = 'Consider moving excess cash into inflation-protected securities, real assets, or short-term bonds.'
    } else if (cashExposure > 0.2 || (cashExposure > 0.15 && inflationRate > 3)) {
      level = 'medium'
      explanation = `Your ${(cashExposure * 100).toFixed(0)}% cash position provides liquidity but is subject to inflation erosion of about ${formatCurrency(inflationLoss)} annually at current rates.`
      recommendation = 'Maintain 3-6 months emergency fund in cash, consider investing surplus in inflation-linked assets.'
    } else {
      explanation = `Your portfolio has ${cashExposure > 0 ? `${(cashExposure * 100).toFixed(0)}% in cash` : 'minimal cash holdings'}. With inflation at ${inflationRate.toFixed(1)}%, your investments are largely protected from cash erosion.`
      recommendation = 'Maintain current allocation. Ensure adequate emergency reserves.'
    }

    return {
      level,
      exposure: cashValue,
      exposurePercent: cashExposure * 100,
      estimatedImpact: inflationLoss,
      explanation,
      recommendation
    }
  }

  /**
   * Calculate detailed equity impact
   */
  private static calculateEquityImpact(
    equityValue: number,
    totalAUM: number,
    ftseChangePercent: number,
    riskLevel: number
  ): ImpactDetails {
    const equityExposure = totalAUM > 0 ? equityValue / totalAUM : 0
    const estimatedImpact = equityValue * (ftseChangePercent / 100)

    let level: 'high' | 'medium' | 'low' = 'low'
    let explanation = ''
    let recommendation = ''

    const isVolatile = Math.abs(ftseChangePercent) > 1
    const isConservative = riskLevel <= 2

    if (equityExposure > 0.6 && isVolatile && isConservative) {
      level = 'high'
      explanation = `Your ${(equityExposure * 100).toFixed(0)}% equity allocation (${formatCurrency(equityValue)}) may be too volatile for your cautious risk profile. Recent ${ftseChangePercent > 0 ? 'gains' : 'losses'} of ${Math.abs(ftseChangePercent).toFixed(2)}% represent a ${formatCurrency(Math.abs(estimatedImpact))} change.`
      recommendation = 'Review if current equity exposure aligns with your comfort level. Consider reducing to 40-50%.'
    } else if ((equityExposure > 0.5 && isVolatile) || (equityExposure > 0.7 && Math.abs(ftseChangePercent) > 0.5)) {
      level = 'medium'
      explanation = `Your ${(equityExposure * 100).toFixed(0)}% equity allocation is participating in market movements. The recent ${ftseChangePercent > 0 ? '+' : ''}${ftseChangePercent.toFixed(2)}% market move affects your portfolio by approximately ${formatCurrency(Math.abs(estimatedImpact))}.`
      recommendation = 'Current exposure is appropriate for your profile. Rebalance if allocation drifts significantly.'
    } else {
      explanation = `Your ${equityExposure > 0 ? `${(equityExposure * 100).toFixed(0)}%` : 'limited'} equity exposure ${ftseChangePercent > 0 ? 'benefits from positive momentum' : 'provides stability in volatile markets'}.`
      recommendation = equityExposure < 0.3 && riskLevel >= 3
        ? 'Consider increasing equity exposure to match your growth-oriented profile.'
        : 'Portfolio is well-positioned for current market conditions.'
    }

    return {
      level,
      exposure: equityValue,
      exposurePercent: equityExposure * 100,
      estimatedImpact: Math.abs(estimatedImpact),
      explanation,
      recommendation
    }
  }
}

// Helper function for formatting currency in impact calculations
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Export types for use in components
export interface ImpactDetails {
  level: 'high' | 'medium' | 'low'
  exposure: number
  exposurePercent: number
  estimatedImpact: number
  explanation: string
  recommendation: string
}

export interface DetailedClientImpact {
  clientId: string
  clientName: string
  initials: string
  aum: number
  riskProfile: number
  rateImpact: 'high' | 'medium' | 'low'
  inflationImpact: 'high' | 'medium' | 'low'
  equityImpact: 'high' | 'medium' | 'low'
  rateDetails: ImpactDetails
  inflationDetails: ImpactDetails
  equityDetails: ImpactDetails
  portfolio: {
    equities: number
    bonds: number
    cash: number
    total: number
  }
}

export default FirmAnalyticsService
