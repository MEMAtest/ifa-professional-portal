import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/monte-carlo/config', () => ({
  MONTE_CARLO_CONFIG: {
    simulation: { defaultRuns: 100 },
    performance: { chunkSize: 100 }
  },
  MATH_CONSTANTS: {},
  MARKET_REGIMES: {},
  ASSET_CLASSES: {
    equity: { expectedReturn: 0, volatility: 0 },
    bonds: { expectedReturn: 0, volatility: 0 },
    cash: { expectedReturn: 0, volatility: 0 },
    alternatives: { expectedReturn: 0, volatility: 0 }
  },
  CORRELATION_MATRIX: {
    equity_bonds: 0,
    equity_cash: 0,
    equity_alternatives: 0
  }
}));

describe('MonteCarloEngine deterministic maths', async () => {
  const { createMonteCarloEngine } = await import('@/lib/monte-carlo/engine');

  it('produces deterministic cashflow with zero returns and no inflation', async () => {
    const engine = createMonteCarloEngine(42);
    const result = await engine.runSimulation({
      initialWealth: 100,
      timeHorizon: 5,
      withdrawalAmount: 10,
      riskScore: 5,
      inflationRate: 0,
      simulationCount: 10,
      assetAllocation: { equity: 1, bonds: 0, cash: 0 },
      returnAssumptions: { equity: 0, bonds: 0, cash: 0 }
    });

    expect(result.successProbability).toBe(100);
    expect(result.averageFinalWealth).toBe(50);
    expect(result.medianFinalWealth).toBe(50);
    expect(result.confidenceIntervals.p10).toBe(50);
    expect(result.confidenceIntervals.p50).toBe(50);
    expect(result.confidenceIntervals.p90).toBe(50);
    expect(result.shortfallRisk).toBe(0);
    expect(result.averageShortfall).toBe(0);
    expect(result.maxDrawdown).toBe(50);
    expect(result.volatility).toBe(0);
  });

  it('inflation increases withdrawals over time', async () => {
    const engine = createMonteCarloEngine(7);
    const result = await engine.runSimulation({
      initialWealth: 100,
      timeHorizon: 2,
      withdrawalAmount: 10,
      riskScore: 5,
      inflationRate: 0.1,
      simulationCount: 5,
      assetAllocation: { equity: 1, bonds: 0, cash: 0 },
      returnAssumptions: { equity: 0, bonds: 0, cash: 0 }
    });

    expect(result.averageFinalWealth).toBe(79);
    expect(result.medianFinalWealth).toBe(79);
    expect(result.maxDrawdown).toBe(21);
    expect(result.successProbability).toBe(100);
  });
});
