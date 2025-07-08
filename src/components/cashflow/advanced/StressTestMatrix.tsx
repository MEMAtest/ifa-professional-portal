// ================================================================
// CORRECTED: StressTestMatrix.tsx using your existing components
// Path: ifa-platform/src/components/cashflow/advanced/StressTestMatrix.tsx
// ================================================================
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Shield } from 'lucide-react';
import { StressTestResults } from '@/types/advanced-analytics';

interface StressTestMatrixProps {
  stressTests: StressTestResults[];
}

export const StressTestMatrix: React.FC<StressTestMatrixProps> = ({ stressTests }) => {
  const getScenarioName = (scenarioId: string) => {
    const names: Record<string, string> = {
      'market_crash_2008': '2008-Style Market Crash',
      'inflation_shock_1970s': '1970s Inflation Shock',
      'longevity_extension': 'Longevity Extension',
      'interest_rate_shock': 'Interest Rate Shock',
      'prolonged_recession': 'Prolonged Recession'
    };
    return names[scenarioId] || scenarioId;
  };

  const getResilienceColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          Stress Test Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stressTests.map((test) => (
            <div key={test.scenario_id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-lg">
                  {getScenarioName(test.scenario_id)}
                </h4>
                <Badge variant={getResilienceColor(test.resilience_score)}>
                  Resilience: {test.resilience_score}/100
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Survival Probability</div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={test.survival_probability} 
                      className="flex-1"
                    />
                    <span className="text-sm font-medium">
                      {test.survival_probability.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Shortfall Risk</div>
                  <div className="text-lg font-semibold text-red-600">
                    {test.shortfall_risk.toFixed(1)}%
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Worst Case</div>
                  <div className="text-lg font-semibold text-red-600">
                    £{Math.abs(test.worst_case_outcome).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="text-sm text-gray-600 mb-2">Impact Analysis:</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>Portfolio: {test.impact_analysis.portfolio_decline_percent}%</div>
                  <div>Income: {test.impact_analysis.income_reduction_percent}%</div>
                  <div>Expenses: +{test.impact_analysis.expense_increase_percent}%</div>
                </div>
                {test.recovery_time_years && (
                  <div className="text-sm text-gray-600 mt-1">
                    Est. Recovery Time: {test.recovery_time_years} years
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};