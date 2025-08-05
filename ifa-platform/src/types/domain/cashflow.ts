// src/types/domain/cashflow.ts
export interface CashFlowScenario {
  id: string;
  clientId: string;
  scenarioName: string;
  scenarioType: 'retirement' | 'education' | 'investment' | 'custom';
  description?: string;
  
  // Financial parameters
  initialCapital: number;
  monthlyContribution: number;
  annualReturnRate: number;
  inflationRate: number;
  
  // Time parameters
  startDate: Date;
  endDate: Date;
  retirementAge?: number;
  currentAge: number;
  
  // Income sources
  pensionIncome?: number;
  rentalIncome?: number;
  otherIncome?: number;
  
  // Expenses
  livingExpenses: number;
  housingCosts: number;
  healthcareCosts: number;
  otherExpenses?: number;
  
  // Asset allocation
  equityAllocation: number;
  bondAllocation: number;
  cashAllocation: number;
  alternativeAllocation: number;
  
  // Risk parameters
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  emergencyFundMonths: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastCalculatedAt?: Date;
  version: number;
}