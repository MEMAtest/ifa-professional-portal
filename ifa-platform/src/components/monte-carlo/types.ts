export interface MonteCarloScenario {
  id: string;
  client_id: string | null;
  scenario_name: string;
  created_at: string | null;
  initial_wealth: number | null;
  time_horizon: number | null;
  withdrawal_amount: number | null;
  risk_score: number | null;
  inflation_rate: number | null;
}

export interface MonteCarloResult {
  id: string;
  scenario_id: string;
  success_probability: number;
  simulation_count: number;
  average_final_wealth: number;
  median_final_wealth: number;
  confidence_intervals: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfall_risk: number;
  average_shortfall_amount: number;
  wealth_volatility: number;
  maximum_drawdown: number;
  calculation_status: string;
  created_at: string;
}

export interface ScenarioWithResult extends MonteCarloScenario {
  result?: MonteCarloResult;
  success_probability?: number;
  simulation_count?: number;
  average_final_wealth?: number;
  median_final_wealth?: number;
  confidence_intervals?: any;
  shortfall_risk?: number;
  volatility?: number;
  max_drawdown?: number;
}

export interface MonteCarloDashboardStats {
  totalClients: number;
  activeClients: number;
  totalScenarios: number;
  averageSuccessRate: number;
}

export type ViewMode = 'dashboard' | 'simulation' | 'results' | 'history';
export type StatFilter = 'all' | 'active' | 'with-scenarios' | 'high-success';
