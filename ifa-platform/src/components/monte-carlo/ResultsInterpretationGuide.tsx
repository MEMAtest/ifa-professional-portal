// ================================================================
// src/components/monte-carlo/ResultsInterpretationGuide.tsx
// Post-simulation helper content explaining what results mean
// Shows contextual guidance based on actual simulation outcomes
// ================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BarChart3,
  Target,
  Shield
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
}

interface SimulationInputs {
  initialPortfolio: number;
  timeHorizon: number;
  annualWithdrawal: number;
  riskScore: number;
  inflationRate: number;
  simulationCount: number;
}

interface ResultsInterpretationGuideProps {
  results: SimulationResults;
  inputs: SimulationInputs;
}

// Helper to format currency
const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toLocaleString()}`;
};

export const ResultsInterpretationGuide: React.FC<ResultsInterpretationGuideProps> = ({
  results,
  inputs
}) => {
  const [expanded, setExpanded] = useState(false);

  // Determine risk level and messaging
  const getRiskLevel = () => {
    if (results.successRate >= 90) return { level: 'excellent', color: 'green', icon: CheckCircle2 };
    if (results.successRate >= 75) return { level: 'good', color: 'green', icon: CheckCircle2 };
    if (results.successRate >= 50) return { level: 'moderate', color: 'amber', icon: AlertTriangle };
    return { level: 'high', color: 'red', icon: XCircle };
  };

  const riskInfo = getRiskLevel();
  const withdrawalRate = (inputs.annualWithdrawal / inputs.initialPortfolio) * 100;

  // Guide items based on results
  const guideItems = [
    {
      icon: Target,
      title: 'Success Rate Explained',
      color: riskInfo.color,
      content: results.successRate >= 90
        ? `A ${results.successRate.toFixed(0)}% success rate means in 9 out of 10 market scenarios, your client's money lasts the full ${inputs.timeHorizon} years. This is considered excellent.`
        : results.successRate >= 75
        ? `A ${results.successRate.toFixed(0)}% success rate is considered good. In most scenarios, the portfolio sustains the planned withdrawals.`
        : results.successRate >= 50
        ? `A ${results.successRate.toFixed(0)}% success rate indicates moderate risk. Consider discussing adjustments to improve confidence.`
        : `A ${results.successRate.toFixed(0)}% success rate is concerning. Significant changes to the plan are recommended.`
    },
    {
      icon: BarChart3,
      title: 'What the Percentiles Mean',
      color: 'blue',
      content: `The 10th percentile (${formatCurrency(results.percentiles.p10)}) shows the worst 10% of outcomes. The median (${formatCurrency(results.percentiles.p50)}) is the middle outcome. The 90th percentile (${formatCurrency(results.percentiles.p90)}) shows the best 10% of outcomes.`
    },
    {
      icon: TrendingDown,
      title: 'Maximum Drawdown',
      color: results.maxDrawdown > 40 ? 'red' : results.maxDrawdown > 25 ? 'amber' : 'green',
      content: `The ${results.maxDrawdown.toFixed(0)}% max drawdown shows the largest peak-to-trough decline your client might experience. ${
        results.maxDrawdown > 40
          ? 'This is significant - ensure your client can emotionally handle such volatility.'
          : results.maxDrawdown > 25
          ? 'This is moderate - discuss market volatility expectations with your client.'
          : 'This is relatively low, suggesting a more stable portfolio journey.'
      }`
    },
    {
      icon: Shield,
      title: 'Withdrawal Rate Assessment',
      color: withdrawalRate > 5 ? 'red' : withdrawalRate > 4 ? 'amber' : 'green',
      content: `Your client's ${withdrawalRate.toFixed(1)}% withdrawal rate ${
        withdrawalRate <= 4
          ? 'is at or below the traditional 4% safe withdrawal rate - a conservative approach.'
          : withdrawalRate <= 5
          ? 'is slightly above the 4% rule. Monitor closely and consider flexibility.'
          : 'is aggressive. Consider strategies to reduce spending or increase income sources.'
      }`
    }
  ];

  // Threshold benchmarks
  const thresholds = [
    { rate: '95%+', meaning: 'Highly Sustainable', color: 'bg-green-100 text-green-700' },
    { rate: '85-94%', meaning: 'Good Confidence', color: 'bg-green-50 text-green-600' },
    { rate: '75-84%', meaning: 'Acceptable', color: 'bg-amber-50 text-amber-600' },
    { rate: '50-74%', meaning: 'Needs Review', color: 'bg-orange-50 text-orange-600' },
    { rate: '<50%', meaning: 'High Risk', color: 'bg-red-50 text-red-600' }
  ];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Understanding Your Results</h3>
              <p className="text-sm text-gray-600">What these numbers mean for your client</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600"
          >
            {expanded ? (
              <>Less <ChevronUp className="h-4 w-4 ml-1" /></>
            ) : (
              <>More <ChevronDown className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>

        {/* Quick Summary - Always visible */}
        <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                <strong>Quick Take:</strong>{' '}
                {results.successRate >= 85
                  ? `This plan shows strong sustainability. Your client has a high probability of achieving their retirement goals.`
                  : results.successRate >= 70
                  ? `This plan has reasonable sustainability but could benefit from a buffer strategy or slight adjustments.`
                  : results.successRate >= 50
                  ? `This plan carries material risk. Discuss with your client about reducing withdrawals or extending their working years.`
                  : `This plan needs significant revision. The current parameters are unlikely to sustain your client through retirement.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Threshold Reference */}
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Success Rate Benchmarks</p>
              <div className="flex flex-wrap gap-2">
                {thresholds.map((t, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-full ${t.color}`}>
                    {t.rate}: {t.meaning}
                  </span>
                ))}
              </div>
            </div>

            {/* Detailed Guide Items */}
            <div className="space-y-3">
              {guideItems.map((item, index) => {
                const Icon = item.icon;
                const colorClasses = {
                  green: 'bg-green-100 text-green-600',
                  amber: 'bg-amber-100 text-amber-600',
                  red: 'bg-red-100 text-red-600',
                  blue: 'bg-blue-100 text-blue-600'
                };
                return (
                  <div key={index} className="p-3 bg-white rounded-lg border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* When to Adjust */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-2">When to Recommend Adjustments:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Success rate below 75% - consider reducing withdrawals by 10-15%</li>
                <li>• Max drawdown above 35% - review risk tolerance alignment</li>
                <li>• 10th percentile is negative - discuss contingency planning</li>
                <li>• Withdrawal rate above 5% - explore supplemental income options</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsInterpretationGuide;
