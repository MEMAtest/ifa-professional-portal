// Core interfaces for Phase 2B Advanced Analytics
export interface StressScenario {
  id: string;
  name: string;
  description: string;
  type: 'market_crash' | 'inflation_shock' | 'longevity' | 'interest_rate' | 'recession';
  parameters: Record<string, number>;
  severity: 'mild' | 'moderate' | 'severe';
  duration_years: number;
}

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
}

export interface ComplianceCheck {
  id: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'warning';
  evidence: string[];
  guidance_reference: string;
  last_checked: Date;
}

export interface ComplianceReport {
  scenario_id: string;
  overall_status: 'fully_compliant' | 'partially_compliant' | 'non_compliant';
  compliance_score: number;
  checks: ComplianceCheck[];
  recommendations: string[];
  generated_at: Date;
}

export interface FinancialGoal {
  id: string;
  client_id: string;
  goal_name: string;
  goal_type: 'retirement' | 'education' | 'property' | 'legacy' | 'emergency' | 'lifestyle';
  target_amount: number;
  target_date: Date;
  priority: 1 | 2 | 3 | 4 | 5;
  current_progress: number;
  probability_of_success: number;
  risk_tolerance: 'low' | 'medium' | 'high';
}

export interface GoalProgress {
  goal_id: string;
  probability_bands: {
    optimistic: number;
    likely: number;
    pessimistic: number;
  };
  monte_carlo_success_rate: number;
  shortfall_risk: {
    probability: number;
    average_shortfall: number;
    worst_case_shortfall: number;
  };
  on_track_indicator: 'ahead' | 'on_track' | 'behind' | 'at_risk';
  required_adjustments?: {
    increase_savings_by: number;
    extend_timeline_by_years: number;
    reduce_target_by: number;
  };
}

// Assuming you have this from Phase 2A
export interface CashFlowScenario {
  id: string;
  scenario_name: string;
  client_id: string;
  projection_years: number;
  inflation_rate: number;
  real_equity_return: number;
  real_bond_return: number;
  real_cash_return: number;
  risk_score: number;
  assumption_basis: string;
  annual_charge_percent?: number;
  charges_included?: boolean;
  calculation_method?: string;
  data_sources?: string[];
  last_reviewed?: Date;
}

export interface MonteCarloResults {
  simulations: Array<{
    final_portfolio_value: number;
    shortfall_years: number[];
    success: boolean;
  }>;
  confidence_intervals: {
    percentile_10: number;
    percentile_25: number;
    percentile_50: number;
    percentile_75: number;
    percentile_90: number;
  };
  success_probability: number;
  average_outcome: number;
}