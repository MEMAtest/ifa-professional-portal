// ================================================================
// Cash Flow Scenario Types - Based on your actual database schema
// ================================================================

export interface CashFlowScenario {
  id: string;
  client_id: string;
  scenario_name: string;
  scenario_type: 'base' | 'optimistic' | 'pessimistic' | 'stress';
  created_by: string;
  
  // Projection Settings
  projection_years: number;
  inflation_rate: number;
  real_equity_return: number;
  real_bond_return: number;
  real_cash_return: number;
  
  // Client Demographics
  client_age: number;
  retirement_age: number;
  life_expectancy: number;
  
  // Financial Position
  current_savings: number;
  pension_value: number;
  investment_value: number;
  current_income: number;
  current_expenses: number;
  
  // State Pension
  state_pension_age: number;
  state_pension_amount: number;
  
  // Risk & Compliance
  risk_score: number;
  vulnerability_adjustments: any;
  assumption_basis: string;
  
  // Metadata
  market_data_source?: string;
  last_assumptions_review: string;
  alternative_allocation: number;
  created_at: string;
  updated_at: string;
}

export interface CashFlowProjection {
  id: string;
  scenario_id: string;
  projection_year: number;
  client_age: number;
  employment_income: number;
  pension_income: number;
  state_pension: number;
  investment_income: number;
  other_income: number;
  essential_expenses: number;
  lifestyle_expenses: number;
  discretionary_expenses: number;
  pension_pot_value: number;
  investment_portfolio: number;
  cash_savings: number;
  total_income: number;
  total_expenses: number;
  total_assets: number;
  annual_surplus_deficit: number;
  sustainability_ratio: number;
  created_at: string;
}

export interface ClientGoal {
  id: string;
  client_id: string;
  linked_scenario_id?: string;
  goal_name: string;
  goal_type: 'retirement_income' | 'lump_sum' | 'legacy' | 'emergency_fund';
  target_amount: number;
  target_date: string;
  priority: 'Essential' | 'Important' | 'Desirable';
  current_progress: number;
  probability_of_success: number;
  funding_status: string;
  created_at: string;
  updated_at: string;
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