// =====================================================
// FILE: src/services/assessment/CFLCalculationService.ts
// PURPOSE: Independent CFL calculation per FCA COBS 9.2
// Phase 4: Proper CFL assessment independent from ATR
// =====================================================

import { logger } from '@/lib/errors'

/**
 * Input data for CFL calculation
 */
export interface CFLInputProfile {
  // Time-related
  yearsToRetirement: number
  investmentTimeHorizon: number // years

  // Financial obligations
  dependents: number
  monthlyDebtPayments: number
  monthlyIncome: number

  // Liquidity
  liquidAssets: number
  monthlyExpenses: number

  // Income stability
  employmentType: 'permanent' | 'contract' | 'self-employed' | 'retired' | 'unemployed'
  incomeVariability: 'stable' | 'moderate' | 'variable' | 'highly_variable'

  // Emergency reserves
  emergencyFund: number

  // Investment context
  investmentAmount: number
  netWorth: number
  existingInvestments: number
}

/**
 * CFL calculation result
 */
export interface CFLResult {
  score: number // 1-7 scale
  category: string
  factors: CFLFactors
  rationale: string[]
  warnings: string[]
  maxLossPercentage: number
  confidenceLevel: number
}

/**
 * Individual CFL scoring factors
 */
export interface CFLFactors {
  timeHorizon: number
  obligations: number
  liquidity: number
  incomeStability: number
  reserves: number
  concentration: number
}

/**
 * Weight configuration for CFL factors
 * Per FCA guidance on capacity assessment
 */
const CFL_WEIGHTS = {
  timeHorizon: 0.20,      // How long until funds needed
  obligations: 0.20,      // Financial commitments
  liquidity: 0.15,        // Access to liquid assets
  incomeStability: 0.15,  // Reliability of income
  reserves: 0.15,         // Emergency fund adequacy
  concentration: 0.15     // Investment as % of wealth
} as const

/**
 * CFL category descriptions
 */
const CFL_CATEGORIES: Record<number, { name: string; description: string; maxLoss: number }> = {
  1: { name: 'Very Low', description: 'Cannot afford any loss of capital', maxLoss: 0 },
  2: { name: 'Low', description: 'Can only afford minimal capital loss', maxLoss: 5 },
  3: { name: 'Low-Medium', description: 'Can afford small capital losses', maxLoss: 10 },
  4: { name: 'Medium', description: 'Can afford moderate capital losses', maxLoss: 15 },
  5: { name: 'Medium-High', description: 'Can afford significant capital losses', maxLoss: 25 },
  6: { name: 'High', description: 'Can afford substantial capital losses', maxLoss: 35 },
  7: { name: 'Very High', description: 'Can afford major capital losses', maxLoss: 50 }
}

/**
 * Capacity for Loss (CFL) Calculation Service
 *
 * CFL must be independently calculated from ATR per FCA COBS 9.2 requirements.
 * This service calculates a client's objective capacity to absorb investment losses
 * based on their financial circumstances, not their willingness to take risk.
 */
export class CFLCalculationService {

  /**
   * Calculate complete CFL assessment
   */
  calculateCFL(profile: CFLInputProfile): CFLResult {
    logger.debug('Calculating CFL', {
      yearsToRetirement: profile.yearsToRetirement,
      monthlyIncome: profile.monthlyIncome
    })

    // Calculate individual factors
    const factors: CFLFactors = {
      timeHorizon: this.scoreTimeHorizon(profile.yearsToRetirement, profile.investmentTimeHorizon),
      obligations: this.scoreObligations(profile.dependents, profile.monthlyDebtPayments, profile.monthlyIncome),
      liquidity: this.scoreLiquidity(profile.liquidAssets, profile.monthlyExpenses),
      incomeStability: this.scoreIncomeStability(profile.employmentType, profile.incomeVariability),
      reserves: this.scoreReserves(profile.emergencyFund, profile.monthlyExpenses),
      concentration: this.scoreConcentration(profile.investmentAmount, profile.netWorth, profile.existingInvestments)
    }

    // Calculate weighted score
    const rawScore = this.calculateWeightedScore(factors)

    // Round to nearest 0.5
    const score = Math.round(rawScore * 2) / 2

    // Clamp between 1 and 7
    const finalScore = Math.max(1, Math.min(7, score))
    const roundedScore = Math.round(finalScore)

    // Get category info
    const categoryInfo = CFL_CATEGORIES[roundedScore] || CFL_CATEGORIES[4]

    // Generate rationale and warnings
    const rationale = this.generateRationale(factors, profile)
    const warnings = this.generateWarnings(factors, profile)

    // Calculate confidence based on data completeness
    const confidenceLevel = this.calculateConfidence(profile)

    return {
      score: finalScore,
      category: categoryInfo.name,
      factors,
      rationale,
      warnings,
      maxLossPercentage: categoryInfo.maxLoss,
      confidenceLevel
    }
  }

  /**
   * Score time horizon (1-7)
   * Longer time = higher capacity for loss
   */
  private scoreTimeHorizon(yearsToRetirement: number, investmentHorizon: number): number {
    // Use shorter of retirement or investment horizon
    const effectiveYears = Math.min(yearsToRetirement, investmentHorizon)

    if (effectiveYears >= 20) return 7
    if (effectiveYears >= 15) return 6
    if (effectiveYears >= 10) return 5
    if (effectiveYears >= 7) return 4
    if (effectiveYears >= 5) return 3
    if (effectiveYears >= 3) return 2
    return 1
  }

  /**
   * Score financial obligations (1-7)
   * Lower obligations = higher capacity for loss
   */
  private scoreObligations(
    dependents: number,
    monthlyDebt: number,
    monthlyIncome: number
  ): number {
    // Debt to income ratio
    const debtRatio = monthlyIncome > 0 ? monthlyDebt / monthlyIncome : 1

    // Base score from debt ratio
    let score = 7
    if (debtRatio > 0.5) score = 1
    else if (debtRatio > 0.4) score = 2
    else if (debtRatio > 0.3) score = 3
    else if (debtRatio > 0.2) score = 4
    else if (debtRatio > 0.1) score = 5
    else if (debtRatio > 0) score = 6

    // Adjust for dependents
    if (dependents >= 4) score = Math.max(1, score - 2)
    else if (dependents >= 2) score = Math.max(1, score - 1)
    else if (dependents >= 1) score = Math.max(1, score - 0.5)

    return score
  }

  /**
   * Score liquidity needs (1-7)
   * More liquid assets = higher capacity for loss
   */
  private scoreLiquidity(liquidAssets: number, monthlyExpenses: number): number {
    if (monthlyExpenses <= 0) return 4 // Default if no data

    const monthsCovered = liquidAssets / monthlyExpenses

    if (monthsCovered >= 24) return 7
    if (monthsCovered >= 18) return 6
    if (monthsCovered >= 12) return 5
    if (monthsCovered >= 6) return 4
    if (monthsCovered >= 3) return 3
    if (monthsCovered >= 1) return 2
    return 1
  }

  /**
   * Score income stability (1-7)
   * More stable income = higher capacity for loss
   */
  private scoreIncomeStability(
    employmentType: CFLInputProfile['employmentType'],
    variability: CFLInputProfile['incomeVariability']
  ): number {
    // Base score from employment type
    const employmentScores: Record<CFLInputProfile['employmentType'], number> = {
      permanent: 6,
      retired: 5,
      contract: 4,
      'self-employed': 3,
      unemployed: 1
    }

    let score = employmentScores[employmentType] || 4

    // Adjust for income variability
    const variabilityAdjustment: Record<CFLInputProfile['incomeVariability'], number> = {
      stable: 1,
      moderate: 0,
      variable: -1,
      highly_variable: -2
    }

    score += variabilityAdjustment[variability] || 0

    return Math.max(1, Math.min(7, score))
  }

  /**
   * Score emergency reserves (1-7)
   * More reserves = higher capacity for loss
   */
  private scoreReserves(emergencyFund: number, monthlyExpenses: number): number {
    if (monthlyExpenses <= 0) return 4 // Default if no data

    const monthsCovered = emergencyFund / monthlyExpenses

    if (monthsCovered >= 12) return 7
    if (monthsCovered >= 9) return 6
    if (monthsCovered >= 6) return 5
    if (monthsCovered >= 4) return 4
    if (monthsCovered >= 3) return 3
    if (monthsCovered >= 1) return 2
    return 1
  }

  /**
   * Score concentration risk (1-7)
   * Lower concentration = higher capacity for loss
   */
  private scoreConcentration(
    investmentAmount: number,
    netWorth: number,
    existingInvestments: number
  ): number {
    if (netWorth <= 0) return 1 // No net worth = highest concentration risk

    // Investment as percentage of net worth
    const concentrationRatio = investmentAmount / netWorth

    // Also consider total investment exposure
    const totalInvestments = investmentAmount + existingInvestments
    const totalExposure = totalInvestments / netWorth

    // Use higher (worse) of the two ratios
    const effectiveRatio = Math.max(concentrationRatio, totalExposure * 0.7)

    if (effectiveRatio <= 0.1) return 7
    if (effectiveRatio <= 0.2) return 6
    if (effectiveRatio <= 0.3) return 5
    if (effectiveRatio <= 0.4) return 4
    if (effectiveRatio <= 0.6) return 3
    if (effectiveRatio <= 0.8) return 2
    return 1
  }

  /**
   * Calculate weighted score from factors
   */
  private calculateWeightedScore(factors: CFLFactors): number {
    return (
      factors.timeHorizon * CFL_WEIGHTS.timeHorizon +
      factors.obligations * CFL_WEIGHTS.obligations +
      factors.liquidity * CFL_WEIGHTS.liquidity +
      factors.incomeStability * CFL_WEIGHTS.incomeStability +
      factors.reserves * CFL_WEIGHTS.reserves +
      factors.concentration * CFL_WEIGHTS.concentration
    )
  }

  /**
   * Generate human-readable rationale for the CFL score
   */
  private generateRationale(factors: CFLFactors, profile: CFLInputProfile): string[] {
    const rationale: string[] = []

    // Time horizon
    if (factors.timeHorizon >= 5) {
      rationale.push(`Long investment horizon (${profile.investmentTimeHorizon}+ years) provides time to recover from losses`)
    } else if (factors.timeHorizon <= 2) {
      rationale.push(`Short investment horizon limits ability to recover from market downturns`)
    }

    // Obligations
    if (factors.obligations >= 5) {
      rationale.push(`Low financial obligations relative to income supports loss capacity`)
    } else if (factors.obligations <= 2) {
      rationale.push(`High financial obligations reduce capacity to absorb losses`)
    }

    // Reserves
    if (factors.reserves >= 5) {
      rationale.push(`Adequate emergency reserves provide financial buffer`)
    } else if (factors.reserves <= 2) {
      rationale.push(`Limited emergency reserves reduce loss capacity`)
    }

    // Concentration
    if (factors.concentration >= 5) {
      rationale.push(`Well-diversified wealth reduces concentration risk`)
    } else if (factors.concentration <= 2) {
      rationale.push(`Investment represents significant portion of total wealth`)
    }

    return rationale
  }

  /**
   * Generate warnings for low scoring factors
   */
  private generateWarnings(factors: CFLFactors, profile: CFLInputProfile): string[] {
    const warnings: string[] = []

    if (factors.reserves <= 2) {
      warnings.push('INSUFFICIENT_EMERGENCY_FUND: Consider building emergency reserves before investing')
    }

    if (factors.concentration <= 2) {
      warnings.push('HIGH_CONCENTRATION_RISK: Investment represents significant portion of net worth')
    }

    if (factors.timeHorizon <= 2) {
      warnings.push('SHORT_TIME_HORIZON: Limited time to recover from potential losses')
    }

    if (factors.obligations <= 2) {
      warnings.push('HIGH_OBLIGATIONS: Financial commitments may be impacted by investment losses')
    }

    if (factors.incomeStability <= 2) {
      warnings.push('INCOME_INSTABILITY: Variable income increases vulnerability to losses')
    }

    // Cross-factor warnings
    if (factors.reserves <= 3 && factors.concentration <= 3) {
      warnings.push('COMBINED_RISK: Low reserves combined with high concentration significantly limits loss capacity')
    }

    return warnings
  }

  /**
   * Calculate confidence level based on data completeness
   */
  private calculateConfidence(profile: CFLInputProfile): number {
    let dataPoints = 0
    let totalPoints = 10

    if (profile.yearsToRetirement > 0) dataPoints++
    if (profile.investmentTimeHorizon > 0) dataPoints++
    if (profile.monthlyIncome > 0) dataPoints++
    if (profile.monthlyExpenses > 0) dataPoints++
    if (profile.liquidAssets >= 0) dataPoints++
    if (profile.emergencyFund >= 0) dataPoints++
    if (profile.netWorth !== 0) dataPoints++
    if (profile.investmentAmount > 0) dataPoints++
    if (profile.employmentType) dataPoints++
    if (profile.incomeVariability) dataPoints++

    return Math.round((dataPoints / totalPoints) * 100)
  }

  /**
   * Compare ATR and CFL for reconciliation
   * Returns recommendations when there's a mismatch
   */
  reconcileWithATR(cflScore: number, atrScore: number): {
    aligned: boolean
    finalRecommendation: number
    reconciliationNote: string
    requiresAction: boolean
  } {
    const difference = Math.abs(cflScore - atrScore)

    if (difference <= 1) {
      return {
        aligned: true,
        finalRecommendation: Math.min(cflScore, atrScore),
        reconciliationNote: 'ATR and CFL are well aligned',
        requiresAction: false
      }
    }

    if (difference <= 2) {
      return {
        aligned: false,
        finalRecommendation: Math.min(cflScore, atrScore),
        reconciliationNote: `Minor mismatch between ATR (${atrScore}) and CFL (${cflScore}). Using lower value.`,
        requiresAction: false
      }
    }

    // Significant mismatch
    return {
      aligned: false,
      finalRecommendation: Math.min(cflScore, atrScore),
      reconciliationNote: `Significant mismatch: ATR (${atrScore}) vs CFL (${cflScore}). Client education required about risk capacity constraints.`,
      requiresAction: true
    }
  }
}

// Export singleton instance
export const cflCalculationService = new CFLCalculationService()
