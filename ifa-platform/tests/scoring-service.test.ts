// =====================================================
// FILE: tests/scoring-service.test.ts
// PURPOSE: Comprehensive tests for AssessmentScoringService
// Phase 4: Testing & Infrastructure
// =====================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { AssessmentScoringService } from '@/services/assessment/scoringService'
import type { FinancialProfile, VulnerabilityAssessment, VulnerabilityType, KnowledgeExperience, RiskProfile } from '@/types'

function makeFinancialProfile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    investmentAmount: 0,
    timeHorizon: 10,
    primaryObjective: 'Capital Growth',
    secondaryObjectives: [],
    incomeRequirement: 0,
    emergencyFund: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenditure: 0,
    disposableIncome: 0,
    pensionValue: 0,
    propertyValue: 0,
    ...overrides
  }
}

describe('AssessmentScoringService', () => {

  describe('calculateRiskProfile', () => {
    it('returns correct structure with all fields', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 4000,
        emergencyFund: 30000, // 7.5 months
        liquidAssets: 50000
      } as any)

      const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)

      assert.ok('attitudeToRisk' in result)
      assert.ok('capacityForLoss' in result)
      assert.ok('maxAcceptableLoss' in result)
      assert.ok('emergencyMonths' in result)
      assert.ok('finalRiskProfile' in result)
      assert.ok('riskReconciliation' in result)
      assert.ok('volatilityTolerance' in result)
      assert.ok('expectedReturn' in result)
    })

    it('calculates emergency months correctly', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 4000,
        emergencyFund: 12000, // 3 months
        liquidAssets: 50000
      } as any)

      const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
      assert.equal(result.emergencyMonths, 3)
    })

    it('handles zero monthly expenditure', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 0, // Edge case
        emergencyFund: 12000,
        liquidAssets: 50000
      } as any)

      // Should not throw
      const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
      assert.equal(result.emergencyMonths, 0)
    })

    it('applies single penalty for < 3 months emergency fund', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 5000,
        emergencyFund: 5000, // 1 month
        liquidAssets: 10000
      } as any)

      const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
      // CFL 5 - 1 penalty = 4, final = min(5, 4) = 4
      assert.equal(result.finalRiskProfile, 4)
    })

    it('applies lesser penalty for 3-5 months emergency fund', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 5000,
        emergencyFund: 20000, // 4 months
        liquidAssets: 30000
      } as any)

      const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
      // CFL 5 - 0.5 penalty = 4.5, floor = 4, final = min(5, 4) = 4
      assert.equal(result.finalRiskProfile, 4)
    })

    it('applies no penalty for >= 6 months emergency fund', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 5000,
        emergencyFund: 35000, // 7 months
        liquidAssets: 50000
      } as any)

      const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
      // No penalty, final = min(5, 5) = 5
      assert.equal(result.finalRiskProfile, 5)
    })

    it('takes lower of ATR and adjusted CFL (conservative approach)', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 4000,
        emergencyFund: 30000, // 7.5 months
        liquidAssets: 50000
      } as any)

      // ATR 7, CFL 3 -> final should be 3 (lower)
      const result = AssessmentScoringService.calculateRiskProfile(7, 3, financialProfile)
      assert.equal(result.finalRiskProfile, 3)
    })

    it('never returns CFL below 1 even with penalties', () => {
      const financialProfile = makeFinancialProfile({
        investmentAmount: 50000,
        netWorth: 200000,
        monthlyIncome: 8000,
        monthlyExpenditure: 10000,
        emergencyFund: 5000, // < 1 month
        liquidAssets: 10000
      } as any)

      // CFL 1, with -1 penalty would be 0, but should clamp to 1
      const result = AssessmentScoringService.calculateRiskProfile(5, 1, financialProfile)
      assert.ok(result.finalRiskProfile >= 1)
    })
  })

  describe('assessVulnerability', () => {
    it('returns not vulnerable when no vulnerability types', () => {
      const result = AssessmentScoringService.assessVulnerability(
        [],
        'None',
        45,
        200000
      )
      assert.equal(result.is_vulnerable, false)
      assert.equal(result.reviewFrequency, 'standard')
    })

    it('returns not vulnerable when only "none" selected', () => {
      const result = AssessmentScoringService.assessVulnerability(
        ['none'],
        'None',
        45,
        200000
      )
      assert.equal(result.is_vulnerable, false)
    })

    it('identifies vulnerability with health issues', () => {
      const result = AssessmentScoringService.assessVulnerability(
        ['health'],
        'Larger print materials',
        65,
        150000
      )
      assert.equal(result.is_vulnerable, true)
      assert.equal(result.reviewFrequency, 'frequent')
    })

    it('sets frequent review for clients over 75', () => {
      const result = AssessmentScoringService.assessVulnerability(
        ['resilience'],
        'Regular check-ins',
        78,
        300000
      )
      assert.equal(result.is_vulnerable, true)
      assert.equal(result.reviewFrequency, 'frequent')
    })

    it('sets frequent review for low net worth vulnerable clients', () => {
      const result = AssessmentScoringService.assessVulnerability(
        ['resilience'],
        'Regular check-ins',
        45,
        30000 // Below 50000 threshold
      )
      assert.equal(result.is_vulnerable, true)
      assert.equal(result.reviewFrequency, 'frequent')
    })

    it('sets enhanced review for moderate vulnerability', () => {
      const result = AssessmentScoringService.assessVulnerability(
        ['resilience'],
        'Regular check-ins',
        50,
        100000
      )
      assert.equal(result.is_vulnerable, true)
      assert.equal(result.reviewFrequency, 'enhanced')
    })
  })

  describe('calculateSuitabilityScore', () => {
    const defaultRiskProfile: RiskProfile = {
      attitudeToRisk: 5,
      capacityForLoss: 5,
      maxAcceptableLoss: 25,
      emergencyMonths: 6,
      finalRiskProfile: 5,
      riskReconciliation: 'Risk profile aligned',
      volatilityTolerance: 15,
      expectedReturn: 7.5
    }

    const defaultVulnerability: VulnerabilityAssessment = {
      is_vulnerable: false,
      vulnerabilityTypes: [] as VulnerabilityType[],
      healthVulnerabilities: '',
      lifeEventVulnerabilities: '',
      resilienceVulnerabilities: '',
      capabilityVulnerabilities: '',
      adaptationsMade: '',
      supportRequired: '',
      reviewFrequency: 'standard' as const
    }

    const defaultKnowledge: KnowledgeExperience = {
      investmentKnowledge: 'good',
      investmentExperience: 5,
      productKnowledge: {
        shares: true,
        bonds: true,
        funds: true,
        derivatives: false,
        alternatives: false
      },
      advisorReliance: 'medium',
      educationRequired: false,
      notes: ''
    }

    const defaultFinancial: FinancialProfile = makeFinancialProfile({
      investmentAmount: 50000,
      netWorth: 200000,
      monthlyIncome: 8000,
      monthlyExpenditure: 4000,
      emergencyFund: 30000
    })

    it('returns a score between 0 and 100', () => {
      const result = AssessmentScoringService.calculateSuitabilityScore(
        defaultRiskProfile,
        defaultVulnerability,
        defaultKnowledge,
        defaultFinancial
      )
      assert.ok(result.suitabilityScore >= 0)
      assert.ok(result.suitabilityScore <= 100)
    })

    it('penalizes risk misalignment', () => {
      const alignedRisk = { ...defaultRiskProfile, attitudeToRisk: 5, capacityForLoss: 5 }
      const misalignedRisk = { ...defaultRiskProfile, attitudeToRisk: 7, capacityForLoss: 3 }

      const aligned = AssessmentScoringService.calculateSuitabilityScore(
        alignedRisk, defaultVulnerability, defaultKnowledge, defaultFinancial
      )
      const misaligned = AssessmentScoringService.calculateSuitabilityScore(
        misalignedRisk, defaultVulnerability, defaultKnowledge, defaultFinancial
      )

      assert.ok(aligned.suitabilityScore > misaligned.suitabilityScore)
    })

    it('penalizes high affordability ratio', () => {
      const lowRatio = { ...defaultFinancial, investmentAmount: 20000, netWorth: 200000 } // 10%
      const highRatio = { ...defaultFinancial, investmentAmount: 180000, netWorth: 200000 } // 90%

      const lowResult = AssessmentScoringService.calculateSuitabilityScore(
        defaultRiskProfile, defaultVulnerability, defaultKnowledge, lowRatio
      )
      const highResult = AssessmentScoringService.calculateSuitabilityScore(
        defaultRiskProfile, defaultVulnerability, defaultKnowledge, highRatio
      )

      assert.ok(lowResult.suitabilityScore > highResult.suitabilityScore)
    })

    it('handles zero net worth without crashing', () => {
      const zeroNetWorth = { ...defaultFinancial, netWorth: 0 }

      // Should not throw
      const result = AssessmentScoringService.calculateSuitabilityScore(
        defaultRiskProfile, defaultVulnerability, defaultKnowledge, zeroNetWorth
      )

      assert.equal(Number.isFinite(result.suitabilityScore), true)
      assert.ok(result.suitabilityScore >= 0)
      assert.ok(result.suitabilityScore <= 100)
    })

    it('flags low suitability scores', () => {
      // Create worst case scenario
      const badRisk = { ...defaultRiskProfile, attitudeToRisk: 7, capacityForLoss: 2 }
      const vulnerable: VulnerabilityAssessment = {
        ...defaultVulnerability,
        is_vulnerable: true,
        vulnerabilityTypes: ['health', 'life_events', 'resilience'] as VulnerabilityType[]
      }
      const basicKnowledge: KnowledgeExperience = { ...defaultKnowledge, investmentKnowledge: 'basic' }
      const highInvestment: FinancialProfile = { ...defaultFinancial, investmentAmount: 190000, netWorth: 200000 }

      const result = AssessmentScoringService.calculateSuitabilityScore(
        badRisk, vulnerable, basicKnowledge, highInvestment
      )

      assert.ok(result.complianceFlags.includes('LOW_SUITABILITY_SCORE'))
      assert.ok(result.complianceFlags.includes('VULNERABLE_CLIENT'))
      assert.ok(result.complianceFlags.includes('LIMITED_KNOWLEDGE'))
    })
  })
})

describe('Edge Cases and Boundary Conditions', () => {
  it('handles all zeros in financial profile', () => {
    const financialProfile = makeFinancialProfile({
      investmentAmount: 0,
      netWorth: 0,
      monthlyIncome: 0,
      monthlyExpenditure: 0,
      emergencyFund: 0,
      liquidAssets: 0
    } as any)

    // Should not throw
    const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
    assert.equal(Number.isFinite(result.finalRiskProfile), true)
  })

  it('handles very large numbers', () => {
    const financialProfile = makeFinancialProfile({
      investmentAmount: 1e12,
      netWorth: 1e13,
      monthlyIncome: 1e6,
      monthlyExpenditure: 5e5,
      emergencyFund: 1e7,
      liquidAssets: 1e8
    } as any)

    const result = AssessmentScoringService.calculateRiskProfile(5, 5, financialProfile)
    assert.equal(Number.isFinite(result.finalRiskProfile), true)
    assert.equal(Number.isFinite(result.emergencyMonths), true)
  })
})
