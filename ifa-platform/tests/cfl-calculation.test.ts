// =====================================================
// FILE: tests/cfl-calculation.test.ts
// PURPOSE: Tests for CFL Calculation Service
// Phase 4: Testing & Infrastructure
// =====================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { CFLCalculationService, CFLInputProfile } from '@/services/assessment/CFLCalculationService'

describe('CFLCalculationService', () => {
  const service = new CFLCalculationService()

  const defaultProfile: CFLInputProfile = {
    yearsToRetirement: 20,
    investmentTimeHorizon: 10,
    dependents: 0,
    monthlyDebtPayments: 500,
    monthlyIncome: 5000,
    liquidAssets: 30000,
    monthlyExpenses: 3000,
    employmentType: 'permanent',
    incomeVariability: 'stable',
    emergencyFund: 15000,
    investmentAmount: 50000,
    netWorth: 200000,
    existingInvestments: 50000
  }

  describe('calculateCFL', () => {
    it('returns complete result structure', () => {
      const result = service.calculateCFL(defaultProfile)

      assert.ok('score' in result)
      assert.ok('category' in result)
      assert.ok('factors' in result)
      assert.ok('rationale' in result)
      assert.ok('warnings' in result)
      assert.ok('maxLossPercentage' in result)
      assert.ok('confidenceLevel' in result)
    })

    it('returns score between 1 and 7', () => {
      const result = service.calculateCFL(defaultProfile)
      assert.ok(result.score >= 1)
      assert.ok(result.score <= 7)
    })

    it('returns valid category', () => {
      const result = service.calculateCFL(defaultProfile)
      const validCategories = ['Very Low', 'Low', 'Low-Medium', 'Medium', 'Medium-High', 'High', 'Very High']
      assert.ok(validCategories.includes(result.category))
    })

    it('includes all factor scores', () => {
      const result = service.calculateCFL(defaultProfile)

      assert.ok('timeHorizon' in result.factors)
      assert.ok('obligations' in result.factors)
      assert.ok('liquidity' in result.factors)
      assert.ok('incomeStability' in result.factors)
      assert.ok('reserves' in result.factors)
      assert.ok('concentration' in result.factors)
    })

    it('factors are between 1 and 7', () => {
      const result = service.calculateCFL(defaultProfile)

      Object.values(result.factors).forEach(factor => {
        assert.ok(factor >= 1, `Factor ${factor} is below 1`)
        assert.ok(factor <= 7, `Factor ${factor} is above 7`)
      })
    })
  })

  describe('Time Horizon Scoring', () => {
    it('scores high for long time horizon', () => {
      const profile = { ...defaultProfile, yearsToRetirement: 25, investmentTimeHorizon: 20 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.timeHorizon >= 5)
    })

    it('scores low for short time horizon', () => {
      const profile = { ...defaultProfile, yearsToRetirement: 2, investmentTimeHorizon: 2 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.timeHorizon <= 2)
    })

    it('uses shorter of retirement or investment horizon', () => {
      const profile = { ...defaultProfile, yearsToRetirement: 30, investmentTimeHorizon: 3 }
      const result = service.calculateCFL(profile)
      // 3 years should score 2
      assert.equal(result.factors.timeHorizon, 2)
    })
  })

  describe('Obligations Scoring', () => {
    it('scores high for low debt ratio', () => {
      const profile = { ...defaultProfile, monthlyDebtPayments: 100, monthlyIncome: 10000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.obligations >= 5)
    })

    it('scores low for high debt ratio', () => {
      const profile = { ...defaultProfile, monthlyDebtPayments: 3000, monthlyIncome: 5000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.obligations <= 2)
    })

    it('penalizes for dependents', () => {
      const noDepProfile = { ...defaultProfile, dependents: 0 }
      const depProfile = { ...defaultProfile, dependents: 4 }

      const noDepResult = service.calculateCFL(noDepProfile)
      const depResult = service.calculateCFL(depProfile)

      assert.ok(noDepResult.factors.obligations > depResult.factors.obligations)
    })

    it('handles zero income gracefully', () => {
      const profile = { ...defaultProfile, monthlyIncome: 0 }
      const result = service.calculateCFL(profile)
      assert.equal(result.factors.obligations, 1) // Should be lowest score
    })
  })

  describe('Liquidity Scoring', () => {
    it('scores high for high liquidity', () => {
      const profile = { ...defaultProfile, liquidAssets: 100000, monthlyExpenses: 3000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.liquidity >= 6)
    })

    it('scores low for low liquidity', () => {
      const profile = { ...defaultProfile, liquidAssets: 2000, monthlyExpenses: 3000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.liquidity <= 2)
    })

    it('handles zero expenses gracefully', () => {
      const profile = { ...defaultProfile, monthlyExpenses: 0 }
      const result = service.calculateCFL(profile)
      assert.equal(result.factors.liquidity, 4) // Default value
    })
  })

  describe('Income Stability Scoring', () => {
    it('scores high for permanent employment with stable income', () => {
      const profile = { ...defaultProfile, employmentType: 'permanent' as const, incomeVariability: 'stable' as const }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.incomeStability >= 6)
    })

    it('scores low for unemployed', () => {
      const profile = { ...defaultProfile, employmentType: 'unemployed' as const, incomeVariability: 'highly_variable' as const }
      const result = service.calculateCFL(profile)
      assert.equal(result.factors.incomeStability, 1)
    })

    it('adjusts for income variability', () => {
      const stableProfile = { ...defaultProfile, incomeVariability: 'stable' as const }
      const variableProfile = { ...defaultProfile, incomeVariability: 'highly_variable' as const }

      const stableResult = service.calculateCFL(stableProfile)
      const variableResult = service.calculateCFL(variableProfile)

      assert.ok(stableResult.factors.incomeStability > variableResult.factors.incomeStability)
    })
  })

  describe('Reserves Scoring', () => {
    it('scores high for 12+ months reserves', () => {
      const profile = { ...defaultProfile, emergencyFund: 40000, monthlyExpenses: 3000 }
      const result = service.calculateCFL(profile)
      assert.equal(result.factors.reserves, 7)
    })

    it('scores low for < 1 month reserves', () => {
      const profile = { ...defaultProfile, emergencyFund: 1000, monthlyExpenses: 3000 }
      const result = service.calculateCFL(profile)
      assert.equal(result.factors.reserves, 1)
    })
  })

  describe('Concentration Scoring', () => {
    it('scores high for low concentration', () => {
      const profile = { ...defaultProfile, investmentAmount: 10000, netWorth: 500000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.concentration >= 6)
    })

    it('scores low for high concentration', () => {
      const profile = { ...defaultProfile, investmentAmount: 180000, netWorth: 200000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.factors.concentration <= 2)
    })

    it('scores 1 for zero net worth', () => {
      const profile = { ...defaultProfile, netWorth: 0 }
      const result = service.calculateCFL(profile)
      assert.equal(result.factors.concentration, 1)
    })
  })

  describe('Warnings Generation', () => {
    it('warns about insufficient emergency fund', () => {
      const profile = { ...defaultProfile, emergencyFund: 1000, monthlyExpenses: 5000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.warnings.some(w => w.includes('INSUFFICIENT_EMERGENCY_FUND')))
    })

    it('warns about high concentration', () => {
      const profile = { ...defaultProfile, investmentAmount: 190000, netWorth: 200000 }
      const result = service.calculateCFL(profile)
      assert.ok(result.warnings.some(w => w.includes('HIGH_CONCENTRATION_RISK')))
    })

    it('warns about short time horizon', () => {
      const profile = { ...defaultProfile, yearsToRetirement: 1, investmentTimeHorizon: 1 }
      const result = service.calculateCFL(profile)
      assert.ok(result.warnings.some(w => w.includes('SHORT_TIME_HORIZON')))
    })

    it('returns no warnings for healthy profile', () => {
      const healthyProfile: CFLInputProfile = {
        yearsToRetirement: 25,
        investmentTimeHorizon: 15,
        dependents: 0,
        monthlyDebtPayments: 200,
        monthlyIncome: 10000,
        liquidAssets: 100000,
        monthlyExpenses: 4000,
        employmentType: 'permanent',
        incomeVariability: 'stable',
        emergencyFund: 50000,
        investmentAmount: 30000,
        netWorth: 500000,
        existingInvestments: 100000
      }
      const result = service.calculateCFL(healthyProfile)
      assert.equal(result.warnings.length, 0)
    })
  })

  describe('Confidence Level', () => {
    it('returns 100% for complete data', () => {
      const result = service.calculateCFL(defaultProfile)
      assert.equal(result.confidenceLevel, 100)
    })

    it('returns lower confidence for missing data', () => {
      const incompleteProfile = {
        ...defaultProfile,
        yearsToRetirement: 0,
        investmentTimeHorizon: 0
      }
      const result = service.calculateCFL(incompleteProfile)
      assert.ok(result.confidenceLevel < 100)
    })
  })

  describe('reconcileWithATR', () => {
    it('returns aligned for matching scores', () => {
      const result = service.reconcileWithATR(5, 5)
      assert.equal(result.aligned, true)
      assert.equal(result.finalRecommendation, 5)
      assert.equal(result.requiresAction, false)
    })

    it('returns aligned for small difference', () => {
      const result = service.reconcileWithATR(5, 4)
      assert.equal(result.aligned, true)
      assert.equal(result.finalRecommendation, 4) // Uses lower
    })

    it('returns not aligned for moderate difference', () => {
      const result = service.reconcileWithATR(6, 4)
      assert.equal(result.aligned, false)
      assert.equal(result.finalRecommendation, 4)
      assert.equal(result.requiresAction, false)
    })

    it('requires action for significant mismatch', () => {
      const result = service.reconcileWithATR(7, 3)
      assert.equal(result.aligned, false)
      assert.equal(result.finalRecommendation, 3)
      assert.equal(result.requiresAction, true)
      assert.ok(result.reconciliationNote.includes('education required'))
    })

    it('always uses lower value for final recommendation', () => {
      const result1 = service.reconcileWithATR(7, 2)
      assert.equal(result1.finalRecommendation, 2)

      const result2 = service.reconcileWithATR(2, 7)
      assert.equal(result2.finalRecommendation, 2)
    })
  })
})

describe('CFL Edge Cases', () => {
  const service = new CFLCalculationService()

  it('handles all zeros gracefully', () => {
    const zeroProfile: CFLInputProfile = {
      yearsToRetirement: 0,
      investmentTimeHorizon: 0,
      dependents: 0,
      monthlyDebtPayments: 0,
      monthlyIncome: 0,
      liquidAssets: 0,
      monthlyExpenses: 0,
      employmentType: 'unemployed',
      incomeVariability: 'highly_variable',
      emergencyFund: 0,
      investmentAmount: 0,
      netWorth: 0,
      existingInvestments: 0
    }

    // Should not throw
    const result = service.calculateCFL(zeroProfile)
    assert.ok(result.score >= 1)
    assert.ok(result.score <= 7)
  })

  it('handles very large numbers', () => {
    const largeProfile: CFLInputProfile = {
      yearsToRetirement: 50,
      investmentTimeHorizon: 30,
      dependents: 0,
      monthlyDebtPayments: 1000,
      monthlyIncome: 1000000,
      liquidAssets: 10000000,
      monthlyExpenses: 50000,
      employmentType: 'permanent',
      incomeVariability: 'stable',
      emergencyFund: 1000000,
      investmentAmount: 5000000,
      netWorth: 100000000,
      existingInvestments: 20000000
    }

    const result = service.calculateCFL(largeProfile)
    assert.ok(Number.isFinite(result.score))
    assert.ok(result.score >= 1)
    assert.ok(result.score <= 7)
  })

  it('handles negative values safely', () => {
    const negativeProfile: CFLInputProfile = {
      ...{
        yearsToRetirement: 20,
        investmentTimeHorizon: 10,
        dependents: 0,
        monthlyDebtPayments: 500,
        monthlyIncome: 5000,
        liquidAssets: 30000,
        monthlyExpenses: 3000,
        employmentType: 'permanent' as const,
        incomeVariability: 'stable' as const,
        emergencyFund: 15000,
        investmentAmount: 50000,
        existingInvestments: 50000
      },
      netWorth: -50000 // Negative net worth
    }

    const result = service.calculateCFL(negativeProfile)
    assert.ok(Number.isFinite(result.score))
    assert.equal(result.factors.concentration, 1) // Should be lowest due to negative net worth
  })
})
