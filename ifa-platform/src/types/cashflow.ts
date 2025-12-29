// ================================================================
// src/types/cashflow.ts - COMPLETE TYPE DEFINITIONS
// Add these missing types to resolve all import errors
// ================================================================

// Scenario Types
export type ScenarioType =
  | 'base'
  | 'optimistic'
  | 'pessimistic'
  | 'stress'
  | 'early_retirement'
  | 'high_inflation'
  | 'capacity_for_loss';

// Return Assumptions
export interface ReturnAssumptions {
  realEquityReturn: number;
  realBondReturn: number;
  realCashReturn: number;
}

// Cash Flow Scenario - COMPLETE INTERFACE
export interface CashFlowScenario {
  isActive: unknown;
  id: string;
  clientId: string;
  scenarioName: string;
  scenarioType: ScenarioType;
  createdBy: string;
  
  // Projection Settings
  projectionYears: number;
  inflationRate: number;
  realEquityReturn: number;
  realBondReturn: number;
  realCashReturn: number;
  
  // Client Demographics
  clientAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  dependents: number;
  
  // Financial Position
  currentSavings: number;
  pensionValue: number; // Also map to pensionPotValue for compatibility
  pensionPotValue: number;
  investmentValue: number;
  propertyValue: number;
  
  // Income
  currentIncome: number;
  pensionContributions: number;
  statePensionAge: number;
  statePensionAmount: number;
  otherIncome: number;
  
  // Expenses
  currentExpenses: number;
  essentialExpenses: number;
  lifestyleExpenses: number;
  discretionaryExpenses: number;
  
  // Debt
  mortgageBalance: number;
  mortgagePayment: number;
  otherDebts: number;
  
  // Goals
  retirementIncomeTarget: number;
  retirementIncomeDesired: number;
  emergencyFundTarget: number;
  legacyTarget: number;
  
  // Asset Allocation
  equityAllocation: number;
  bondAllocation: number;
  cashAllocation: number;
  alternativeAllocation: number;
  
  // Assumptions and Documentation
  assumptionBasis: string;
  marketDataSource: string;
  lastAssumptionsReview: string;
  
  // Vulnerability adjustments
  vulnerabilityAdjustments: any;
  
  // Optional assessment scores
  riskScore?: number;
  capacityForLossScore?: number;
  knowledgeExperienceScore?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Cash Flow Projection
export interface CashFlowProjection {
  id: string;
  scenarioId: string;
  projectionYear: number;
  clientAge: number;
  
  // Income components
  employmentIncome: number;
  pensionIncome: number;
  statePension: number;
  investmentIncome: number;
  otherIncome: number;
  totalIncome: number;
  
  // Expense components
  essentialExpenses: number;
  lifestyleExpenses: number;
  discretionaryExpenses: number;
  totalExpenses: number;
  
  // Asset values
  pensionPotValue: number;
  investmentPortfolio: number;
  cashSavings: number;
  totalAssets: number;
  
  // Key metrics
  annualSurplusDeficit: number;
  portfolioBalance: number;
  realTermsValue: number;
  
  createdAt: string;
}

// Risk Metrics
export interface RiskMetrics {
  shortfallRisk: 'Low' | 'Medium' | 'High';
  longevityRisk: 'Low' | 'Medium' | 'High';
  inflationRisk: 'Low' | 'Medium' | 'High';
  sequenceRisk: 'Low' | 'Medium' | 'High';
}

// Projection Summary
export interface ProjectionSummary {
  projectionYears: number; // FIX: Use correct property name
  finalPortfolioValue: number;
  totalContributions: number;
  totalWithdrawals: number;
  maxWithdrawalRate: number;
  averageAnnualReturn: number;
  retirementIncomeAchieved: boolean;
  emergencyFundAchieved: boolean;
  goalAchievementRate: number;
  sustainabilityRating: "Excellent" | "Good" | "Adequate" | "Poor" | "Critical";
  riskMetrics: RiskMetrics;
  keyInsights: string[];
}

// Projection Result - MISSING TYPE
export interface ProjectionResult {
  scenario: CashFlowScenario;
  projections: CashFlowProjection[];
  summary: ProjectionSummary;
}

// Client Goal - COMPLETE INTERFACE
export interface ClientGoal {
  id: string;
  clientId: string;
  goalName: string;
  goalType: 'retirement_income' | 'lump_sum' | 'legacy' | 'emergency_fund';
  
  // Goal Targets
  targetAmount: number;
  targetDate: string;
  priority: 'Essential' | 'Important' | 'Desirable';
  
  // Goal Tracking
  currentProgress: number;
  probabilityOfSuccess?: number;
  fundingStatus: string; // FIX: Add missing required property
  isActive: boolean; // FIX: Add missing required property
  
  // Integration
  linkedScenarioId: string;
  
  createdAt: string;
  updatedAt: string;
}

// Market Data Assumptions
export interface MarketAssumptions {
  realEquityReturn: number;
  realBondReturn: number;
  realCashReturn: number;
  inflationForecast: number;
  lastUpdated: string;
  dataSource: string;
}
