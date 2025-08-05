// ================================================================
// Complete TypeScript definitions for stress testing system
// Path: src/types/stress-testing.ts
// Purpose: Comprehensive type safety - EXACTLY matching StressTestModal.tsx
// ================================================================

// ================================================================
// CORE INTERFACES - MUST MATCH StressTestModal.tsx EXACTLY
// ================================================================

export interface StressTestParams {
  selectedScenarios: string[];
  severity: 'mild' | 'moderate' | 'severe';
  duration: number;
  customParameters?: Record<string, number>;
}

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  survivalProbability: number;
  shortfallRisk: number;
  resilienceScore: number;
  worstCaseOutcome: number;
  recoveryTimeYears?: number;
  impactAnalysis: {
    portfolioDeclinePercent: number;
    incomeReductionPercent: number;
    expenseIncreasePercent: number;
  };
}

// ================================================================
// STRESS TEST RESULTS - Snake case version for engine
// ================================================================

export interface StressTestResults {
  scenario_id: string;
  survival_probability: number;
  shortfall_risk: number;
  worst_case_outcome: number;
  resilience_score: number;
  recovery_time_years?: number;
  impact_analysis: {
    portfolio_decline_percent: number;
    income_reduction_percent: number;
    expense_increase_percent: number;
  };
  mitigation_priority?: 'immediate' | 'short_term' | 'long_term';
}

// ================================================================
// PERSONAL CRISIS PARAMETERS
// ================================================================

export interface PersonalCrisisParameters {
  income_reduction_percent: number;
  income_disruption_months: number;
  severance_months?: number;
  unemployment_benefit_percent?: number;
  healthcare_cost_increase?: number;
  emergency_expense?: number;
  divorce_settlement_percent?: number;
  legal_costs?: number;
  care_costs_annual?: number;
  pension_reduction?: number;
  healthcare_bridge_cost?: number;
  years_early?: number;
  reduced_contribution_years?: number;
  sequence_risk_multiplier?: number;
  income_adjustment?: number;
  housing_cost_increase?: number;
  tax_efficiency_loss?: number;
  insurance_gap?: number;
}

// ================================================================
// EXTENDED INTERFACES - For advanced features without breaking core
// ================================================================

export interface StressTestParamsExtended extends StressTestParams {
  iterations?: number;
  includeCompliance?: boolean;
}

export interface StressTestResultExtended extends StressTestResult {
  confidenceIntervals?: ConfidenceIntervals;
  executedAt?: Date;
}

// Extended impact analysis for advanced charts (separate from core)
export interface ExtendedImpactAnalysis {
  portfolioDeclinePercent: number;
  incomeReductionPercent: number;
  expenseIncreasePercent: number;
  beforeValues?: {
    portfolioValue: number;
    annualIncome: number;
    annualExpenses: number;
  };
  afterValues?: {
    portfolioValue: number;
    annualIncome: number;
    annualExpenses: number;
  };
  recoveryMetrics?: {
    timeToRecover: number;
    probabilityOfRecovery: number;
  };
}

export interface ConfidenceIntervals {
  percentile10: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
}

// ================================================================
// UPDATED STRESS SCENARIO - Now includes personal crisis types
// ================================================================

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  type: 'market_crash' | 'inflation_shock' | 'longevity' | 'interest_rate' | 'interest_rate_shock' | 
        'recession' | 'pandemic' | 'geopolitical' | 'currency_crisis' | 'political' | 
        'currency' | 'commodity' | 'sector' | 'economic' | 'personal_crisis';
  severity: 'mild' | 'moderate' | 'severe';
  durationYears: number;
  parameters: StressParameters;
  historicalBasis?: string;
  likelihood?: 'low' | 'medium' | 'high';
  category: string; // Added for categorization
  duration_years?: number; // Added for backward compatibility
}

export interface StressParameters {
  equityDecline?: number;
  bondDecline?: number;
  propertyDecline?: number;
  inflationSpike?: number;
  interestRateChange?: number;
  currencyDepreciation?: number;
  volatilityIncrease?: number;
  correlationIncrease?: number;
  liquidityReduction?: number;
  additionalYears?: number;
  healthcareCostIncrease?: number;
  careCostAnnual?: number;
  realReturnErosion?: number;
  [key: string]: number | undefined;
}

export interface ComplianceCheck {
  id: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'warning';
  evidence: string[];
  guidanceReference: string;
  lastChecked: Date;
  criticality: 'critical' | 'important' | 'advisory';
}

export interface ComplianceReport {
  scenarioId: string;
  overallStatus: 'fully_compliant' | 'partially_compliant' | 'non_compliant';
  complianceScore: number;
  checks: ComplianceCheck[];
  recommendations: string[];
  generatedAt: Date;
  fcaGuidanceVersion?: string;
  nextReviewDate?: Date;
}

export interface MonteCarloSimulation {
  simulationId: number;
  finalPortfolioValue: number;
  shortfallYears: number[];
  success: boolean;
  maxDrawdown: number;
  timeToDepletion?: number;
}

export interface MonteCarloResults {
  simulations: MonteCarloSimulation[];
  confidenceIntervals: ConfidenceIntervals;
  successProbability: number;
  averageOutcome: number;
  standardDeviation: number;
  maxDrawdown: number;
  timeToDepletionAverage?: number;
}

export interface StressTestMatrix {
  scenarios: StressTestResult[];
  summary: {
    averageResilienceScore: number;
    worstCaseScenario: string;
    bestCaseScenario: string;
    overallRiskRating: 'low' | 'medium' | 'high' | 'critical';
  };
  recommendations: string[];
}

export interface ResilienceMetrics {
  score: number; // 0-100
  breakdown: {
    diversification: number;
    liquidity: number;
    timeHorizon: number;
    riskCapacity: number;
  };
  factors: {
    positive: string[];
    negative: string[];
  };
}

// Chart data interfaces for visualization components
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  category?: string;
}

export interface ImpactChartData {
  category: string;
  before: number;
  after: number;
  impact: number;
  impactPercent: number;
}

export interface GaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  colors?: {
    low: string;
    medium: string;
    high: string;
  };
}

// Service interfaces
export interface StressTestExecutionOptions {
  includeMonteCarloSimulation: boolean;
  simulationIterations: number;
  generateComplianceReport: boolean;
  saveResults: boolean;
  clientId?: string;
}

export interface StressTestSaveData {
  clientId: string;
  scenarioId: string;
  parameters: StressTestParams;
  results: StressTestResult[];
  complianceReport?: ComplianceReport;
  executedAt: Date;
  executedBy: string;
}

// Error handling
export interface StressTestError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// ================================================================
// LEGACY COMPATIBILITY - Export aliases for backward compatibility
// ================================================================

// Alias for backward compatibility - maps to the exact inline type from StressTestResult
export type ImpactAnalysis = StressTestResult['impactAnalysis'];

// Export utility types
export type StressTestStatus = 'idle' | 'running' | 'completed' | 'error';
export type ScenarioSeverity = StressScenario['severity'];
export type ComplianceStatus = ComplianceCheck['status'];

// Type guards
export const isStressTestResult = (obj: any): obj is StressTestResult => {
  return obj && 
    typeof obj.scenarioId === 'string' &&
    typeof obj.survivalProbability === 'number' &&
    typeof obj.resilienceScore === 'number' &&
    obj.impactAnalysis !== undefined &&
    typeof obj.impactAnalysis.portfolioDeclinePercent === 'number';
};

export const isComplianceReport = (obj: any): obj is ComplianceReport => {
  return obj &&
    typeof obj.scenarioId === 'string' &&
    Array.isArray(obj.checks) &&
    typeof obj.complianceScore === 'number';
};