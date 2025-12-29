import { describe, it, expect } from 'vitest';
import { StressTestingEngine } from '@/services/StressTestingEngine';
import type { CashFlowScenario } from '@/types/cashflow';
import type { MonteCarloResults, StressScenario } from '@/types/stress-testing';

const engine = StressTestingEngine as any;

const makeScenario = (overrides: Partial<CashFlowScenario> = {}): CashFlowScenario => ({
  isActive: true,
  id: 'scenario-1',
  clientId: 'client-1',
  scenarioName: 'Base Scenario',
  scenarioType: 'base',
  createdBy: 'user-1',
  projectionYears: 30,
  inflationRate: 2.5,
  realEquityReturn: 5,
  realBondReturn: 2,
  realCashReturn: 1,
  clientAge: 45,
  retirementAge: 67,
  lifeExpectancy: 85,
  dependents: 0,
  currentSavings: 10000,
  pensionValue: 50000,
  pensionPotValue: 50000,
  investmentValue: 100000,
  propertyValue: 0,
  currentIncome: 100,
  pensionContributions: 0,
  statePensionAge: 67,
  statePensionAmount: 0,
  otherIncome: 0,
  currentExpenses: 100,
  essentialExpenses: 70,
  lifestyleExpenses: 20,
  discretionaryExpenses: 10,
  mortgageBalance: 0,
  mortgagePayment: 0,
  otherDebts: 0,
  retirementIncomeTarget: 80,
  retirementIncomeDesired: 90,
  emergencyFundTarget: 10000,
  legacyTarget: 0,
  equityAllocation: 60,
  bondAllocation: 30,
  cashAllocation: 10,
  alternativeAllocation: 0,
  assumptionBasis: 'Test assumptions',
  marketDataSource: 'Test source',
  lastAssumptionsReview: '2025-01-01',
  vulnerabilityAdjustments: {},
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides
});

const makeResults = (
  values: number[],
  overrides: Partial<MonteCarloResults> = {}
): MonteCarloResults => ({
  simulations: values.map((value, index) => ({
    simulationId: index,
    finalPortfolioValue: value,
    shortfallYears: [],
    success: value > 0,
    maxDrawdown: 0
  })),
  confidenceIntervals: {
    percentile10: -100,
    percentile25: -50,
    percentile50: 100,
    percentile75: 200,
    percentile90: 300
  },
  successProbability: 0,
  averageOutcome: values.reduce((sum, value) => sum + value, 0) / values.length,
  standardDeviation: 0,
  maxDrawdown: 0,
  ...overrides
});

describe('StressTestingEngine maths', () => {
  it('calculates survival and shortfall rates from simulations', () => {
    const results = makeResults([100, 0, -50, 25]);
    const survival = engine.calculateSurvivalProbability(results);
    const shortfall = engine.calculateShortfallRisk(results);

    expect(survival).toBeCloseTo(50);
    expect(shortfall).toBeCloseTo(50);
    expect(survival + shortfall).toBeCloseTo(100);
  });

  it('calculates worst case outcome from simulations', () => {
    const results = makeResults([500, -250, 1000, -10]);
    const worstCase = engine.calculateWorstCase(results);
    expect(worstCase).toBe(-250);
  });

  it('scores resilience for personal risk with recovery bonus', () => {
    const personalScenario: StressScenario = {
      id: 'job_loss_redundancy',
      name: 'Job Loss',
      description: 'Income shock',
      type: 'personal_crisis',
      severity: 'severe',
      durationYears: 1,
      category: 'Personal Risk',
      parameters: {} as any
    };

    const results = makeResults([100, -100, 100, -100], {
      confidenceIntervals: {
        percentile10: -100,
        percentile25: -50,
        percentile50: 10,
        percentile75: 50,
        percentile90: 100
      },
      averageOutcome: 0
    });

    const score = engine.calculateResilienceScore(personalScenario, results);
    expect(score).toBeCloseTo(45);
  });

  it('scores resilience for market risk with outcome bonus', () => {
    const marketScenario: StressScenario = {
      id: 'market_crash_2008',
      name: 'Market Crash',
      description: 'Market shock',
      type: 'market_crash',
      severity: 'moderate',
      durationYears: 2,
      category: 'Market Risk',
      parameters: {} as any
    };

    const results = makeResults([100, -100, 100, -100], {
      averageOutcome: 25
    });

    const score = engine.calculateResilienceScore(marketScenario, results);
    expect(score).toBeCloseTo(47.5);
  });

  it('computes impact deltas between base and stressed scenarios', () => {
    const baseScenario = makeScenario({
      realEquityReturn: 5,
      currentIncome: 100,
      currentExpenses: 100
    });
    const stressedScenario = makeScenario({
      realEquityReturn: 2,
      currentIncome: 80,
      currentExpenses: 110
    });

    const impact = engine.analyzeImpact(baseScenario, stressedScenario);
    expect(impact.portfolio_decline_percent).toBeCloseTo(-60);
    expect(impact.income_reduction_percent).toBeCloseTo(-20);
    expect(impact.expense_increase_percent).toBeCloseTo(10);
  });

  it('applies inflation shock parameters consistently', () => {
    const baseScenario = makeScenario({
      inflationRate: 2.5,
      realEquityReturn: 5,
      realBondReturn: 2,
      currentExpenses: 100
    });

    const inflationScenario: StressScenario = {
      id: 'inflation_shock_1970s',
      name: 'Inflation Shock',
      description: 'High inflation',
      type: 'inflation_shock',
      severity: 'severe',
      durationYears: 5,
      category: 'Inflation Risk',
      parameters: {
        inflation_increase: 5,
        real_return_erosion: -3,
        expense_multiplier: 1.4
      } as any
    };

    const stressed = engine.applyStressParameters(baseScenario, inflationScenario);

    expect(stressed.inflationRate).toBeCloseTo(7.5);
    expect(stressed.realEquityReturn).toBeCloseTo(2);
    expect(stressed.realBondReturn).toBeCloseTo(-1);
    expect(stressed.currentExpenses).toBeCloseTo(140);
  });
});
