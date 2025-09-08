import { createClient } from "@/lib/supabase/client"
// ================================================================
// src/services/MitigationStrategiesService.ts
// Generates actionable mitigation strategies based on stress test results
// Provides immediate actions, preventive measures, and recovery plans
// ================================================================

import type { CashFlowScenario } from '@/types/cashflow';
import type { Client } from '@/types/client';
import type { 
  StressTestResult,
  StressScenario
} from '@/types/stress-testing';
import { StressTestingEngine } from './StressTestingEngine';

// Types for mitigation strategies
export interface MitigationStrategy {
  id: string;
  type: 'immediate' | 'preventive' | 'recovery';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'spending' | 'income' | 'assets' | 'insurance' | 'planning';
  title: string;
  description: string;
  expectedImpact: string;
  timeframe: string;
  requirements?: string[];
  cost?: number;
  difficulty: 'easy' | 'moderate' | 'complex';
}

export interface MitigationPlan {
  scenarioId: string;
  scenarioName: string;
  overallRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  immediateActions: MitigationStrategy[];
  preventiveMeasures: MitigationStrategy[];
  recoveryPlans: MitigationStrategy[];
  keyRecommendations: string[];
  estimatedCostRange: {
    min: number;
    max: number;
  };
}

export interface ClientContext {
  age: number;
  retirementAge: number;
  hasEmergencyFund: boolean;
  emergencyFundMonths: number;
  hasLifeInsurance: boolean;
  hasIncomeProtection: boolean;
  hasCriticalIllnessCovet: boolean;
  assetAllocation: {
    equity: number;
    bonds: number;
    cash: number;
    property: number;
  };
  monthlyIncome: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  dependents: number;
}

export class MitigationStrategiesService {
  
  /**
   * Generate comprehensive mitigation plan based on stress test results
   */
  static generateMitigationPlan(
    stressTestResult: StressTestResult,
    scenario: CashFlowScenario,
    client: Client
  ): MitigationPlan {
    
    // Build client context for strategy generation
    const clientContext = this.buildClientContext(scenario, client);
    
    // Get the stress scenario details
    const stressScenario = StressTestingEngine.getScenarioById(stressTestResult.scenarioId);
    if (!stressScenario) {
      throw new Error(`Stress scenario ${stressTestResult.scenarioId} not found`);
    }
    
    // Determine overall risk level
    const overallRiskLevel = this.assessOverallRiskLevel(stressTestResult);
    
    // Generate strategies based on scenario type and results
    const immediateActions = this.generateImmediateActions(
      stressTestResult, 
      stressScenario, 
      clientContext
    );
    
    const preventiveMeasures = this.generatePreventiveMeasures(
      stressTestResult, 
      stressScenario, 
      clientContext
    );
    
    const recoveryPlans = this.generateRecoveryPlans(
      stressTestResult, 
      stressScenario, 
      clientContext
    );
    
    // Generate key recommendations
    const keyRecommendations = this.generateKeyRecommendations(
      stressTestResult,
      stressScenario,
      overallRiskLevel
    );
    
    // Calculate estimated cost range
    const estimatedCostRange = this.calculateCostRange(
      [...immediateActions, ...preventiveMeasures, ...recoveryPlans]
    );
    
    return {
      scenarioId: stressTestResult.scenarioId,
      scenarioName: stressTestResult.scenarioName,
      overallRiskLevel,
      immediateActions,
      preventiveMeasures,
      recoveryPlans,
      keyRecommendations,
      estimatedCostRange
    };
  }
  
  /**
   * Build client context from scenario and client data
   */
  private static buildClientContext(scenario: CashFlowScenario, client: Client): ClientContext {
    // Calculate emergency fund coverage
    const monthlyExpenses = scenario.currentExpenses ?? 0;
    const emergencyFundTarget = scenario.emergencyFundTarget ?? (monthlyExpenses * 6);
    const currentSavings = scenario.currentSavings ?? 0;
    const emergencyFundMonths = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;
    
    return {
      age: scenario.clientAge ?? 50,
      retirementAge: scenario.retirementAge ?? 65,
      hasEmergencyFund: currentSavings >= emergencyFundTarget,
      emergencyFundMonths: Math.floor(emergencyFundMonths),
      hasLifeInsurance: false, // Would come from client data in real implementation
      hasIncomeProtection: false,
      hasCriticalIllnessCovet: false,
      assetAllocation: {
        equity: scenario.equityAllocation ?? 60,
        bonds: scenario.bondAllocation ?? 30,
        cash: scenario.cashAllocation ?? 10,
        property: 0 // Would calculate from property value
      },
      monthlyIncome: scenario.currentIncome ?? 0,
      monthlyExpenses: scenario.currentExpenses ?? 0,
      totalAssets: (scenario.currentSavings ?? 0) + (scenario.investmentValue ?? 0) + (scenario.pensionValue ?? 0),
      totalLiabilities: (scenario.mortgageBalance ?? 0) + (scenario.otherDebts ?? 0),
      dependents: scenario.dependents ?? 0
    };
  }
  
  /**
   * Assess overall risk level based on stress test results
   */
  private static assessOverallRiskLevel(result: StressTestResult): 'critical' | 'high' | 'medium' | 'low' {
    if (result.survivalProbability < 50 || result.shortfallRisk > 50) {
      return 'critical';
    } else if (result.survivalProbability < 70 || result.shortfallRisk > 30) {
      return 'high';
    } else if (result.survivalProbability < 85 || result.shortfallRisk > 15) {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Generate immediate actions based on stress test results
   */
  private static generateImmediateActions(
    result: StressTestResult,
    scenario: StressScenario,
    context: ClientContext
  ): MitigationStrategy[] {
    const actions: MitigationStrategy[] = [];
    
    // Critical actions for poor survival probability
    if (result.survivalProbability < 60) {
      actions.push({
        id: 'reduce_discretionary_spending',
        type: 'immediate',
        priority: 'critical',
        category: 'spending',
        title: 'Reduce Discretionary Spending',
        description: 'Immediately cut non-essential expenses by 20-30% to improve cash flow',
        expectedImpact: 'Save £200-400/month to strengthen financial position',
        timeframe: 'Implement within 1 week',
        difficulty: 'easy'
      });
    }
    
    // Emergency fund actions
    if (!context.hasEmergencyFund || context.emergencyFundMonths < 3) {
      actions.push({
        id: 'build_emergency_fund',
        type: 'immediate',
        priority: 'critical',
        category: 'assets',
        title: 'Build Emergency Fund',
        description: `Current emergency fund covers only ${context.emergencyFundMonths} months. Target 6 months of expenses.`,
        expectedImpact: 'Provide financial buffer against income disruption',
        timeframe: '3-6 months to build',
        requirements: ['Automate savings', 'Use high-yield savings account'],
        difficulty: 'moderate'
      });
    }
    
    // Scenario-specific immediate actions
    switch (scenario.type) {
      case 'personal_crisis':
        this.addPersonalCrisisImmediateActions(actions, scenario, context, result);
        break;
        
      case 'market_crash':
        this.addMarketCrashImmediateActions(actions, context, result);
        break;
        
      case 'inflation_shock':
        this.addInflationShockImmediateActions(actions, context, result);
        break;
    }
    
    // Asset reallocation if needed
    if (result.impactAnalysis.portfolioDeclinePercent < -30 && context.assetAllocation.equity > 70) {
      actions.push({
        id: 'rebalance_portfolio',
        type: 'immediate',
        priority: 'high',
        category: 'assets',
        title: 'Rebalance Portfolio',
        description: 'Reduce equity allocation from ' + context.assetAllocation.equity + '% to a more balanced 60%',
        expectedImpact: 'Reduce portfolio volatility by 20-30%',
        timeframe: 'Complete within 2 weeks',
        requirements: ['Review tax implications', 'Consider pound-cost averaging'],
        difficulty: 'moderate'
      });
    }
    
    return actions;
  }
  
  /**
   * Add personal crisis specific immediate actions
   */
  private static addPersonalCrisisImmediateActions(
    actions: MitigationStrategy[],
    scenario: StressScenario,
    context: ClientContext,
    result: StressTestResult
  ): void {
    if (scenario.id === 'job_loss_redundancy') {
      actions.push({
        id: 'update_cv_network',
        type: 'immediate',
        priority: 'critical',
        category: 'income',
        title: 'Update CV and Activate Network',
        description: 'Prepare for potential job search by updating CV and reaching out to professional network',
        expectedImpact: 'Reduce potential unemployment duration by 2-3 months',
        timeframe: 'Start immediately',
        difficulty: 'easy'
      });
      
      actions.push({
        id: 'claim_benefits',
        type: 'immediate',
        priority: 'high',
        category: 'income',
        title: 'Research and Claim Available Benefits',
        description: 'Identify and apply for unemployment benefits and other support',
        expectedImpact: 'Secure 30-40% income replacement during job search',
        timeframe: 'Apply within 1 week',
        requirements: ['Gather employment documentation', 'Register with job centre'],
        difficulty: 'easy'
      });
    }
    
    if (scenario.id === 'major_health_event') {
      actions.push({
        id: 'review_insurance_coverage',
        type: 'immediate',
        priority: 'critical',
        category: 'insurance',
        title: 'Review Health Insurance Coverage',
        description: 'Understand coverage limits, deductibles, and claim procedures',
        expectedImpact: 'Minimize out-of-pocket medical expenses',
        timeframe: 'Complete within 48 hours',
        difficulty: 'easy'
      });
      
      actions.push({
        id: 'apply_work_accommodations',
        type: 'immediate',
        priority: 'high',
        category: 'income',
        title: 'Request Work Accommodations',
        description: 'Discuss flexible working arrangements or reduced hours with employer',
        expectedImpact: 'Maintain partial income during recovery',
        timeframe: 'Initiate within 1 week',
        difficulty: 'moderate'
      });
    }
    
    if (scenario.id === 'divorce_separation') {
      actions.push({
        id: 'secure_financial_documents',
        type: 'immediate',
        priority: 'critical',
        category: 'planning',
        title: 'Secure Financial Documentation',
        description: 'Gather and secure copies of all financial statements, tax returns, and asset documentation',
        expectedImpact: 'Ensure fair settlement and protect assets',
        timeframe: 'Complete within 1 week',
        difficulty: 'easy'
      });
      
      actions.push({
        id: 'separate_finances',
        type: 'immediate',
        priority: 'critical',
        category: 'assets',
        title: 'Establish Separate Financial Accounts',
        description: 'Open individual bank accounts and credit cards',
        expectedImpact: 'Maintain financial independence and credit history',
        timeframe: 'Complete within 2 weeks',
        difficulty: 'easy'
      });
    }
  }
  
  /**
   * Add market crash specific immediate actions
   */
  private static addMarketCrashImmediateActions(
    actions: MitigationStrategy[],
    context: ClientContext,
    result: StressTestResult
  ): void {
    actions.push({
      id: 'avoid_panic_selling',
      type: 'immediate',
      priority: 'critical',
      category: 'assets',
      title: 'Avoid Panic Selling',
      description: 'Maintain investment discipline and avoid crystallizing losses',
      expectedImpact: 'Preserve long-term wealth and benefit from eventual recovery',
      timeframe: 'Ongoing discipline required',
      difficulty: 'moderate'
    });
    
    if (context.age > context.retirementAge - 5) {
      actions.push({
        id: 'review_withdrawal_strategy',
        type: 'immediate',
        priority: 'high',
        category: 'planning',
        title: 'Adjust Withdrawal Strategy',
        description: 'Reduce withdrawal rate temporarily to preserve capital',
        expectedImpact: 'Extend portfolio longevity by 5-10 years',
        timeframe: 'Implement immediately',
        requirements: ['Calculate sustainable withdrawal rate', 'Identify expense reductions'],
        difficulty: 'moderate'
      });
    }
  }
  
  /**
   * Add inflation shock specific immediate actions
   */
  private static addInflationShockImmediateActions(
    actions: MitigationStrategy[],
    context: ClientContext,
    result: StressTestResult
  ): void {
    actions.push({
      id: 'hedge_inflation',
      type: 'immediate',
      priority: 'high',
      category: 'assets',
      title: 'Add Inflation Protection',
      description: 'Increase allocation to inflation-linked bonds and real assets',
      expectedImpact: 'Protect purchasing power of portfolio',
      timeframe: 'Implement over 1 month',
      requirements: ['Research inflation-linked gilts', 'Consider commodity exposure'],
      difficulty: 'moderate'
    });
    
    actions.push({
      id: 'lock_in_costs',
      type: 'immediate',
      priority: 'medium',
      category: 'spending',
      title: 'Lock in Fixed Costs',
      description: 'Fix energy prices, insurance premiums, and other variable costs where possible',
      expectedImpact: 'Protect against 20-30% of inflation impact',
      timeframe: 'Complete within 1 month',
      difficulty: 'easy'
    });
  }
  
  /**
   * Generate preventive measures
   */
  private static generatePreventiveMeasures(
    result: StressTestResult,
    scenario: StressScenario,
    context: ClientContext
  ): MitigationStrategy[] {
    const measures: MitigationStrategy[] = [];
    
    // Insurance recommendations
    if (!context.hasIncomeProtection && context.age < context.retirementAge) {
      measures.push({
        id: 'income_protection_insurance',
        type: 'preventive',
        priority: 'high',
        category: 'insurance',
        title: 'Obtain Income Protection Insurance',
        description: 'Protect against income loss due to illness or disability',
        expectedImpact: 'Replace 50-70% of income if unable to work',
        timeframe: 'Arrange within 3 months',
        cost: Math.round(context.monthlyIncome * 0.02 * 12), // Rough 2% of income estimate
        requirements: ['Medical underwriting', 'Choose deferment period'],
        difficulty: 'moderate'
      });
    }
    
    if (!context.hasLifeInsurance && context.dependents > 0) {
      measures.push({
        id: 'life_insurance',
        type: 'preventive',
        priority: 'high',
        category: 'insurance',
        title: 'Secure Adequate Life Insurance',
        description: `Protect ${context.dependents} dependent(s) with term life insurance`,
        expectedImpact: 'Provide financial security for dependents',
        timeframe: 'Arrange within 2 months',
        cost: Math.round(context.monthlyIncome * 0.01 * 12), // Rough estimate
        requirements: ['Calculate coverage needs', 'Medical underwriting'],
        difficulty: 'moderate'
      });
    }
    
    // Diversification recommendations
    if (context.assetAllocation.equity > 80) {
      measures.push({
        id: 'diversify_assets',
        type: 'preventive',
        priority: 'medium',
        category: 'assets',
        title: 'Improve Asset Diversification',
        description: 'Reduce concentration risk by diversifying across asset classes',
        expectedImpact: 'Reduce portfolio volatility by 30-40%',
        timeframe: 'Implement over 6 months',
        requirements: ['Asset allocation review', 'Consider alternative assets'],
        difficulty: 'complex'
      });
    }
    
    // Emergency planning
    measures.push({
      id: 'create_emergency_plan',
      type: 'preventive',
      priority: 'medium',
      category: 'planning',
      title: 'Create Comprehensive Emergency Plan',
      description: 'Document financial accounts, contacts, and action steps for emergencies',
      expectedImpact: 'Enable quick response to crisis situations',
      timeframe: 'Complete within 1 month',
      difficulty: 'easy'
    });
    
    // Skills and income diversification
    if (scenario.type === 'personal_crisis' || result.survivalProbability < 70) {
      measures.push({
        id: 'develop_income_streams',
        type: 'preventive',
        priority: 'medium',
        category: 'income',
        title: 'Develop Alternative Income Streams',
        description: 'Build secondary income sources through skills, investments, or side business',
        expectedImpact: 'Reduce reliance on primary income by 20-30%',
        timeframe: '6-12 months to establish',
        requirements: ['Identify marketable skills', 'Allocate time for development'],
        difficulty: 'complex'
      });
    }
    
    return measures;
  }
  
  /**
   * Generate recovery plans
   */
  private static generateRecoveryPlans(
    result: StressTestResult,
    scenario: StressScenario,
    context: ClientContext
  ): MitigationStrategy[] {
    const plans: MitigationStrategy[] = [];
    
    // Portfolio recovery
    plans.push({
      id: 'systematic_rebalancing',
      type: 'recovery',
      priority: 'medium',
      category: 'assets',
      title: 'Implement Systematic Rebalancing',
      description: 'Regular rebalancing to maintain target allocation and capture recovery',
      expectedImpact: 'Enhance returns by 1-2% annually through disciplined rebalancing',
      timeframe: 'Quarterly reviews for 2-3 years',
      difficulty: 'moderate'
    });
    
    // Catch-up contributions
    if (context.age < context.retirementAge - 10) {
      const catchUpAmount = Math.round(context.monthlyIncome * 0.05);
      plans.push({
        id: 'increase_contributions',
        type: 'recovery',
        priority: 'medium',
        category: 'assets',
        title: 'Increase Pension Contributions',
        description: `Boost monthly contributions by £${catchUpAmount} to accelerate recovery`,
        expectedImpact: 'Recover lost ground within 5-7 years',
        timeframe: 'Start when crisis passes',
        cost: catchUpAmount * 12,
        requirements: ['Review contribution limits', 'Optimize tax relief'],
        difficulty: 'easy'
      });
    }
    
    // Career recovery for personal crisis
    if (scenario.type === 'personal_crisis') {
      plans.push({
        id: 'career_advancement',
        type: 'recovery',
        priority: 'high',
        category: 'income',
        title: 'Accelerate Career Recovery',
        description: 'Invest in skills development and professional networking',
        expectedImpact: 'Achieve 10-20% income growth within 2 years',
        timeframe: '12-24 months',
        cost: 2000, // Training and development estimate
        requirements: ['Identify growth areas', 'Commit to continuous learning'],
        difficulty: 'moderate'
      });
    }
    
    // Lifestyle adjustments
    if (result.survivalProbability < 75) {
      plans.push({
        id: 'lifestyle_optimization',
        type: 'recovery',
        priority: 'medium',
        category: 'spending',
        title: 'Optimize Lifestyle Expenses',
        description: 'Permanently adjust spending patterns to more sustainable level',
        expectedImpact: 'Reduce expenses by 15-20% without major sacrifice',
        timeframe: 'Implement over 6 months',
        requirements: ['Expense tracking', 'Identify value-based spending'],
        difficulty: 'moderate'
      });
    }
    
    // Long-term planning adjustments
    if (scenario.type === 'longevity' || context.age > 50) {
      plans.push({
        id: 'retirement_plan_revision',
        type: 'recovery',
        priority: 'medium',
        category: 'planning',
        title: 'Revise Retirement Timeline',
        description: 'Consider phased retirement or working 2-3 years longer',
        expectedImpact: 'Improve retirement security by 30-40%',
        timeframe: 'Plan over next 12 months',
        requirements: ['Health assessment', 'Skills relevance review'],
        difficulty: 'complex'
      });
    }
    
    return plans;
  }
  
  /**
   * Generate key recommendations summary
   */
  private static generateKeyRecommendations(
    result: StressTestResult,
    scenario: StressScenario,
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Priority based on risk level
    if (riskLevel === 'critical') {
      recommendations.push('Take immediate action to reduce expenses and preserve capital');
      recommendations.push('Consider professional financial advice for crisis management');
    }
    
    // Survival probability recommendations
    if (result.survivalProbability < 70) {
      recommendations.push(`With only ${result.survivalProbability.toFixed(0)}% survival probability, significant lifestyle adjustments are necessary`);
    }
    
    // Scenario-specific recommendations
    if (scenario.type === 'personal_crisis') {
      recommendations.push('Focus on income protection and emergency fund building');
      recommendations.push('Review all insurance coverages to ensure adequate protection');
    } else if (scenario.type === 'market_crash') {
      recommendations.push('Maintain investment discipline and avoid emotional decisions');
      recommendations.push('Use market downturns as rebalancing opportunities');
    }
    
    // Recovery time insight
    if (result.recoveryTimeYears) {
      recommendations.push(`Expected recovery time is ${result.recoveryTimeYears} years - plan accordingly`);
    }
    
    // General resilience building
    recommendations.push('Regular stress testing (annually) helps maintain financial resilience');
    
    return recommendations;
  }
  
  /**
   * Calculate total cost range for all strategies
   */
  private static calculateCostRange(strategies: MitigationStrategy[]): { min: number; max: number } {
    const costsWithEstimates = strategies
      .filter(s => s.cost !== undefined)
      .map(s => s.cost || 0);
    
    const totalCost = costsWithEstimates.reduce((sum, cost) => sum + cost, 0);
    
    // Add 20% variance for cost range
    return {
      min: Math.round(totalCost * 0.8),
      max: Math.round(totalCost * 1.2)
    };
  }
  
  /**
   * Generate HTML report of mitigation strategies
   */
  static generateMitigationReport(plan: MitigationPlan): string {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
    
    let html = `
      <div class="mitigation-report">
        <h2>Mitigation Strategies for ${plan.scenarioName}</h2>
        <div class="risk-level risk-${plan.overallRiskLevel}">
          Overall Risk Level: ${plan.overallRiskLevel.toUpperCase()}
        </div>
        
        <div class="key-recommendations">
          <h3>Key Recommendations</h3>
          <ul>
            ${plan.keyRecommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <div class="immediate-actions">
          <h3>Immediate Actions Required</h3>
          ${this.renderStrategyList(plan.immediateActions)}
        </div>
        
        <div class="preventive-measures">
          <h3>Preventive Measures</h3>
          ${this.renderStrategyList(plan.preventiveMeasures)}
        </div>
        
        <div class="recovery-plans">
          <h3>Recovery Plans</h3>
          ${this.renderStrategyList(plan.recoveryPlans)}
        </div>
        
        <div class="cost-summary">
          <h3>Estimated Cost Range</h3>
          <p>${formatCurrency(plan.estimatedCostRange.min)} - ${formatCurrency(plan.estimatedCostRange.max)}</p>
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Render strategy list as HTML
   */
  private static renderStrategyList(strategies: MitigationStrategy[]): string {
    if (strategies.length === 0) {
      return '<p>No strategies identified for this category.</p>';
    }
    
    return strategies.map(strategy => `
      <div class="strategy-item priority-${strategy.priority}">
        <h4>${strategy.title}</h4>
        <p class="description">${strategy.description}</p>
        <div class="strategy-details">
          <span class="impact">Impact: ${strategy.expectedImpact}</span>
          <span class="timeframe">Timeframe: ${strategy.timeframe}</span>
          <span class="difficulty">Difficulty: ${strategy.difficulty}</span>
          ${strategy.cost ? `<span class="cost">Cost: £${strategy.cost}</span>` : ''}
        </div>
        ${strategy.requirements ? `
          <div class="requirements">
            <strong>Requirements:</strong>
            <ul>
              ${strategy.requirements.map(req => `<li>${req}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('');
  }
}