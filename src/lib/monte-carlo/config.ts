// src/lib/monte-carlo/config.ts
// Fixed Monte Carlo Configuration - Removed Duplicate Exports

/**
 * Monte Carlo Configuration Constants
 * Centralized configuration for Monte Carlo simulation system
 */

// ===== SIMULATION DEFAULTS =====
const MONTE_CARLO_CONFIG = {
  simulation: {
    defaultRuns: 1000,
    minRuns: 100,
    maxRuns: 50000,
    timeHorizonYears: 30,
    inflationRate: 0.025,
    withdrawalRate: 0.04,
    rebalanceFrequency: 'annual' as const
  },
  
  performance: {
    maxConcurrentSimulations: 4,
    chunkSize: 250,
    timeoutMs: 30000,
    progressUpdateInterval: 100
  },
  
  storage: {
    resultsRetentionDays: 90,
    maxStoredScenarios: 1000,
    compressionEnabled: true
  }
} as const;

// ===== MATHEMATICAL CONSTANTS =====
const MATH_CONSTANTS = {
  precision: {
    decimalPlaces: 4,
    percentagePlaces: 2,
    currencyPlaces: 2
  },
  
  random: {
    seed: null as number | null,
    algorithm: 'mersenne-twister' as const,
    warmupIterations: 100
  },
  
  statistics: {
    confidenceInterval: 0.95,
    outlierThreshold: 3.0,
    correlationThreshold: 0.1
  },
  
  bounds: {
    minReturnRate: -0.5,
    maxReturnRate: 2.0,
    minVolatility: 0.001,
    maxVolatility: 1.0
  }
} as const;

// ===== MARKET REGIME MODELING =====
const MARKET_REGIMES = {
  bull: {
    probability: 0.6,
    equityBoost: 0.02,
    bondBoost: 0.005,
    volatilityMultiplier: 0.8,
    duration: { min: 2, max: 8 }
  },
  
  bear: {
    probability: 0.2,
    equityPenalty: -0.05,
    bondPenalty: -0.01,
    volatilityMultiplier: 1.5,
    duration: { min: 1, max: 3 }
  },
  
  neutral: {
    probability: 0.2,
    equityAdjustment: 0,
    bondAdjustment: 0,
    volatilityMultiplier: 1.0,
    duration: { min: 3, max: 6 }
  },
  
  recession: {
    probability: 0.1,
    equityPenalty: -0.15,
    bondBoost: 0.02,
    volatilityMultiplier: 2.0,
    duration: { min: 1, max: 2 }
  }
} as const;

// ===== FCA COMPLIANCE SETTINGS =====
const FCA_COMPLIANCE = {
  disclosures: {
    pastPerformanceWarning: true,
    volatilityDisclosure: true,
    inflationImpact: true,
    taxConsiderations: true
  },
  
  calculations: {
    realTerms: true,
    inflationAdjusted: true,
    feeImpact: true,
    sequenceRisk: true
  },
  
  reporting: {
    confidenceIntervals: [10, 25, 50, 75, 90],
    shortfallProbability: true,
    worstCaseScenarios: true,
    stressTestResults: true
  },
  
  validation: {
    assumptionReasonableness: true,
    scenarioPlausibility: true,
    resultsSanityCheck: true
  }
} as const;

// ===== UI CONFIGURATION =====
const UI_CONFIG = {
  theme: {
    primaryColor: '#2563eb',
    successColor: '#059669',
    warningColor: '#d97706',
    errorColor: '#dc2626',
    neutralColor: '#6b7280'
  },
  
  animation: {
    progressDuration: 200,
    chartTransition: 300,
    loadingSpinner: 1000
  },
  
  display: {
    maxChartDataPoints: 1000,
    defaultChartHeight: 400,
    resultsPerPage: 50,
    autoRefreshInterval: 30000
  },
  
  formatting: {
    currency: 'GBP',
    locale: 'en-GB',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  }
} as const;

// ===== ERROR MESSAGES =====
const ERROR_MESSAGES = {
  simulation: {
    invalidInput: 'Invalid simulation parameters provided',
    timeoutError: 'Simulation timed out - please reduce complexity',
    memoryError: 'Insufficient memory for simulation size',
    convergenceError: 'Simulation failed to converge'
  },
  
  database: {
    connectionError: 'Failed to connect to database',
    saveError: 'Failed to save simulation results',
    retrieveError: 'Failed to retrieve simulation data',
    validationError: 'Data validation failed'
  },
  
  api: {
    rateLimitExceeded: 'API rate limit exceeded',
    authenticationFailed: 'Authentication failed',
    invalidRequest: 'Invalid API request format',
    serverError: 'Internal server error'
  }
} as const;

// ===== ASSET ALLOCATION PRESETS =====
const ASSET_ALLOCATION_PRESETS = {
  conservative: {
    name: 'Conservative',
    riskScore: 3,
    equity: 0.3,
    bonds: 0.6,
    cash: 0.1,
    expectedReturn: 0.05,
    volatility: 0.08
  },
  
  moderate: {
    name: 'Moderate',
    riskScore: 5,
    equity: 0.6,
    bonds: 0.35,
    cash: 0.05,
    expectedReturn: 0.07,
    volatility: 0.12
  },
  
  aggressive: {
    name: 'Aggressive',
    riskScore: 8,
    equity: 0.85,
    bonds: 0.1,
    cash: 0.05,
    expectedReturn: 0.09,
    volatility: 0.18
  },
  
  growth: {
    name: 'Growth',
    riskScore: 7,
    equity: 0.8,
    bonds: 0.15,
    cash: 0.05,
    expectedReturn: 0.085,
    volatility: 0.16
  }
} as const;

// ===== PERFORMANCE BENCHMARKS =====
const PERFORMANCE_BENCHMARKS = {
  execution: {
    maxSimulationTime: 10000, // ms
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxCpuUsage: 0.8, // 80%
    targetThroughput: 100 // simulations per second
  },
  
  accuracy: {
    minConvergenceRuns: 1000,
    maxStandardError: 0.01,
    confidenceLevel: 0.95,
    stabilityThreshold: 0.001
  },
  
  quality: {
    minSuccessRate: 0.95,
    maxErrorRate: 0.05,
    dataIntegrityScore: 0.99,
    resultConsistency: 0.98
  }
} as const;

// ===== ASSET CLASS DEFINITIONS =====
const ASSET_CLASSES = {
  equity: {
    name: 'Equity',
    expectedReturn: 0.08,
    volatility: 0.16,
    sharpeRatio: 0.4,
    maxAllocation: 0.9
  },
  
  bonds: {
    name: 'Bonds',
    expectedReturn: 0.04,
    volatility: 0.05,
    sharpeRatio: 0.3,
    maxAllocation: 0.8
  },
  
  cash: {
    name: 'Cash',
    expectedReturn: 0.02,
    volatility: 0.01,
    sharpeRatio: 0.1,
    maxAllocation: 0.3
  },
  
  alternatives: {
    name: 'Alternatives',
    expectedReturn: 0.06,
    volatility: 0.12,
    sharpeRatio: 0.35,
    maxAllocation: 0.2
  }
} as const;

// ===== CORRELATION MATRIX =====
const CORRELATION_MATRIX = {
  equity_bonds: -0.1,
  equity_cash: 0.05,
  equity_alternatives: 0.6,
  bonds_cash: 0.1,
  bonds_alternatives: 0.2,
  cash_alternatives: 0.05
} as const;

// ===== STRESS TEST SCENARIOS =====
const STRESS_SCENARIOS = {
  marketCrash: {
    name: '2008-style Market Crash',
    equityReturn: -0.37,
    bondReturn: 0.05,
    duration: 1,
    recoveryPeriod: 3
  },
  
  inflationSpike: {
    name: '1970s Inflation Spike',
    inflationRate: 0.12,
    equityReturn: -0.05,
    bondReturn: -0.1,
    duration: 3
  },
  
  deflation: {
    name: 'Japan-style Deflation',
    inflationRate: -0.02,
    equityReturn: 0.02,
    bondReturn: 0.03,
    duration: 10
  }
} as const;

// ===== EXPORT ALL CONFIGURATIONS =====
export {
  MONTE_CARLO_CONFIG,
  MATH_CONSTANTS,
  MARKET_REGIMES,
  FCA_COMPLIANCE,
  UI_CONFIG,
  ERROR_MESSAGES,
  ASSET_ALLOCATION_PRESETS,
  PERFORMANCE_BENCHMARKS,
  ASSET_CLASSES,
  CORRELATION_MATRIX,
  STRESS_SCENARIOS
};