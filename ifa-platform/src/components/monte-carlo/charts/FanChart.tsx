// ================================================================
// src/components/monte-carlo/charts/FanChart.tsx
// Fan Chart - Industry Standard for Monte Carlo Confidence Intervals
// Shows shaded "cone" of wealth over time with P10-P90 bands
// ================================================================

'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { TrendingUp, Info } from 'lucide-react';

interface YearlyProjection {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  withdrawal?: number;
}

interface FanChartProps {
  data: YearlyProjection[];
  initialWealth: number;
  withdrawalAmount: number;
  timeHorizon: number;
  title?: string;
  showWithdrawal?: boolean;
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
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[220px]">
        <p className="font-semibold text-gray-900 mb-2">Year {data.year}</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-green-600">Optimistic (P90):</span>
            <span className="font-medium">{formatFullCurrency(data.p90)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-600">Upper Mid (P75):</span>
            <span className="font-medium">{formatFullCurrency(data.p75)}</span>
          </div>
          <div className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded">
            <span className="text-blue-800 font-medium">Median (P50):</span>
            <span className="font-bold text-blue-800">{formatFullCurrency(data.p50)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-amber-600">Lower Mid (P25):</span>
            <span className="font-medium">{formatFullCurrency(data.p25)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-600">Stress (P10):</span>
            <span className="font-medium">{formatFullCurrency(data.p10)}</span>
          </div>
        </div>
        {data.withdrawal && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Annual Withdrawal:</span>
              <span className="font-medium">{formatFullCurrency(data.withdrawal)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const FanChart: React.FC<FanChartProps> = ({
  data,
  initialWealth,
  withdrawalAmount,
  timeHorizon,
  title = 'Wealth Projection Fan Chart',
  showWithdrawal = true,
  height = 400
}) => {
  // Calculate chart domain
  const chartDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, initialWealth * 2];

    const allValues = data.flatMap(d => [d.p10, d.p25, d.p50, d.p75, d.p90]);
    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues);

    // Add 10% padding
    return [
      Math.floor(minValue * 0.9),
      Math.ceil(maxValue * 1.1)
    ];
  }, [data, initialWealth]);

  // Check if portfolio depletes in stress scenario
  const depletionYear = useMemo(() => {
    if (!data) return null;
    const depleted = data.find(d => d.p10 <= 0);
    return depleted ? depleted.year : null;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No projection data available. Run a simulation first.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Shaded bands show range of possible outcomes. Darker = more likely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.3)' }} />
            <span>Optimistic (Top 10%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }} />
            <span>Upper Middle (25-75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600" />
            <span>Median (50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.3)' }} />
            <span>Stress Scenario (Bottom 10%)</span>
          </div>
        </div>

        {/* Depletion Warning */}
        {depletionYear && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-red-800">Stress Scenario Warning:</span>
              <span className="text-red-700"> In the worst 10% of outcomes, your portfolio could deplete by Year {depletionYear}.</span>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              {/* P90 to P75 band (top - green/optimistic) */}
              <linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
              </linearGradient>
              {/* P75 to P50 band (upper middle - blue) */}
              <linearGradient id="colorP75" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
              </linearGradient>
              {/* P50 to P25 band (lower middle - blue) */}
              <linearGradient id="colorP25" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
              </linearGradient>
              {/* P25 to P10 band (bottom - red/stress) */}
              <linearGradient id="colorP10" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
              </linearGradient>
            </defs>

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

            {/* P90 band (optimistic outer) */}
            <Area
              type="monotone"
              dataKey="p90"
              stroke="none"
              fill="url(#colorP90)"
              fillOpacity={1}
              name="P90 (Optimistic)"
            />

            {/* P75 band */}
            <Area
              type="monotone"
              dataKey="p75"
              stroke="none"
              fill="url(#colorP75)"
              fillOpacity={1}
              name="P75"
            />

            {/* P50 line (median) - solid line */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorP25)"
              fillOpacity={1}
              name="Median (P50)"
            />

            {/* P25 band */}
            <Area
              type="monotone"
              dataKey="p25"
              stroke="none"
              fill="url(#colorP10)"
              fillOpacity={1}
              name="P25"
            />

            {/* P10 band (stress outer) - shows depletion risk */}
            <Area
              type="monotone"
              dataKey="p10"
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="5 5"
              fill="transparent"
              name="P10 (Stress)"
            />

            {/* Zero line reference */}
            <ReferenceLine
              y={0}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: 'Depletion', position: 'insideTopLeft', fill: '#ef4444', fontSize: 11 }}
            />

            {/* Initial wealth reference */}
            <ReferenceLine
              y={initialWealth}
              stroke="#6b7280"
              strokeDasharray="3 3"
              label={{ value: 'Initial', position: 'insideTopRight', fill: '#6b7280', fontSize: 11 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600">Starting Value</div>
            <div className="font-semibold text-gray-900">{formatFullCurrency(initialWealth)}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600">Median End Value</div>
            <div className="font-semibold text-blue-900">
              {data.length > 0 ? formatFullCurrency(data[data.length - 1].p50) : '-'}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600">Best Case (P90)</div>
            <div className="font-semibold text-green-900">
              {data.length > 0 ? formatFullCurrency(data[data.length - 1].p90) : '-'}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600">Stress Case (P10)</div>
            <div className="font-semibold text-red-900">
              {data.length > 0 ? formatFullCurrency(Math.max(0, data[data.length - 1].p10)) : '-'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FanChart;
