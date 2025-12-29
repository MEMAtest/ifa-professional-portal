export interface ClientDetails {
  name: string;
  age: number;
  netWorth: number;
  email?: string;
  notes?: string;
}

export interface SimulationInputs {
  initialPortfolio: number;
  timeHorizon: number;
  annualWithdrawal: number;
  riskScore: number;
  inflationRate: number;
  simulationCount: number;
}

export type SimulationParameters = Omit<SimulationInputs, 'simulationCount'> & {
  simulationCount?: number;
};

export interface SimulationResults {
  successRate: number;
  averageFinalWealth: number;
  medianFinalWealth: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  failureRisk: number;
  maxDrawdown: number;
  yearlyData: YearlyProjection[];
  executionTime: number;
  simulationCount?: number;
  confidenceIntervals?: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfallRisk?: number;
  volatility?: number;
}

export interface YearlyProjection {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  expectedWithdrawal: number;
}
