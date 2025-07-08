// src/lib/monte-carlo/engine.ts
// Fixed Monte Carlo Engine - Removed Math.seedrandom dependency

import { 
  MONTE_CARLO_CONFIG,
  MATH_CONSTANTS,
  MARKET_REGIMES,
  ASSET_CLASSES,
  CORRELATION_MATRIX 
} from './config';

/**
 * Types and Interfaces
 */
interface SimulationInput {
  initialWealth: number;
  timeHorizon: number;
  withdrawalAmount: number;
  riskScore: number;
  inflationRate?: number;
  simulationCount?: number;
  assetAllocation?: AssetAllocation;
}

interface AssetAllocation {
  equity: number;
  bonds: number;
  cash: number;
  alternatives?: number;
}

interface SimulationResult {
  finalWealth: number;
  success: boolean;
  shortfall: number;
  maxDrawdown: number;
  yearlyWealth: number[];
  yearlyReturns: number[];
}

interface MonteCarloResults {
  successProbability: number;
  averageFinalWealth: number;
  medianFinalWealth: number;
  confidenceIntervals: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfallRisk: number;
  averageShortfall: number;
  maxDrawdown: number;
  volatility: number;
  simulations: SimulationResult[];
  executionTime: number;
}

/**
 * Simple Pseudo-Random Number Generator
 * Uses Linear Congruential Generator (LCG) algorithm
 */
class SimpleRNG {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = Math.pow(2, 32);

  constructor(seed?: number) {
    this.seed = seed ?? Date.now() % this.m;
  }

  /**
   * Generate next random number between 0 and 1
   */
  random(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  /**
   * Generate random number from normal distribution
   * Uses Box-Muller transformation
   */
  normalRandom(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Set new seed
   */
  setSeed(seed: number): void {
    this.seed = seed % this.m;
  }
}

/**
 * Advanced Monte Carlo Engine
 */
export class MonteCarloEngine {
  private rng: SimpleRNG;
  private simulationCount: number;
  private progressCallback?: (progress: number) => void;

  constructor(seed?: number) {
    this.rng = new SimpleRNG(seed);
    this.simulationCount = MONTE_CARLO_CONFIG.simulation.defaultRuns;
  }

  /**
   * Run complete Monte Carlo simulation
   */
  async runSimulation(input: SimulationInput): Promise<MonteCarloResults> {
    const startTime = performance.now();
    
    // Validate input
    this.validateInput(input);
    
    // Set simulation parameters
    const simCount = input.simulationCount ?? this.simulationCount;
    const allocation = input.assetAllocation ?? this.getRiskBasedAllocation(input.riskScore);
    
    // Run simulations
    const simulations: SimulationResult[] = [];
    const chunkSize = MONTE_CARLO_CONFIG.performance.chunkSize;
    
    for (let i = 0; i < simCount; i += chunkSize) {
      const chunk = Math.min(chunkSize, simCount - i);
      const chunkResults = await this.runSimulationChunk(input, allocation, chunk);
      simulations.push(...chunkResults);
      
      // Report progress
      if (this.progressCallback) {
        this.progressCallback((i + chunk) / simCount);
      }
      
      // Yield to event loop
      await this.sleep(0);
    }
    
    // Calculate statistics
    const results = this.calculateStatistics(simulations);
    results.executionTime = performance.now() - startTime;
    
    return results;
  }

  /**
   * Run a chunk of simulations
   */
  private async runSimulationChunk(
    input: SimulationInput,
    allocation: AssetAllocation,
    count: number
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const result = this.runSingleSimulation(input, allocation);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Run single simulation path
   */
  private runSingleSimulation(
    input: SimulationInput,
    allocation: AssetAllocation
  ): SimulationResult {
    const { initialWealth, timeHorizon, withdrawalAmount, inflationRate = 0.025 } = input;
    
    let wealth = initialWealth;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    const yearlyWealth: number[] = [wealth];
    const yearlyReturns: number[] = [];
    
    // Calculate inflation-adjusted withdrawal
    let adjustedWithdrawal = withdrawalAmount;
    
    for (let year = 1; year <= timeHorizon; year++) {
      // Generate correlated returns for each asset class
      const returns = this.generateCorrelatedReturns(allocation);
      
      // Calculate portfolio return
      const portfolioReturn = this.calculatePortfolioReturn(allocation, returns);
      yearlyReturns.push(portfolioReturn);
      
      // Apply return to wealth
      wealth *= (1 + portfolioReturn);
      
      // Apply withdrawal (at beginning of year, inflation-adjusted)
      if (year > 1) {
        adjustedWithdrawal *= (1 + inflationRate);
      }
      wealth -= adjustedWithdrawal;
      
      // Track drawdown
      const peak = Math.max(...yearlyWealth);
      if (wealth < peak) {
        currentDrawdown = (peak - wealth) / peak;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      } else {
        currentDrawdown = 0;
      }
      
      yearlyWealth.push(wealth);
      
      // Early exit if wealth depleted
      if (wealth <= 0) {
        // Fill remaining years with zero
        for (let remainingYear = year + 1; remainingYear <= timeHorizon; remainingYear++) {
          yearlyWealth.push(0);
          yearlyReturns.push(0);
        }
        break;
      }
    }
    
    const finalWealth = Math.max(0, wealth);
    const success = finalWealth > 0;
    const shortfall = success ? 0 : Math.abs(finalWealth);
    
    return {
      finalWealth,
      success,
      shortfall,
      maxDrawdown,
      yearlyWealth,
      yearlyReturns
    };
  }

  /**
   * Generate correlated returns for asset classes
   */
  private generateCorrelatedReturns(allocation: AssetAllocation): Record<string, number> {
    const assetClasses = Object.keys(ASSET_CLASSES);
    const returns: Record<string, number> = {};
    
    // Generate independent normal random variables
    const independentReturns: Record<string, number> = {};
    for (const asset of assetClasses) {
      const assetData = ASSET_CLASSES[asset as keyof typeof ASSET_CLASSES];
      independentReturns[asset] = this.rng.normalRandom(
        assetData.expectedReturn,
        assetData.volatility
      );
    }
    
    // Apply correlation adjustments (simplified approach)
    // In a full implementation, you'd use Cholesky decomposition
    returns.equity = independentReturns.equity;
    returns.bonds = independentReturns.bonds + 
      (CORRELATION_MATRIX.equity_bonds * independentReturns.equity * 0.1);
    returns.cash = independentReturns.cash + 
      (CORRELATION_MATRIX.equity_cash * independentReturns.equity * 0.05);
    
    if (allocation.alternatives) {
      returns.alternatives = independentReturns.alternatives + 
        (CORRELATION_MATRIX.equity_alternatives * independentReturns.equity * 0.2);
    }
    
    return returns;
  }

  /**
   * Calculate weighted portfolio return
   */
  private calculatePortfolioReturn(
    allocation: AssetAllocation,
    returns: Record<string, number>
  ): number {
    let portfolioReturn = 0;
    
    portfolioReturn += allocation.equity * returns.equity;
    portfolioReturn += allocation.bonds * returns.bonds;
    portfolioReturn += allocation.cash * returns.cash;
    
    if (allocation.alternatives && returns.alternatives) {
      portfolioReturn += allocation.alternatives * returns.alternatives;
    }
    
    return portfolioReturn;
  }

  /**
   * Get risk-based asset allocation
   */
  private getRiskBasedAllocation(riskScore: number): AssetAllocation {
    // Clamp risk score between 1-10
    const clampedScore = Math.max(1, Math.min(10, riskScore));
    
    // Linear interpolation between conservative and aggressive
    const equityWeight = 0.1 + (clampedScore - 1) * 0.08; // 10% to 82%
    const bondWeight = 0.8 - (clampedScore - 1) * 0.07;   // 80% to 17%
    const cashWeight = 0.1 - (clampedScore - 1) * 0.01;   // 10% to 1%
    
    return {
      equity: Math.round(equityWeight * 100) / 100,
      bonds: Math.round(bondWeight * 100) / 100,
      cash: Math.round(cashWeight * 100) / 100
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(simulations: SimulationResult[]): MonteCarloResults {
    const finalWealths = simulations.map(s => s.finalWealth).sort((a, b) => a - b);
    const successCount = simulations.filter(s => s.success).length;
    
    // Basic statistics
    const successProbability = successCount / simulations.length;
    const averageFinalWealth = finalWealths.reduce((a, b) => a + b, 0) / finalWealths.length;
    const medianFinalWealth = this.calculatePercentile(finalWealths, 50);
    
    // Confidence intervals
    const confidenceIntervals = {
      p10: this.calculatePercentile(finalWealths, 10),
      p25: this.calculatePercentile(finalWealths, 25),
      p50: this.calculatePercentile(finalWealths, 50),
      p75: this.calculatePercentile(finalWealths, 75),
      p90: this.calculatePercentile(finalWealths, 90)
    };
    
    // Risk metrics
    const shortfallSims = simulations.filter(s => !s.success);
    const shortfallRisk = shortfallSims.length / simulations.length;
    const averageShortfall = shortfallSims.length > 0 
      ? shortfallSims.reduce((sum, s) => sum + s.shortfall, 0) / shortfallSims.length 
      : 0;
    
    const maxDrawdown = Math.max(...simulations.map(s => s.maxDrawdown));
    
    // Volatility calculation
    const meanWealth = averageFinalWealth;
    const variance = finalWealths.reduce((sum, wealth) => 
      sum + Math.pow(wealth - meanWealth, 2), 0) / finalWealths.length;
    const volatility = Math.sqrt(variance) / meanWealth;
    
    return {
      successProbability: Math.round(successProbability * 10000) / 100,
      averageFinalWealth: Math.round(averageFinalWealth),
      medianFinalWealth: Math.round(medianFinalWealth),
      confidenceIntervals: {
        p10: Math.round(confidenceIntervals.p10),
        p25: Math.round(confidenceIntervals.p25),
        p50: Math.round(confidenceIntervals.p50),
        p75: Math.round(confidenceIntervals.p75),
        p90: Math.round(confidenceIntervals.p90)
      },
      shortfallRisk: Math.round(shortfallRisk * 10000) / 100,
      averageShortfall: Math.round(averageShortfall),
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      volatility: Math.round(volatility * 10000) / 100,
      simulations,
      executionTime: 0 // Will be set by caller
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower === upper) return sortedArray[lower];
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Validate simulation input
   */
  private validateInput(input: SimulationInput): void {
    if (input.initialWealth <= 0) {
      throw new Error('Initial wealth must be positive');
    }
    
    if (input.timeHorizon <= 0 || input.timeHorizon > 100) {
      throw new Error('Time horizon must be between 1 and 100 years');
    }
    
    if (input.withdrawalAmount < 0) {
      throw new Error('Withdrawal amount cannot be negative');
    }
    
    if (input.riskScore < 1 || input.riskScore > 10) {
      throw new Error('Risk score must be between 1 and 10');
    }
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (progress: number) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Set random seed for reproducible results
   */
  setSeed(seed: number): void {
    this.rng.setSeed(seed);
  }

  /**
   * Sleep function for yielding to event loop
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating engine instance
 */
export function createMonteCarloEngine(seed?: number): MonteCarloEngine {
  return new MonteCarloEngine(seed);
}

/**
 * Helper function for quick simulation runs
 */
export async function runQuickSimulation(
  initialWealth: number,
  timeHorizon: number,
  withdrawalAmount: number,
  riskScore: number,
  simulationCount: number = 1000
): Promise<MonteCarloResults> {
  const engine = createMonteCarloEngine();
  
  return engine.runSimulation({
    initialWealth,
    timeHorizon,
    withdrawalAmount,
    riskScore,
    simulationCount
  });
}

export type { SimulationInput, SimulationResult, MonteCarloResults, AssetAllocation };