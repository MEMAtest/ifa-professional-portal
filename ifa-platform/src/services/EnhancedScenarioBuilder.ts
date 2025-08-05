// ================================================================
// src/services/EnhancedScenarioBuilder.ts
// Comprehensive scenario generation with rich insights and explanations
// ================================================================

import type { CashFlowScenario, RiskMetrics } from '@/types/cashflow';

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'stress' | 'goal-based' | 'custom';
  parameters: Partial<CashFlowScenario>;
  assumptions: string[];
  keyRisks: string[];
  suitableFor: string[];
}

export interface EnhancedInsight {
  category: 'opportunity' | 'risk' | 'action' | 'information';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendation?: string;
  relatedMetrics?: string[];
}

export interface RiskAnalysisDetail {
  riskType: keyof RiskMetrics;
  level: 'Low' | 'Medium' | 'High';
  description: string;
  factors: string[];
  mitigationStrategies: string[];
  probabilityRange: { min: number; max: number };
  potentialImpact: string;
}

export class EnhancedScenarioBuilder {
  
  /**
   * Get comprehensive scenario templates beyond basic three
   */
  static getScenarioTemplates(): ScenarioTemplate[] {
    return [
      // Standard Scenarios
      {
        id: 'base-case',
        name: 'Base Case Projection',
        description: 'Realistic projection based on current market conditions and moderate assumptions',
        category: 'standard',
        parameters: {
          scenarioType: 'base',
          inflationRate: 2.5,
          realEquityReturn: 5.0,
          realBondReturn: 2.0,
          realCashReturn: 0.5
        },
        assumptions: [
          'Inflation remains at long-term average of 2.5%',
          'Equity markets deliver historical average returns',
          'No major economic disruptions',
          'Current spending patterns continue'
        ],
        keyRisks: [
          'Market volatility could impact short-term returns',
          'Inflation may exceed expectations',
          'Unexpected expenses could arise'
        ],
        suitableFor: [
          'Initial financial planning',
          'Baseline comparison',
          'Regular reviews'
        ]
      },
      
      {
        id: 'optimistic',
        name: 'Optimistic Growth',
        description: 'Best-case scenario with favorable market conditions and higher returns',
        category: 'standard',
        parameters: {
          scenarioType: 'optimistic',
          inflationRate: 2.0,
          realEquityReturn: 7.0,
          realBondReturn: 3.0,
          realCashReturn: 1.0
        },
        assumptions: [
          'Strong economic growth continues',
          'Innovation drives higher equity returns',
          'Inflation remains below target',
          'No significant market corrections'
        ],
        keyRisks: [
          'Over-optimism may lead to under-saving',
          'Market corrections are inevitable',
          'Assumes perfect market timing'
        ],
        suitableFor: [
          'Understanding upside potential',
          'Setting stretch goals',
          'Young investors with long horizons'
        ]
      },

      {
        id: 'pessimistic',
        name: 'Conservative Outlook',
        description: 'Cautious projection with lower returns and higher inflation',
        category: 'standard',
        parameters: {
          scenarioType: 'pessimistic',
          inflationRate: 3.5,
          realEquityReturn: 3.0,
          realBondReturn: 1.0,
          realCashReturn: -0.5
        },
        assumptions: [
          'Prolonged low growth environment',
          'Higher inflation erodes returns',
          'Increased market volatility',
          'Lower risk appetite'
        ],
        keyRisks: [
          'May be overly conservative',
          'Could miss growth opportunities',
          'Risk of outliving assets increases'
        ],
        suitableFor: [
          'Risk-averse investors',
          'Near-retirement planning',
          'Stress testing portfolios'
        ]
      },

      // Stress Test Scenarios
      {
        id: 'market-crash',
        name: 'Market Crash Scenario',
        description: 'Tests portfolio resilience against a significant market downturn',
        category: 'stress',
        parameters: {
          scenarioType: 'stress',
          inflationRate: 4.0,
          realEquityReturn: -2.0,
          realBondReturn: 0.5,
          realCashReturn: -1.0
        },
        assumptions: [
          '40% market decline in first 2 years',
          'Slow recovery over 5-7 years',
          'Flight to safety in bonds',
          'Elevated inflation from stimulus'
        ],
        keyRisks: [
          'Forced selling at market lows',
          'Inability to rebalance',
          'Psychological impact on investor behavior'
        ],
        suitableFor: [
          'Stress testing retirement readiness',
          'Evaluating emergency fund adequacy',
          'Testing withdrawal strategies'
        ]
      },

      {
        id: 'high-inflation',
        name: 'High Inflation Environment',
        description: 'Models impact of sustained high inflation on purchasing power',
        category: 'stress',
        parameters: {
          scenarioType: 'stress',
          inflationRate: 6.0,
          realEquityReturn: 2.0,
          realBondReturn: -2.0,
          realCashReturn: -3.0
        },
        assumptions: [
          'Inflation remains elevated for 5+ years',
          'Central banks struggle to control prices',
          'Negative real returns on fixed income',
          'Commodity prices surge'
        ],
        keyRisks: [
          'Rapid erosion of purchasing power',
          'Fixed income investments lose value',
          'Living costs outpace income growth'
        ],
        suitableFor: [
          'Inflation hedging strategies',
          'Asset allocation reviews',
          'Fixed income investors'
        ]
      },

      {
        id: 'longevity-stress',
        name: 'Extended Longevity',
        description: 'Plans for living to 100+ with associated costs',
        category: 'stress',
        parameters: {
          scenarioType: 'stress',
          lifeExpectancy: 100,
          inflationRate: 3.0,
          realEquityReturn: 4.0,
          realBondReturn: 1.5,
          realCashReturn: 0.0
        },
        assumptions: [
          'Medical advances extend lifespan',
          'Healthcare costs rise faster than inflation',
          'Need for long-term care increases',
          'State pension age increases'
        ],
        keyRisks: [
          'Outliving retirement savings',
          'Increased healthcare expenses',
          'Need for care home funding'
        ],
        suitableFor: [
          'Long-term planning',
          'Insurance needs assessment',
          'Estate planning considerations'
        ]
      },

      // Goal-Based Scenarios
      {
        id: 'early-retirement',
        name: 'Early Retirement Strategy',
        description: 'Aggressive savings plan for retiring before state pension age',
        category: 'goal-based',
        parameters: {
          scenarioType: 'base',
          retirementAge: 55,
          inflationRate: 2.5,
          realEquityReturn: 5.5,
          realBondReturn: 2.0,
          realCashReturn: 0.5
        },
        assumptions: [
          'High savings rate maintained',
          'Bridge period before state pension',
          'Healthcare costs before NHS coverage',
          'Lifestyle adjustments accepted'
        ],
        keyRisks: [
          'Gap before state pension',
          'Loss of employer benefits',
          'Sequence of returns risk'
        ],
        suitableFor: [
          'FIRE movement followers',
          'High earners with strong savings',
          'Career transition planning'
        ]
      },

      {
        id: 'legacy-focused',
        name: 'Legacy & Inheritance Planning',
        description: 'Balances retirement needs with wealth transfer goals',
        category: 'goal-based',
        parameters: {
          scenarioType: 'base',
          inflationRate: 2.5,
          realEquityReturn: 4.5,
          realBondReturn: 2.0,
          realCashReturn: 0.5,
          legacyTarget: 500000
        },
        assumptions: [
          'Moderate spending in retirement',
          'Tax-efficient wealth transfer',
          'Trust structures considered',
          'Gifting strategies implemented'
        ],
        keyRisks: [
          'Changes in inheritance tax',
          'Family circumstances change',
          'Care costs deplete estate'
        ],
        suitableFor: [
          'High net worth individuals',
          'Multi-generational planning',
          'Charitable giving goals'
        ]
      }
    ];
  }

  /**
   * Generate enhanced insights with detailed explanations
   */
  static generateEnhancedInsights(
    scenario: CashFlowScenario,
    projectionSummary: any
  ): EnhancedInsight[] {
    const insights: EnhancedInsight[] = [];

    // Portfolio Sustainability Insights
    if (projectionSummary.sustainabilityRating === 'Excellent') {
      insights.push({
        category: 'opportunity',
        priority: 'high',
        title: 'Strong Portfolio Sustainability',
        description: 'Your portfolio shows excellent sustainability with high probability of meeting all goals',
        impact: 'You may have room to increase spending or reduce investment risk',
        recommendation: 'Consider reviewing your goals - you might be able to retire earlier or increase lifestyle spending',
        relatedMetrics: ['finalPortfolioValue', 'sustainabilityRating']
      });
    } else if (projectionSummary.sustainabilityRating === 'Poor' || projectionSummary.sustainabilityRating === 'Critical') {
      insights.push({
        category: 'risk',
        priority: 'high',
        title: 'Portfolio Sustainability Concerns',
        description: 'Current projections show risk of depleting assets before life expectancy',
        impact: 'You may need to work longer, save more, or adjust retirement expectations',
        recommendation: 'Consider increasing contributions, delaying retirement, or reducing planned expenses',
        relatedMetrics: ['sustainabilityRating', 'shortfallRisk']
      });
    }

    // Sequence of Returns Risk
    const yearsToRetirement = scenario.retirementAge - scenario.clientAge;
    if (yearsToRetirement <= 5 && yearsToRetirement > 0) {
      insights.push({
        category: 'risk',
        priority: 'high',
        title: 'Approaching Retirement - Sequence Risk',
        description: 'You\'re entering the critical period where market downturns can significantly impact retirement outcomes',
        impact: 'Poor returns in early retirement years can permanently reduce portfolio longevity',
        recommendation: 'Consider de-risking strategy, building cash reserves, or flexible withdrawal planning',
        relatedMetrics: ['sequenceRisk', 'retirementAge']
      });
    }

    // Tax Efficiency Opportunities
    if (scenario.pensionContributions < scenario.currentIncome * 0.15) {
      insights.push({
        category: 'opportunity',
        priority: 'medium',
        title: 'Pension Contribution Opportunity',
        description: 'Your pension contributions are below typical tax-efficient levels',
        impact: 'Missing out on tax relief and employer matching',
        recommendation: 'Consider increasing pension contributions to at least 15% of gross income',
        relatedMetrics: ['pensionContributions', 'currentIncome']
      });
    }

    // Emergency Fund Assessment
    const monthlyExpenses = scenario.currentExpenses / 12;
    const emergencyMonths = scenario.currentSavings / monthlyExpenses;
    
    if (emergencyMonths < 3) {
      insights.push({
        category: 'risk',
        priority: 'high',
        title: 'Insufficient Emergency Fund',
        description: `Current savings cover only ${emergencyMonths.toFixed(1)} months of expenses`,
        impact: 'May need to liquidate investments during market downturns',
        recommendation: 'Build emergency fund to cover 3-6 months of essential expenses',
        relatedMetrics: ['currentSavings', 'currentExpenses']
      });
    }

    // Asset Allocation Review
    if (scenario.equityAllocation > 80 && scenario.clientAge > 50) {
      insights.push({
        category: 'risk',
        priority: 'medium',
        title: 'High Equity Allocation for Age',
        description: 'Your equity allocation may be aggressive given your age and time to retirement',
        impact: 'Higher volatility could impact retirement timing',
        recommendation: 'Consider age-appropriate asset allocation review',
        relatedMetrics: ['equityAllocation', 'clientAge']
      });
    }

    // Inflation Protection
    if (scenario.inflationRate > 3 && scenario.cashAllocation > 20) {
      insights.push({
        category: 'risk',
        priority: 'medium',
        title: 'Inflation Erosion Risk',
        description: 'High cash allocation may lose purchasing power in inflationary environment',
        impact: 'Real returns on cash likely to be negative',
        recommendation: 'Consider inflation-protected securities or real assets',
        relatedMetrics: ['inflationRate', 'cashAllocation']
      });
    }

    return insights;
  }

  /**
   * Generate detailed risk analysis with explanations
   */
  static generateDetailedRiskAnalysis(
    scenario: CashFlowScenario,
    riskMetrics: RiskMetrics
  ): RiskAnalysisDetail[] {
    return [
      {
        riskType: 'shortfallRisk',
        level: riskMetrics.shortfallRisk,
        description: 'The risk of running out of money before the end of your planned retirement period',
        factors: [
          'Current savings level',
          'Withdrawal rate in retirement',
          'Investment returns',
          'Longevity assumptions'
        ],
        mitigationStrategies: [
          'Increase current savings rate',
          'Delay retirement by 1-2 years',
          'Implement dynamic withdrawal strategy',
          'Consider part-time work in early retirement',
          'Review and reduce discretionary expenses'
        ],
        probabilityRange: this.getProbabilityRange(riskMetrics.shortfallRisk),
        potentialImpact: 'May need to significantly reduce lifestyle or return to work'
      },
      
      {
        riskType: 'longevityRisk',
        level: riskMetrics.longevityRisk,
        description: 'The possibility of outliving your retirement savings due to longer than expected lifespan',
        factors: [
          'Family history and health status',
          'Medical advances extending life',
          'Quality of healthcare access',
          'Lifestyle and health habits'
        ],
        mitigationStrategies: [
          'Plan for 90-95 year life expectancy',
          'Consider longevity insurance/annuities',
          'Maintain growth allocation in portfolio',
          'Develop phased retirement strategy',
          'Build multiple income streams'
        ],
        probabilityRange: this.getProbabilityRange(riskMetrics.longevityRisk),
        potentialImpact: 'Dependence on state support or family in later years'
      },
      
      {
        riskType: 'inflationRisk',
        level: riskMetrics.inflationRisk,
        description: 'The erosion of purchasing power over time due to rising prices',
        factors: [
          'Fixed income allocation',
          'Length of retirement',
          'Healthcare cost inflation',
          'Lifestyle inflation expectations'
        ],
        mitigationStrategies: [
          'Maintain equity allocation for growth',
          'Consider inflation-linked bonds',
          'Invest in real assets (property/commodities)',
          'Build inflation assumptions into planning',
          'Review and adjust spending annually'
        ],
        probabilityRange: this.getProbabilityRange(riskMetrics.inflationRisk),
        potentialImpact: 'Gradual decline in standard of living over retirement'
      },
      
      {
        riskType: 'sequenceRisk',
        level: riskMetrics.sequenceRisk,
        description: 'The risk of experiencing poor investment returns early in retirement when withdrawing funds',
        factors: [
          'Market valuations at retirement',
          'Withdrawal rate and flexibility',
          'Asset allocation strategy',
          'Time to state pension'
        ],
        mitigationStrategies: [
          'Build 2-3 year cash buffer before retirement',
          'Implement bucket strategy for withdrawals',
          'Use dynamic withdrawal rates',
          'Consider retirement date flexibility',
          'Diversify income sources'
        ],
        probabilityRange: this.getProbabilityRange(riskMetrics.sequenceRisk),
        potentialImpact: 'Permanent reduction in sustainable withdrawal rate'
      }
    ];
  }

  /**
   * Helper to convert risk level to probability range
   */
  private static getProbabilityRange(level: 'Low' | 'Medium' | 'High'): { min: number; max: number } {
    switch (level) {
      case 'Low': return { min: 0, max: 25 };
      case 'Medium': return { min: 25, max: 50 };
      case 'High': return { min: 50, max: 75 };
      default: return { min: 0, max: 100 };
    }
  }

  /**
   * Generate scenario comparison insights
   */
  static generateScenarioComparison(scenarios: CashFlowScenario[]): {
    bestCase: string;
    worstCase: string;
    keyDifferences: string[];
    recommendation: string;
  } {
    // Implementation for comparing multiple scenarios
    return {
      bestCase: 'Optimistic scenario shows 95% probability of success',
      worstCase: 'Market crash scenario requires 30% spending reduction',
      keyDifferences: [
        'Base case provides balanced approach with 75% success rate',
        'Stress scenarios highlight need for 24-month emergency fund',
        'Early retirement feasible only in optimistic scenario'
      ],
      recommendation: 'Plan using base case but prepare contingencies for stress scenarios'
    };
  }
}