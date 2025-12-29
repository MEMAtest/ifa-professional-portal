import type { ClientFilterKey, DrillDownConfig, RetirementBucket } from './types';

export const FILTER_LABELS: Record<ClientFilterKey, string> = {
  all: 'All clients',
  active: 'Active clients',
  review_due: 'Review due',
  top_aum: 'Top AUM clients',
  top_income: 'Top income clients',
  assessed: 'Assessment completed',
  scenario_built: 'Scenario created',
  report_generated: 'Cash flow report generated',
  missing_assessment: 'Missing assessment',
  missing_plan: 'Missing cash flow plan',
  high_risk: 'High risk',
  risk_conservative: 'Conservative risk',
  risk_moderate: 'Moderate risk',
  risk_growth: 'Growth risk',
  risk_aggressive: 'Aggressive risk',
  risk_unrated: 'Unrated risk',
  retirement_50_54: 'Retirement 50-54',
  retirement_55_59: 'Retirement 55-59',
  retirement_60_64: 'Retirement 60-64',
  retirement_65_69: 'Retirement 65-69',
  retirement_70_74: 'Retirement 70-74',
  retirement_75_plus: 'Retirement 75+'
};

export const DRILLDOWN_CONFIGS: Record<ClientFilterKey, DrillDownConfig> = {
  all: {
    title: 'All Active Clients',
    description: 'Full active client list with cash flow readiness indicators.',
    sortField: 'name'
  },
  active: {
    title: 'Active Clients',
    description: 'Clients currently marked as active within the cash flow workspace.',
    sortField: 'name'
  },
  review_due: {
    title: 'Reviews Due',
    description: 'Clients flagged for upcoming annual review actions.',
    sortField: 'createdAt'
  },
  top_aum: {
    title: 'Top AUM Clients',
    description: 'Largest portfolio values contributing to AUM momentum.',
    sortField: 'aum',
    showOnboarded: true
  },
  top_income: {
    title: 'Top Income Clients',
    description: 'Highest annual income profiles for cash flow focus.',
    sortField: 'income'
  },
  assessed: {
    title: 'Assessment Completed',
    description: 'Clients with a completed risk assessment.',
    sortField: 'name'
  },
  scenario_built: {
    title: 'Scenario Created',
    description: 'Clients with a cash flow scenario already in place.',
    sortField: 'name'
  },
  report_generated: {
    title: 'Cash Flow Reports Generated',
    description: 'Clients with a cash flow report saved in documents.',
    sortField: 'name'
  },
  missing_assessment: {
    title: 'Missing Risk Assessments',
    description: 'Clients without a completed risk assessment on record.',
    sortField: 'name'
  },
  missing_plan: {
    title: 'Missing Cash Flow Plans',
    description: 'Clients who do not yet have a cash flow scenario created.',
    sortField: 'name'
  },
  high_risk: {
    title: 'High Risk Watchlist',
    description: 'Growth or aggressive risk tolerance profiles for closer monitoring.',
    sortField: 'aum'
  },
  risk_conservative: {
    title: 'Conservative Risk Clients',
    description: 'Clients assessed with conservative risk tolerance.',
    sortField: 'aum'
  },
  risk_moderate: {
    title: 'Moderate Risk Clients',
    description: 'Clients assessed with balanced or moderate risk tolerance.',
    sortField: 'aum'
  },
  risk_growth: {
    title: 'Growth Risk Clients',
    description: 'Clients assessed with growth-oriented risk tolerance.',
    sortField: 'aum'
  },
  risk_aggressive: {
    title: 'Aggressive Risk Clients',
    description: 'Clients assessed with aggressive or high risk tolerance.',
    sortField: 'aum'
  },
  risk_unrated: {
    title: 'Unrated Risk Clients',
    description: 'Clients missing a risk tolerance assessment.',
    sortField: 'name'
  },
  retirement_50_54: {
    title: 'Retirement Age 50-54',
    description: 'Clients planning to retire between age 50 and 54.',
    sortField: 'name'
  },
  retirement_55_59: {
    title: 'Retirement Age 55-59',
    description: 'Clients planning to retire between age 55 and 59.',
    sortField: 'name'
  },
  retirement_60_64: {
    title: 'Retirement Age 60-64',
    description: 'Clients planning to retire between age 60 and 64.',
    sortField: 'name'
  },
  retirement_65_69: {
    title: 'Retirement Age 65-69',
    description: 'Clients planning to retire between age 65 and 69.',
    sortField: 'name'
  },
  retirement_70_74: {
    title: 'Retirement Age 70-74',
    description: 'Clients planning to retire between age 70 and 74.',
    sortField: 'name'
  },
  retirement_75_plus: {
    title: 'Retirement Age 75+',
    description: 'Clients planning to retire at age 75 or later.',
    sortField: 'name'
  }
};

export const RETIREMENT_BUCKETS: RetirementBucket[] = [
  { key: 'retirement_50_54', label: '50-54', min: 50, max: 54, color: '#60a5fa' },
  { key: 'retirement_55_59', label: '55-59', min: 55, max: 59, color: '#3b82f6' },
  { key: 'retirement_60_64', label: '60-64', min: 60, max: 64, color: '#2563eb' },
  { key: 'retirement_65_69', label: '65-69', min: 65, max: 69, color: '#1d4ed8' },
  { key: 'retirement_70_74', label: '70-74', min: 70, max: 74, color: '#1e40af' },
  { key: 'retirement_75_plus', label: '75+', min: 75, max: 120, color: '#1e3a8a' }
];

export const RISK_MIX_COLORS = {
  conservative: '#10b981',
  moderate: '#3b82f6',
  growth: '#f59e0b',
  aggressive: '#ef4444',
  unrated: '#94a3b8'
} as const;
