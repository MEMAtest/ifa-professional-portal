import { createClient } from "@/lib/supabase/client"
// ================================================================
// src/services/StressTestingEngine.ts - ENHANCED WITH PERSONAL CRISIS
// Extends existing engine with personal crisis scenarios
// Maintains backward compatibility with all existing functionality
// ================================================================

import type { CashFlowScenario } from '@/types/cashflow';
import { createMonteCarloEngine, type SimulationInput } from '@/lib/monte-carlo/engine';
import type { 
  StressScenario, 
  PersonalCrisisParameters, 
  StressTestResults, 
  MonteCarloResults,
  StressParameters,
  MonteCarloSimulation
} from '@/types/stress-testing';

export class StressTestingEngine {
  // EXPANDED: Now includes personal crisis scenarios
  private static readonly STRESS_SCENARIOS: StressScenario[] = [
    // ======== EXISTING MARKET/ECONOMIC SCENARIOS ========
    {
      id: 'market_crash_2008',
      name: '2008 Financial Crisis',
      description: 'Severe market decline with credit crisis',
      type: 'market_crash',
      category: 'Market Risk',
      severity: 'severe',
      durationYears: 2,
      parameters: {
        equity_decline: -40,
        bond_decline: -15,
        property_decline: -25,
        inflation_spike: 1.5,
        interest_rate_change: -3.0,
        volatility_multiplier: 2.5
      }
    },
    {
      id: 'inflation_shock_1970s',
      name: '1970s Inflation Shock',
      description: 'Sustained high inflation environment',
      type: 'inflation_shock',
      category: 'Inflation Risk',
      severity: 'severe',
      durationYears: 5,
      parameters: {
        inflation_increase: 7.0,
        real_return_erosion: -3.0,
        interest_rate_rise: 4.0,
        currency_depreciation: -10,
        expense_multiplier: 1.4
      }
    },
    {
      id: 'covid_volatility',
      name: 'COVID-19 Style Volatility',
      description: 'Sharp initial decline with rapid recovery',
      type: 'market_crash',
      category: 'Market Risk',
      severity: 'moderate',
      durationYears: 1,
      parameters: {
        equity_decline: -35,
        bond_performance: 5,
        recovery_rate: 2.0,
        volatility_spike: 3.0,
        correlation_increase: 0.4
      }
    },
    {
      id: 'brexit_uncertainty',
      name: 'Brexit-Style Political Risk',
      description: 'Prolonged political and economic uncertainty',
      type: 'geopolitical',
      category: 'Political Risk',
      severity: 'moderate',
      durationYears: 3,
      parameters: {
        equity_decline: -15,
        currency_decline: -12,
        inflation_increase: 2.0,
        trade_impact: -5,
        uncertainty_premium: 2.0
      }
    },
    {
      id: 'interest_rate_shock_up',
      name: 'Rising Interest Rate Shock',
      description: 'Rapid increase in interest rates',
      type: 'interest_rate_shock',
      category: 'Interest Rate Risk',
      severity: 'moderate',
      durationYears: 2,
      parameters: {
        rate_increase: 4.0,
        bond_decline: -20,
        equity_impact: -10,
        mortgage_cost_increase: 50,
        refinancing_stress: 30
      }
    },
    {
      id: 'interest_rate_shock_down',
      name: 'Zero Interest Rate Environment',
      description: 'Extended period of near-zero rates',
      type: 'interest_rate_shock',
      category: 'Interest Rate Risk',
      severity: 'mild',
      durationYears: 8,
      parameters: {
        rate_floor: 0.1,
        cash_return_erosion: -1.5,
        pension_funding_stress: 20,
        insurance_cost_increase: 15,
        savings_yield_compression: -2.0
      }
    },
    {
      id: 'currency_crisis',
      name: 'Currency Crisis',
      description: 'Significant currency devaluation',
      type: 'currency_crisis',
      category: 'Currency Risk',
      severity: 'moderate',
      durationYears: 2,
      parameters: {
        currency_decline: -25,
        import_inflation: 8.0,
        foreign_asset_gain: 25,
        domestic_equity_decline: -12,
        commodity_price_spike: 30
      }
    },
    {
      id: 'commodity_shock',
      name: 'Commodity Price Shock',
      description: 'Oil/energy price spike affecting inflation',
      type: 'commodity',
      category: 'Commodity Risk',
      severity: 'moderate',
      durationYears: 2,
      parameters: {
        energy_price_increase: 150,
        headline_inflation_spike: 4.0,
        transport_cost_increase: 25,
        utility_cost_increase: 40,
        food_price_increase: 20
      }
    },
    {
      id: 'tech_bubble_burst',
      name: 'Technology Bubble Burst',
      description: 'Correction in growth/technology sectors',
      type: 'sector',
      category: 'Sector Risk',
      severity: 'moderate',
      durationYears: 3,
      parameters: {
        growth_stocks_decline: -50,
        value_stocks_outperformance: 10,
        venture_capital_decline: -60,
        employment_impact: -8,
        startup_funding_crisis: 70
      }
    },
    {
      id: 'recession_mild',
      name: 'Mild Recession',
      description: 'Modest economic contraction',
      type: 'recession',
      category: 'Economic Risk',
      severity: 'mild',
      durationYears: 1,
      parameters: {
        gdp_decline: -2,
        unemployment_increase: 3,
        equity_decline: -15,
        corporate_earnings_decline: -20,
        consumer_spending_decline: -5
      }
    },
    {
      id: 'recession_severe',
      name: 'Severe Recession',
      description: 'Major economic downturn',
      type: 'recession',
      category: 'Economic Risk',
      severity: 'severe',
      durationYears: 2,
      parameters: {
        gdp_decline: -6,
        unemployment_increase: 8,
        equity_decline: -35,
        corporate_earnings_decline: -50,
        consumer_spending_decline: -15,
        credit_tightening: 40
      }
    },
    {
      id: 'longevity_extension',
      name: 'Longevity Extension',
      description: 'Living significantly beyond life expectancy',
      type: 'longevity',
      category: 'Longevity Risk',
      severity: 'moderate',
      durationYears: 10,
      parameters: {
        additional_years: 10,
        healthcare_cost_increase: 50,
        care_cost_annual: 50000,
        pension_extension_impact: 25,
        insurance_premium_increase: 30
      }
    },
    
    // ======== NEW PERSONAL CRISIS SCENARIOS ========
    {
      id: 'job_loss_redundancy',
      name: 'Job Loss/Redundancy',
      description: 'Unexpected job loss with typical severance package',
      type: 'personal_crisis',
      category: 'Personal Risk',
      severity: 'moderate',
      durationYears: 1,
      parameters: {
        income_reduction_percent: -100,
        income_disruption_months: 6,
        severance_months: 3,
        unemployment_benefit_percent: 30,
        healthcare_cost_increase: 20,
        emergency_expense: 0
      }
    },
    {
      id: 'major_health_event',
      name: 'Major Health Event',
      description: 'Serious illness requiring extended treatment',
      type: 'personal_crisis',
      category: 'Personal Risk',
      severity: 'severe',
      durationYears: 2,
      parameters: {
        income_reduction_percent: -50,
        income_disruption_months: 12,
        healthcare_cost_increase: 200,
        emergency_expense: 25000,
        care_costs_annual: 30000,
        insurance_gap: 20
      }
    },
    {
      id: 'divorce_separation',
      name: 'Divorce/Separation',
      description: 'Marital dissolution with typical settlement',
      type: 'personal_crisis',
      category: 'Personal Risk',
      severity: 'severe',
      durationYears: 2,
      parameters: {
        divorce_settlement_percent: -50,
        legal_costs: 25000,
        income_adjustment: -20,
        housing_cost_increase: 40,
        emergency_expense: 10000,
        tax_efficiency_loss: 15
      }
    },
    {
      id: 'early_retirement_forced',
      name: 'Forced Early Retirement',
      description: 'Unexpected early exit from workforce',
      type: 'personal_crisis',
      category: 'Personal Risk',
      severity: 'moderate',
      durationYears: 20,
      parameters: {
        income_reduction_percent: -100,
        pension_reduction: -25,
        healthcare_bridge_cost: 15000,
        years_early: 5,
        reduced_contribution_years: 5,
        sequence_risk_multiplier: 1.5
      }
    }
  ];

  /**
   * ENHANCED: Run stress tests with personal crisis handling
   */
  static async runStressTests(
    baseScenario: CashFlowScenario,
    selectedTests?: string[]
  ): Promise<StressTestResults[]> {
    const testsToRun = selectedTests 
      ? this.STRESS_SCENARIOS.filter(s => selectedTests.includes(s.id))
      : this.STRESS_SCENARIOS;

    const results: StressTestResults[] = [];

    for (const stressTest of testsToRun) {
      console.log(`🧪 Running stress test: ${stressTest.name}`);
      
      try {
        // Apply stress parameters to create modified scenario
        const stressedScenario = this.applyStressParameters(baseScenario, stressTest);
        
        // Run Monte Carlo simulation on stressed scenario
        const monteCarloResults = await this.runMonteCarloSimulation(
          stressedScenario, 
          1000 // iterations
        );
        
        // Calculate stress test metrics
        const stressResult: StressTestResults = {
          scenario_id: stressTest.id,
          survival_probability: this.calculateSurvivalProbability(monteCarloResults),
          shortfall_risk: this.calculateShortfallRisk(monteCarloResults),
          worst_case_outcome: this.calculateWorstCase(monteCarloResults),
          resilience_score: this.calculateResilienceScore(stressTest, monteCarloResults),
          recovery_time_years: this.calculateRecoveryTime(stressTest),
          impact_analysis: this.analyzeImpact(baseScenario, stressedScenario),
          mitigation_priority: this.calculateMitigationPriority(stressTest, monteCarloResults)
        };

        results.push(stressResult);

      } catch (error) {
        console.error(`Error running stress test ${stressTest.name}:`, error);
        // Continue with other tests even if one fails
      }
    }

    return results;
  }

  /**
   * ENHANCED: Apply stress parameters with personal crisis handling
   */
  private static applyStressParameters(
    baseScenario: CashFlowScenario,
    stressTest: StressScenario
  ): CashFlowScenario {
    const stressedScenario = { ...baseScenario };
    const params = stressTest.parameters;

    switch (stressTest.type) {
      case 'market_crash':
        // Apply market crash parameters
        this.applyMarketShock(stressedScenario, params.equity_decline ?? 0, params.bond_decline ?? 0);
        break;

      case 'inflation_shock':
        // Apply inflation shock with real return erosion
        stressedScenario.inflationRate = baseScenario.inflationRate + (params.inflation_increase ?? 0);
        stressedScenario.realEquityReturn += (params.real_return_erosion ?? 0);
        stressedScenario.realBondReturn += (params.real_return_erosion ?? 0);
        const expenseMultiplier = params.expense_multiplier ?? 1;
        stressedScenario.currentExpenses = (stressedScenario.currentExpenses ?? 0) * expenseMultiplier;
        break;

      case 'interest_rate':
      case 'interest_rate_shock':
        // Apply interest rate changes
        if (params.rate_increase) {
          stressedScenario.realBondReturn += params.rate_increase - 2; // Assuming duration impact
          stressedScenario.realCashReturn += params.rate_increase;
        } else if (params.rate_floor !== undefined) {
          stressedScenario.realCashReturn = Math.max(params.rate_floor, stressedScenario.realCashReturn);
        }
        break;

      case 'longevity':
        // Apply longevity extension
        const additionalYears = params.additional_years ?? 0;
        stressedScenario.projectionYears += additionalYears;
        stressedScenario.lifeExpectancy += additionalYears;
        const careCostAnnual = params.care_cost_annual ?? 0;
        stressedScenario.currentExpenses = (stressedScenario.currentExpenses ?? 0) + careCostAnnual;
        break;

      case 'personal_crisis':
        // Handle all personal crisis scenarios
        this.applyPersonalCrisisParameters(stressedScenario, params, stressTest);
        break;

      case 'recession':
        // Apply recession parameters
        this.applyMarketShock(stressedScenario, params.equity_decline ?? 0, 0);
        const spendingDecline = params.consumer_spending_decline ?? 0;
        stressedScenario.currentIncome = (stressedScenario.currentIncome ?? 0) * (1 - spendingDecline / 100);
        break;

      case 'geopolitical':
        // Handle geopolitical uncertainty
        this.applyMarketShock(stressedScenario, params.equity_decline ?? 0, 0);
        stressedScenario.inflationRate += params.inflation_increase ?? 0;
        break;

      case 'currency_crisis':
        // Apply currency crisis effects
        stressedScenario.inflationRate += params.import_inflation ?? 0;
        this.applyMarketShock(stressedScenario, params.domestic_equity_decline ?? 0, 0);
        break;

      case 'commodity':
        // Apply commodity price shock
        stressedScenario.inflationRate += params.headline_inflation_spike ?? 0;
        const transportIncrease = params.transport_cost_increase ?? 0;
        stressedScenario.currentExpenses = (stressedScenario.currentExpenses ?? 0) * (1 + transportIncrease / 100);
        break;

      case 'sector':
        // Apply sector-specific stress
        const growthDecline = params.growth_stocks_decline ?? 0;
        this.applyMarketShock(stressedScenario, growthDecline * 0.5, 0);
        break;

      default:
        // Generic stress application
        stressedScenario.realEquityReturn *= 0.8; // 20% reduction
    }

    return stressedScenario;
  }

  /**
   * NEW: Apply personal crisis parameters to scenario
   */
  private static applyPersonalCrisisParameters(
    scenario: CashFlowScenario,
    params: StressParameters,
    stressTest: StressScenario
  ): void {
    const crisisParams = params as unknown as PersonalCrisisParameters;

    switch (stressTest.id) {
      case 'job_loss_redundancy':
        // Income disruption with severance consideration
        const monthlyIncome = (scenario.currentIncome ?? 0) / 12;
        const severanceTotal = monthlyIncome * (crisisParams.severance_months ?? 0);
        const unemploymentBenefit = monthlyIncome * (crisisParams.unemployment_benefit_percent ?? 0) / 100;
        
        // Reduce income but add severance as one-time payment
        scenario.currentIncome = unemploymentBenefit * 12;
        scenario.currentSavings = (scenario.currentSavings ?? 0) + severanceTotal;
        
        // Increase healthcare costs if losing employer coverage
        const healthcareIncrease = crisisParams.healthcare_cost_increase ?? 0;
        scenario.currentExpenses = (scenario.currentExpenses ?? 0) * (1 + healthcareIncrease / 100);
        break;

      case 'major_health_event':
        // Reduce income due to inability to work
        const incomeReduction = crisisParams.income_reduction_percent ?? 0;
        scenario.currentIncome = (scenario.currentIncome ?? 0) * (1 + incomeReduction / 100);
        
        // Add healthcare costs
        const healthcareMultiplier = 1 + (crisisParams.healthcare_cost_increase ?? 0) / 100;
        scenario.currentExpenses = ((scenario.currentExpenses ?? 0) + (crisisParams.emergency_expense ?? 0)) * healthcareMultiplier;
        
        // Add ongoing care costs
        if (crisisParams.care_costs_annual) {
          scenario.currentExpenses = (scenario.currentExpenses ?? 0) + crisisParams.care_costs_annual;
        }
        break;

      case 'divorce_separation':
        // Split assets
        const settlementPercent = (crisisParams.divorce_settlement_percent ?? -50) / 100;
        scenario.currentSavings = (scenario.currentSavings ?? 0) * (1 + settlementPercent);
        scenario.pensionValue = (scenario.pensionValue ?? 0) * (1 + settlementPercent);
        scenario.investmentValue = (scenario.investmentValue ?? 0) * (1 + settlementPercent);
        
        // Deduct legal costs
        scenario.currentSavings = (scenario.currentSavings ?? 0) - (crisisParams.legal_costs ?? 0);
        
        // Adjust ongoing expenses (single household vs joint)
        scenario.currentExpenses = (scenario.currentExpenses ?? 0) * 1.4; // Typically 40% increase
        break;

      case 'early_retirement_forced':
        // Complete income loss
        scenario.currentIncome = 0;
        
        // Reduce pension value due to early access penalties
        const pensionReduction = crisisParams.pension_reduction ?? 25;
        scenario.pensionValue = (scenario.pensionValue ?? 0) * (1 - pensionReduction / 100);
        
        // Add healthcare bridge costs until state pension age
        const bridgeCostAnnual = crisisParams.healthcare_bridge_cost ?? 0;
        scenario.currentExpenses = (scenario.currentExpenses ?? 0) + bridgeCostAnnual;
        
        // Increase sequence risk for early retirement
        scenario.realEquityReturn *= 0.9; // Additional 10% reduction for sequence risk
        break;
    }
  }

  private static applyMarketShock(
    scenario: CashFlowScenario,
    equityShockPercent: number,
    bondShockPercent: number
  ): void {
    const equityWeight = (scenario.equityAllocation || 0) / 100;
    const bondWeight = (scenario.bondAllocation || 0) / 100;
    const cashWeight = (scenario.cashAllocation || 0) / 100;
    const totalWeight = equityWeight + bondWeight + cashWeight;
    const normalizedEquity = totalWeight > 0 ? equityWeight / totalWeight : 0.6;
    const normalizedBond = totalWeight > 0 ? bondWeight / totalWeight : 0.3;
    const normalizedCash = totalWeight > 0 ? cashWeight / totalWeight : 0.1;

    const weightedShock = (normalizedEquity * equityShockPercent) + (normalizedBond * bondShockPercent);
    const shockMultiplier = 1 + (weightedShock / 100);

    scenario.investmentValue = (scenario.investmentValue ?? 0) * shockMultiplier;
    scenario.currentSavings = (scenario.currentSavings ?? 0) * (1 + (normalizedCash * equityShockPercent) / 100);
    scenario.pensionValue = (scenario.pensionValue ?? 0) * shockMultiplier;
    scenario.pensionPotValue = (scenario.pensionPotValue ?? 0) * shockMultiplier;
  }

  /**
   * NEW: Calculate mitigation priority based on severity and impact
   */
  private static calculateMitigationPriority(
    stressTest: StressScenario,
    results: MonteCarloResults
  ): 'immediate' | 'short_term' | 'long_term' {
    const survivalProb = this.calculateSurvivalProbability(results);
    
    // Personal crisis scenarios often require immediate action
    if (stressTest.category === 'Personal Risk' && survivalProb < 70) {
      return 'immediate';
    }
    
    // Severe scenarios with low survival probability
    if (stressTest.severity === 'severe' && survivalProb < 60) {
      return 'immediate';
    }
    
    // Moderate impact scenarios
    if (survivalProb >= 60 && survivalProb < 80) {
      return 'short_term';
    }
    
    // Lower priority for mild scenarios or high survival probability
    return 'long_term';
  }

  /**
   * ENHANCED: Integration with existing Monte Carlo engine
   */
  private static async runMonteCarloSimulation(
    scenario: CashFlowScenario,
    iterations: number
  ): Promise<MonteCarloResults> {
    const simulationInput = this.buildSimulationInput(scenario, iterations);
    const engine = createMonteCarloEngine();
    const results = await engine.runSimulation(simulationInput);

    const simulations: MonteCarloSimulation[] = results.simulations.map((simulation, index) => ({
      simulationId: index,
      finalPortfolioValue: simulation.finalWealth,
      shortfallYears: simulation.yearlyWealth
        .map((value, yearIndex) => (value <= 0 ? yearIndex + 1 : null))
        .filter((year): year is number => year !== null),
      success: simulation.success,
      maxDrawdown: simulation.maxDrawdown
    }));

    const values = simulations.map(s => s.finalPortfolioValue).sort((a, b) => a - b);

    return {
      simulations,
      confidenceIntervals: {
        percentile10: results.confidenceIntervals.p10,
        percentile25: results.confidenceIntervals.p25,
        percentile50: results.confidenceIntervals.p50,
        percentile75: results.confidenceIntervals.p75,
        percentile90: results.confidenceIntervals.p90
      },
      successProbability: results.successProbability,
      averageOutcome: results.averageFinalWealth,
      standardDeviation: this.calculateStandardDeviation(values),
      maxDrawdown: results.maxDrawdown
    };
  }

  private static buildSimulationInput(
    scenario: CashFlowScenario,
    iterations: number
  ): SimulationInput {
    const initialWealth =
      (scenario.currentSavings ?? 0) +
      (scenario.investmentValue ?? 0) +
      (scenario.pensionPotValue ?? scenario.pensionValue ?? 0);
    const timeHorizon = scenario.projectionYears ?? 30;
    const inflationRate = (scenario.inflationRate ?? 2.5) / 100;
    const retirementTarget = scenario.retirementIncomeTarget || scenario.currentExpenses || 0;
    const guaranteedIncome = (scenario.statePensionAmount ?? 0) + (scenario.otherIncome ?? 0);
    const withdrawalAmount = Math.max(0, retirementTarget - guaranteedIncome);
    const riskScore = scenario.riskScore ?? 5;

    const rawAllocations = [
      (scenario.equityAllocation ?? 0) / 100,
      (scenario.bondAllocation ?? 0) / 100,
      (scenario.cashAllocation ?? 0) / 100,
      (scenario.alternativeAllocation ?? 0) / 100
    ];
    const [equity, bonds, cash, alternatives] = this.normalizeAllocation(rawAllocations);
    const nominalEquity = ((scenario.realEquityReturn ?? 0) + (scenario.inflationRate ?? 0)) / 100;
    const nominalBond = ((scenario.realBondReturn ?? 0) + (scenario.inflationRate ?? 0)) / 100;
    const nominalCash = ((scenario.realCashReturn ?? 0) + (scenario.inflationRate ?? 0)) / 100;

    return {
      initialWealth,
      timeHorizon,
      withdrawalAmount,
      riskScore,
      inflationRate,
      simulationCount: iterations,
      assetAllocation: {
        equity,
        bonds,
        cash,
        alternatives: alternatives > 0 ? alternatives : undefined
      },
      returnAssumptions: {
        equity: nominalEquity,
        bonds: nominalBond,
        cash: nominalCash,
        alternatives: nominalEquity
      }
    };
  }

  private static normalizeAllocation(values: number[]): number[] {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return [0.6, 0.3, 0.1, 0];
    return values.map((value) => value / total);
  }

  /**
   * Generate random returns using normal distribution approximation
   */
  private static generateRandomReturn(): number {
    // Box-Muller transformation for normal distribution
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return z * 0.15; // 15% volatility
  }

  /**
   * Calculate standard deviation
   */
  private static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate survival probability from Monte Carlo results
   */
  private static calculateSurvivalProbability(results: MonteCarloResults): number {
    const successfulRuns = results.simulations.filter(sim => sim.finalPortfolioValue > 0).length;
    return (successfulRuns / results.simulations.length) * 100;
  }

  /**
   * Calculate shortfall risk from Monte Carlo results
   */
  private static calculateShortfallRisk(results: MonteCarloResults): number {
    const shortfallRuns = results.simulations.filter(sim => sim.finalPortfolioValue <= 0).length;
    return (shortfallRuns / results.simulations.length) * 100;
  }

  /**
   * Calculate worst case outcome
   */
  private static calculateWorstCase(results: MonteCarloResults): number {
    return Math.min(...results.simulations.map(sim => sim.finalPortfolioValue));
  }

  /**
   * ENHANCED: Calculate resilience score with personal crisis consideration
   */
  private static calculateResilienceScore(
    stressTest: StressScenario, 
    results: MonteCarloResults
  ): number {
    const survivalProb = this.calculateSurvivalProbability(results);
    
    // Different scoring weights for personal crisis
    if (stressTest.category === 'Personal Risk') {
      // Personal crises are often unavoidable, so we score resilience differently
      const severityWeight = stressTest.severity === 'severe' ? 0.6 : 
                            stressTest.severity === 'moderate' ? 0.8 : 1.0;
      
      // Give more weight to recovery capability for personal crises
      const recoveryBonus = results.confidenceIntervals.percentile50 > 0 ? 15 : 0;
      const baseScore = survivalProb * severityWeight;
      
      return Math.min(100, Math.max(0, baseScore + recoveryBonus));
    }
    
    // Original scoring for market/economic scenarios
    const severityWeight = stressTest.severity === 'severe' ? 0.5 : 
                          stressTest.severity === 'moderate' ? 0.75 : 1.0;
    
    const baseScore = survivalProb * severityWeight;
    const outcomeBonus = results.averageOutcome > 0 ? 10 : 0;
    
    return Math.min(100, Math.max(0, baseScore + outcomeBonus));
  }

  /**
   * ENHANCED: Calculate recovery time with personal crisis patterns
   */
  private static calculateRecoveryTime(stressTest: StressScenario): number | undefined {
    // Personal crisis recovery patterns differ from market events
    if (stressTest.category === 'Personal Risk') {
      switch (stressTest.id) {
        case 'job_loss_redundancy':
          return 1; // Typically find new employment within a year
        case 'major_health_event':
          return 2; // Health recovery and financial stabilization
        case 'divorce_separation':
          return 3; // Time to rebuild and stabilize
        case 'early_retirement_forced':
          return undefined; // No recovery - permanent state change
        default:
          return 2;
      }
    }
    
    // Original recovery time calculation for market events
    const baseRecovery = stressTest.durationYears;
    const severityMultiplier = stressTest.severity === 'severe' ? 2 : 
                              stressTest.severity === 'moderate' ? 1.5 : 1;
    
    return Math.round(baseRecovery * severityMultiplier);
  }

  /**
   * Analyze impact between base and stressed scenarios
   */
  private static analyzeImpact(
    baseScenario: CashFlowScenario,
    stressedScenario: CashFlowScenario
  ) {
    const baseReturn = baseScenario.realEquityReturn;
    const stressedReturn = stressedScenario.realEquityReturn;
    const portfolioDecline = baseReturn !== 0 
      ? ((stressedReturn - baseReturn) / Math.abs(baseReturn)) * 100 
      : 0;

    const baseIncome = baseScenario.currentIncome ?? 0;
    const stressedIncome = stressedScenario.currentIncome ?? 0;
    const incomeReduction = baseIncome !== 0 
      ? ((stressedIncome - baseIncome) / baseIncome) * 100 
      : 0;

    const baseExpenses = baseScenario.currentExpenses ?? 0;
    const stressedExpenses = stressedScenario.currentExpenses ?? 0;
    const expenseIncrease = baseExpenses !== 0 
      ? ((stressedExpenses - baseExpenses) / baseExpenses) * 100 
      : 0;

    return {
      portfolio_decline_percent: Math.min(0, portfolioDecline), // Ensure negative
      income_reduction_percent: Math.min(0, incomeReduction),
      expense_increase_percent: Math.max(0, expenseIncrease)
    };
  }

  /**
   * Get available stress scenarios for UI
   */
  static getAvailableScenarios(): StressScenario[] {
    return this.STRESS_SCENARIOS;
  }

  /**
   * Get scenario by ID
   */
  static getScenarioById(id: string): StressScenario | undefined {
    return this.STRESS_SCENARIOS.find(scenario => scenario.id === id);
  }

  /**
   * NEW: Get scenarios by category for organized display
   */
  static getScenariosByCategory(): Record<string, StressScenario[]> {
    const categories: Record<string, StressScenario[]> = {};
    
    this.STRESS_SCENARIOS.forEach(scenario => {
      if (!categories[scenario.category]) {
        categories[scenario.category] = [];
      }
      categories[scenario.category].push(scenario);
    });
    
    return categories;
  }

  /**
   * NEW: Get personal crisis scenarios specifically
   */
  static getPersonalCrisisScenarios(): StressScenario[] {
    return this.STRESS_SCENARIOS.filter(s => s.category === 'Personal Risk');
  }
}
