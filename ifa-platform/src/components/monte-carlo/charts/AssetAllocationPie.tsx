// ================================================================
// src/components/monte-carlo/charts/AssetAllocationPie.tsx
// Asset Allocation Pie Chart - Shows portfolio breakdown
// Links risk score to actual allocation (60/40, etc.)
// ================================================================

'use client';

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PieChart as PieChartIcon, Info, TrendingUp, Shield, Wallet } from 'lucide-react';

interface AssetClass {
  name: string;
  value: number; // Percentage
  color: string;
  description?: string;
  expectedReturn?: number;
  volatility?: number;
}

interface AssetAllocationPieProps {
  allocation: AssetClass[];
  riskScore?: number; // 1-10
  portfolioValue?: number;
  expectedReturn?: number;
  expectedVolatility?: number;
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

const getRiskProfileName = (score: number): string => {
  if (score <= 2) return 'Very Conservative';
  if (score <= 4) return 'Conservative';
  if (score <= 6) return 'Balanced';
  if (score <= 8) return 'Growth';
  return 'Aggressive';
};

const getRiskProfileColor = (score: number): string => {
  if (score <= 2) return 'text-blue-700 bg-blue-100';
  if (score <= 4) return 'text-cyan-700 bg-cyan-100';
  if (score <= 6) return 'text-amber-700 bg-amber-100';
  if (score <= 8) return 'text-orange-700 bg-orange-100';
  return 'text-red-700 bg-red-100';
};

// Default allocation colors
const DEFAULT_COLORS = [
  '#3b82f6', // Blue - Equities
  '#22c55e', // Green - Bonds
  '#f59e0b', // Amber - Property
  '#8b5cf6', // Purple - Alternatives
  '#ec4899', // Pink - Cash
  '#14b8a6', // Teal - Commodities
  '#f97316', // Orange - Other
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[180px]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-gray-900">{data.name}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Allocation:</span>
            <span className="font-medium">{data.value}%</span>
          </div>
          {data.expectedReturn !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Exp. Return:</span>
              <span className="font-medium text-green-600">{data.expectedReturn}%</span>
            </div>
          )}
          {data.volatility !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Volatility:</span>
              <span className="font-medium text-orange-600">{data.volatility}%</span>
            </div>
          )}
          {data.description && (
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
              {data.description}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  if (percent < 0.05) return null; // Don't show label for small slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const AssetAllocationPie: React.FC<AssetAllocationPieProps> = ({
  allocation,
  riskScore,
  portfolioValue,
  expectedReturn,
  expectedVolatility,
  height = 300
}) => {
  // Ensure all allocations have colors
  const coloredAllocation = useMemo(() => {
    return allocation.map((asset, index) => ({
      ...asset,
      color: asset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    }));
  }, [allocation]);

  // Calculate portfolio-level metrics if not provided
  const metrics = useMemo(() => {
    if (expectedReturn !== undefined && expectedVolatility !== undefined) {
      return { expectedReturn, expectedVolatility };
    }

    // Calculate weighted averages from allocation
    let weightedReturn = 0;
    let weightedVolatility = 0;

    coloredAllocation.forEach(asset => {
      if (asset.expectedReturn) {
        weightedReturn += (asset.value / 100) * asset.expectedReturn;
      }
      if (asset.volatility) {
        weightedVolatility += (asset.value / 100) * asset.volatility;
      }
    });

    return {
      expectedReturn: weightedReturn || 6.0, // Default
      expectedVolatility: weightedVolatility || 12.0 // Default
    };
  }, [coloredAllocation, expectedReturn, expectedVolatility]);

  // Calculate equity/bond split for quick reference
  const equityBondSplit = useMemo(() => {
    const equity = coloredAllocation
      .filter(a => a.name.toLowerCase().includes('equit') || a.name.toLowerCase().includes('stock'))
      .reduce((sum, a) => sum + a.value, 0);
    const bonds = coloredAllocation
      .filter(a => a.name.toLowerCase().includes('bond') || a.name.toLowerCase().includes('fixed'))
      .reduce((sum, a) => sum + a.value, 0);

    return { equity, bonds };
  }, [coloredAllocation]);

  if (!allocation || allocation.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-blue-600" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            No allocation data available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-blue-600" />
          Asset Allocation
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Portfolio composition used in simulation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Risk Profile Badge */}
        {riskScore !== undefined && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Risk Profile:</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskProfileColor(riskScore)}`}>
              {getRiskProfileName(riskScore)} ({riskScore}/10)
            </span>
          </div>
        )}

        {/* Portfolio Value */}
        {portfolioValue && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Total Portfolio:</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(portfolioValue)}
            </span>
          </div>
        )}

        {/* Pie Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={coloredAllocation}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={height * 0.35}
              innerRadius={height * 0.15}
              fill="#8884d8"
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
            >
              {coloredAllocation.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Quick Split Reference */}
        {(equityBondSplit.equity > 0 || equityBondSplit.bonds > 0) && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{equityBondSplit.equity}%</div>
              <div className="text-xs text-gray-500">Equities</div>
            </div>
            <div className="text-gray-300 text-2xl">/</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{equityBondSplit.bonds}%</div>
              <div className="text-xs text-gray-500">Bonds</div>
            </div>
          </div>
        )}

        {/* Expected Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">Expected Return</span>
            </div>
            <div className="text-xl font-bold text-green-700">
              {metrics.expectedReturn.toFixed(1)}% p.a.
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">Expected Volatility</span>
            </div>
            <div className="text-xl font-bold text-orange-700">
              {metrics.expectedVolatility.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Allocation Breakdown Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-gray-600">Asset Class</th>
                <th className="text-right py-2 px-2 text-gray-600">%</th>
                {portfolioValue && (
                  <th className="text-right py-2 px-2 text-gray-600">Value</th>
                )}
              </tr>
            </thead>
            <tbody>
              {coloredAllocation.map((asset, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: asset.color }}
                      />
                      <span className="text-gray-900">{asset.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 px-2 font-medium">
                    {asset.value}%
                  </td>
                  {portfolioValue && (
                    <td className="text-right py-2 px-2 text-gray-600">
                      {formatCurrency((portfolioValue * asset.value) / 100)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              This allocation determines the expected return and volatility used in the Monte Carlo simulation.
              Higher equity allocation typically means higher expected returns but also higher volatility.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetAllocationPie;
