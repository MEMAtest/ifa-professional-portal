import type { ElementType } from 'react';

export type ClientFilterKey =
  | 'all'
  | 'active'
  | 'review_due'
  | 'top_aum'
  | 'top_income'
  | 'assessed'
  | 'scenario_built'
  | 'report_generated'
  | 'missing_assessment'
  | 'missing_plan'
  | 'high_risk'
  | 'risk_conservative'
  | 'risk_moderate'
  | 'risk_growth'
  | 'risk_aggressive'
  | 'risk_unrated'
  | 'retirement_50_54'
  | 'retirement_55_59'
  | 'retirement_60_64'
  | 'retirement_65_69'
  | 'retirement_70_74'
  | 'retirement_75_plus';

export interface QuickAction {
  icon: ElementType;
  label: string;
  description: string;
  action: () => void;
  disabled?: boolean;
}

export interface TrackingState {
  isTracking: boolean;
  lastTrackedScenarioId?: string;
}

export type DrillDownSortField = 'name' | 'aum' | 'income' | 'createdAt';

export interface DrillDownConfig {
  title: string;
  description: string;
  sortField?: DrillDownSortField;
  showOnboarded?: boolean;
}

export interface RetirementBucket {
  key: ClientFilterKey;
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface CommandCenterStats {
  totalClients: number;
  activeClients: number;
  reviewDue: number;
  totalAum: number;
  avgIncome: number;
  missingAssessments: number;
  missingPlans: number;
  highRisk: number;
}

export interface RiskMixEntry {
  label: string;
  count: number;
  color: string;
}

export interface AumSeriesPoint {
  month: string;
  aum: number;
  clients: number;
}

export interface CoverageSeriesEntry {
  key: ClientFilterKey;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface RetirementDistributionEntry {
  key: ClientFilterKey;
  label: string;
  count: number;
  color: string;
}
