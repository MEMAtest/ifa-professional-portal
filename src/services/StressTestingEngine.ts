import { StressScenario, StressTestResults, CashFlowScenario, MonteCarloResults } from '@/types/advanced-analytics';

export class StressTestingEngine {
  private static readonly STRESS_SCENARIOS: StressScenario[] = [
    {
      id: 'market_crash_2008',
      name: '2008-Style Market Crash',
      description: 'Severe equity decline with credit crisis',
      type: 'market_crash',
      severity: 'severe',
      duration_years: 2,
      parameters: {
        equity_decline: -40,
        bond_decline: -15,
        property_decline: -25,
        inflation_spike: 1.5,
        interest_rate_change: -3.0
      }
    },
    {
      id: 'inflation_shock_1970s',
      name: '1970s-Style Inflation Shock',
      description: 'Sustained high inflation period',
      type: 'inflation_shock',
      severity: 'severe',
      duration_years: 5,
      parameters: {
        inflation_increase: 7.0,
        real_return_erosion: -3.0,
        interest_rate_rise: 4.0,
        currency_depreciation: -10
      }
    },
    {
      id: 'longevity_extension',
      name: 'Longevity Extension',
      description: 'Living 10 years beyond life expectancy',
      type: 'longevity',
      severity: 'moderate',
      duration_years: 10,
      parameters: {
        additional_years: 10,
        healthcare_cost_increase: 50,
        care_cost_annual: 50000
      }
    }
  ];

  static async runStressTests(
    scenario: CashFlowScenario,
    selectedTests?: string[]
  ): Promise<StressTestResults[]> {
    const testsToRun = selectedTests 
      ? this.STRESS_SCENARIOS.filter(s => selectedTests.includes(s.id))
      : this.STRESS_SCENARIOS;

    const results: StressTestResults[] = [];

    for (const stressTest of testsToRun) {
      console.log(`🧪 Running stress test: ${stressTest.name}`);
      
      const stressedScenario = this.applyStressParameters(scenario, stressTest);
      
      // Mock Monte Carlo results for now - replace with your actual MonteCarloEngine
      const mockResults = this.generateMockResults();
      
      const stressResult: StressTestResults = {
        scenario_id: stressTest.id,
        survival_probability: this.calculateSurvivalProbability(mockResults),
        shortfall_risk: this.calculateShortfallRisk(mockResults),
        worst_case_outcome: this.calculateWorstCase(mockResults),
        resilience_score: this.calculateResilienceScore(stressTest, mockResults),
        recovery_time_years: this.calculateRecoveryTime(stressTest),
        impact_analysis: this.analyzeImpact(scenario, stressedScenario)
      };

      results.push(stressResult);
    }

    return results;
  }

  private static applyStressParameters(
    baseScenario: CashFlowScenario,
    stressTest: StressScenario
  ): CashFlowScenario {
    const stressedScenario = { ...baseScenario };
    const params = stressTest.parameters;

    switch (stressTest.type) {
      case 'market_crash':
        stressedScenario.real_equity_return = Math.min(
          baseScenario.real_equity_return + (params.equity_decline / 10),
          -20
        );
        break;
      case 'inflation_shock':
        stressedScenario.real_equity_return -= params.real_return_erosion;
        stressedScenario.real_bond_return -= params.real_return_erosion;
        break;
      case 'longevity':
        stressedScenario.projection_years += params.additional_years;
        break;
    }

    return stressedScenario;
  }

  private static generateMockResults(): MonteCarloResults {
    return {
      simulations: Array.from({ length: 1000 }, (_, i) => ({
        final_portfolio_value: Math.random() * 1000000 - 200000,
        shortfall_years: [],
        success: Math.random() > 0.3
      })),
      confidence_intervals: {
        percentile_10: 50000,
        percentile_25: 150000,
        percentile_50: 300000,
        percentile_75: 500000,
        percentile_90: 750000
      },
      success_probability: 72.5,
      average_outcome: 350000
    };
  }

  private static calculateSurvivalProbability(results: MonteCarloResults): number {
    const successfulRuns = results.simulations.filter(sim => sim.final_portfolio_value > 0).length;
    return (successfulRuns / results.simulations.length) * 100;
  }

  private static calculateShortfallRisk(results: MonteCarloResults): number {
    const shortfallRuns = results.simulations.filter(sim => sim.final_portfolio_value <= 0).length;
    return (shortfallRuns / results.simulations.length) * 100;
  }

  private static calculateWorstCase(results: MonteCarloResults): number {
    return Math.min(...results.simulations.map(sim => sim.final_portfolio_value));
  }

  private static calculateResilienceScore(stressTest: StressScenario, results: MonteCarloResults): number {
    const survivalProb = this.calculateSurvivalProbability(results);
    const severityWeight = stressTest.severity === 'severe' ? 0.5 : 
                          stressTest.severity === 'moderate' ? 0.75 : 1.0;
    return Math.round(survivalProb * severityWeight);
  }

  private static calculateRecoveryTime(stressTest: StressScenario): number | undefined {
    if (stressTest.type === 'market_crash' || stressTest.type === 'recession') {
      return stressTest.duration_years + 2;
    }
    return undefined;
  }

  private static analyzeImpact(
    original: CashFlowScenario,
    stressed: CashFlowScenario
  ): { portfolio_decline_percent: number; income_reduction_percent: number; expense_increase_percent: number } {
    return {
      portfolio_decline_percent: Math.round(
        ((stressed.real_equity_return - original.real_equity_return) / original.real_equity_return) * 100
      ),
      income_reduction_percent: 0,
      expense_increase_percent: 0
    };
  }
}