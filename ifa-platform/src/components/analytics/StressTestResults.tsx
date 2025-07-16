'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

interface StressTestResultsProps {
  data: any[];
  detailed?: boolean;
}

export function StressTestResults({ data, detailed = false }: StressTestResultsProps) {
  // Mock data if not provided
  const mockStressTests = [
    {
      scenario_id: '2008-crash',
      name: '2008-Style Market Crash',
      survival_probability: 80.2,
      shortfall_risk: 19.8,
      worst_case_outcome: 198959.992,
      resilience_score: 40,
      recovery_time_years: 4,
      impact_analysis: {
        portfolio_decline_percent: -50,
        income_reduction_percent: 0,
        expense_increase_percent: 0
      }
    },
    {
      scenario_id: '1970s-inflation',
      name: '1970s Inflation Shock',
      survival_probability: 79.3,
      shortfall_risk: 20.7,
      worst_case_outcome: 199353.98,
      resilience_score: 40,
      recovery_time_years: 5,
      impact_analysis: {
        portfolio_decline_percent: -60,
        income_reduction_percent: 0,
        expense_increase_percent: 0
      }
    }
  ];

  const stressTests = data && data.length > 0 ? data : mockStressTests;

  const getResilienceColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskIcon = (risk: number) => {
    if (risk <= 15) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (risk <= 25) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Stress Test Analysis
          <Badge variant="outline" className="ml-auto">
            {stressTests.length} scenarios tested
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stressTests.map((test, index) => (
            <div key={test.scenario_id || index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{test.name}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      {getRiskIcon(test.shortfall_risk)}
                      <span>Survival: {test.survival_probability.toFixed(1)}%</span>
                    </div>
                    <div className="text-gray-600">
                      Shortfall Risk: {test.shortfall_risk.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <Badge className={getResilienceColor(test.resilience_score)}>
                  Resilience: {test.resilience_score}/100
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">Worst Case</div>
                  <div className="font-semibold">
                    £{test.worst_case_outcome.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">Portfolio Impact</div>
                  <div className="font-semibold text-red-600">
                    {test.impact_analysis.portfolio_decline_percent}%
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">Recovery Time</div>
                  <div className="font-semibold">
                    {test.recovery_time_years} years
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">Overall Score</div>
                  <div className="font-semibold">
                    {test.resilience_score}/100
                  </div>
                </div>
              </div>

              {detailed && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h5 className="font-medium mb-2">Impact Analysis:</h5>
                  <div className="text-sm space-y-1">
                    <div>Portfolio: <span className="text-red-600">{test.impact_analysis.portfolio_decline_percent}%</span></div>
                    <div>Income: <span className="text-gray-600">{test.impact_analysis.income_reduction_percent}%</span></div>
                    <div>Expenses: <span className="text-gray-600">+{test.impact_analysis.expense_increase_percent}%</span></div>
                    <div className="text-xs text-gray-500 mt-2">
                      Est. Recovery Time: {test.recovery_time_years} years
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}