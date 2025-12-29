// ================================================================
// src/components/cashflow/ProjectionChart.tsx
// Interactive projection chart using Recharts with full type safety
// ================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import type { CashFlowProjection } from '@/types/cashflow';

interface ProjectionChartProps {
  projections: CashFlowProjection[];
  height?: number;
  showControls?: boolean;
  realTermsEnabled?: boolean;
  onRealTermsToggle?: (enabled: boolean) => void;
  milestones?: Array<{ year: number; label: string; color?: string }>;
  assetSplit?: { isaRatio: number; giaRatio: number };
}

interface ChartDataPoint {
  year: number;
  age: number;
  totalAssets: number;
  portfolioBalance: number;
  totalIncome: number;
  totalExpenses: number;
  annualFlow: number;
  realTermsValue: number;
  pensionPot: number;
  investments: number;
  isa: number;
  gia: number;
  otherInvestments: number;
  cash: number;
}

type ViewMode = 'portfolio' | 'income_expense' | 'asset_breakdown' | 'real_terms';
type ChartType = 'line' | 'area';

export const ProjectionChart: React.FC<ProjectionChartProps> = ({
  projections,
  height = 400,
  showControls = true,
  realTermsEnabled,
  onRealTermsToggle,
  milestones = [],
  assetSplit
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('asset_breakdown');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [internalRealTerms, setInternalRealTerms] = useState(false);
  const showRealTerms = realTermsEnabled ?? internalRealTerms;
  const hasInvestmentSplit = (assetSplit?.isaRatio || 0) + (assetSplit?.giaRatio || 0) > 0;

  // Transform projections into chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return projections.map((projection) => ({
      year: projection.projectionYear + 1,
      age: projection.clientAge,
      totalAssets: projection.totalAssets,
      portfolioBalance: projection.investmentPortfolio + projection.cashSavings,
      totalIncome: projection.totalIncome,
      totalExpenses: projection.totalExpenses,
      annualFlow: projection.annualSurplusDeficit,
      realTermsValue: projection.realTermsValue || projection.totalAssets,
      pensionPot: projection.pensionPotValue,
      isa: hasInvestmentSplit ? projection.investmentPortfolio * (assetSplit?.isaRatio || 0) : 0,
      gia: hasInvestmentSplit ? projection.investmentPortfolio * (assetSplit?.giaRatio || 0) : 0,
      otherInvestments: hasInvestmentSplit
        ? Math.max(0, projection.investmentPortfolio - (projection.investmentPortfolio * ((assetSplit?.isaRatio || 0) + (assetSplit?.giaRatio || 0))))
        : 0,
      investments: hasInvestmentSplit
        ? Math.max(0, projection.investmentPortfolio - (projection.investmentPortfolio * ((assetSplit?.isaRatio || 0) + (assetSplit?.giaRatio || 0))))
        : projection.investmentPortfolio,
      cash: projection.cashSavings
    }));
  }, [projections, assetSplit, hasInvestmentSplit]);

  const hasOtherInvestments = useMemo(
    () => hasInvestmentSplit && chartData.some((point) => point.otherInvestments > 0),
    [chartData, hasInvestmentSplit]
  );

  // Format currency for tooltips using existing utils
  const formatCurrency = (value: number, compact: boolean = false): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard'
    }).format(value);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="font-semibold text-gray-900 mb-2">
            Year {label} (Age {data.age})
          </p>
          
          {viewMode === 'portfolio' && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Assets:</span>
                <span className="font-medium">{formatCurrency(data.totalAssets)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Portfolio:</span>
                <span className="font-medium">{formatCurrency(data.portfolioBalance)}</span>
              </div>
              {showRealTerms && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Real Terms:</span>
                  <span className="font-medium">{formatCurrency(data.realTermsValue)}</span>
                </div>
              )}
            </div>
          )}

          {viewMode === 'income_expense' && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-green-600">Income:</span>
                <span className="font-medium text-green-700">{formatCurrency(data.totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Expenses:</span>
                <span className="font-medium text-red-700">{formatCurrency(data.totalExpenses)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-sm text-gray-600">Net Flow:</span>
                <span className={`font-medium ${data.annualFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(data.annualFlow)}
                </span>
              </div>
            </div>
          )}

          {viewMode === 'asset_breakdown' && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pension Pot:</span>
                <span className="font-medium">{formatCurrency(data.pensionPot)}</span>
              </div>
              {hasInvestmentSplit ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ISA:</span>
                    <span className="font-medium">{formatCurrency(data.isa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">GIA:</span>
                    <span className="font-medium">{formatCurrency(data.gia)}</span>
                  </div>
                  {data.otherInvestments > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Other Investments:</span>
                      <span className="font-medium">{formatCurrency(data.otherInvestments)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Investments:</span>
                  <span className="font-medium">{formatCurrency(data.investments)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cash:</span>
                <span className="font-medium">{formatCurrency(data.cash)}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Chart configuration based on view mode
  const getChartConfig = () => {
    switch (viewMode) {
      case 'portfolio':
        return {
          lines: [
            { 
              dataKey: 'totalAssets', 
              stroke: '#2563eb', 
              strokeWidth: 3,
              name: showRealTerms ? 'Total Assets (Nominal)' : 'Total Assets'
            },
            { 
              dataKey: 'portfolioBalance', 
              stroke: '#059669', 
              strokeWidth: 2,
              name: 'Available Portfolio'
            },
            ...(showRealTerms ? [{
              dataKey: 'realTermsValue',
              stroke: '#7c3aed',
              strokeWidth: 2,
              strokeDasharray: '5 5',
              name: 'Total Assets (Real Terms)'
            }] : [])
          ]
        };

      case 'income_expense':
        return {
          lines: [
            { 
              dataKey: 'totalIncome', 
              stroke: '#059669', 
              strokeWidth: 2,
              name: 'Total Income'
            },
            { 
              dataKey: 'totalExpenses', 
              stroke: '#dc2626', 
              strokeWidth: 2,
              name: 'Total Expenses'
            }
          ]
        };

      case 'asset_breakdown':
        return {
          lines: [
            { 
              dataKey: 'pensionPot', 
              stroke: '#7c3aed', 
              strokeWidth: 2,
              name: 'Pensions'
            },
            ...(hasInvestmentSplit ? [
              { 
                dataKey: 'isa', 
                stroke: '#2563eb', 
                strokeWidth: 2,
                name: 'ISA'
              },
              { 
                dataKey: 'gia', 
                stroke: '#059669', 
                strokeWidth: 2,
                name: 'GIA'
              },
              ...(hasOtherInvestments ? [{
                dataKey: 'otherInvestments',
                stroke: '#0ea5e9',
                strokeWidth: 2,
                name: 'Other Investments'
              }] : [])
            ] : [
              { 
                dataKey: 'investments', 
                stroke: '#059669', 
                strokeWidth: 2,
                name: 'Investments'
              }
            ]),
            { 
              dataKey: 'cash', 
              stroke: '#d97706', 
              strokeWidth: 2,
              name: 'Cash Savings'
            }
          ]
        };

      case 'real_terms':
        return {
          lines: [
            { 
              dataKey: 'totalAssets', 
              stroke: '#2563eb', 
              strokeWidth: 2,
              name: 'Nominal Value'
            },
            { 
              dataKey: 'realTermsValue', 
              stroke: '#dc2626', 
              strokeWidth: 2,
              name: 'Real Terms Value'
            }
          ]
        };

      default:
        return { lines: [] };
    }
  };

  const chartConfig = getChartConfig();

  // Calculate key statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const valueKey = (showRealTerms ? 'realTermsValue' : 'totalAssets') as keyof ChartDataPoint;
    const finalValue = chartData[chartData.length - 1]?.[valueKey] || 0;
    const initialValue = chartData[0]?.[valueKey] || 0;
    const growth = ((finalValue - initialValue) / initialValue) * 100;
    const peakValue = Math.max(...chartData.map(d => d[valueKey] as number));
    const minValue = Math.min(...chartData.map(d => d[valueKey] as number));

    return {
      finalValue,
      initialValue,
      growth,
      peakValue,
      minValue,
      totalYears: chartData.length
    };
  }, [chartData, showRealTerms]);

  if (!projections || projections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No projection data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex gap-1">
              {[
                { key: 'portfolio', label: 'Portfolio', icon: DollarSign },
                { key: 'income_expense', label: 'Cash Flow', icon: TrendingUp },
                { key: 'asset_breakdown', label: 'Asset Breakdown', icon: Calendar },
                { key: 'real_terms', label: 'Real Terms', icon: TrendingDown }
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={viewMode === key ? "default" : "outline"}
                  onClick={() => setViewMode(key as ViewMode)}
                  className="text-xs"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={chartType === 'line' ? "default" : "outline"}
              onClick={() => setChartType('line')}
              className="text-xs"
            >
              Line
            </Button>
            <Button
              size="sm"
              variant={chartType === 'area' ? "default" : "outline"}
              onClick={() => setChartType('area')}
              className="text-xs"
            >
              Area
            </Button>
            
            <Button
              size="sm"
              variant={showRealTerms ? "default" : "outline"}
              onClick={() => {
                const next = !showRealTerms;
                if (realTermsEnabled === undefined) {
                  setInternalRealTerms(next);
                }
                onRealTermsToggle?.(next);
              }}
              className="text-xs"
            >
              Real Terms
            </Button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Final Value{showRealTerms ? ' (Real Terms)' : ''}
            </p>
            <p className="font-semibold">{formatCurrency(stats.finalValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Growth</p>
            <p className={`font-semibold ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.growth.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Peak Value</p>
            <p className="font-semibold">{formatCurrency(stats.peakValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Projection Period</p>
            <p className="font-semibold">{stats.totalYears} years</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {chartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, true)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {milestones.map((milestone) => (
                <ReferenceLine
                  key={`${milestone.label}-${milestone.year}`}
                  x={milestone.year}
                  stroke={milestone.color || '#94a3b8'}
                  strokeDasharray="3 3"
                  label={{
                    value: milestone.label,
                    position: 'top',
                    fill: milestone.color || '#64748b',
                    fontSize: 11
                  }}
                />
              ))}
              
              {chartConfig.lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  strokeDasharray={line.strokeDasharray}
                  name={line.name}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, true)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {milestones.map((milestone) => (
                <ReferenceLine
                  key={`${milestone.label}-${milestone.year}`}
                  x={milestone.year}
                  stroke={milestone.color || '#94a3b8'}
                  strokeDasharray="3 3"
                  label={{
                    value: milestone.label,
                    position: 'top',
                    fill: milestone.color || '#64748b',
                    fontSize: 11
                  }}
                />
              ))}
              
              {chartConfig.lines.map((line, index) => (
                <Area
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stackId={viewMode === 'asset_breakdown' ? "1" : index}
                  stroke={line.stroke}
                  fill={line.stroke}
                  fillOpacity={0.3}
                  name={line.name}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
