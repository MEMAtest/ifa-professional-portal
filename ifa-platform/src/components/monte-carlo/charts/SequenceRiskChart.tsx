// ================================================================
// src/components/monte-carlo/charts/SequenceRiskChart.tsx
// Sequence of Returns Risk Chart - Shows impact of market timing
// Visualizes: What if crash in Year 1 vs Year 10?
// ================================================================

'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Activity, Info, TrendingDown, AlertTriangle, Shield } from 'lucide-react';

interface SequenceScenario {
  year: number;
  baseline: number;
  earlyCrash: number;
  lateCrash: number;
  noCrash: number;
}

interface SequenceRiskChartProps {
  data: SequenceScenario[];
  crashYear: {
    early: number;
    late: number;
  };
  crashMagnitude: number; // e.g., -30 for 30% drop
  initialWealth: number;
  withdrawalAmount: number;
  timeHorizon: number;
  height?: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  if (value < 0) {
    return `-£${Math.abs(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
};

const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[220px]">
        <p className="font-semibold text-gray-900 mb-2">Year {label}</p>
        <div className="space-y-1.5 text-sm">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatFullCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const SequenceRiskChart: React.FC<SequenceRiskChartProps> = ({
  data,
  crashYear,
  crashMagnitude,
  initialWealth,
  withdrawalAmount,
  timeHorizon,
  height = 400
}) => {
  // Calculate impact metrics
  const impactMetrics = useMemo(() => {
    if (!data || data.length === 0) return null;

    const finalYear = data[data.length - 1];
    const earlyCrashFinal = finalYear.earlyCrash;
    const lateCrashFinal = finalYear.lateCrash;
    const noCrashFinal = finalYear.noCrash;

    const earlyCrashLoss = noCrashFinal - earlyCrashFinal;
    const lateCrashLoss = noCrashFinal - lateCrashFinal;
    const sequenceImpact = earlyCrashLoss - lateCrashLoss;

    // Find depletion years
    const earlyDepletionYear = data.find(d => d.earlyCrash <= 0)?.year || null;
    const lateDepletionYear = data.find(d => d.lateCrash <= 0)?.year || null;

    return {
      earlyCrashFinal,
      lateCrashFinal,
      noCrashFinal,
      earlyCrashLoss,
      lateCrashLoss,
      sequenceImpact,
      earlyDepletionYear,
      lateDepletionYear,
      earlySurvives: earlyCrashFinal > 0,
      lateSurvives: lateCrashFinal > 0
    };
  }, [data]);

  // Generate sample data if none provided
  const displayData = useMemo(() => {
    if (data && data.length > 0) return data;

    // Generate illustrative data
    const sampleData: SequenceScenario[] = [];
    let noCrash = initialWealth;
    let earlyCrash = initialWealth;
    let lateCrash = initialWealth;

    const avgReturn = 0.06;

    for (let year = 0; year <= timeHorizon; year++) {
      sampleData.push({
        year,
        baseline: initialWealth,
        noCrash: Math.max(0, noCrash),
        earlyCrash: Math.max(0, earlyCrash),
        lateCrash: Math.max(0, lateCrash)
      });

      // Apply returns
      if (year === crashYear.early) {
        earlyCrash = earlyCrash * (1 + crashMagnitude / 100);
      } else {
        earlyCrash = earlyCrash * (1 + avgReturn);
      }

      if (year === crashYear.late) {
        lateCrash = lateCrash * (1 + crashMagnitude / 100);
      } else {
        lateCrash = lateCrash * (1 + avgReturn);
      }

      noCrash = noCrash * (1 + avgReturn);

      // Apply withdrawals
      earlyCrash -= withdrawalAmount;
      lateCrash -= withdrawalAmount;
      noCrash -= withdrawalAmount;
    }

    return sampleData;
  }, [data, initialWealth, withdrawalAmount, timeHorizon, crashYear, crashMagnitude]);

  // Chart domain
  const chartDomain = useMemo(() => {
    const allValues = displayData.flatMap(d => [d.noCrash, d.earlyCrash, d.lateCrash]);
    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues);
    return [Math.floor(minValue * 1.1), Math.ceil(maxValue * 1.1)];
  }, [displayData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-600" />
          Sequence of Returns Risk
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          When a market crash happens matters as much as if it happens
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Explanation Banner */}
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <strong>What is Sequence Risk?</strong> A {Math.abs(crashMagnitude)}% market drop in Year {crashYear.early}
              has a much larger impact than the same drop in Year {crashYear.late} because you&apos;re withdrawing
              from a smaller base.
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={displayData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="year"
              tickFormatter={(year) => `Yr ${year}`}
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />

            <YAxis
              domain={chartDomain}
              tickFormatter={formatCurrency}
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              width={80}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* No crash scenario (ideal) */}
            <Line
              type="monotone"
              dataKey="noCrash"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="No Crash"
            />

            {/* Late crash scenario */}
            <Line
              type="monotone"
              dataKey="lateCrash"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name={`Crash Year ${crashYear.late}`}
              strokeDasharray="5 5"
            />

            {/* Early crash scenario (worst) */}
            <Line
              type="monotone"
              dataKey="earlyCrash"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              name={`Crash Year ${crashYear.early}`}
            />

            {/* Zero line */}
            <ReferenceLine
              y={0}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: 'Depletion', position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }}
            />

            {/* Crash year markers */}
            <ReferenceLine
              x={crashYear.early}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: '📉 Early Crash', position: 'top', fill: '#ef4444', fontSize: 10 }}
            />
            <ReferenceLine
              x={crashYear.late}
              stroke="#3b82f6"
              strokeDasharray="3 3"
              label={{ value: '📉 Late Crash', position: 'top', fill: '#3b82f6', fontSize: 10 }}
            />

            <Legend />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Impact Comparison */}
        {impactMetrics && (
          <>
            <div className="grid grid-cols-3 gap-4 mt-6 mb-4">
              {/* No Crash */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">No Crash</span>
                </div>
                <div className="text-xl font-bold text-green-700">
                  {formatCurrency(impactMetrics.noCrashFinal)}
                </div>
                <div className="text-xs text-green-600">Final portfolio value</div>
              </div>

              {/* Late Crash */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Year {crashYear.late} Crash</span>
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {formatCurrency(impactMetrics.lateCrashFinal)}
                </div>
                <div className="text-xs text-blue-600">
                  Loss: {formatCurrency(impactMetrics.lateCrashLoss)}
                </div>
              </div>

              {/* Early Crash */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Year {crashYear.early} Crash</span>
                </div>
                <div className="text-xl font-bold text-red-700">
                  {impactMetrics.earlyCrashFinal > 0
                    ? formatCurrency(impactMetrics.earlyCrashFinal)
                    : 'Depleted'
                  }
                </div>
                <div className="text-xs text-red-600">
                  Loss: {formatCurrency(impactMetrics.earlyCrashLoss)}
                </div>
              </div>
            </div>

            {/* Sequence Impact Highlight */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Sequence Risk Impact</div>
                  <div className="text-xs text-gray-500">
                    Difference between early and late crash outcomes
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-700">
                    {formatCurrency(impactMetrics.sequenceImpact)}
                  </div>
                  <div className="text-xs text-orange-600">
                    Additional loss from early crash
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Depletion Warnings */}
        {impactMetrics && (impactMetrics.earlyDepletionYear || impactMetrics.lateDepletionYear) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-red-800">Depletion Warning: </span>
                <span className="text-red-700">
                  {impactMetrics.earlyDepletionYear && (
                    <>Early crash scenario depletes portfolio by Year {impactMetrics.earlyDepletionYear}. </>
                  )}
                  {impactMetrics.lateDepletionYear && (
                    <>Late crash scenario depletes portfolio by Year {impactMetrics.lateDepletionYear}.</>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mitigation Strategies */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-blue-800 mb-2">Mitigating Sequence Risk</div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Maintain 2-3 years of expenses in cash/bonds as a buffer</li>
                <li>• Consider a more conservative allocation in early retirement</li>
                <li>• Use a flexible withdrawal strategy that reduces spending in down markets</li>
                <li>• Delay large withdrawals after significant market drops</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500" />
            <span>No crash scenario</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed #3b82f6' }} />
            <span>Late crash (Year {crashYear.late})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500" />
            <span>Early crash (Year {crashYear.early})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SequenceRiskChart;
