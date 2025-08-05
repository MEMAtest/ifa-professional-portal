// ================================================================
// src/components/cashflow/advanced/BeforeAfterComparison.tsx
// Side-by-side comparison of unstressed vs stressed projections
// Visual impact representation with key metric differences
// ================================================================

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, PieChart, Pie,
  Cell, RadialBarChart, RadialBar
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, Minus, 
  TrendingDown, TrendingUp, AlertTriangle,
  Shield, BarChart3, PieChartIcon, Eye,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import type { CashFlowScenario } from '@/types/cashflow';
import type { StressTestResult } from '@/types/stress-testing';
// TODO: Ensure the correct path and existence of YearByYearStressProjections.ts
// If the file does not exist, create it and export the YearByYearProjection type as below:
import type { YearByYearProjection } from './YearByYearStressProjections';
// Example fallback definition (remove if the real type exists):
// export interface YearByYearProjection {
//   year: number;
//   age: number;
//   portfolioValue: number;
//   income: number;
//   survivalProbability: number;
//   milestone?: string;
// }

interface BeforeAfterComparisonProps {
  scenario: CashFlowScenario;
  stressResults: StressTestResult[];
  baselineProjections: YearByYearProjection[];
  stressedProjections: YearByYearProjection[];
}

export function BeforeAfterComparison({
  scenario,
  stressResults,
  baselineProjections,
  stressedProjections
}: BeforeAfterComparisonProps) {
  const [viewMode, setViewMode] = useState<'split' | 'overlay' | 'difference'>('split');
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'income' | 'probability'>('value');
  const [showPercentages, setShowPercentages] = useState(false);

  // Calculate impact metrics
  const impactMetrics = useMemo(() => {
    const baseline = baselineProjections[baselineProjections.length - 1];
    const stressed = stressedProjections[stressedProjections.length - 1];
    
    const portfolioImpact = baseline && stressed ? 
      ((stressed.portfolioValue - baseline.portfolioValue) / baseline.portfolioValue) * 100 : 0;
    
    const incomeImpact = baseline && stressed ?
      ((stressed.income - baseline.income) / baseline.income) * 100 : 0;
    
    const survivalImpact = baseline && stressed ?
      stressed.survivalProbability - baseline.survivalProbability : 0;
    
    // Find critical points
    const baselineDepletion = baselineProjections.find(p => p.portfolioValue <= 0);
    const stressedDepletion = stressedProjections.find(p => p.portfolioValue <= 0);
    
    const yearsLost = baselineDepletion && stressedDepletion ? 
      stressedDepletion.year - baselineDepletion.year :
      !baselineDepletion && stressedDepletion ? 
      scenario.projectionYears - (stressedDepletion.year - new Date().getFullYear()) : 0;
    
    return {
      portfolioImpact,
      incomeImpact,
      survivalImpact,
      yearsLost,
      baselineFinalValue: baseline?.portfolioValue || 0,
      stressedFinalValue: stressed?.portfolioValue || 0,
      baselineMinValue: Math.min(...baselineProjections.map(p => p.portfolioValue)),
      stressedMinValue: Math.min(...stressedProjections.map(p => p.portfolioValue))
    };
  }, [baselineProjections, stressedProjections, scenario]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    return baselineProjections.map((baseline, index) => {
      const stressed = stressedProjections[index];
      return {
        year: baseline.year,
        age: baseline.age,
        baselineValue: baseline.portfolioValue,
        stressedValue: stressed?.portfolioValue || 0,
        difference: (stressed?.portfolioValue || 0) - baseline.portfolioValue,
        percentDifference: baseline.portfolioValue > 0 ? 
          (((stressed?.portfolioValue || 0) - baseline.portfolioValue) / baseline.portfolioValue) * 100 : 0,
        baselineIncome: baseline.income,
        stressedIncome: stressed?.income || 0,
        baselineProbability: baseline.survivalProbability,
        stressedProbability: stressed?.survivalProbability || 0,
        milestone: baseline.milestone
      };
    });
  }, [baselineProjections, stressedProjections]);

  // Key metrics for display
  const keyMetrics = [
    {
      label: 'Final Portfolio Value',
      baseline: impactMetrics.baselineFinalValue,
      stressed: impactMetrics.stressedFinalValue,
      impact: impactMetrics.portfolioImpact,
      icon: TrendingUp,
      format: 'currency'
    },
    {
      label: 'Lowest Portfolio Value',
      baseline: impactMetrics.baselineMinValue,
      stressed: impactMetrics.stressedMinValue,
      impact: ((impactMetrics.stressedMinValue - impactMetrics.baselineMinValue) / Math.abs(impactMetrics.baselineMinValue)) * 100,
      icon: TrendingDown,
      format: 'currency'
    },
    {
      label: 'Years of Funding',
      baseline: baselineProjections.filter(p => p.portfolioValue > 0).length,
      stressed: stressedProjections.filter(p => p.portfolioValue > 0).length,
      impact: -impactMetrics.yearsLost,
      icon: Shield,
      format: 'years'
    },
    {
      label: 'Success Probability',
      baseline: baselineProjections[baselineProjections.length - 1]?.survivalProbability || 0,
      stressed: stressedProjections[stressedProjections.length - 1]?.survivalProbability || 0,
      impact: impactMetrics.survivalImpact,
      icon: BarChart3,
      format: 'percentage'
    }
  ];

  // Format values
  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'years':
        return `${Math.round(value)} years`;
      default:
        return value.toString();
    }
  };

  // Impact gauge component
  const ImpactGauge = ({ impact, size = 60 }: { impact: number; size?: number }) => {
    const radius = size / 2 - 5;
    const circumference = 2 * Math.PI * radius;
    const absImpact = Math.abs(impact);
    const strokeDashoffset = circumference - (Math.min(absImpact, 100) / 100) * circumference;
    
    const getColor = () => {
      if (impact > 0) return '#10b981'; // Positive impact
      if (impact > -20) return '#f59e0b'; // Mild negative
      return '#ef4444'; // Severe negative
    };

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth="5"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xs font-bold" style={{ color: getColor() }}>
            {impact > 0 ? '+' : ''}{impact.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-2">Year {label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {
              entry.name.includes('Probability') 
                ? `${entry.value.toFixed(1)}%`
                : formatValue(entry.value, 'currency')
            }
          </p>
        ))}
      </div>
    );
  };

  // Chart configuration based on view mode
  const getChartComponent = () => {
    const chartHeight = 400;
    
    switch (viewMode) {
      case 'split':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Baseline Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Baseline Projection
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">No Stress</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="baselineValue" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Portfolio Value"
                    />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stressed Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Stressed Projection
                  </span>
                  <Badge className="bg-red-100 text-red-800">Under Stress</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="stressedValue" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.6}
                      name="Portfolio Value"
                    />
                    <ReferenceLine y={0} stroke="#991b1b" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      case 'overlay':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Baseline vs Stressed Overlay
                </span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">Baseline</Badge>
                  <Badge className="bg-red-100 text-red-800">Stressed</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="baselineValue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Baseline"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stressedValue" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Stressed"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  {/* Milestone markers */}
                  {comparisonData.filter(d => d.milestone).map((d, i) => (
                    <ReferenceLine
                      key={i}
                      x={d.age}
                      stroke="#666"
                      strokeDasharray="3 3"
                      label={{ value: d.milestone, position: 'top', fontSize: 10 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'difference':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Impact Analysis
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPercentages(!showPercentages)}
                >
                  {showPercentages ? '£ Values' : '% Change'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis 
                    tickFormatter={(value) => 
                      showPercentages ? `${value}%` : `£${(value / 1000).toFixed(0)}k`
                    } 
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    formatter={(value: any) => 
                      showPercentages ? `${value.toFixed(1)}%` : formatValue(value, 'currency')
                    }
                  />
                  <Legend />
                  <Bar 
                    dataKey={showPercentages ? "percentDifference" : "difference"} 
                    name="Impact"
                    fill="#10b981"
                  >
                    {comparisonData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          (showPercentages ? entry.percentDifference : entry.difference) < 0
                            ? '#ef4444'
                            : '#10b981'
                        }
                      />
                    ))}
                  </Bar>
                  <ReferenceLine y={0} stroke="#666" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Before & After Comparison</h3>
          <p className="text-sm text-gray-600 mt-1">
            Baseline projection vs stress-tested outcomes
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              onClick={() => setViewMode('split')}
              className="text-xs"
            >
              Split View
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'overlay' ? 'default' : 'ghost'}
              onClick={() => setViewMode('overlay')}
              className="text-xs"
            >
              Overlay
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'difference' ? 'default' : 'ghost'}
              onClick={() => setViewMode('difference')}
              className="text-xs"
            >
              Difference
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const isNegative = metric.impact < 0;
          
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  </div>
                  <ImpactGauge impact={metric.impact} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Baseline</span>
                    <span className="text-sm font-medium">
                      {formatValue(metric.baseline, metric.format)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Stressed</span>
                    <span className={`text-sm font-medium ${
                      isNegative ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatValue(metric.stressed, metric.format)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Impact</span>
                      <span className={`text-sm font-bold flex items-center gap-1 ${
                        isNegative ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {isNegative ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : metric.impact === 0 ? (
                          <Minus className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {Math.abs(metric.impact).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Visualization */}
      {getChartComponent()}

      {/* Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Overall Impact Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Impact Distribution Pie Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
                Impact Distribution
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Portfolio Impact', value: Math.abs(impactMetrics.portfolioImpact) },
                      { name: 'Income Impact', value: Math.abs(impactMetrics.incomeImpact) },
                      { name: 'Time Impact', value: Math.abs(impactMetrics.yearsLost) * 5 }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Resilience Score Radial */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
                Resilience Score
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="30%" 
                  outerRadius="90%" 
                  data={[
                    {
                      name: 'Resilience',
                      value: stressResults[0]?.resilienceScore || 0,
                      fill: stressResults[0]?.resilienceScore >= 80 ? '#10b981' :
                            stressResults[0]?.resilienceScore >= 60 ? '#f59e0b' : '#ef4444'
                    }
                  ]}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar dataKey="value" />
                  <text 
                    x="50%" 
                    y="50%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="text-2xl font-bold"
                  >
                    {stressResults[0]?.resilienceScore || 0}
                  </text>
                  <text 
                    x="50%" 
                    y="65%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="text-xs text-gray-600"
                  >
                    out of 100
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Key Findings */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Key Findings
              </h4>
              <div className="space-y-2">
                {impactMetrics.yearsLost > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Portfolio depletes {impactMetrics.yearsLost} years earlier under stress
                    </p>
                  </div>
                )}
                {impactMetrics.portfolioImpact < -30 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Significant portfolio reduction of {Math.abs(impactMetrics.portfolioImpact).toFixed(0)}%
                    </p>
                  </div>
                )}
                {impactMetrics.stressedMinValue < 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Portfolio goes negative during stress period
                    </p>
                  </div>
                )}
                {impactMetrics.portfolioImpact > -10 && (
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Portfolio shows good resilience to stress
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}