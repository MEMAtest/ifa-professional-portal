import type { StressScenario } from '@/types/stress-testing'

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'market_crash_2008',
    name: '2008 Financial Crisis',
    description: 'Severe equity decline with bond stress, similar to the 2008 global financial crisis',
    type: 'market_crash',
    severity: 'severe',
    durationYears: 3,
    category: 'Market Risk',
    parameters: { equityDecline: -40, bondDecline: -15, propertyDecline: -25 },
    historicalBasis: '2008 Global Financial Crisis'
  },
  {
    id: 'covid_volatility',
    name: 'COVID-19 Style Volatility',
    description: 'Sharp initial decline with rapid but partial recovery',
    type: 'pandemic',
    severity: 'moderate',
    durationYears: 2,
    category: 'Market Risk',
    parameters: { equityDecline: -35, bondDecline: -5, volatilityIncrease: 50 },
    historicalBasis: 'COVID-19 March 2020'
  },
  {
    id: 'tech_bubble',
    name: 'Tech Bubble Burst',
    description: 'Growth stocks and technology sector decline significantly',
    type: 'sector',
    severity: 'severe',
    durationYears: 3,
    category: 'Market Risk',
    parameters: { equityDecline: -50, volatilityIncrease: 30 },
    historicalBasis: '2000-2002 Dot-com Crash'
  },
  {
    id: 'inflation_shock_1970s',
    name: '1970s Inflation Shock',
    description: 'Sustained high inflation eroding real returns',
    type: 'inflation_shock',
    severity: 'severe',
    durationYears: 5,
    category: 'Inflation Risk',
    parameters: { inflationSpike: 7.0, realReturnErosion: 5 },
    historicalBasis: '1970s UK Stagflation'
  },
  {
    id: 'interest_rate_shock',
    name: 'Rising Interest Rate Shock',
    description: 'Rapid interest rate increases causing bond decline',
    type: 'interest_rate_shock',
    severity: 'moderate',
    durationYears: 2,
    category: 'Interest Rate Risk',
    parameters: { interestRateChange: 4.0, bondDecline: -20 },
    historicalBasis: '2022-2023 Rate Rises'
  },
  {
    id: 'mild_recession',
    name: 'Mild Recession',
    description: 'Modest economic downturn with gradual recovery',
    type: 'recession',
    severity: 'mild',
    durationYears: 2,
    category: 'Economic Risk',
    parameters: { equityDecline: -20, bondDecline: -5, propertyDecline: -10 }
  },
  {
    id: 'severe_recession',
    name: 'Severe Recession',
    description: 'Major economic downturn similar to 2008',
    type: 'recession',
    severity: 'severe',
    durationYears: 4,
    category: 'Economic Risk',
    parameters: { equityDecline: -45, bondDecline: -15, propertyDecline: -30 }
  },
  {
    id: 'job_loss_redundancy',
    name: 'Job Loss / Redundancy',
    description: 'Complete income loss with severance and job search period',
    type: 'personal_crisis',
    severity: 'severe',
    durationYears: 1,
    category: 'Personal Risk',
    parameters: { equityDecline: 0 }
  },
  {
    id: 'major_health_event',
    name: 'Major Health Event',
    description: 'Significant health issue requiring reduced work and increased healthcare costs',
    type: 'personal_crisis',
    severity: 'severe',
    durationYears: 2,
    category: 'Personal Risk',
    parameters: { healthcareCostIncrease: 200 }
  },
  {
    id: 'divorce_separation',
    name: 'Divorce / Separation',
    description: 'Asset division and legal costs',
    type: 'personal_crisis',
    severity: 'severe',
    durationYears: 1,
    category: 'Personal Risk',
    parameters: { equityDecline: -50 }
  },
  {
    id: 'forced_early_retirement',
    name: 'Forced Early Retirement',
    description: 'Unexpected early retirement with reduced pension',
    type: 'personal_crisis',
    severity: 'severe',
    durationYears: 3,
    category: 'Personal Risk',
    parameters: { equityDecline: 0 }
  },
  {
    id: 'longevity_extension',
    name: 'Longevity Extension',
    description: 'Client lives significantly longer than expected',
    type: 'longevity',
    severity: 'moderate',
    durationYears: 5,
    category: 'Longevity Risk',
    parameters: { lifeExpectancyIncrease: 10 }
  },
  {
    id: 'brexit_political',
    name: 'Brexit-Style Political Risk',
    description: 'Political uncertainty causing market and currency volatility',
    type: 'political',
    severity: 'moderate',
    durationYears: 2,
    category: 'Political Risk',
    parameters: { equityDecline: -15, currencyDepreciation: -12 },
    historicalBasis: 'Brexit 2016'
  },
  {
    id: 'currency_crisis',
    name: 'Currency Crisis',
    description: 'Significant currency devaluation affecting imports and overseas assets',
    type: 'currency_crisis',
    severity: 'severe',
    durationYears: 2,
    category: 'Currency Risk',
    parameters: { currencyDepreciation: -25, inflationSpike: 4 }
  }
]

export const SCENARIO_CATEGORIES = STRESS_SCENARIOS.reduce((acc, scenario) => {
  const category = scenario.category
  if (!acc[category]) {
    acc[category] = []
  }
  acc[category].push(scenario)
  return acc
}, {} as Record<string, StressScenario[]>)

export const SCENARIO_CATEGORY_LOOKUP = new Map(
  STRESS_SCENARIOS.map((scenario) => [scenario.id, scenario.category])
)

export const SCENARIO_CATEGORY_COLORS: Record<string, string> = {
  'Market Risk': '#60a5fa',
  'Personal Risk': '#f97316',
  'Economic Risk': '#a78bfa',
  'Inflation Risk': '#f59e0b',
  'Interest Rate Risk': '#38bdf8',
  'Longevity Risk': '#22c55e',
  'Political Risk': '#94a3b8',
  'Currency Risk': '#14b8a6',
  Other: '#cbd5f5'
}

export const RESILIENCE_BUCKETS = [
  { key: 'resilience_0_39', label: '0-39', min: 0, max: 39, color: '#ef4444' },
  { key: 'resilience_40_59', label: '40-59', min: 40, max: 59, color: '#f97316' },
  { key: 'resilience_60_79', label: '60-79', min: 60, max: 79, color: '#facc15' },
  { key: 'resilience_80_100', label: '80-100', min: 80, max: 100, color: '#22c55e' }
]

export const SEVERITY_LEVELS = [
  { key: 'severity_mild', label: 'Mild', value: 'mild', color: '#22c55e' },
  { key: 'severity_moderate', label: 'Moderate', value: 'moderate', color: '#f59e0b' },
  { key: 'severity_severe', label: 'Severe', value: 'severe', color: '#ef4444' }
]
