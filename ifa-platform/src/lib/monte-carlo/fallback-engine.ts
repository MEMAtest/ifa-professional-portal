// src/lib/monte-carlo/fallback-engine.ts
// Fallback Monte Carlo engine that runs on main thread

export interface FallbackMonteCarloInput {
  initialWealth: number;
  timeHorizon: number;
  withdrawalAmount: number;
  riskScore: number;
  inflationRate?: number;
  simulationCount?: number;
  onProgress?: (progress: number) => void;
}

export class FallbackMonteCarloEngine {
  private seed: number = Date.now();
  private a = 1664525;
  private c = 1013904223;
  private m = Math.pow(2, 32);

  // Simple random number generator
  private random(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  private normalRandom(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  private getRiskBasedAllocation(riskScore: number) {
    const clampedScore = Math.max(1, Math.min(10, riskScore));
    
    const equityWeight = 0.1 + (clampedScore - 1) * 0.08;
    const bondWeight = 0.8 - (clampedScore - 1) * 0.07;
    const cashWeight = 0.1 - (clampedScore - 1) * 0.01;
    
    const total = equityWeight + bondWeight + cashWeight;
    
    return {
      equity: equityWeight / total,
      bonds: bondWeight / total,
      cash: cashWeight / total
    };
  }

  async runSimulation(input: FallbackMonteCarloInput) {
    
    const {
      initialWealth,
      timeHorizon,
      withdrawalAmount,
      riskScore,
      inflationRate = 0.025,
      simulationCount = 1000,
      onProgress
    } = input;

    const allocation = this.getRiskBasedAllocation(riskScore);
    const simulations: { finalWealth: number; success: boolean; maxDrawdown: number }[] = [];
    const startTime = performance.now();

    // Asset parameters
    const assetParams = {
      equity: { return: 0.08, volatility: 0.16 },
      bonds: { return: 0.04, volatility: 0.05 },
      cash: { return: 0.02, volatility: 0.01 }
    };

    for (let sim = 0; sim < simulationCount; sim++) {
      let wealth = initialWealth;
      let adjustedWithdrawal = withdrawalAmount;
      let maxDrawdown = 0;
      let peakWealth = initialWealth;

      for (let year = 1; year <= timeHorizon; year++) {
        // Generate returns
        const equityReturn = this.normalRandom(assetParams.equity.return, assetParams.equity.volatility);
        const bondsReturn = this.normalRandom(assetParams.bonds.return, assetParams.bonds.volatility);
        const cashReturn = this.normalRandom(assetParams.cash.return, assetParams.cash.volatility);

        // Calculate portfolio return
        const portfolioReturn = 
          allocation.equity * equityReturn +
          allocation.bonds * bondsReturn +
          allocation.cash * cashReturn;

        // Apply return
        wealth *= (1 + portfolioReturn);

        // Apply withdrawal
        adjustedWithdrawal *= (1 + inflationRate);
        wealth -= adjustedWithdrawal;

        // Track drawdown
        if (wealth > peakWealth) {
          peakWealth = wealth;
        }
        const drawdown = peakWealth > 0 ? (peakWealth - wealth) / peakWealth : 0;
        maxDrawdown = Math.max(maxDrawdown, drawdown);

        // Early exit if depleted
        if (wealth <= 0) {
          wealth = 0;
          break;
        }
      }

      simulations.push({
        finalWealth: Math.max(0, wealth),
        success: wealth > 0,
        maxDrawdown
      });

      // Report progress every 10 simulations
      if (sim % 10 === 0 && onProgress) {
        const progress = (sim / simulationCount) * 100;
        onProgress(progress);
        
        // Yield to UI thread
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Calculate statistics
    const finalWealths = simulations.map(s => s.finalWealth).sort((a, b) => a - b);
    const successCount = simulations.filter(s => s.success).length;
    const successProbability = (successCount / simulationCount) * 100;

    const calculatePercentile = (arr: number[], pct: number) => {
      const index = (pct / 100) * (arr.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      
      if (upper >= arr.length) return arr[arr.length - 1];
      if (lower === upper) return arr[lower];
      
      return arr[lower] * (1 - weight) + arr[upper] * weight;
    };

    const executionTime = performance.now() - startTime;

    return {
      successProbability: Math.round(successProbability * 100) / 100,
      averageFinalWealth: Math.round(finalWealths.reduce((a, b) => a + b, 0) / finalWealths.length),
      medianFinalWealth: Math.round(calculatePercentile(finalWealths, 50)),
      confidenceIntervals: {
        p10: Math.round(calculatePercentile(finalWealths, 10)),
        p25: Math.round(calculatePercentile(finalWealths, 25)),
        p50: Math.round(calculatePercentile(finalWealths, 50)),
        p75: Math.round(calculatePercentile(finalWealths, 75)),
        p90: Math.round(calculatePercentile(finalWealths, 90))
      },
      shortfallRisk: Math.round((100 - successProbability) * 100) / 100,
      averageShortfall: 0, // Simplified
      maxDrawdown: Math.round(Math.max(...simulations.map(s => s.maxDrawdown)) * 10000) / 100,
      volatility: 0, // Simplified
      executionTime,
      simulationCount
    };
  }
}

// Usage in component:
/*
import { FallbackMonteCarloEngine } from '@/lib/monte-carlo/fallback-engine';

// In your component
const runFallbackSimulation = async () => {
  const engine = new FallbackMonteCarloEngine();
  
  const results = await engine.runSimulation({
    initialWealth: inputs.initialWealth,
    timeHorizon: inputs.timeHorizon,
    withdrawalAmount: inputs.withdrawalAmount,
    riskScore: inputs.riskScore,
    inflationRate: inputs.inflationRate,
    simulationCount: inputs.simulationCount,
    onProgress: (progress) => {
      setProgress({
        progress,
        completed: Math.floor(progress * inputs.simulationCount / 100),
        total: inputs.simulationCount,
        timeElapsed: (Date.now() - startTime) / 1000,
        estimatedTimeRemaining: 0
      });
    }
  });
  
  handleSimulationComplete(results);
};
*/