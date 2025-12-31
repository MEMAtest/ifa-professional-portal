// ================================================================
// src/components/monte-carlo/charts/SuccessHistogram.tsx
// Success Distribution Histogram - Shows distribution of outcomes
// Visual proof that success rate isn't just a guess
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
  ReferenceLine,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { BarChart3, Info, CheckCircle, XCircle } from 'lucide-react';

interface HistogramBin {
  range: string;
  rangeStart: number;
  rangeEnd: number;
  count: number;
  percentage: number;
  isSuccess: boolean;
}

interface SuccessHistogramProps {
  finalWealthValues: number[];
  successThreshold?: number;
  simulationCount: number;
  successProbability: number;
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
    return `(£${Math.abs(value).toFixed(0)})`;
  }
  return `£${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as HistogramBin;
    if (!data) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
        <p className="font-semibold text-gray-900 mb-2">
          {data.range}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Simulations:</span>
            <span className="font-medium">{data.count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Percentage:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
          <div className={`flex items-center gap-1 mt-2 pt-2 border-t ${
            data.isSuccess ? 'text-green-600' : 'text-red-600'
          }`}>
            {data.isSuccess ? (
              <><CheckCircle className="h-4 w-4" /> Successful Outcome</>
            ) : (
              <><XCircle className="h-4 w-4" /> Portfolio Depleted</>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const SuccessHistogram: React.FC<SuccessHistogramProps> = ({
  finalWealthValues,
  successThreshold = 0,
  simulationCount,
  successProbability,
  height = 350
}) => {
  // Create histogram bins
  const histogramData = useMemo(() => {
    if (!finalWealthValues || finalWealthValues.length === 0) return [];

    const sorted = [...finalWealthValues].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Create 20 bins
    const binCount = 20;
    const binWidth = (max - min) / binCount;
    const bins: HistogramBin[] = [];

    for (let i = 0; i < binCount; i++) {
      const rangeStart = min + i * binWidth;
      const rangeEnd = min + (i + 1) * binWidth;

      const count = sorted.filter(v => v >= rangeStart && (i === binCount - 1 ? v <= rangeEnd : v < rangeEnd)).length;

      bins.push({
        range: `${formatCurrency(rangeStart)} - ${formatCurrency(rangeEnd)}`,
        rangeStart,
        rangeEnd,
        count,
        percentage: (count / simulationCount) * 100,
        isSuccess: rangeStart >= successThreshold
      });
    }

    return bins;
  }, [finalWealthValues, successThreshold, simulationCount]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!finalWealthValues || finalWealthValues.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, skewness: 0 };
    }

    const sorted = [...finalWealthValues].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Calculate skewness
    const skewness = sorted.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;

    return { mean, median, stdDev, skewness };
  }, [finalWealthValues]);

  if (!finalWealthValues || finalWealthValues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Outcome Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No simulation data available. Run a simulation first.
          </div>
        </CardContent>
      </Card>
    );
  }

  const failureCount = Math.round((100 - successProbability) / 100 * simulationCount);
  const successCount = simulationCount - failureCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Outcome Distribution
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Distribution of {simulationCount.toLocaleString()} simulated final portfolio values
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{successProbability.toFixed(1)}%</div>
            <div className="text-xs text-green-600">Success Rate</div>
            <div className="text-xs text-green-500 mt-1">{successCount.toLocaleString()} runs</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{(100 - successProbability).toFixed(1)}%</div>
            <div className="text-xs text-red-600">Failure Rate</div>
            <div className="text-xs text-red-500 mt-1">{failureCount.toLocaleString()} runs</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-700">{formatCurrency(stats.median)}</div>
            <div className="text-xs text-blue-600">Median Outcome</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-700">{formatCurrency(stats.stdDev)}</div>
            <div className="text-xs text-gray-600">Std Deviation</div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

            <XAxis
              dataKey="range"
              tick={false}
              stroke="#6b7280"
              label={{ value: 'Final Portfolio Value →', position: 'bottom', offset: 0, fontSize: 12 }}
            />

            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              label={{ value: 'Frequency', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Zero reference line (depletion threshold) */}
            <ReferenceLine
              x={histogramData.findIndex(b => b.rangeStart >= 0)}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
            />

            <Bar dataKey="percentage" name="Percentage" radius={[2, 2, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isSuccess ? '#22c55e' : '#ef4444'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend and Explanation */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Portfolio survives ({successCount.toLocaleString()} scenarios)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Portfolio depletes ({failureCount.toLocaleString()} scenarios)</span>
          </div>
        </div>

        {/* Distribution Insight */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Distribution Insight:</strong>{' '}
              {stats.skewness > 0.5 ? (
                <>The distribution is positively skewed, meaning there&apos;s potential for upside outcomes significantly above the median.</>
              ) : stats.skewness < -0.5 ? (
                <>The distribution is negatively skewed, indicating higher downside risk with potential for losses below the median.</>
              ) : (
                <>The distribution is relatively symmetric around the median of {formatCurrency(stats.median)}.</>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuccessHistogram;
