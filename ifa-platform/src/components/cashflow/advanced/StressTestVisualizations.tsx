// ================================================================
// src/components/cashflow/advanced/StressTestVisualizations.tsx
// Advanced visualization components for stress test results
// Includes impact charts, recovery timeline, probability funnel, heat maps
// FIXED: Added yAxisId to ReferenceLine
// ================================================================

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
  Cell, Rectangle, ReferenceLine, Treemap
} from 'recharts';
import {
  TrendingDown, TrendingUp, Activity, Target,
  AlertTriangle, Shield, Clock, DollarSign
} from 'lucide-react';
import type { StressTestResult } from '@/types/stress-testing';

// Define YearByYearProjection type locally since it's not exported from @/types/cashflow
interface YearByYearProjection {
  year: number;
  portfolioValue: number;
  income?: number;
  expenses?: number;
  netCashflow?: number;
}

interface StressTestVisualizationsProps {
  results: StressTestResult[];
  yearByYearProjections?: YearByYearProjection[];
  baselineProjections?: YearByYearProjection[];
  scenarioName: string;
}

export function StressTestVisualizations({
  results,
  yearByYearProjections,
  baselineProjections,
  scenarioName
}: StressTestVisualizationsProps) {
  
  // Color scheme for consistent visualization
  const COLORS = {
    positive: '#10b981',
    negative: '#ef4444',
    warning: '#f59e0b',
    neutral: '#6b7280',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    baseline: '#94a3b8',
    stressed: '#dc2626'
  };

  // 1. WATERFALL IMPACT CHART - Shows cumulative impact of stress factors
  const impactData = useMemo(() => {
    if (!results.length) return [];
    
    // Calculate average impacts across all scenarios
    const avgImpacts = results.reduce((acc, result) => {
      acc.portfolio += result.impactAnalysis.portfolioDeclinePercent;
      acc.income += result.impactAnalysis.incomeReductionPercent;
      acc.expenses += result.impactAnalysis.expenseIncreasePercent;
      return acc;
    }, { portfolio: 0, income: 0, expenses: 0 });
    
    // Average the impacts
    Object.keys(avgImpacts).forEach(key => {
      (avgImpacts as Record<string, number>)[key] = (avgImpacts as Record<string, number>)[key] / results.length;
    });

    // Create waterfall data
    const baseValue = 100;
    let cumulativeValue = baseValue;
    
    const waterfallData = [
      { name: 'Starting Position', value: baseValue, fill: COLORS.primary },
      {
        name: 'Portfolio Impact',
        value: avgImpacts.portfolio,
        fill: COLORS.negative,
        y: cumulativeValue + avgImpacts.portfolio,
        height: Math.abs(avgImpacts.portfolio)
      },
      {
        name: 'Income Impact',
        value: avgImpacts.income,
        fill: COLORS.negative,
        y: (cumulativeValue += avgImpacts.portfolio) + avgImpacts.income,
        height: Math.abs(avgImpacts.income)
      },
      {
        name: 'Expense Impact',
        value: -avgImpacts.expenses, // Negative because expenses increase
        fill: COLORS.negative,
        y: (cumulativeValue += avgImpacts.income) - avgImpacts.expenses,
        height: Math.abs(avgImpacts.expenses)
      },
      {
        name: 'Final Position',
        value: cumulativeValue - avgImpacts.expenses,
        fill: cumulativeValue - avgImpacts.expenses > 50 ? COLORS.warning : COLORS.negative
      }
    ];

    return waterfallData;
  }, [results]);

  // 2. RECOVERY TIMELINE CHART - Shows projected recovery path
  const recoveryData = useMemo(() => {
    if (!yearByYearProjections || !baselineProjections) return [];
    
    return yearByYearProjections.map((year, index) => {
      const baseline = baselineProjections[index];
      return {
        year: year.year,
        stressed: year.portfolioValue,
        baseline: baseline?.portfolioValue || 0,
        recoveryGap: baseline ? baseline.portfolioValue - year.portfolioValue : 0,
        percentRecovered: baseline 
          ? ((year.portfolioValue / baseline.portfolioValue) * 100).toFixed(1)
          : 0
      };
    });
  }, [yearByYearProjections, baselineProjections]);

  // 3. PROBABILITY FUNNEL - Shows success probability over time
  const probabilityFunnelData = useMemo(() => {
    if (!results.length) return [];
    
    // Sort scenarios by severity for funnel effect
    const sortedResults = [...results].sort((a, b) => 
      b.survivalProbability - a.survivalProbability
    );
    
    return sortedResults.map((result, index) => ({
      name: result.scenarioName,
      value: result.survivalProbability,
      fill: result.survivalProbability >= 80 ? COLORS.positive :
            result.survivalProbability >= 60 ? COLORS.warning :
            COLORS.negative
    }));
  }, [results]);

  // 4. RISK HEAT MAP - Shows risk levels across different factors
  const riskHeatMapData = useMemo(() => {
    if (!results.length) return [];
    
    // Create risk matrix data
    const riskFactors = [
      'Market Risk',
      'Inflation Risk',
      'Longevity Risk',
      'Personal Risk',
      'Sequence Risk'
    ];
    
    const timeHorizons = ['1 Year', '5 Years', '10 Years', '20 Years'];
    
    // Generate heat map data (this would be calculated from actual projections)
    const heatMapData: Array<{
      factor: string;
      horizon: string;
      risk: number;
      color: string;
    }> = [];
    riskFactors.forEach((factor, factorIndex) => {
      timeHorizons.forEach((horizon, horizonIndex) => {
        // Simulate risk score based on results
        const baseRisk = 50;
        const stressFactor = results[0]?.shortfallRisk || 0;
        const timeFactor = (horizonIndex + 1) * 10;
        const riskScore = Math.min(100, baseRisk + stressFactor * (factorIndex + 1) / 5 + timeFactor / 4);
        
        heatMapData.push({
          factor,
          horizon,
          risk: riskScore,
          color: riskScore >= 70 ? COLORS.negative :
                 riskScore >= 40 ? COLORS.warning :
                 COLORS.positive
        });
      });
    });
    
    return heatMapData;
  }, [results]);

  // 5. RESILIENCE SCORE GAUGE - Visual representation of overall resilience
  const ResilienceGauge = ({ score }: { score: number }) => {
    const radius = 60;
    const strokeWidth = 10;
    const normalizedScore = Math.min(100, Math.max(0, score));
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
    
    const getGaugeColor = (score: number) => {
      if (score >= 80) return COLORS.positive;
      if (score >= 60) return COLORS.warning;
      return COLORS.negative;
    };

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={getGaugeColor(normalizedScore)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold">{normalizedScore}</span>
          <span className="text-xs text-gray-600">Resilience</span>
        </div>
      </div>
    );
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' 
              ? entry.value.toFixed(1) + '%'
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // Calculate average resilience score
  const avgResilienceScore = results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Resilience</p>
                <p className="text-2xl font-bold mt-1">{avgResilienceScore.toFixed(0)}/100</p>
              </div>
              <ResilienceGauge score={avgResilienceScore} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Scenarios Tested</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Highest Risk</p>
                <p className="text-2xl font-bold">
                  {Math.max(...results.map(r => r.shortfallRisk)).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Recovery</p>
                <p className="text-2xl font-bold">
                  {Math.round(results.reduce((sum, r) => sum + (r.recoveryTimeYears || 0), 0) / results.length)} yrs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waterfall Impact Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cumulative Stress Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={impactData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis label={{ value: 'Portfolio Value (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" shape={(props: any) => {
                const { fill, x, y, width, height } = props;
                // Custom bar shape for waterfall effect
                if (props.payload.y !== undefined) {
                  return (
                    <Rectangle 
                      x={x} 
                      y={props.payload.y} 
                      width={width} 
                      height={props.payload.height} 
                      fill={fill} 
                    />
                  );
                }
                return <Rectangle {...props} />;
              }} />
              {/* FIX: No yAxisId needed since this is a single Y-axis chart */}
              <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recovery Timeline */}
      {recoveryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recovery Timeline Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={recoveryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: any) => `£${(value / 1000).toFixed(0)}k`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke={COLORS.baseline} 
                  fill={COLORS.baseline} 
                  fillOpacity={0.3}
                  name="Baseline Projection"
                />
                <Area 
                  type="monotone" 
                  dataKey="stressed" 
                  stroke={COLORS.stressed} 
                  fill={COLORS.stressed} 
                  fillOpacity={0.3}
                  name="Stressed Projection"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Probability Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Success Probability by Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <Tooltip content={<CustomTooltip />} />
                <Funnel
                  dataKey="value"
                  data={probabilityFunnelData}
                  isAnimationActive
                >
                  <LabelList position="center" fill="#fff" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Heat Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Heat Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1">
              <div className="col-span-1"></div>
              {['1Y', '5Y', '10Y', '20Y'].map(horizon => (
                <div key={horizon} className="text-center text-xs font-medium text-gray-600">
                  {horizon}
                </div>
              ))}
              
              {['Market', 'Inflation', 'Longevity', 'Personal', 'Sequence'].map((factor, factorIndex) => (
                <React.Fragment key={factor}>
                  <div className="text-xs font-medium text-gray-600 pr-2 flex items-center justify-end">
                    {factor}
                  </div>
                  {[1, 5, 10, 20].map((years, yearIndex) => {
                    const dataPoint = riskHeatMapData.find(
                      d => d.factor === `${factor} Risk` && d.horizon === `${years} Year${years > 1 ? 's' : ''}`
                    );
                    const risk = dataPoint?.risk || 0;
                    const color = risk >= 70 ? COLORS.negative :
                                 risk >= 40 ? COLORS.warning :
                                 COLORS.positive;
                    
                    return (
                      <div
                        key={`${factor}-${years}`}
                        className="aspect-square flex items-center justify-center text-xs font-medium text-white rounded"
                        style={{ backgroundColor: color }}
                      >
                        {Math.round(risk)}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.positive }}></div>
                <span className="text-xs text-gray-600">Low Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.warning }}></div>
                <span className="text-xs text-gray-600">Medium Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.negative }}></div>
                <span className="text-xs text-gray-600">High Risk</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Comparison Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Scenario Impact Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={results.map(r => ({
                name: r.scenarioName.length > 20 ? r.scenarioName.substring(0, 20) + '...' : r.scenarioName,
                fullName: r.scenarioName,
                survivalProbability: r.survivalProbability,
                resilienceScore: r.resilienceScore,
                shortfallRisk: -r.shortfallRisk // Negative for visual impact
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  const data = payload[0]?.payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-sm mb-1">{data?.fullName || label}</p>
                      {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                          {entry.name}: {Math.abs(entry.value).toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar dataKey="survivalProbability" fill={COLORS.positive} name="Survival Probability" />
              <Bar dataKey="resilienceScore" fill={COLORS.primary} name="Resilience Score" />
              <Bar dataKey="shortfallRisk" fill={COLORS.negative} name="Shortfall Risk" />
              {/* FIX: No yAxisId needed since this is a single Y-axis chart */}
              <ReferenceLine y={0} stroke="#666" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}