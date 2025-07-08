// ================================================================
// src/services/ProjectionEngine.ts - FIXED v2
// All property mismatches and type errors resolved
// ================================================================

import type { 
  CashFlowScenario, 
  CashFlowProjection, 
  ProjectionSummary,
  ProjectionResult // FIX: Import the missing type
} from '@/types/cashflow';

export class ProjectionEngine {
  /**
   * Generate projections for a cash flow scenario
   */
  static async generateProjections(scenario: CashFlowScenario): Promise<ProjectionResult> {
    try {
      const projections: CashFlowProjection[] = [];
      const startYear = new Date().getFullYear();
      
      // Initialize starting values - FIX: Use correct property names
      let currentAge = scenario.clientAge;
      let pensionValue = scenario.pensionPotValue; // FIX: Use correct property name
      let investmentValue = scenario.investmentValue;
      let cashSavings = scenario.currentSavings;
      let currentIncome = scenario.currentIncome;
      let currentExpenses = scenario.currentExpenses;
      
      for (let year = 0; year < scenario.projectionYears; year++) {
        const projectionYear = startYear + year;
        currentAge = scenario.clientAge + year;
        
        // Determine if retired
        const isRetired = currentAge >= scenario.retirementAge;
        
        // Calculate income for this year
        const yearlyIncome = this.calculateYearlyIncome({
          scenario,
          year,
          currentAge,
          isRetired,
          pensionValue,
          investmentValue,
          cashSavings
        });
        
        // Calculate expenses for this year
        const yearlyExpenses = this.calculateYearlyExpenses({
          scenario,
          year,
          currentAge,
          isRetired,
          currentExpenses
        });
        
        // Calculate investment returns
        const investmentReturns = this.calculateInvestmentReturns({
          scenario,
          pensionValue,
          investmentValue,
          cashSavings
        });
        
        // Update portfolio values
        pensionValue = Math.max(0, pensionValue + investmentReturns.pension);
        investmentValue = Math.max(0, investmentValue + investmentReturns.investments);
        cashSavings = Math.max(0, cashSavings + investmentReturns.cash);
        
        // Calculate net position
        const annualSurplusDeficit = yearlyIncome.total - yearlyExpenses.total;
        
        // Apply surplus/deficit to portfolios
        if (annualSurplusDeficit > 0) {
          // Surplus - invest according to allocation
          const surplusToInvest = annualSurplusDeficit;
          investmentValue += surplusToInvest * (scenario.equityAllocation / 100);
          cashSavings += surplusToInvest * (scenario.cashAllocation / 100);
        } else {
          // Deficit - withdraw from portfolios
          const deficitToFund = Math.abs(annualSurplusDeficit);
          const totalPortfolioValue = pensionValue + investmentValue + cashSavings; // FIX: Define variable
          
          if (totalPortfolioValue > 0) {
            const withdrawalRate = Math.min(deficitToFund / totalPortfolioValue, 0.5); // Max 50% withdrawal
            
            // Withdraw proportionally unless retired (then pension first)
            if (isRetired && pensionValue > 0) {
              const pensionWithdrawal = Math.min(deficitToFund, pensionValue);
              pensionValue -= pensionWithdrawal;
              const remainingDeficit = deficitToFund - pensionWithdrawal;
              
              if (remainingDeficit > 0 && investmentValue > 0) {
                const investmentWithdrawal = Math.min(remainingDeficit, investmentValue);
                investmentValue -= investmentWithdrawal;
              }
            } else {
              pensionValue *= (1 - withdrawalRate);
              investmentValue *= (1 - withdrawalRate);
              cashSavings *= (1 - withdrawalRate);
            }
          }
        }
        
        // Create projection record - FIX: Remove non-existent properties
        const projection: CashFlowProjection = {
          id: `${scenario.id}_year_${year}`,
          scenarioId: scenario.id,
          projectionYear: year + 1,
          clientAge: currentAge,
          
          // Income components
          employmentIncome: isRetired ? 0 : yearlyIncome.employment,
          pensionIncome: yearlyIncome.pension,
          statePension: yearlyIncome.statePension,
          investmentIncome: yearlyIncome.investment,
          otherIncome: yearlyIncome.other,
          totalIncome: yearlyIncome.total,
          
          // Expense components
          essentialExpenses: yearlyExpenses.essential,
          lifestyleExpenses: yearlyExpenses.lifestyle,
          discretionaryExpenses: yearlyExpenses.discretionary,
          totalExpenses: yearlyExpenses.total,
          
          // Asset values
          pensionPotValue: Math.round(pensionValue),
          investmentPortfolio: Math.round(investmentValue),
          cashSavings: Math.round(cashSavings),
          totalAssets: Math.round(pensionValue + investmentValue + cashSavings),
          
          // Key metrics
          annualSurplusDeficit: Math.round(annualSurplusDeficit),
          portfolioBalance: Math.round(pensionValue + investmentValue + cashSavings),
          realTermsValue: Math.round(pensionValue + investmentValue + cashSavings),
          
          createdAt: new Date().toISOString()
        };
        
        projections.push(projection);
      }
      
      // Generate summary
      const summary = this.generateProjectionSummary(scenario, projections);
      
      return {
        scenario,
        projections,
        summary
      };
      
    } catch (error) {
      console.error('Error generating projections:', error);
      throw error;
    }
  }
  
  /**
   * Calculate yearly income components
   */
  private static calculateYearlyIncome(params: {
    scenario: CashFlowScenario;
    year: number;
    currentAge: number;
    isRetired: boolean;
    pensionValue: number;
    investmentValue: number;
    cashSavings: number;
  }): {
    employment: number;
    pension: number;
    statePension: number;
    investment: number;
    other: number;
    total: number;
  } {
    const { scenario, year, currentAge, isRetired, pensionValue, investmentValue } = params;
    
    // Employment income (stops at retirement) - FIX: Use correct property
    const employment = isRetired ? 0 : scenario.currentIncome;
    
    // State pension (starts at state pension age) - FIX: Use correct properties
    const statePension = currentAge >= scenario.statePensionAge ? scenario.statePensionAmount : 0;
    
    // Private pension withdrawals (can start at retirement age)
    let pension = 0;
    if (isRetired && pensionValue > 0) {
      // Sustainable withdrawal rate approach
      const withdrawalRate = 0.04; // 4% rule
      pension = pensionValue * withdrawalRate;
    }
    
    // Investment income
    const investmentYield = 0.02; // 2% dividend yield assumption
    const investment = investmentValue * investmentYield;
    
    // Other income - FIX: Use correct property
    const other = scenario.otherIncome || 0;
    
    const total = employment + pension + statePension + investment + other;
    
    return { employment, pension, statePension, investment, other, total };
  }
  
  /**
   * Calculate yearly expenses
   */
  private static calculateYearlyExpenses(params: {
    scenario: CashFlowScenario;
    year: number;
    currentAge: number;
    isRetired: boolean;
    currentExpenses: number;
  }): {
    essential: number;
    lifestyle: number;
    discretionary: number;
    total: number;
  } {
    const { scenario, isRetired } = params;
    
    // Base expenses
    let essential = scenario.essentialExpenses;
    let lifestyle = scenario.lifestyleExpenses;
    let discretionary = scenario.discretionaryExpenses;
    
    // Retirement expense adjustment (typically 10-20% reduction)
    if (isRetired) {
      essential *= 0.9; // 10% reduction in essential expenses
      lifestyle *= 0.8; // 20% reduction in lifestyle expenses
      discretionary *= 0.7; // 30% reduction in discretionary expenses
    }
    
    const total = essential + lifestyle + discretionary;
    
    return { essential, lifestyle, discretionary, total };
  }
  
  /**
   * Calculate investment returns for the year
   */
  private static calculateInvestmentReturns(params: {
    scenario: CashFlowScenario;
    pensionValue: number;
    investmentValue: number;
    cashSavings: number;
  }): {
    pension: number;
    investments: number;
    cash: number;
  } {
    const { scenario, pensionValue, investmentValue, cashSavings } = params;
    
    // Apply real returns (already adjusted for inflation)
    const pensionReturn = pensionValue * (scenario.realEquityReturn / 100);
    const investmentReturn = investmentValue * (scenario.realEquityReturn / 100);
    const cashReturn = cashSavings * (scenario.realCashReturn / 100);
    
    return {
      pension: pensionReturn,
      investments: investmentReturn,
      cash: cashReturn
    };
  }
  
  /**
   * Generate projection summary with key metrics
   * FIX: Use correct property names from ProjectionSummary interface
   */
  private static generateProjectionSummary(
    scenario: CashFlowScenario, 
    projections: CashFlowProjection[]
  ): ProjectionSummary {
    if (projections.length === 0) {
      throw new Error('No projections to summarize');
    }
    
    const finalProjection = projections[projections.length - 1];
    const totalContributions = projections.reduce((sum, p) => sum + Math.max(0, p.annualSurplusDeficit), 0);
    const totalWithdrawals = projections.reduce((sum, p) => sum + Math.abs(Math.min(0, p.annualSurplusDeficit)), 0);
    
    // Calculate goal achievement
    const retirementIncomeAchieved = this.calculateRetirementIncomeAchievement(scenario, projections);
    const emergencyFundAchieved = finalProjection.cashSavings >= scenario.emergencyFundTarget;
    
    // Calculate maximum withdrawal rate during retirement
    const retirementProjections = projections.filter(p => p.clientAge >= scenario.retirementAge);
    const maxWithdrawalRate = retirementProjections.length > 0 
      ? Math.max(...retirementProjections.map(p => this.calculateWithdrawalRate(p, scenario))) // FIX: Calculate withdrawal rate
      : 0;
    
    // Map withdrawal rate to sustainability rating
    let sustainabilityRating: "Excellent" | "Good" | "Adequate" | "Poor" | "Critical";
    if (maxWithdrawalRate < 0.04) {
      sustainabilityRating = "Excellent";
    } else if (maxWithdrawalRate < 0.05) {
      sustainabilityRating = "Good";
    } else if (maxWithdrawalRate < 0.06) {
      sustainabilityRating = "Adequate";
    } else if (maxWithdrawalRate < 0.08) {
      sustainabilityRating = "Poor";
    } else {
      sustainabilityRating = "Critical";
    }
    
    return {
      projectionYears: projections.length, // FIX: Use correct property name
      finalPortfolioValue: finalProjection.totalAssets,
      totalContributions: Math.round(totalContributions),
      totalWithdrawals: Math.round(totalWithdrawals),
      maxWithdrawalRate: Math.round(maxWithdrawalRate * 10000) / 100, // Convert to percentage
      averageAnnualReturn: this.calculateAverageReturn(projections),
      retirementIncomeAchieved,
      emergencyFundAchieved,
      goalAchievementRate: this.calculateOverallGoalAchievement(retirementIncomeAchieved, emergencyFundAchieved),
      sustainabilityRating,
      riskMetrics: {
        shortfallRisk: this.calculateShortfallRisk(projections),
        longevityRisk: this.calculateLongevityRisk(scenario, projections),
        inflationRisk: 'Medium', // Simplified for now
        sequenceRisk: 'Medium'   // Simplified for now
      },
      keyInsights: this.generateKeyInsights(scenario, projections, sustainabilityRating)
    };
  }
  
  /**
   * Helper methods for summary calculations
   */
  
  // FIX: Add method to calculate withdrawal rate for projection
  private static calculateWithdrawalRate(projection: CashFlowProjection, scenario: CashFlowScenario): number {
    if (projection.totalAssets <= 0) return 0;
    const deficit = Math.abs(Math.min(0, projection.annualSurplusDeficit));
    return deficit / projection.totalAssets;
  }
  
  private static calculateRetirementIncomeAchievement(
    scenario: CashFlowScenario, 
    projections: CashFlowProjection[]
  ): boolean {
    const retirementProjections = projections.filter(p => p.clientAge >= scenario.retirementAge);
    if (retirementProjections.length === 0) return false;
    
    const averageRetirementIncome = retirementProjections.reduce((sum, p) => sum + p.totalIncome, 0) / retirementProjections.length;
    return averageRetirementIncome >= scenario.retirementIncomeTarget;
  }
  
  private static calculateAverageReturn(projections: CashFlowProjection[]): number {
    if (projections.length <= 1) return 0;
    
    const initialValue = projections[0].totalAssets;
    const finalValue = projections[projections.length - 1].totalAssets;
    const years = projections.length;
    
    if (initialValue <= 0) return 0;
    
    const totalReturn = Math.pow(finalValue / initialValue, 1 / years) - 1;
    return Math.round(totalReturn * 10000) / 100; // Convert to percentage
  }
  
  private static calculateOverallGoalAchievement(
    retirementAchieved: boolean, 
    emergencyFundAchieved: boolean
  ): number {
    const goals = [retirementAchieved, emergencyFundAchieved];
    const achievedCount = goals.filter(Boolean).length;
    return Math.round((achievedCount / goals.length) * 100);
  }
  
  private static calculateShortfallRisk(projections: CashFlowProjection[]): 'Low' | 'Medium' | 'High' {
    const deficitYears = projections.filter(p => p.annualSurplusDeficit < 0).length;
    const deficitPercentage = deficitYears / projections.length;
    
    if (deficitPercentage < 0.1) return 'Low';
    if (deficitPercentage < 0.3) return 'Medium';
    return 'High';
  }
  
  private static calculateLongevityRisk(
    scenario: CashFlowScenario, 
    projections: CashFlowProjection[]
  ): 'Low' | 'Medium' | 'High' {
    const finalProjection = projections[projections.length - 1];
    const projectedEndAge = scenario.clientAge + projections.length;
    
    // Risk is higher if projections don't extend to reasonable life expectancy
    // FIX: Handle undefined lifeExpectancy safely
    const lifeExpectancy = scenario.lifeExpectancy || 85; // Default if undefined
    if (projectedEndAge < lifeExpectancy) return 'High';
    if (finalProjection.totalAssets < scenario.essentialExpenses * 5) return 'High';
    if (finalProjection.totalAssets < scenario.essentialExpenses * 10) return 'Medium';
    return 'Low';
  }
  
  private static generateKeyInsights(
    scenario: CashFlowScenario,
    projections: CashFlowProjection[],
    sustainabilityRating: string
  ): string[] {
    const insights: string[] = [];
    
    const finalProjection = projections[projections.length - 1];
    const retirementProjections = projections.filter(p => p.clientAge >= scenario.retirementAge);
    
    // Portfolio sustainability insight
    if (sustainabilityRating === 'Excellent') {
      insights.push('Portfolio is highly sustainable with conservative withdrawal rates');
    } else if (sustainabilityRating === 'Critical') {
      insights.push('Portfolio may face sustainability challenges - consider reducing expenses or increasing savings');
    }
    
    // Retirement readiness insight
    if (retirementProjections.length > 0) {
      const averageRetirementIncome = retirementProjections.reduce((sum, p) => sum + p.totalIncome, 0) / retirementProjections.length;
      const incomeReplacementRatio = averageRetirementIncome / scenario.currentIncome;
      
      if (incomeReplacementRatio > 0.8) {
        insights.push('Projected to maintain high income replacement in retirement');
      } else if (incomeReplacementRatio < 0.5) {
        insights.push('Consider increasing pension contributions to improve retirement income');
      }
    }
    
    // Asset allocation insight - FIX: Use correct properties
    if (scenario.equityAllocation > 80) {
      insights.push('High equity allocation may increase volatility - consider diversification');
    } else if (scenario.equityAllocation < 40 && scenario.clientAge < 50) {
      insights.push('Conservative allocation may limit growth potential for long-term goals');
    }
    
    // Emergency fund insight
    if (finalProjection.cashSavings < scenario.emergencyFundTarget) {
      insights.push('Emergency fund target not met - consider building cash reserves');
    }
    
    return insights.slice(0, 4); // Limit to 4 key insights
  }
}