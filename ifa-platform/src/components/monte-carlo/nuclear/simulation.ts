import { getRiskAllocation } from '@/components/monte-carlo/nuclear/utils';
import type { SimulationInputs, SimulationResults, YearlyProjection } from '@/components/monte-carlo/nuclear/types';

interface SimulationRunOptions {
  inputs: SimulationInputs;
  onProgress?: (progress: number) => void | Promise<void>;
}

const random = () => Math.random();

const normalRandom = (mean: number, stdDev: number) => {
  const u1 = random();
  const u2 = random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
};

const percentileFromArray = (values: number[], percentile: number) => {
  if (!values.length) return 0;
  const index = Math.floor((values.length - 1) * percentile / 100);
  return values[index];
};

export const runMonteCarloSimulation = async ({
  inputs,
  onProgress
}: SimulationRunOptions): Promise<SimulationResults> => {
  const startTime = Date.now();
  const allocation = getRiskAllocation(inputs.riskScore);
  const inflationRate = inputs.inflationRate / 100;

  const assetParams = {
    equity: { return: 0.08, volatility: 0.16 },
    bonds: { return: 0.04, volatility: 0.05 },
    cash: { return: 0.02, volatility: 0.01 }
  };

  const simResults: { yearlyWealths: number[]; maxDrawdown: number }[] = [];
  const finalWealths: number[] = [];
  let successCount = 0;

  const chunkSize = 100;

  for (let i = 0; i < inputs.simulationCount; i++) {
    let wealth = inputs.initialPortfolio;
    const yearlyWealths = [wealth];
    let failed = false;
    let peakWealth = wealth;
    let maxDrawdown = 0;

    for (let year = 1; year <= inputs.timeHorizon; year++) {
      const equityReturn = normalRandom(assetParams.equity.return, assetParams.equity.volatility);
      const bondsReturn = normalRandom(assetParams.bonds.return, assetParams.bonds.volatility);
      const cashReturn = assetParams.cash.return;

      const portfolioReturn =
        allocation.equity * equityReturn +
        allocation.bonds * bondsReturn +
        allocation.cash * cashReturn;

      wealth = wealth * (1 + portfolioReturn);

      const adjustedWithdrawal = inputs.annualWithdrawal * Math.pow(1 + inflationRate, year - 1);
      wealth -= adjustedWithdrawal;

      if (wealth > peakWealth) peakWealth = wealth;
      const drawdown = (peakWealth - wealth) / peakWealth;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      yearlyWealths.push(wealth);

      if (wealth <= 0) {
        failed = true;
        break;
      }
    }

    if (!failed && wealth > 0) {
      successCount++;
    }

    finalWealths.push(wealth > 0 ? wealth : 0);
    simResults.push({ yearlyWealths, maxDrawdown });

    if (i % chunkSize === 0 || i === inputs.simulationCount - 1) {
      const currentProgress = Math.round(((i + 1) / inputs.simulationCount) * 100);
      if (onProgress) {
        await onProgress(currentProgress);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  finalWealths.sort((a, b) => a - b);

  const successRate = inputs.simulationCount > 0
    ? (successCount / inputs.simulationCount) * 100
    : 0;
  const averageFinalWealth = finalWealths.length > 0
    ? finalWealths.reduce((sum, w) => sum + w, 0) / finalWealths.length
    : 0;
  const medianFinalWealth = finalWealths.length > 0
    ? finalWealths[Math.floor(finalWealths.length / 2)]
    : 0;

  const percentiles = {
    p10: percentileFromArray(finalWealths, 10),
    p25: percentileFromArray(finalWealths, 25),
    p50: percentileFromArray(finalWealths, 50),
    p75: percentileFromArray(finalWealths, 75),
    p90: percentileFromArray(finalWealths, 90)
  };

  const yearlyData: YearlyProjection[] = [];
  for (let year = 0; year <= inputs.timeHorizon; year++) {
    const yearWealths = simResults
      .map((r) => r.yearlyWealths[year] || 0)
      .filter((w) => w > 0)
      .sort((a, b) => a - b);

    if (yearWealths.length > 0) {
      yearlyData.push({
        year,
        p10: yearWealths[Math.floor(yearWealths.length * 0.1)],
        p25: yearWealths[Math.floor(yearWealths.length * 0.25)],
        p50: yearWealths[Math.floor(yearWealths.length * 0.5)],
        p75: yearWealths[Math.floor(yearWealths.length * 0.75)],
        p90: yearWealths[Math.floor(yearWealths.length * 0.9)],
        expectedWithdrawal: inputs.annualWithdrawal * Math.pow(1 + inflationRate, year)
      });
    }
  }

  const maxDrawdown = simResults.length > 0
    ? Math.max(...simResults.map((r) => r.maxDrawdown))
    : 0;

  return {
    successRate,
    averageFinalWealth,
    medianFinalWealth,
    percentiles,
    failureRisk: 100 - successRate,
    maxDrawdown: maxDrawdown * 100,
    yearlyData,
    executionTime: (Date.now() - startTime) / 1000
  };
};
