// src/types/cash-flow-scenario.ts
// ================================================================
// DEFINITIVE, ELEVATED AND CORRECTED - FULL FILE
// This version preserves all original types and adds the missing
// properties to the CashFlowScenario interface to create a single,
// authoritative definition across the application.
// ================================================================

export interface CashFlowScenario {
  // ✅ FIX: Removed the conflicting index signature that was causing type errors
  // If you need dynamic properties, use a more specific approach or separate interface
  
  id: string;
  // ✅ FIX: Added the 'client_id' property to match the complete type definition used elsewhere.
  client_id: string;
  scenario_name: string;
  scenario_type: 'base' | 'retirement' | 'custom';
  projection_years: number;
  inflation_rate: number;
  real_equity_return: number;
  real_bond_return: number;
  real_cash_return: number;
  client_age: number;
  retirement_age: number;
  life_expectancy: number;
  current_savings: number;
  pension_value: number;
  investment_value: number;
  current_income: number;
  current_expenses: number;
  state_pension_age: number;
  state_pension_amount: number;
  risk_score: number;
  vulnerability_adjustments: Record<string, any>;
  assumption_basis: string;
  alternative_allocation: number;
  // ✅ FIX: Added the 'isActive' property to match the complete type definition.
  isActive: boolean;
  created_at: string;
  updated_at: string;
  
  // ✅ Added these properties that are used in AdvancedAnalyticsDashboard
  clientId?: string;  // For camelCase compatibility
  scenarioName?: string;  // For camelCase compatibility
  scenarioType?: 'base' | 'retirement' | 'custom';  // For camelCase compatibility
  projectionYears?: number;  // For camelCase compatibility
  riskScore?: number;  // For camelCase compatibility
  currentIncome?: number;  // For camelCase compatibility
  investmentValue?: number;  // For camelCase compatibility
  retirementAge?: number;  // For camelCase compatibility
  inflationRate?: number;  // For camelCase compatibility
  realEquityReturn?: number;  // For camelCase compatibility
  realBondReturn?: number;  // For camelCase compatibility
  realCashReturn?: number;  // For camelCase compatibility
  assumptionBasis?: string;  // For camelCase compatibility
  annualChargePercent?: number;
  chargesIncluded?: boolean;
  calculationMethod?: string;
  dataSources?: string[];
  lastReviewed?: Date;
  currentExpenses?: number;  // For camelCase compatibility
  pensionValue?: number;  // For camelCase compatibility
  clientAge?: number;  // For camelCase compatibility
}

export interface CashFlowProjection {
  id: string;
  scenario_id: string;
  projection_year: number;
  age: number;
  total_assets: number;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  sustainability_ratio: number;
  created_at: string;
}

export interface ClientGoal {
  id: string;
  client_id: string;
  goal_name: string;
  target_amount: number;
  target_year: number;
  priority: 'high' | 'medium' | 'low';
  is_achieved: boolean;
}

export interface ScenarioSummary {
  scenario: CashFlowScenario;
  projections: CashFlowProjection[];
  goals: ClientGoal[];
  totalProjectedFund: number;
  successProbability: number;
  shortfallRisk: number;
}

export interface ClientOption {
  id: string;
  name: string;
  age?: number;
  scenarioCount: number;
}

// ✅ If you need a type that allows arbitrary string properties, create a separate interface
export interface CashFlowScenarioWithDynamicProps extends CashFlowScenario {
  [key: string]: any;
}