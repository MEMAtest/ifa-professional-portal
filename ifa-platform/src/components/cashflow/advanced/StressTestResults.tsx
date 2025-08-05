// ================================================================
// src/components/cashflow/advanced/StressTestResults.tsx - PHASE 3 CORE
// Professional display of stress test results with charts
// Integrates with Recharts for visualization
// ================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  BarChart3,
  Target,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import type { CashFlowScenario } from '@/types/cashflow';

// Import the interface from StressTestModal
export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  survivalProbability: number;
  shortfallRisk: number;
  resilienceScore: number;
  worstCaseOutcome: number;
  recoveryTimeYears?: number;
  impactAnalysis: {
    portfolioDeclinePercent: number;
    incomeReductionPercent: number;
    expenseIncreasePercent: number;
  };
}

interface StressTestResultsProps {
  results: StressTestResult[];
  scenario: CashFlowScenario | null;
}

export function StressTestResults({ results, scenario }: StressTestResultsProps) {
  // Calculate summary statistics
  const avgResilienceScore = results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length;
  const avgSurvivalProbability = results.reduce((sum, r) => sum + r.survivalProbability, 0) / results.length;
  const maxShortfallRisk = Math.max(...results.map(r => r.shortfallRisk));
  const worstCaseScenario = results.reduce((worst, current) => 
    current.worstCaseOutcome < worst.worstCaseOutcome ? current : worst
  );

  // Color schemes for charts
  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];
  
  // Prepare chart data
  const resilienceData = results.map((result, index) => ({
    name: result.scenarioName.replace(/\s+/g, '\n'),
    score: result.resilienceScore,
    survival: result.survivalProbability,
    shortfall: result.shortfallRisk,
    fill: COLORS[index % COLORS.length]
  }));

  const impactData = results.map((result, index) => ({
    name: result.scenarioName,
    portfolio: Math.abs(result.impactAnalysis.portfolioDeclinePercent),
    income: Math.abs(result.impactAnalysis.incomeReductionPercent),
    expenses: result.impactAnalysis.expenseIncreasePercent,
    fill: COLORS[index % COLORS.length]
  }));

  // Gauge data for overall resilience
  const gaugeData = [
    { name: 'Resilience', value: avgResilienceScore, fill: '#3b82f6' }
  ];

  const getResilienceColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSurvivalColor = (probability: number): string => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {avgResilienceScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Avg Resilience Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold ${getSurvivalColor(avgSurvivalProbability)}`}>
                {avgSurvivalProbability.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Avg Survival Rate</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {maxShortfallRisk.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Max Shortfall Risk</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {results.length}
              </div>
              <div className="text-sm text-gray-600">Scenarios Tested</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800">Key Finding</div>
                <div className="text-sm text-amber-700 mt-1">
                  The worst-case scenario is <strong>{worstCaseScenario.scenarioName}</strong> with a 
                  shortfall risk of {worstCaseScenario.shortfallRisk.toFixed(1)}% and potential losses 
                  of £{Math.abs(worstCaseScenario.worstCaseOutcome).toLocaleString()}.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resilience Scores Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Resilience Scores by Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resilienceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value}${name === 'score' ? '' : '%'}`, 
                      name === 'score' ? 'Resilience Score' : 
                      name === 'survival' ? 'Survival Probability' : 'Shortfall Risk'
                    ]}
                  />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Impact Analysis Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Impact Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value}%`, 
                      name === 'portfolio' ? 'Portfolio Decline' :
                      name === 'income' ? 'Income Reduction' : 'Expenses Increase'
                    ]}
                  />
                  <Bar dataKey="portfolio" fill="#ef4444" name="Portfolio" />
                  <Bar dataKey="income" fill="#f59e0b" name="Income" />
                  <Bar dataKey="expenses" fill="#8b5cf6" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Resilience Gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Overall Portfolio Resilience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  data={gaugeData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar 
                    dataKey="value" 
                    cornerRadius={10} 
                    fill="#3b82f6"
                  />
                  <text 
                    x="50%" 
                    y="50%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="text-3xl font-bold fill-gray-800"
                  >
                    {avgResilienceScore.toFixed(0)}
                  </text>
                  <text 
                    x="50%" 
                    y="60%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="text-sm fill-gray-600"
                  >
                    Resilience Score
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Resilience Assessment</h4>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getResilienceColor(avgResilienceScore)}`}>
                  {avgResilienceScore >= 80 ? 'High Resilience' :
                   avgResilienceScore >= 60 ? 'Moderate Resilience' : 'Low Resilience'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Survival Probability:</span>
                  <span className={`font-medium ${getSurvivalColor(avgSurvivalProbability)}`}>
                    {avgSurvivalProbability.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Maximum Shortfall Risk:</span>
                  <span className="font-medium text-red-600">
                    {maxShortfallRisk.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Scenarios Tested:</span>
                  <span className="font-medium">{results.length}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Interpretation:</strong> {
                    avgResilienceScore >= 80 
                      ? 'Your portfolio shows strong resilience across stress scenarios. Minor adjustments may further improve outcomes.'
                      : avgResilienceScore >= 60
                      ? 'Your portfolio shows moderate resilience. Consider diversification strategies to improve stress performance.'
                      : 'Your portfolio may struggle in stress scenarios. Review asset allocation and consider more conservative positioning.'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Detailed Results by Scenario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Scenario</th>
                  <th className="text-right p-3 font-medium">Resilience Score</th>
                  <th className="text-right p-3 font-medium">Survival Probability</th>
                  <th className="text-right p-3 font-medium">Shortfall Risk</th>
                  <th className="text-right p-3 font-medium">Portfolio Impact</th>
                  <th className="text-right p-3 font-medium">Recovery Time</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result.scenarioId} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{result.scenarioName}</div>
                    </td>
                    <td className="text-right p-3">
                      <Badge className={getResilienceColor(result.resilienceScore)}>
                        {result.resilienceScore.toFixed(0)}
                      </Badge>
                    </td>
                    <td className={`text-right p-3 font-medium ${getSurvivalColor(result.survivalProbability)}`}>
                      {result.survivalProbability.toFixed(1)}%
                    </td>
                    <td className="text-right p-3 font-medium text-red-600">
                      {result.shortfallRisk.toFixed(1)}%
                    </td>
                    <td className="text-right p-3 font-medium text-red-600">
                      -{Math.abs(result.impactAnalysis.portfolioDeclinePercent).toFixed(1)}%
                    </td>
                    <td className="text-right p-3 text-gray-600">
                      {result.recoveryTimeYears ? `${result.recoveryTimeYears}y` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {avgResilienceScore < 60 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-800">High Priority</div>
                <div className="text-sm text-red-700 mt-1">
                  Consider reducing portfolio risk through increased diversification or more conservative asset allocation.
                </div>
              </div>
            )}
            
            {maxShortfallRisk > 30 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-medium text-amber-800">Medium Priority</div>
                <div className="text-sm text-amber-700 mt-1">
                  High shortfall risk detected. Review emergency fund adequacy and consider stress-testing withdrawal strategies.
                </div>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800">General Recommendation</div>
              <div className="text-sm text-blue-700 mt-1">
                Regular stress testing (annually or after major life changes) helps ensure your financial plan remains robust under various market conditions.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}