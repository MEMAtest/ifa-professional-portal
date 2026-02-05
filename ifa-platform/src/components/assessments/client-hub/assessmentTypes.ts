import type { LucideIcon } from 'lucide-react'
import { Activity, Calculator, FileText, Shield, TrendingUp, User } from 'lucide-react'

export type AssessmentTypeId = 'suitability' | 'atr' | 'cfl' | 'persona' | 'monte_carlo' | 'cashflow'

export interface AssessmentTypeConfig {
  id: AssessmentTypeId
  name: string
  shortName: string
  description: string
  icon: LucideIcon
  route: string
  resultsRoute: string
  estimatedTime: string
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'orange' | 'teal'
  order: number
}

// Assessment configuration with FIXED routes
export const assessmentTypes: Record<AssessmentTypeId, AssessmentTypeConfig> = {
  atr: {
    id: 'atr',
    name: 'Attitude to Risk',
    shortName: 'ATR',
    description: 'Assess risk tolerance and investment preferences',
    icon: Shield,
    route: '/assessments/atr',
    resultsRoute: '/assessments/atr/results',
    estimatedTime: '15-20 mins',
    color: 'blue',
    order: 1
  },
  cfl: {
    id: 'cfl',
    name: 'Capacity for Loss',
    shortName: 'CFL',
    description: 'Evaluate financial capacity for potential losses',
    icon: TrendingUp,
    route: '/assessments/cfl',
    resultsRoute: '/assessments/cfl/results',
    estimatedTime: '20-25 mins',
    color: 'purple',
    order: 2
  },
  persona: {
    id: 'persona',
    name: 'Investor Persona',
    shortName: 'Persona',
    description: 'Identify investor personality and preferences',
    icon: User,
    route: '/assessments/persona-assessment',
    resultsRoute: '/assessments/personas/results',
    estimatedTime: '10-15 mins',
    color: 'indigo',
    order: 3
  },
  suitability: {
    id: 'suitability',
    name: 'Full Suitability',
    shortName: 'Suitability',
    description: 'Comprehensive suitability assessment',
    icon: FileText,
    route: '/assessments/suitability',
    resultsRoute: '/assessments/suitability/results',
    estimatedTime: '30-45 mins',
    color: 'green',
    order: 4
  },
  monte_carlo: {
    id: 'monte_carlo',
    name: 'Monte Carlo Analysis',
    shortName: 'Monte Carlo',
    description: 'Probability-based retirement planning simulations',
    icon: Activity,
    route: '/monte-carlo',
    resultsRoute: '/monte-carlo/results',
    estimatedTime: '15-20 mins',
    color: 'orange',
    order: 5
  },
  cashflow: {
    id: 'cashflow',
    name: 'Cash Flow Planning',
    shortName: 'Cash Flow',
    description: 'Detailed income and expenditure projections',
    icon: Calculator,
    route: '/cashflow',
    resultsRoute: '/cashflow/results',
    estimatedTime: '20-30 mins',
    color: 'teal',
    order: 6
  }
}
