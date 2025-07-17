// public/workers/monte-carlo-worker.js
// Web Worker for background Monte Carlo simulations
// UPDATED: Added test handler

/**
 * Monte Carlo Web Worker
 * Runs simulations in background thread to prevent UI freezing
 */

// Simple Pseudo-Random Number Generator
class SimpleRNG {
  constructor(seed) {
    this.seed = seed ?? Date.now() % Math.pow(2, 32);
    this.a = 1664525;
    this.c = 1013904223;
    this.m = Math.pow(2, 32);
  }

  random() {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  normalRandom(mean = 0, stdDev = 1) {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  setSeed(seed) {
    this.seed = seed % this.m;
  }
}

// Asset class definitions
const ASSET_CLASSES = {
  equity: {
    expectedReturn: 0.08,
    volatility: 0.16,
    maxAllocation: 0.9
  },
  bonds: {
    expectedReturn: 0.04,
    volatility: 0.05,
    maxAllocation: 0.8
  },
  cash: {
    expectedReturn: 0.02,
    volatility: 0.01,
    maxAllocation: 0.3
  }
};

// Correlation matrix (simplified)
const CORRELATION_MATRIX = {
  equity_bonds: -0.1,
  equity_cash: 0.05,
  bonds_cash: 0.1
};

/**
 * Run Monte Carlo simulation in worker
 */
function runMonteCarloSimulation(input) {
  const {
    initialWealth,
    timeHorizon,
    withdrawalAmount,
    riskScore,
    inflationRate = 0.025,
    simulationCount = 1000,
    seed
  } = input;

  // Initialize RNG with seed for reproducible results
  const rng = new SimpleRNG(seed);
  
  // Get risk-based allocation
  const allocation = getRiskBasedAllocation(riskScore);
  
  const simulations = [];
  const chunkSize = 100; // Process in chunks for progress updates
  
  for (let i = 0; i < simulationCount; i += chunkSize) {
    const chunk = Math.min(chunkSize, simulationCount - i);
    
    // Run chunk of simulations
    for (let j = 0; j < chunk; j++) {
      const simulation = runSingleSimulation(
        rng,
        initialWealth,
        timeHorizon,
        withdrawalAmount,
        inflationRate,
        allocation
      );
      simulations.push(simulation);
    }
    
    // Send progress update
    const progress = Math.min(100, ((i + chunk) / simulationCount) * 100);
    self.postMessage({
      type: 'progress',
      progress: {
        progress: Math.round(progress * 10) / 10, // Round to 1 decimal
        completed: i + chunk,
        total: simulationCount
      }
    });
  }
  
  // Calculate final statistics
  const results = calculateStatistics(simulations);
  
  return {
    type: 'complete',
    results: {
      ...results,
      simulationCount,
      inputParameters: input
    }
  };
}

/**
 * Run single simulation path
 */
function runSingleSimulation(rng, initialWealth, timeHorizon, withdrawalAmount, inflationRate, allocation) {
  let wealth = initialWealth;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  const yearlyWealth = [wealth];
  const yearlyReturns = [];
  
  let adjustedWithdrawal = withdrawalAmount;
  
  for (let year = 1; year <= timeHorizon; year++) {
    // Generate correlated returns
    const returns = generateCorrelatedReturns(rng, allocation);
    
    // Calculate portfolio return
    const portfolioReturn = calculatePortfolioReturn(allocation, returns);
    yearlyReturns.push(portfolioReturn);
    
    // Apply return to wealth
    wealth *= (1 + portfolioReturn);
    
    // Apply inflation-adjusted withdrawal
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
function generateCorrelatedReturns(rng, allocation) {
  const returns = {};
  
  // Generate independent returns
  returns.equity = rng.normalRandom(
    ASSET_CLASSES.equity.expectedReturn,
    ASSET_CLASSES.equity.volatility
  );
  
  returns.bonds = rng.normalRandom(
    ASSET_CLASSES.bonds.expectedReturn,
    ASSET_CLASSES.bonds.volatility
  ) + (CORRELATION_MATRIX.equity_bonds * returns.equity * 0.1);
  
  returns.cash = rng.normalRandom(
    ASSET_CLASSES.cash.expectedReturn,
    ASSET_CLASSES.cash.volatility
  ) + (CORRELATION_MATRIX.equity_cash * returns.equity * 0.05);
  
  return returns;
}

/**
 * Calculate weighted portfolio return
 */
function calculatePortfolioReturn(allocation, returns) {
  return (
    allocation.equity * returns.equity +
    allocation.bonds * returns.bonds +
    allocation.cash * returns.cash
  );
}

/**
 * Get risk-based asset allocation
 */
function getRiskBasedAllocation(riskScore) {
  const clampedScore = Math.max(1, Math.min(10, riskScore));
  
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
function calculateStatistics(simulations) {
  const finalWealths = simulations.map(s => s.finalWealth).sort((a, b) => a - b);
  const successCount = simulations.filter(s => s.success).length;
  
  // Basic statistics
  const successProbability = successCount / simulations.length;
  const averageFinalWealth = finalWealths.reduce((a, b) => a + b, 0) / finalWealths.length;
  
  // Confidence intervals
  const confidenceIntervals = {
    p10: calculatePercentile(finalWealths, 10),
    p25: calculatePercentile(finalWealths, 25),
    p50: calculatePercentile(finalWealths, 50),
    p75: calculatePercentile(finalWealths, 75),
    p90: calculatePercentile(finalWealths, 90)
  };
  
  // Risk metrics
  const shortfallSims = simulations.filter(s => !s.success);
  const shortfallRisk = shortfallSims.length / simulations.length;
  const averageShortfall = shortfallSims.length > 0 
    ? shortfallSims.reduce((sum, s) => sum + s.shortfall, 0) / shortfallSims.length 
    : 0;
  
  const maxDrawdown = Math.max(...simulations.map(s => s.maxDrawdown));
  
  // Volatility calculation
  const variance = finalWealths.reduce((sum, wealth) => 
    sum + Math.pow(wealth - averageFinalWealth, 2), 0) / finalWealths.length;
  const volatility = Math.sqrt(variance) / averageFinalWealth;
  
  return {
    successProbability: Math.round(successProbability * 10000) / 100,
    averageFinalWealth: Math.round(averageFinalWealth),
    medianFinalWealth: Math.round(confidenceIntervals.p50),
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
    simulations
  };
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray, percentile) {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  if (lower === upper) return sortedArray[lower];
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

// ===== WORKER MESSAGE HANDLING =====

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'test':
        // Handle test message to confirm worker is ready
        self.postMessage({ type: 'test', status: 'ready' });
        break;
        
      case 'simulate':
        // Add execution timing
        const startTime = performance.now();
        const result = runMonteCarloSimulation(data);
        const executionTime = performance.now() - startTime;
        
        result.results.executionTime = executionTime;
        
        self.postMessage(result);
        break;
        
      case 'cancel':
        // For now, we'll handle cancellation by terminating the worker
        // In a more advanced implementation, we'd check cancellation flags
        self.postMessage({ type: 'cancelled' });
        break;
        
      default:
        self.postMessage({ 
          type: 'error', 
          error: `Unknown message type: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message,
      stack: error.stack 
    });
  }
};