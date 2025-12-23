// ================================================================
// src/lib/cashflow/projectionEngine.ts
// Core projection calculation engine with full type safety
// ================================================================

import type {
  CashFlowScenario,
  CashFlowProjection,
  ProjectionResult,
  ProjectionSummary,
  RiskMetrics
} from '@/types/cashflow';

/**
 * Safe division helper to prevent divide-by-zero errors
 * Returns fallback value if denominator is 0, NaN, or Infinity
 */
function safeRatio(numerator: number, denominator: number, fallback: number = 0): number {
  if (!Number.isFinite(denominator) || denominator === 0) return fallback;
  if (!Number.isFinite(numerator)) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export interface YearlyCalculation {
  year: number;
  age: number;
  
  // Income streams
  employmentIncome: number;
  pensionIncome: number;
  statePension: number;
  investmentIncome: number;
  otherIncome: number;
  totalIncome: number;
  
  // Expenses
  essentialExpenses: number;
  lifestyleExpenses: number;
  discretionaryExpenses: number;
  totalExpenses: number;
  
  // Assets
  pensionPotValue: number;
  investmentPortfolio: number;
  cashSavings: number;
  totalAssets: number;
  
  // Flow
  annualSurplusDeficit: number;
  portfolioBalance: number;
  realTermsValue: number;
  sustainabilityRatio: number;
}

export class ProjectionEngine {
  /**
   * Main entry point - generates complete projection result
   */
  static async generateProjections(scenario: CashFlowScenario): Promise<ProjectionResult> {
    const yearlyProjections = this.calculateYearByYear(scenario);
    const projections = this.convertToProjectionFormat(yearlyProjections, scenario.id);
    const summary = this.generateSummary(scenario, yearlyProjections);
    
    return {
      scenario,
      projections,
      summary
    };
  }

  /**
   * Core year-by-year calculation logic
   */
  private static calculateYearByYear(scenario: CashFlowScenario): YearlyCalculation[] {
    const projections: YearlyCalculation[] = [];
    let currentAge = scenario.clientAge;
    let pensionPot = scenario.pensionPotValue || scenario.pensionValue || 0;
    let investmentPortfolio = scenario.investmentValue || 0;
    let cashSavings = scenario.currentSavings || 0;
    let currentIncome = scenario.currentIncome || 0;
    let currentExpenses = scenario.currentExpenses || 0;

    for (let year = 0; year < scenario.projectionYears; year++) {
      const age = currentAge + year;
      const isRetired = age >= scenario.retirementAge;
      const receivesStatePension = age >= scenario.statePensionAge;

      // Calculate income for this year
      const employmentIncome = isRetired ? 0 : this.inflateValue(currentIncome, scenario.inflationRate, year);
      const pensionIncome = this.calculatePensionIncome(isRetired, pensionPot, scenario);
      const statePension = receivesStatePension ? this.inflateValue(scenario.statePensionAmount || 0, scenario.inflationRate, year) : 0;
      const investmentIncome = this.calculateInvestmentIncome(investmentPortfolio, scenario);
      const otherIncome = this.inflateValue(scenario.otherIncome || 0, scenario.inflationRate, year);
      const totalIncome = employmentIncome + pensionIncome + statePension + investmentIncome + otherIncome;

      // Calculate expenses for this year
      const inflatedExpenses = this.inflateValue(currentExpenses, scenario.inflationRate, year);
      const essentialExpenses = inflatedExpenses * 0.6; // Assume 60% essential
      const lifestyleExpenses = inflatedExpenses * 0.3; // 30% lifestyle
      const discretionaryExpenses = inflatedExpenses * 0.1; // 10% discretionary
      const totalExpenses = essentialExpenses + lifestyleExpenses + discretionaryExpenses;

      // Calculate annual surplus/deficit
      const annualSurplusDeficit = totalIncome - totalExpenses;

      // Update asset values with investment returns
      if (!isRetired && year > 0) {
        // Add pension contributions before retirement
        pensionPot += scenario.pensionContributions || 0;
      }

      // Apply investment returns
      pensionPot = this.applyInvestmentReturn(pensionPot, scenario.realEquityReturn, scenario.inflationRate);
      investmentPortfolio = this.applyInvestmentReturn(investmentPortfolio, scenario.realEquityReturn, scenario.inflationRate);
      cashSavings = this.applyInvestmentReturn(cashSavings, scenario.realCashReturn, scenario.inflationRate);

      // Handle withdrawals if retired and insufficient income
      if (isRetired && annualSurplusDeficit < 0) {
        const shortfall = Math.abs(annualSurplusDeficit);
        const totalAvailable = investmentPortfolio + cashSavings;
        
        if (totalAvailable >= shortfall) {
          // Withdraw from investments first, then cash
          const fromInvestments = Math.min(shortfall, investmentPortfolio);
          const fromCash = shortfall - fromInvestments;
          
          investmentPortfolio -= fromInvestments;
          cashSavings -= fromCash;
        }
      } else if (annualSurplusDeficit > 0) {
        // Add surplus to investments
        investmentPortfolio += annualSurplusDeficit;
      }

      const totalAssets = pensionPot + investmentPortfolio + cashSavings;
      const portfolioBalance = investmentPortfolio + cashSavings;
      const realTermsValue = this.deflateValue(totalAssets, scenario.inflationRate, year);
      // FIX: Use safeRatio to prevent divide-by-zero when totalExpenses is 0
      // Ratio > 1 means income exceeds expenses (sustainable)
      const sustainabilityRatio = safeRatio(totalIncome, totalExpenses, 1);

      projections.push({
        year,
        age,
        employmentIncome,
        pensionIncome,
        statePension,
        investmentIncome,
        otherIncome,
        totalIncome,
        essentialExpenses,
        lifestyleExpenses,
        discretionaryExpenses,
        totalExpenses,
        pensionPotValue: pensionPot,
        investmentPortfolio,
        cashSavings,
        totalAssets,
        annualSurplusDeficit,
        portfolioBalance,
        realTermsValue,
        sustainabilityRatio
      });
    }

    return projections;
  }

  /**
   * Convert yearly calculations to database projection format
   */
  private static convertToProjectionFormat(
    yearlyCalculations: YearlyCalculation[], 
    scenarioId: string
  ): CashFlowProjection[] {
    return yearlyCalculations.map((calc, index) => ({
      id: `${scenarioId}-proj-${index}`,
      scenarioId,
      projectionYear: calc.year,
      clientAge: calc.age,
      employmentIncome: calc.employmentIncome,
      pensionIncome: calc.pensionIncome,
      statePension: calc.statePension,
      investmentIncome: calc.investmentIncome,
      otherIncome: calc.otherIncome,
      totalIncome: calc.totalIncome,
      essentialExpenses: calc.essentialExpenses,
      lifestyleExpenses: calc.lifestyleExpenses,
      discretionaryExpenses: calc.discretionaryExpenses,
      totalExpenses: calc.totalExpenses,
      pensionPotValue: calc.pensionPotValue,
      investmentPortfolio: calc.investmentPortfolio,
      cashSavings: calc.cashSavings,
      totalAssets: calc.totalAssets,
      annualSurplusDeficit: calc.annualSurplusDeficit,
      portfolioBalance: calc.portfolioBalance, // ADD: Missing required property
      realTermsValue: calc.realTermsValue,
      sustainabilityRatio: calc.sustainabilityRatio, // ADD: Missing sustainability ratio
      createdAt: new Date().toISOString()
    }));
  }

  /**
   * Generate projection summary with key insights
   */
  private static generateSummary(
    scenario: CashFlowScenario, 
    projections: YearlyCalculation[]
  ): ProjectionSummary {
    const finalProjection = projections[projections.length - 1];
    const finalPortfolioValue = finalProjection?.totalAssets || 0;
    
    // Calculate total contributions and withdrawals
    const totalContributions = projections.reduce((sum, p) => 
      sum + Math.max(0, p.annualSurplusDeficit), 0
    );
    const totalWithdrawals = projections.reduce((sum, p) => 
      sum + Math.abs(Math.min(0, p.annualSurplusDeficit)), 0
    );

    // Calculate maximum safe withdrawal rate
    const maxWithdrawalRate = this.calculateMaxWithdrawalRate(projections);
    
    // Calculate average return
    const averageAnnualReturn = this.calculateAverageReturn(scenario);

    // Check goal achievement
    const retirementIncomeAchieved = this.checkRetirementIncomeGoal(scenario, projections);
    const emergencyFundAchieved = finalPortfolioValue >= (scenario.emergencyFundTarget || 0);
    const goalAchievementRate = this.calculateGoalAchievementRate(scenario, projections);

    // Determine sustainability rating
    const sustainabilityRating = this.calculateSustainabilityRating(projections);

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(scenario, projections);

    // Generate key insights
    const keyInsights = this.generateKeyInsights(scenario, projections, finalPortfolioValue);

    return {
      projectionYears: scenario.projectionYears,
      finalPortfolioValue,
      totalContributions,
      totalWithdrawals,
      maxWithdrawalRate,
      averageAnnualReturn,
      retirementIncomeAchieved,
      emergencyFundAchieved,
      goalAchievementRate,
      sustainabilityRating,
      riskMetrics,
      keyInsights
    };
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  private static inflateValue(value: number, inflationRate: number, years: number): number {
    return value * Math.pow(1 + (inflationRate / 100), years);
  }

  private static deflateValue(value: number, inflationRate: number, years: number): number {
    return value / Math.pow(1 + (inflationRate / 100), years);
  }

  private static applyInvestmentReturn(value: number, realReturn: number, inflationRate: number): number {
    const nominalReturn = realReturn + inflationRate;
    return value * (1 + (nominalReturn / 100));
  }

  private static calculatePensionIncome(isRetired: boolean, pensionPot: number, scenario: CashFlowScenario): number {
    if (!isRetired || pensionPot <= 0) return 0;
    
    // Use 4% rule or calculate based on life expectancy
    const withdrawalRate = 0.04; // 4% safe withdrawal rate
    return pensionPot * withdrawalRate;
  }

  private static calculateInvestmentIncome(portfolio: number, scenario: CashFlowScenario): number {
    // Calculate dividend yield (assumed 2% of portfolio)
    return portfolio * 0.02;
  }

  private static calculateMaxWithdrawalRate(projections: YearlyCalculation[]): number {
    const retirementProjections = projections.filter(p => p.pensionIncome > 0);
    if (retirementProjections.length === 0) return 0;

    // FIX: Use safeRatio to prevent divide-by-zero
    const avgPortfolioValue = safeRatio(
      retirementProjections.reduce((sum, p) => sum + p.portfolioBalance, 0),
      retirementProjections.length,
      0
    );
    const avgWithdrawal = safeRatio(
      retirementProjections.reduce((sum, p) => sum + Math.abs(Math.min(0, p.annualSurplusDeficit)), 0),
      retirementProjections.length,
      0
    );

    return safeRatio(avgWithdrawal, avgPortfolioValue, 0) * 100;
  }

  private static calculateAverageReturn(scenario: CashFlowScenario): number {
    const equityWeight = scenario.equityAllocation / 100;
    const bondWeight = scenario.bondAllocation / 100;
    const cashWeight = scenario.cashAllocation / 100;

    return (equityWeight * scenario.realEquityReturn) + 
           (bondWeight * scenario.realBondReturn) + 
           (cashWeight * scenario.realCashReturn);
  }

  private static checkRetirementIncomeGoal(scenario: CashFlowScenario, projections: YearlyCalculation[]): boolean {
    const retirementProjections = projections.filter(p => p.age >= scenario.retirementAge);
    if (retirementProjections.length === 0) return false;

    const avgRetirementIncome = retirementProjections.reduce((sum, p) => sum + p.totalIncome, 0) / retirementProjections.length;
    return avgRetirementIncome >= (scenario.retirementIncomeTarget || 0);
  }

  private static calculateGoalAchievementRate(scenario: CashFlowScenario, projections: YearlyCalculation[]): number {
    let achievedGoals = 0;
    let totalGoals = 0;

    // Check retirement income goal
    totalGoals++;
    if (this.checkRetirementIncomeGoal(scenario, projections)) achievedGoals++;

    // Check emergency fund goal
    totalGoals++;
    const finalAssets = projections[projections.length - 1]?.totalAssets || 0;
    if (finalAssets >= (scenario.emergencyFundTarget || 0)) achievedGoals++;

    // Check legacy goal
    if (scenario.legacyTarget && scenario.legacyTarget > 0) {
      totalGoals++;
      if (finalAssets >= scenario.legacyTarget) achievedGoals++;
    }

    // FIX: Use safeRatio to prevent divide-by-zero
    return safeRatio(achievedGoals, totalGoals, 100) * 100;
  }

  private static calculateSustainabilityRating(projections: YearlyCalculation[]): "Excellent" | "Good" | "Adequate" | "Poor" | "Critical" {
    const finalProjection = projections[projections.length - 1];
    if (!finalProjection) return "Critical";

    // FIX: Use safeRatio to prevent divide-by-zero
    const avgSustainabilityRatio = safeRatio(
      projections.reduce((sum, p) => sum + p.sustainabilityRatio, 0),
      projections.length,
      0
    );
    const finalAssets = finalProjection.totalAssets;

    if (avgSustainabilityRatio > 1.5 && finalAssets > 0) return "Excellent";
    if (avgSustainabilityRatio > 1.2 && finalAssets > 0) return "Good";
    if (avgSustainabilityRatio > 1.0 && finalAssets > 0) return "Adequate";
    if (avgSustainabilityRatio > 0.8) return "Poor";
    return "Critical";
  }

  private static calculateRiskMetrics(scenario: CashFlowScenario, projections: YearlyCalculation[]): RiskMetrics {
    const finalAssets = projections[projections.length - 1]?.totalAssets || 0;
    const shortfallYears = projections.filter(p => p.totalAssets <= 0).length;
    const totalYears = projections.length;

    return {
      shortfallRisk: shortfallYears > totalYears * 0.2 ? 'High' : shortfallYears > totalYears * 0.1 ? 'Medium' : 'Low',
      longevityRisk: scenario.lifeExpectancy > 85 ? 'High' : scenario.lifeExpectancy > 80 ? 'Medium' : 'Low',
      inflationRisk: scenario.inflationRate > 3 ? 'High' : scenario.inflationRate > 2 ? 'Medium' : 'Low',
      sequenceRisk: scenario.realEquityReturn > 6 ? 'High' : scenario.realEquityReturn > 4 ? 'Medium' : 'Low'
    };
  }

  private static generateKeyInsights(scenario: CashFlowScenario, projections: YearlyCalculation[], finalValue: number): string[] {
    const insights: string[] = [];
    
    // Retirement readiness
    const retirementAge = scenario.retirementAge;
    const retirementProjection = projections.find(p => p.age === retirementAge);
    if (retirementProjection) {
      insights.push(`At retirement (age ${retirementAge}), projected portfolio value: £${Math.round(retirementProjection.totalAssets).toLocaleString()}`);
    }

    // Shortfall risk
    const shortfallYears = projections.filter(p => p.totalAssets <= 0).length;
    if (shortfallYears > 0) {
      insights.push(`Portfolio may be depleted in ${shortfallYears} out of ${projections.length} projection years`);
    } else {
      insights.push(`Portfolio remains positive throughout the projection period`);
    }

    // Final value
    if (finalValue > 0) {
      insights.push(`Projected final portfolio value: £${Math.round(finalValue).toLocaleString()}`);
    }

    // Income replacement
    const currentIncome = scenario.currentIncome || 0;
    const retirementIncome = retirementProjection?.totalIncome || 0;
    // FIX: Use safeRatio to prevent divide-by-zero
    const replacementRatio = safeRatio(retirementIncome, currentIncome, 0) * 100;
    if (currentIncome > 0 && Number.isFinite(replacementRatio)) {
      insights.push(`Retirement income replaces ${Math.round(replacementRatio)}% of current income`);
    }

    return insights;
  }
}