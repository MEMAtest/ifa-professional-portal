// ================================================================
// src/components/monte-carlo/ResultsNarrative.tsx
// Comprehensive results story with plain English summary,
// scenario comparison, and actionable insights for IFAs
// ================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  PiggyBank,
  Calendar
} from 'lucide-react';

// Types
interface SimulationResults {
  successRate: number;
  averageFinalWealth: number;
  medianFinalWealth: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  failureRisk: number;
  maxDrawdown: number;
  yearlyData?: any[];
  executionTime?: number;
  simulationCount?: number;
}

interface SimulationInputs {
  initialPortfolio: number;
  timeHorizon: number;
  annualWithdrawal: number;
  riskScore: number;
  inflationRate: number;
  simulationCount: number;
}

interface ResultsNarrativeProps {
  results: SimulationResults;
  inputs: SimulationInputs;
  clientName?: string;
}

// Helper to format currency
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) {
    return `${sign}£${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}£${(absValue / 1000).toFixed(0)}K`;
  }
  return `${sign}£${absValue.toLocaleString()}`;
};

// Calculate years to depletion for worst case
const calculateYearsToDepletion = (
  initialPortfolio: number,
  annualWithdrawal: number,
  p10FinalWealth: number,
  timeHorizon: number
): number | null => {
  if (p10FinalWealth >= 0) return null; // No depletion in worst case

  // Estimate when portfolio hits zero based on linear interpolation
  const totalWithdrawn = annualWithdrawal * timeHorizon;
  const endingWealth = p10FinalWealth;
  const shortfall = Math.abs(endingWealth);
  const yearsShort = shortfall / annualWithdrawal;
  return Math.max(1, Math.round(timeHorizon - yearsShort));
};

// Calculate safe withdrawal rate for horizon
const getSafeWithdrawalRate = (timeHorizon: number): number => {
  if (timeHorizon <= 20) return 5.0;
  if (timeHorizon <= 25) return 4.5;
  if (timeHorizon <= 30) return 4.0;
  if (timeHorizon <= 35) return 3.5;
  return 3.0;
};

// Calculate inflation-adjusted value
const getInflationAdjustedValue = (
  amount: number,
  inflationRate: number,
  years: number
): number => {
  return amount / Math.pow(1 + inflationRate / 100, years);
};

export const ResultsNarrative: React.FC<ResultsNarrativeProps> = ({
  results,
  inputs,
  clientName
}) => {
  const displayName = clientName || 'your client';
  const simCount = results.simulationCount || inputs.simulationCount;
  const withdrawalRate = (inputs.annualWithdrawal / inputs.initialPortfolio) * 100;
  const safeRate = getSafeWithdrawalRate(inputs.timeHorizon);
  const rateMargin = safeRate - withdrawalRate;
  const yearsToDepletion = calculateYearsToDepletion(
    inputs.initialPortfolio,
    inputs.annualWithdrawal,
    results.percentiles.p10,
    inputs.timeHorizon
  );
  const inflationAdjustedWithdrawal = getInflationAdjustedValue(
    inputs.annualWithdrawal,
    inputs.inflationRate,
    inputs.timeHorizon
  );

  // Determine overall status
  const getStatus = () => {
    if (results.successRate >= 85) return { level: 'excellent', color: 'green', Icon: CheckCircle2 };
    if (results.successRate >= 70) return { level: 'good', color: 'blue', Icon: CheckCircle2 };
    if (results.successRate >= 50) return { level: 'moderate', color: 'amber', Icon: AlertTriangle };
    return { level: 'concerning', color: 'red', Icon: XCircle };
  };

  const status = getStatus();

  // Generate dynamic recommendations
  const getRecommendations = (): { text: string; impact?: string; icon: React.ElementType }[] => {
    const recommendations: { text: string; impact?: string; icon: React.ElementType }[] = [];

    if (results.successRate < 70) {
      const suggestedReduction = Math.round(inputs.annualWithdrawal * 0.1);
      recommendations.push({
        text: `Reduce annual withdrawal by ${formatCurrency(suggestedReduction)}`,
        impact: 'Could increase success rate by ~8-12%',
        icon: PiggyBank
      });
    }

    if (results.successRate < 85) {
      recommendations.push({
        text: 'Build a 2-year cash buffer for market protection',
        impact: 'Reduces sequence-of-returns risk',
        icon: Clock
      });
    }

    if (withdrawalRate > safeRate) {
      recommendations.push({
        text: `Consider reducing withdrawal rate to ${safeRate.toFixed(1)}% or below`,
        impact: 'Aligns with sustainable withdrawal research',
        icon: TrendingDown
      });
    }

    if (results.successRate >= 90) {
      recommendations.push({
        text: `${displayName} may have capacity to increase spending or retire earlier`,
        impact: 'High sustainability provides flexibility',
        icon: TrendingUp
      });
    }

    if (results.successRate >= 85 && results.successRate < 95) {
      recommendations.push({
        text: 'Review plan annually and adjust for market performance',
        impact: 'Early years are most critical for outcomes',
        icon: Calendar
      });
    }

    if (results.maxDrawdown > 30) {
      recommendations.push({
        text: 'Discuss market volatility expectations with your client',
        impact: `Max drawdown of ${results.maxDrawdown.toFixed(0)}% could test emotional resilience`,
        icon: AlertTriangle
      });
    }

    return recommendations.slice(0, 4); // Max 4 recommendations
  };

  const recommendations = getRecommendations();

  // Scenario outcomes
  const scenarios = [
    {
      name: 'Best Case',
      percentile: '90th',
      value: results.percentiles.p90,
      color: 'green',
      Icon: TrendingUp,
      description: 'Markets perform well; wealth grows despite withdrawals'
    },
    {
      name: 'Median',
      percentile: '50th',
      value: results.percentiles.p50,
      color: 'blue',
      Icon: Minus,
      description: 'Typical outcome; portfolio sustains lifestyle'
    },
    {
      name: 'Worst Case',
      percentile: '10th',
      value: results.percentiles.p10,
      color: results.percentiles.p10 < 0 ? 'red' : 'amber',
      Icon: TrendingDown,
      description: results.percentiles.p10 < 0
        ? `Portfolio depletes ~${yearsToDepletion ? `year ${yearsToDepletion}` : 'before target'}`
        : 'Portfolio sustains but with lower final value'
    }
  ];

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          What This Means for {displayName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Plain English Summary */}
        <div className={`p-4 rounded-lg border-l-4 ${
          status.color === 'green' ? 'bg-green-50 border-green-500' :
          status.color === 'blue' ? 'bg-blue-50 border-blue-500' :
          status.color === 'amber' ? 'bg-amber-50 border-amber-500' :
          'bg-red-50 border-red-500'
        }`}>
          <p className="text-gray-800 leading-relaxed">
            Based on <strong>{simCount.toLocaleString()} simulations</strong>, {displayName} has{' '}
            <strong className={`${
              status.color === 'green' ? 'text-green-700' :
              status.color === 'blue' ? 'text-blue-700' :
              status.color === 'amber' ? 'text-amber-700' :
              'text-red-700'
            }`}>
              {results.successRate.toFixed(0)}% probability
            </strong>{' '}
            of their {formatCurrency(inputs.initialPortfolio)} portfolio lasting the full{' '}
            <strong>{inputs.timeHorizon}-year</strong> retirement while withdrawing{' '}
            <strong>{formatCurrency(inputs.annualWithdrawal)}</strong> annually.
            {results.medianFinalWealth > 0 && (
              <> In the median scenario, they would end with <strong>{formatCurrency(results.medianFinalWealth)}</strong> remaining.</>
            )}
          </p>
        </div>

        {/* Scenario Comparison */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-3">Outcome Scenarios</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarios.map((scenario, index) => {
              const Icon = scenario.Icon;
              const colorClasses = {
                green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
                amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600' },
                red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' }
              };
              const c = colorClasses[scenario.color as keyof typeof colorClasses];

              return (
                <div key={index} className={`p-4 rounded-lg border ${c.bg} ${c.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${c.icon}`} />
                    <span className="font-medium text-gray-900">{scenario.name}</span>
                    <span className="text-xs text-gray-500">({scenario.percentile})</span>
                  </div>
                  <p className={`text-2xl font-bold ${c.text}`}>
                    {formatCurrency(scenario.value)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{scenario.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {/* Withdrawal Safety Margin */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-xs uppercase font-medium">Withdrawal Rate</p>
            <p className="font-semibold text-gray-900">
              {withdrawalRate.toFixed(1)}% vs {safeRate.toFixed(1)}% safe
            </p>
            <p className={`text-xs ${rateMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rateMargin >= 0 ? `+${rateMargin.toFixed(1)}% margin` : `${rateMargin.toFixed(1)}% above safe rate`}
            </p>
          </div>

          {/* Inflation Impact */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-xs uppercase font-medium">Inflation Impact</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(inflationAdjustedWithdrawal)}
            </p>
            <p className="text-xs text-gray-600">
              {formatCurrency(inputs.annualWithdrawal)} in today&apos;s money after {inputs.timeHorizon}yr
            </p>
          </div>

          {/* Years to Depletion (Worst Case) */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-xs uppercase font-medium">Worst Case Runway</p>
            <p className="font-semibold text-gray-900">
              {yearsToDepletion ? `Year ${yearsToDepletion}` : `${inputs.timeHorizon}+ years`}
            </p>
            <p className="text-xs text-gray-600">
              {yearsToDepletion ? 'Depletes before target' : 'Lasts full period'}
            </p>
          </div>
        </div>

        {/* Actionable Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <p className="font-medium text-gray-900">Recommendations</p>
            </div>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => {
                const RecIcon = rec.icon;
                return (
                  <li key={index} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm text-gray-800">{rec.text}</span>
                      {rec.impact && (
                        <span className="text-xs text-gray-500 ml-2">— {rec.impact}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsNarrative;
