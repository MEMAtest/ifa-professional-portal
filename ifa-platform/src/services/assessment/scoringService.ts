import { createClient } from "@/lib/supabase/client"
// src/services/assessment/scoringService.ts - Complete assessment scoring
import { 
  RiskProfile, 
  VulnerabilityAssessment, 
  FinancialProfile, 
  KnowledgeExperience,
  SuitabilityAssessment,
  ConsumerDutyOutcome 
} from '@/types'

export class AssessmentScoringService {
  /**
   * Calculate final risk profile based on ATR and CFL
   */
  static calculateRiskProfile(
    attitudeToRisk: number,
    capacityForLoss: number,
    financialProfile: FinancialProfile
  ): RiskProfile {
    // Calculate emergency fund months
    const emergencyMonths = financialProfile.monthlyExpenditure > 0 
      ? Math.floor(financialProfile.emergencyFund / financialProfile.monthlyExpenditure)
      : 0

    // Adjust capacity for loss based on emergency fund
    let adjustedCFL = capacityForLoss
    if (emergencyMonths < 3) adjustedCFL = Math.max(1, adjustedCFL - 1)
    if (emergencyMonths < 6) adjustedCFL = Math.max(1, adjustedCFL - 0.5)

    // Calculate final risk profile (conservative approach - take lower of ATR/CFL)
    const finalRiskProfile = Math.min(attitudeToRisk, Math.floor(adjustedCFL))

    // Calculate expected return and volatility based on risk level
    const riskMetrics = this.getRiskMetrics(finalRiskProfile)

    return {
      attitudeToRisk,
      capacityForLoss,
      maxAcceptableLoss: this.calculateMaxLoss(finalRiskProfile),
      emergencyMonths,
      finalRiskProfile,
      riskReconciliation: this.generateRiskReconciliation(attitudeToRisk, adjustedCFL, finalRiskProfile),
      volatilityTolerance: riskMetrics.volatility,
      expectedReturn: riskMetrics.expectedReturn
    }
  }

  /**
   * Assess vulnerability indicators and calculate risk adjustments
   */
  static assessVulnerability(
    vulnerabilityTypes: string[],
    adaptationsMade: string,
    clientAge: number,
    netWorth: number
  ): VulnerabilityAssessment {
    const is_vulnerable = vulnerabilityTypes.length > 0 && !vulnerabilityTypes.includes('none')
    
    // Determine review frequency based on vulnerability severity
    let reviewFrequency: 'standard' | 'enhanced' | 'frequent' = 'standard'
    
    if (is_vulnerable) {
      const highRiskVulnerabilities = ['health', 'life_events']
      const hasHighRisk = vulnerabilityTypes.some(v => highRiskVulnerabilities.includes(v))
      
      if (hasHighRisk || clientAge > 75 || netWorth < 50000) {
        reviewFrequency = 'frequent'
      } else {
        reviewFrequency = 'enhanced'
      }
    }

    return {
      is_vulnerable,
      vulnerabilityTypes: vulnerabilityTypes as any,
      healthVulnerabilities: vulnerabilityTypes.includes('health') ? 'Identified' : '',
      lifeEventVulnerabilities: vulnerabilityTypes.includes('life_events') ? 'Identified' : '',
      resilienceVulnerabilities: vulnerabilityTypes.includes('resilience') ? 'Identified' : '',
      capabilityVulnerabilities: vulnerabilityTypes.includes('capability') ? 'Identified' : '',
      adaptationsMade,
      supportRequired: this.determineSupportRequired(vulnerabilityTypes),
      reviewFrequency
    }
  }

  /**
   * Calculate comprehensive suitability score
   */
  static calculateSuitabilityScore(
    riskProfile: RiskProfile,
    vulnerabilityAssessment: VulnerabilityAssessment,
    knowledgeExperience: KnowledgeExperience,
    financialProfile: FinancialProfile
  ): SuitabilityAssessment {
    let score = 100

    // Risk alignment scoring (30% weight)
    const riskAlignment = Math.abs(riskProfile.attitudeToRisk - riskProfile.capacityForLoss)
    if (riskAlignment > 2) score -= 20
    else if (riskAlignment > 1) score -= 10

    // Vulnerability impact (25% weight)
    if (vulnerabilityAssessment.is_vulnerable) {
      const vulnerabilityCount = vulnerabilityAssessment.vulnerabilityTypes.length
      score -= Math.min(25, vulnerabilityCount * 8)
    }

    // Knowledge appropriateness (20% weight)
    const knowledgeScore = this.calculateKnowledgeScore(knowledgeExperience, riskProfile.finalRiskProfile)
    score -= (100 - knowledgeScore) * 0.2

    // Financial capacity (25% weight)
    const affordabilityRatio = financialProfile.investmentAmount / financialProfile.netWorth
    if (affordabilityRatio > 0.8) score -= 25
    else if (affordabilityRatio > 0.6) score -= 15
    else if (affordabilityRatio > 0.4) score -= 10

    return {
      meetsObjectives: score >= 70,
      objectivesExplanation: this.generateObjectivesExplanation(score),
      suitableForRisk: riskAlignment <= 1,
      riskExplanation: this.generateRiskExplanation(riskAlignment),
      affordabilityConfirmed: affordabilityRatio <= 0.6,
      affordabilityNotes: this.generateAffordabilityNotes(affordabilityRatio),
      recommendationSuitable: score >= 60,
      suitabilityScore: Math.max(0, Math.round(score)),
      complianceFlags: this.generateComplianceFlags(score, vulnerabilityAssessment, knowledgeExperience),
      consumerDutyOutcomes: this.assessConsumerDutyOutcomes(score, vulnerabilityAssessment)
    }
  }

  private static getRiskMetrics(riskLevel: number) {
    const riskLevels = {
      1: { expectedReturn: 3.5, volatility: 3 },
      2: { expectedReturn: 4.5, volatility: 6 },
      3: { expectedReturn: 5.5, volatility: 9 },
      4: { expectedReturn: 6.5, volatility: 12 },
      5: { expectedReturn: 7.5, volatility: 15 },
      6: { expectedReturn: 8.5, volatility: 18 },
      7: { expectedReturn: 9.5, volatility: 22 }
    }
    return riskLevels[riskLevel as keyof typeof riskLevels] || riskLevels[4]
  }

  private static calculateMaxLoss(riskLevel: number): number {
    const lossLevels = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25, 6: 30, 7: 40 }
    return lossLevels[riskLevel as keyof typeof lossLevels] || 20
  }

  private static generateRiskReconciliation(atr: number, cfl: number, final: number): string {
    if (atr === cfl) {
      return `Risk profile aligned: ATR ${atr} matches CFL ${cfl}`
    }
    return `Risk profile reconciled: ATR ${atr}, CFL ${cfl}, Final ${final} (conservative approach taken)`
  }

  private static determineSupportRequired(vulnerabilityTypes: string[]): string {
    if (vulnerabilityTypes.includes('capability')) {
      return 'Enhanced communication and simplified documentation required'
    }
    if (vulnerabilityTypes.includes('health')) {
      return 'Regular check-ins and accessible communication methods'
    }
    return 'Standard support with enhanced monitoring'
  }

  private static calculateKnowledgeScore(knowledge: KnowledgeExperience, riskLevel: number): number {
    let score = 100
    
    // Penalize mismatch between knowledge and risk level
    const knowledgeMap = { basic: 1, good: 2, advanced: 3, expert: 4 }
    const knowledgeLevel = knowledgeMap[knowledge.investmentKnowledge]
    
    if (riskLevel >= 5 && knowledgeLevel < 2) score -= 30
    if (riskLevel >= 6 && knowledgeLevel < 3) score -= 20
    if (riskLevel === 7 && knowledgeLevel < 4) score -= 10

    return Math.max(0, score)
  }

  private static generateObjectivesExplanation(score: number): string {
    if (score >= 80) return 'Recommendation fully aligns with client objectives and circumstances'
    if (score >= 60) return 'Recommendation generally suitable but requires ongoing monitoring'
    return 'Recommendation may not fully meet objectives - review required'
  }

  private static generateRiskExplanation(riskAlignment: number): string {
    if (riskAlignment === 0) return 'Perfect alignment between attitude to risk and capacity for loss'
    if (riskAlignment === 1) return 'Good alignment with minor difference addressed'
    return 'Significant misalignment requiring risk mitigation measures'
  }

  private static generateAffordabilityNotes(ratio: number): string {
    if (ratio <= 0.4) return 'Investment represents prudent allocation of available capital'
    if (ratio <= 0.6) return 'Investment within acceptable limits but monitor for changes'
    return 'Investment represents significant portion of net worth - enhanced monitoring required'
  }

  private static generateComplianceFlags(
    score: number, 
    vulnerability: VulnerabilityAssessment, 
    knowledge: KnowledgeExperience
  ): string[] {
    const flags: string[] = []
    
    if (score < 60) flags.push('LOW_SUITABILITY_SCORE')
    if (vulnerability.is_vulnerable) flags.push('VULNERABLE_CLIENT')
    if (knowledge.investmentKnowledge === 'basic') flags.push('LIMITED_KNOWLEDGE')
    if (vulnerability.reviewFrequency === 'frequent') flags.push('FREQUENT_REVIEW_REQUIRED')
    
    return flags
  }

  private static assessConsumerDutyOutcomes(
    score: number, 
    vulnerability: VulnerabilityAssessment
  ): ConsumerDutyOutcome[] {
    return [
      {
        outcome: 'products_services' as const,
        status: score >= 70 ? 'met' as const : 'partially_met' as const,
        evidence: 'Suitability assessment completed with appropriate risk matching',
        actions: score < 70 ? ['Enhanced monitoring required'] : []
      },
      {
        outcome: 'price_value' as const,
        status: 'met' as const,
        evidence: 'Transparent fee structure and value assessment provided',
        actions: []
      },
      {
        outcome: 'understanding' as const,
        status: vulnerability.is_vulnerable ? 'partially_met' as const : 'met' as const,
        evidence: 'Risk warnings and product information provided',
        actions: vulnerability.is_vulnerable ? ['Simplified documentation provided'] : []
      },
      {
        outcome: 'support' as const,
        status: 'met' as const,
        evidence: 'Appropriate support level determined based on client needs',
        actions: vulnerability.reviewFrequency !== 'standard' ? ['Enhanced review schedule'] : []
      }
    ]
  }
}