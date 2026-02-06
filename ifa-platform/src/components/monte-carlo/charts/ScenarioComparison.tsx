// ================================================================
// src/components/monte-carlo/charts/ScenarioComparison.tsx
// Scenario Comparison - Side-by-side comparison of Monte Carlo runs
// Shows delta highlighting for what changed between scenarios
// ================================================================

'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { GitCompare, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

export interface ScenarioData {
  id: string;
  name: string;
  runDate: string;
  inputs: {
    initialWealth: number;
    withdrawalAmount: number;
    withdrawalRate: number;
    timeHorizon: number;
    expectedReturn: number;
    volatility: number;
    inflationRate: number;
  };
  results: {
    successProbability: number;
    medianFinalWealth: number;
    p10FinalWealth: number;
    p90FinalWealth: number;
    maxDrawdown: number;
    averageReturn: number;
  };
}

interface ScenarioComparisonProps {
  scenarios: ScenarioData[];
  baselineIndex?: number; // Index of scenario to compare against (default 0)
  height?: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const DeltaIndicator: React.FC<{
  value: number;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}> = ({ value, isPercentage = false, higherIsBetter = true }) => {
  if (Math.abs(value) < 0.01) {
    return (
      <span className="text-gray-500 flex items-center gap-1 text-xs">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  const isPositive = value > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${
      isGood ? 'text-green-600' : 'text-red-600'
    }`}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}
      {isPercentage ? `${value.toFixed(1)}%` : formatCurrency(value)}
    </span>
  );
};

const MetricCard: React.FC<{
  label: string;
  values: { scenarioName: string; value: number; delta?: number }[];
  formatter: (v: number) => string;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}> = ({ label, values, formatter, isPercentage = false, higherIsBetter = true }) => {
  // Find best and worst values
  const numericValues = values.map(v => v.value);
  const best = higherIsBetter ? Math.max(...numericValues) : Math.min(...numericValues);
  const worst = higherIsBetter ? Math.min(...numericValues) : Math.max(...numericValues);

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-2 font-medium">{label}</div>
      <div className="space-y-2">
        {values.map((v, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className={`text-sm truncate max-w-[100px] ${
              v.value === best ? 'text-green-700 font-semibold' :
              v.value === worst && values.length > 2 ? 'text-red-700' : 'text-gray-700'
            }`}>
              {v.scenarioName}
            </span>
            <div className="flex flex-col items-end">
              <span className={`font-semibold ${
                v.value === best ? 'text-green-700' :
                v.value === worst && values.length > 2 ? 'text-red-700' : 'text-gray-900'
              }`}>
                {formatter(v.value)}
              </span>
              {v.delta !== undefined && idx > 0 && (
                <DeltaIndicator
                  value={v.delta}
                  isPercentage={isPercentage}
                  higherIsBetter={higherIsBetter}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[150px]">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-sm">
              <span style={{ color: entry.fill }}>{entry.name}:</span>
              <span className="font-medium">{entry.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios,
  baselineIndex = 0,
  height = 300
}) => {
  // Calculate deltas from baseline
  const scenariosWithDeltas = useMemo(() => {
    if (scenarios.length === 0) return [];

    const baseline = scenarios[baselineIndex];

    return scenarios.map((scenario, idx) => ({
      ...scenario,
      deltas: idx === baselineIndex ? null : {
        successProbability: scenario.results.successProbability - baseline.results.successProbability,
        medianFinalWealth: scenario.results.medianFinalWealth - baseline.results.medianFinalWealth,
        p10FinalWealth: scenario.results.p10FinalWealth - baseline.results.p10FinalWealth,
        p90FinalWealth: scenario.results.p90FinalWealth - baseline.results.p90FinalWealth,
        maxDrawdown: scenario.results.maxDrawdown - baseline.results.maxDrawdown,
      }
    }));
  }, [scenarios, baselineIndex]);

  // Prepare chart data for success probability comparison
  const chartData = useMemo(() => {
    return [{
      metric: 'Success Rate',
      ...Object.fromEntries(scenarios.map(s => [s.name, s.results.successProbability]))
    }];
  }, [scenarios]);

  // Identify what changed between scenarios
  const changedInputs = useMemo(() => {
    if (scenarios.length < 2) return [];

    const changes: { input: string; values: string[] }[] = [];
    const inputLabels: Record<string, string> = {
      initialWealth: 'Initial Wealth',
      withdrawalAmount: 'Annual Portfolio Withdrawal',
      withdrawalRate: 'Withdrawal Rate',
      timeHorizon: 'Time Horizon',
      expectedReturn: 'Expected Return',
      volatility: 'Volatility',
      inflationRate: 'Inflation Rate'
    };

    Object.keys(inputLabels).forEach(key => {
      const values = scenarios.map(s => (s.inputs as any)[key]);
      if (new Set(values).size > 1) {
        changes.push({
          input: inputLabels[key],
          values: values.map((v, i) => {
            if (key === 'initialWealth' || key === 'withdrawalAmount') {
              return formatCurrency(v);
            }
            if (key === 'timeHorizon') {
              return `${v} years`;
            }
            return `${v}%`;
          })
        });
      }
    });

    return changes;
  }, [scenarios]);

  // Color palette for scenarios
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (scenarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600" />
            Scenario Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            No scenarios to compare. Run multiple simulations to compare results.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scenarios.length === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600" />
            Scenario Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            <div className="text-center">
              <GitCompare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Run at least 2 simulations to compare scenarios.</p>
              <p className="text-sm mt-1">Try different withdrawal rates or time horizons!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find winning scenario (highest success probability)
  const winner = scenarios.reduce((best, current) =>
    current.results.successProbability > best.results.successProbability ? current : best
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-600" />
          Scenario Comparison
        </CardTitle>
        <CardDescription>
          Comparing {scenarios.length} scenarios • Baseline: {scenarios[baselineIndex].name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Winner Announcement */}
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <span className="font-semibold text-green-800">{winner.name}</span>
            <span className="text-green-700"> has the highest success rate at </span>
            <span className="font-bold text-green-800">{winner.results.successProbability.toFixed(1)}%</span>
          </div>
        </div>

        {/* What Changed */}
        {changedInputs.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Variables Changed:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {changedInputs.map((change, idx) => (
                <div key={idx} className="bg-white px-2 py-1 rounded border border-amber-200 text-sm">
                  <span className="text-amber-700 font-medium">{change.input}: </span>
                  {change.values.map((v, i) => (
                    <span key={i}>
                      <span className="text-gray-700">{v}</span>
                      {i < change.values.length - 1 && <span className="text-amber-500"> → </span>}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Rate Bar Chart */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="metric" hide />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {scenarios.map((scenario, idx) => (
                <Bar
                  key={scenario.id}
                  dataKey={scenario.name}
                  fill={colors[idx % colors.length]}
                  radius={[0, 4, 4, 0]}
                  barSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Metric Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Success Rate"
            values={scenariosWithDeltas.map(s => ({
              scenarioName: s.name,
              value: s.results.successProbability,
              delta: s.deltas?.successProbability
            }))}
            formatter={formatPercent}
            isPercentage={true}
            higherIsBetter={true}
          />
          <MetricCard
            label="Median Final Wealth"
            values={scenariosWithDeltas.map(s => ({
              scenarioName: s.name,
              value: s.results.medianFinalWealth,
              delta: s.deltas?.medianFinalWealth
            }))}
            formatter={formatCurrency}
            higherIsBetter={true}
          />
          <MetricCard
            label="Stress Case (P10)"
            values={scenariosWithDeltas.map(s => ({
              scenarioName: s.name,
              value: s.results.p10FinalWealth,
              delta: s.deltas?.p10FinalWealth
            }))}
            formatter={formatCurrency}
            higherIsBetter={true}
          />
          <MetricCard
            label="Optimistic (P90)"
            values={scenariosWithDeltas.map(s => ({
              scenarioName: s.name,
              value: s.results.p90FinalWealth,
              delta: s.deltas?.p90FinalWealth
            }))}
            formatter={formatCurrency}
            higherIsBetter={true}
          />
          <MetricCard
            label="Max Drawdown"
            values={scenariosWithDeltas.map(s => ({
              scenarioName: s.name,
              value: s.results.maxDrawdown,
              delta: s.deltas?.maxDrawdown
            }))}
            formatter={(v) => `-${v.toFixed(1)}%`}
            isPercentage={true}
            higherIsBetter={false}
          />
        </div>

        {/* Scenario Details Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-600">Scenario</th>
                <th className="text-right py-2 px-3 text-gray-600">Run Date</th>
                <th className="text-right py-2 px-3 text-gray-600">Withdrawal</th>
                <th className="text-right py-2 px-3 text-gray-600">Horizon</th>
                <th className="text-right py-2 px-3 text-gray-600">Expected Return</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario, idx) => (
                <tr key={scenario.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      />
                      <span className="font-medium">{scenario.name}</span>
                      {idx === baselineIndex && (
                        <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">Baseline</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 text-gray-600">
                    {new Date(scenario.runDate).toLocaleDateString()}
                  </td>
                  <td className="text-right py-2 px-3">
                    {formatCurrency(scenario.inputs.withdrawalAmount)}/yr
                  </td>
                  <td className="text-right py-2 px-3">
                    {scenario.inputs.timeHorizon} years
                  </td>
                  <td className="text-right py-2 px-3">
                    {scenario.inputs.expectedReturn}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScenarioComparison;
