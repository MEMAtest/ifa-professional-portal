import type { StressTestResult } from '@/types/stress-testing'
import { STRESS_SCENARIOS } from '@/components/stress-testing/constants'

const findScenarioName = (scenarioId: string) => {
  const scenario = STRESS_SCENARIOS.find((item) => item.id === scenarioId)
  return scenario?.name || scenarioId
}

export const mapStoredStressResults = (storedResults: any[]): StressTestResult[] => {
  return storedResults.map((result: any) => ({
    scenarioId: result.scenario_id,
    scenarioName: findScenarioName(result.scenario_id),
    survivalProbability: result.survival_probability,
    shortfallRisk: result.shortfall_risk,
    resilienceScore: result.resilience_score,
    worstCaseOutcome: result.worst_case_outcome,
    recoveryTimeYears: result.recovery_time_years,
    impactAnalysis: {
      portfolioDeclinePercent: result.impact_analysis?.portfolio_decline_percent ?? 0,
      incomeReductionPercent: result.impact_analysis?.income_reduction_percent ?? 0,
      expenseIncreasePercent: result.impact_analysis?.expense_increase_percent ?? 0
    }
  }))
}

export const mapApiStressResults = (apiResults: any[]): StressTestResult[] => {
  return apiResults.map((result: any) => ({
    scenarioId: result.scenario_id,
    scenarioName: findScenarioName(result.scenario_id),
    survivalProbability: result.survival_probability,
    shortfallRisk: result.shortfall_risk,
    resilienceScore: result.resilience_score,
    worstCaseOutcome: result.worst_case_outcome,
    recoveryTimeYears: result.recovery_time_years,
    impactAnalysis: {
      portfolioDeclinePercent: result.impact_analysis?.portfolio_decline_percent ?? 0,
      incomeReductionPercent: result.impact_analysis?.income_reduction_percent ?? 0,
      expenseIncreasePercent: result.impact_analysis?.expense_increase_percent ?? 0
    }
  }))
}
