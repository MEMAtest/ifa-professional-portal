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

  // Contributions
  pensionContribution: number;
  
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
    const hasDetailedExpenses = (scenario.essentialExpenses || 0) > 0 ||
      (scenario.lifestyleExpenses || 0) > 0 ||
      (scenario.discretionaryExpenses || 0) > 0;
    const baseEssentialExpenses = hasDetailedExpenses
      ? (scenario.essentialExpenses || 0)
      : currentExpenses * 0.6;
    const baseLifestyleExpenses = hasDetailedExpenses
      ? (scenario.lifestyleExpenses || 0)
      : currentExpenses * 0.3;
    const baseDiscretionaryExpenses = hasDetailedExpenses
      ? (scenario.discretionaryExpenses || 0)
      : currentExpenses * 0.1;

    for (let year = 0; year < scenario.projectionYears; year++) {
      const age = currentAge + year;
      const isRetired = age >= scenario.retirementAge;
      const receivesStatePension = age >= scenario.statePensionAge;
      const inflationRateForYear = this.getInflationRateForYear(scenario, year);

      // Calculate income for this year
      const employmentIncome = isRetired ? 0 : this.inflateValueByYear(currentIncome, scenario, year);
      const statePension = receivesStatePension ? this.inflateValueByYear(scenario.statePensionAmount || 0, scenario, year) : 0;
      const otherIncome = this.inflateValueByYear(scenario.otherIncome || 0, scenario, year);
      const baseIncome = employmentIncome + statePension + otherIncome;

      // Calculate expenses for this year
      const essentialExpenses = this.inflateValueByYear(baseEssentialExpenses, scenario, year);
      const lifestyleExpenses = this.inflateValueByYear(baseLifestyleExpenses, scenario, year);
      const discretionaryExpenses = this.inflateValueByYear(baseDiscretionaryExpenses, scenario, year);
      const totalExpenses = essentialExpenses + lifestyleExpenses + discretionaryExpenses;

      // Contributions reduce available surplus before retirement
      const pensionContribution = !isRetired ? (scenario.pensionContributions || 0) : 0;
      if (pensionContribution > 0) {
        pensionPot += pensionContribution;
      }

      // Apply investment returns
      const portfolioRealReturn = this.calculatePortfolioRealReturn(scenario);
      pensionPot = this.applyInvestmentReturn(pensionPot, portfolioRealReturn, inflationRateForYear);
      investmentPortfolio = this.applyInvestmentReturn(investmentPortfolio, portfolioRealReturn, inflationRateForYear);
      cashSavings = this.applyInvestmentReturn(cashSavings, scenario.realCashReturn, inflationRateForYear);

      // Apply sequence-of-returns shock for capacity-for-loss scenario
      if (this.isSequenceShockYear(scenario, age)) {
        pensionPot *= 0.8;
        investmentPortfolio *= 0.8;
      }

      // Planned pension drawdown in retirement (reduces pension pot)
      let pensionIncome = 0;
      if (isRetired && pensionPot > 0) {
        const plannedWithdrawal = pensionPot * 0.04;
        pensionIncome = Math.min(plannedWithdrawal, pensionPot);
        pensionPot -= pensionIncome;
      }

      // Cover any remaining shortfall using liquid assets (cash then investments), pension last if needed
      let investmentIncome = 0;
      let remainingShortfall = (totalExpenses + pensionContribution) - (baseIncome + pensionIncome);
      if (remainingShortfall > 0) {
        const fromCash = Math.min(remainingShortfall, cashSavings);
        cashSavings -= fromCash;
        remainingShortfall -= fromCash;

        const fromInvestments = Math.min(remainingShortfall, investmentPortfolio);
        investmentPortfolio -= fromInvestments;
        remainingShortfall -= fromInvestments;

        investmentIncome = fromCash + fromInvestments;

        if (remainingShortfall > 0 && pensionPot > 0) {
          const fromPension = Math.min(remainingShortfall, pensionPot);
          pensionPot -= fromPension;
          pensionIncome += fromPension;
          remainingShortfall -= fromPension;
        }
      }

      const totalIncome = baseIncome + pensionIncome + investmentIncome;
      const annualSurplusDeficit = totalIncome - totalExpenses - pensionContribution;
      if (annualSurplusDeficit > 0) {
        investmentPortfolio += annualSurplusDeficit;
      }

      const totalAssets = pensionPot + investmentPortfolio + cashSavings;
      const portfolioBalance = investmentPortfolio + cashSavings;
      const realTermsValue = this.deflateValueByYear(totalAssets, scenario, year);
      // FIX: Use safeRatio to prevent divide-by-zero when totalExpenses is 0
      // Ratio > 1 means income exceeds expenses (sustainable)
      const sustainabilityRatio = safeRatio(baseIncome, totalExpenses, 1);

      projections.push({
        year,
        age,
        employmentIncome,
        pensionIncome,
        statePension,
        investmentIncome,
        otherIncome,
        totalIncome,
        pensionContribution,
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
      sum + p.pensionContribution + Math.max(0, p.annualSurplusDeficit), 0
    );
    const totalWithdrawals = projections.reduce((sum, p) =>
      sum + p.pensionIncome + p.investmentIncome, 0
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

  private static getInflationRateForYear(scenario: CashFlowScenario, year: number): number {
    if (scenario.scenarioType === 'high_inflation' && year < 10) {
      return 5.0;
    }
    if (scenario.scenarioType === 'high_inflation') {
      return 2.5;
    }
    return scenario.inflationRate;
  }

  private static getInflationFactor(scenario: CashFlowScenario, years: number): number {
    let factor = 1;
    for (let i = 0; i < years; i++) {
      const rate = this.getInflationRateForYear(scenario, i);
      factor *= 1 + (rate / 100);
    }
    return factor;
  }

  private static inflateValueByYear(value: number, scenario: CashFlowScenario, years: number): number {
    return value * this.getInflationFactor(scenario, years);
  }

  private static deflateValueByYear(value: number, scenario: CashFlowScenario, years: number): number {
    return value / this.getInflationFactor(scenario, years);
  }

  private static isSequenceShockYear(scenario: CashFlowScenario, age: number): boolean {
    if (scenario.scenarioType !== 'capacity_for_loss') return false;
    const yearsIntoRetirement = age - scenario.retirementAge;
    return yearsIntoRetirement >= 0 && yearsIntoRetirement < 2;
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

  private static calculateMaxWithdrawalRate(projections: YearlyCalculation[]): number {
    const retirementProjections = projections.filter(p => (p.pensionIncome + p.investmentIncome) > 0);
    if (retirementProjections.length === 0) return 0;

    // FIX: Use safeRatio to prevent divide-by-zero
    const avgPortfolioValue = safeRatio(
      retirementProjections.reduce((sum, p) => sum + p.totalAssets, 0),
      retirementProjections.length,
      0
    );
    const avgWithdrawal = safeRatio(
      retirementProjections.reduce((sum, p) => sum + p.pensionIncome + p.investmentIncome, 0),
      retirementProjections.length,
      0
    );

    return safeRatio(avgWithdrawal, avgPortfolioValue, 0) * 100;
  }

  private static calculatePortfolioRealReturn(scenario: CashFlowScenario): number {
    const rawEquityWeight = (scenario.equityAllocation || 0) + (scenario.alternativeAllocation || 0);
    const rawBondWeight = scenario.bondAllocation || 0;
    const rawCashWeight = scenario.cashAllocation || 0;
    const totalWeight = rawEquityWeight + rawBondWeight + rawCashWeight;

    if (totalWeight <= 0) {
      return scenario.realEquityReturn;
    }

    const equityWeight = rawEquityWeight / totalWeight;
    const bondWeight = rawBondWeight / totalWeight;
    const cashWeight = rawCashWeight / totalWeight;

    return (equityWeight * scenario.realEquityReturn) +
           (bondWeight * scenario.realBondReturn) +
           (cashWeight * scenario.realCashReturn);
  }

  private static calculateAverageReturn(scenario: CashFlowScenario): number {
    return this.calculatePortfolioRealReturn(scenario);
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

    const inflationRisk =
      scenario.scenarioType === 'high_inflation'
        ? 'High'
        : scenario.inflationRate > 3
          ? 'High'
          : scenario.inflationRate > 2
            ? 'Medium'
            : 'Low';

    const sequenceRisk =
      scenario.scenarioType === 'capacity_for_loss'
        ? 'High'
        : scenario.realEquityReturn > 6
          ? 'High'
          : scenario.realEquityReturn > 4
            ? 'Medium'
            : 'Low';

    return {
      shortfallRisk: shortfallYears > totalYears * 0.2 ? 'High' : shortfallYears > totalYears * 0.1 ? 'Medium' : 'Low',
      longevityRisk: scenario.lifeExpectancy > 85 ? 'High' : scenario.lifeExpectancy > 80 ? 'Medium' : 'Low',
      inflationRisk,
      sequenceRisk
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
    const firstShortfall = projections.find(p => p.totalAssets <= 0);
    if (shortfallYears > 0) {
      insights.push(`Portfolio may be depleted in ${shortfallYears} out of ${projections.length} projection years`);
    } else {
      insights.push(`Portfolio remains positive throughout the projection period`);
    }

    // Shortfall year insight when sustainability is below target
    const sustainabilityRating = this.calculateSustainabilityRating(projections);
    if (sustainabilityRating !== 'Excellent' && sustainabilityRating !== 'Good') {
      if (firstShortfall) {
        insights.push(`Potential cash shortfall identified at age ${firstShortfall.age}`);
      } else {
        insights.push(`Sustainability below target; review withdrawal rate and expenses`);
      }
    }

    // Final value
    if (finalValue > 0) {
      insights.push(`Projected final portfolio value: £${Math.round(finalValue).toLocaleString()}`);
    }

    // Tax efficiency note (heuristic)
    const retirementProjections = projections.filter(p => p.age >= scenario.retirementAge);
    const totalWithdrawals = retirementProjections.reduce(
      (sum, p) => sum + Math.abs(Math.min(0, p.annualSurplusDeficit)),
      0
    );
    const avgWithdrawal = retirementProjections.length > 0 ? totalWithdrawals / retirementProjections.length : 0;
    const personalAllowance = 12570;
    if (avgWithdrawal > 0) {
      const allowanceUtilization = Math.min(100, Math.round((avgWithdrawal / personalAllowance) * 100));
      insights.push(`Withdrawal strategy utilizes about ${allowanceUtilization}% of the annual tax-free allowance`);
    } else {
      insights.push('No portfolio withdrawals projected in retirement; tax-free allowances preserved');
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
