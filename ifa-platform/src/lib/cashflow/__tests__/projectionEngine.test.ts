import { describe, it, expect } from 'vitest';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import type { CashFlowScenario } from '@/types/cashflow';

const baseScenario: CashFlowScenario = {
  isActive: true,
  id: 'scenario-1',
  clientId: 'client-1',
  scenarioName: 'Test Scenario',
  scenarioType: 'base',
  createdBy: 'user-1',
  projectionYears: 1,
  inflationRate: 0,
  realEquityReturn: 0,
  realBondReturn: 0,
  realCashReturn: 0,
  clientAge: 65,
  retirementAge: 65,
  lifeExpectancy: 85,
  dependents: 0,
  currentSavings: 0,
  pensionValue: 0,
  pensionPotValue: 0,
  investmentValue: 0,
  propertyValue: 0,
  currentIncome: 0,
  pensionContributions: 0,
  statePensionAge: 67,
  statePensionAmount: 0,
  otherIncome: 0,
  currentExpenses: 0,
  essentialExpenses: 0,
  lifestyleExpenses: 0,
  discretionaryExpenses: 0,
  mortgageBalance: 0,
  mortgagePayment: 0,
  otherDebts: 0,
  retirementIncomeTarget: 0,
  retirementIncomeDesired: 0,
  emergencyFundTarget: 0,
  legacyTarget: 0,
  equityAllocation: 100,
  bondAllocation: 0,
  cashAllocation: 0,
  alternativeAllocation: 0,
  assumptionBasis: '',
  marketDataSource: '',
  lastAssumptionsReview: '2025-01-01',
  vulnerabilityAdjustments: {},
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01'
};

describe('ProjectionEngine', () => {
  it('reduces pension pot when pension drawdown occurs', async () => {
    const scenario: CashFlowScenario = {
      ...baseScenario,
      pensionPotValue: 100000,
      currentExpenses: 4000
    };

    const result = await ProjectionEngine.generateProjections(scenario);
    const firstYear = result.projections[0];

    expect(firstYear.pensionPotValue).toBe(96000);
    expect(firstYear.pensionIncome).toBe(4000);
  });

  it('withdraws from cash, then investments, then pension for deficits', async () => {
    const scenario: CashFlowScenario = {
      ...baseScenario,
      pensionPotValue: 100000,
      currentSavings: 2000,
      investmentValue: 3000,
      currentExpenses: 10000
    };

    const result = await ProjectionEngine.generateProjections(scenario);
    const firstYear = result.projections[0];

    expect(firstYear.cashSavings).toBe(0);
    expect(firstYear.investmentPortfolio).toBe(0);
    expect(firstYear.pensionIncome).toBe(5000);
    expect(firstYear.investmentIncome).toBe(5000);
  });

  it('uses scenario expense breakdown when provided', async () => {
    const scenario: CashFlowScenario = {
      ...baseScenario,
      essentialExpenses: 10000,
      lifestyleExpenses: 5000,
      discretionaryExpenses: 5000
    };

    const result = await ProjectionEngine.generateProjections(scenario);
    const firstYear = result.projections[0];

    expect(firstYear.essentialExpenses).toBe(10000);
    expect(firstYear.lifestyleExpenses).toBe(5000);
    expect(firstYear.discretionaryExpenses).toBe(5000);
  });

  it('applies allocation-weighted returns to portfolio', async () => {
    const scenario: CashFlowScenario = {
      ...baseScenario,
      clientAge: 50,
      retirementAge: 60,
      pensionPotValue: 100000,
      realEquityReturn: 10,
      realBondReturn: 0,
      equityAllocation: 50,
      bondAllocation: 50
    };

    const result = await ProjectionEngine.generateProjections(scenario);
    const firstYear = result.projections[0];

    expect(firstYear.pensionPotValue).toBe(105000);
  });
});
