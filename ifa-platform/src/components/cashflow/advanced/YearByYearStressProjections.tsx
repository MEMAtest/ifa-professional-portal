// ================================================================
// src/components/cashflow/advanced/YearByYearStressProjections.tsx
// Detailed year-by-year projections under stress conditions
// Shows portfolio values, cash flows, and recovery trajectory
// ================================================================

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';
import {
  Calendar, TrendingDown, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, Download, Eye, Filter
} from 'lucide-react';
import type { CashFlowScenario } from '@/types/cashflow';
import type { StressTestResult } from '@/types/stress-testing';

// Type for year-by-year projection data
export interface YearByYearProjection {
  year: number;
  age: number;
  portfolioValue: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  inflationAdjustedValue: number;
  survivalProbability: number;
  milestone?: string;
}

interface YearByYearStressProjectionsProps {
  scenario: CashFlowScenario;
  stressResult: StressTestResult;
  stressScenarioName: string;
}

export function YearByYearStressProjections({
  scenario,
  stressResult,
  stressScenarioName
}: YearByYearStressProjectionsProps) {
  const [showDetailed, setShowDetailed] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'portfolio' | 'cashflow' | 'probability'>('portfolio');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // Generate year-by-year projections with stress impacts
  const projections = useMemo((): YearByYearProjection[] => {
    const years: YearByYearProjection[] = [];
    const projectionYears = scenario.projectionYears;
    
    let currentPortfolio = scenario.currentSavings + scenario.investmentValue + scenario.pensionValue;
    let currentAge = scenario.clientAge;
    let cumulativeCashFlow = 0;
    
    // Apply initial stress impact
    const initialImpact = 1 + (stressResult.impactAnalysis.portfolioDeclinePercent / 100);
    currentPortfolio *= initialImpact;
    
    // Calculate stressed returns
    const stressedEquityReturn = scenario.realEquityReturn * (1 + stressResult.impactAnalysis.portfolioDeclinePercent / 100);
    const stressedIncome = scenario.currentIncome * (1 + stressResult.impactAnalysis.incomeReductionPercent / 100);
    const stressedExpenses = scenario.currentExpenses * (1 + stressResult.impactAnalysis.expenseIncreasePercent / 100);
    
    for (let year = 0; year < projectionYears; year++) {
      const age = currentAge + year;
      const isRetired = age >= scenario.retirementAge;
      
      // Calculate income for the year
      let yearlyIncome = isRetired ? 0 : stressedIncome;
      if (age >= scenario.statePensionAge) {
        yearlyIncome += scenario.statePensionAmount * 12;
      }
      if (isRetired && currentPortfolio > 0) {
        // Add pension/withdrawal income
        yearlyIncome += currentPortfolio * 0.04; // 4% withdrawal rule
      }
      
      // Calculate expenses with inflation
      const inflationMultiplier = Math.pow(1 + scenario.inflationRate / 100, year);
      const yearlyExpenses = stressedExpenses * inflationMultiplier;
      
      // Net cash flow
      const netCashFlow = yearlyIncome - yearlyExpenses;
      cumulativeCashFlow += netCashFlow;
      
      // Portfolio growth/decline
      const portfolioReturn = isRetired ? 
        (stressedEquityReturn * 0.4 + scenario.realBondReturn * 0.6) : // Conservative in retirement
        (stressedEquityReturn * 0.6 + scenario.realBondReturn * 0.4);  // Growth phase
      
      currentPortfolio = currentPortfolio * (1 + portfolioReturn / 100) + netCashFlow;
      
      // Recovery factor (gradual recovery after stress)
      const recoveryYear = stressResult.recoveryTimeYears || 5;
      const recoveryFactor = year < recoveryYear ? 
        (year / recoveryYear) * 0.5 + 0.5 : // Gradual recovery to 100%
        1.0;
      
      currentPortfolio *= recoveryFactor;
      
      // Calculate survival probability with decay over time
      const survivalProbability = stressResult.survivalProbability * 
        Math.pow(0.98, year); // 2% annual decay
      
      // Identify milestones
      let milestone: string | undefined;
      if (age === scenario.retirementAge) milestone = 'Retirement';
      if (age === scenario.statePensionAge) milestone = 'State Pension';
      if (age === 75) milestone = 'Age 75';
      if (age === scenario.lifeExpectancy) milestone = 'Life Expectancy';
      
      years.push({
        year: new Date().getFullYear() + year,
        age,
        portfolioValue: Math.max(0, currentPortfolio),
        income: yearlyIncome,
        expenses: yearlyExpenses,
        netCashFlow,
        cumulativeCashFlow,
        inflationAdjustedValue: currentPortfolio / inflationMultiplier,
        survivalProbability: Math.max(0, survivalProbability),
        milestone
      });
    }
    
    return years;
  }, [scenario, stressResult]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const finalValue = projections[projections.length - 1]?.portfolioValue || 0;
    const minValue = Math.min(...projections.map(p => p.portfolioValue));
    const depletionYear = projections.find(p => p.portfolioValue <= 0)?.year;
    const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
    const totalExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
    const avgSurvivalProb = projections.reduce((sum, p) => sum + p.survivalProbability, 0) / projections.length;
    
    return {
      finalValue,
      minValue,
      depletionYear,
      totalIncome,
      totalExpenses,
      netResult: totalIncome - totalExpenses,
      avgSurvivalProb
    };
  }, [projections]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Toggle year expansion
  const toggleYearExpansion = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  // Chart data based on selected metric
  const chartData = useMemo(() => {
    switch (selectedMetric) {
      case 'portfolio':
        return projections.map(p => ({
          year: p.year,
          age: p.age,
          'Portfolio Value': p.portfolioValue,
          'Real Value': p.inflationAdjustedValue,
          milestone: p.milestone
        }));
      
      case 'cashflow':
        return projections.map(p => ({
          year: p.year,
          age: p.age,
          Income: p.income,
          Expenses: p.expenses,
          'Net Cash Flow': p.netCashFlow,
          milestone: p.milestone
        }));
      
      case 'probability':
        return projections.map(p => ({
          year: p.year,
          age: p.age,
          'Survival Probability': p.survivalProbability,
          'Success Threshold': 50, // Reference line
          milestone: p.milestone
        }));
      
      default:
        return [];
    }
  }, [projections, selectedMetric]);

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    const data = projections.find(p => p.year === label);
    if (!data) return null;
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-2">Year {label} (Age {data.age})</p>
        {data.milestone && (
          <Badge className="mb-2" variant="outline">{data.milestone}</Badge>
        )}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {
              entry.name.includes('Probability') || entry.name === 'Success Threshold'
                ? `${entry.value.toFixed(1)}%`
                : formatCurrency(entry.value)
            }
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Year-by-Year Stress Projections</h3>
          <p className="text-sm text-gray-600 mt-1">
            {stressScenarioName} • {scenario.projectionYears} years • Starting age {scenario.clientAge}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetailed(!showDetailed)}
          >
            {showDetailed ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showDetailed ? 'Show Chart' : 'Show Table'}
          </Button>
          
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={selectedMetric === 'portfolio' ? 'default' : 'ghost'}
              onClick={() => setSelectedMetric('portfolio')}
              className="text-xs"
            >
              Portfolio
            </Button>
            <Button
              size="sm"
              variant={selectedMetric === 'cashflow' ? 'default' : 'ghost'}
              onClick={() => setSelectedMetric('cashflow')}
              className="text-xs"
            >
              Cash Flow
            </Button>
            <Button
              size="sm"
              variant={selectedMetric === 'probability' ? 'default' : 'ghost'}
              onClick={() => setSelectedMetric('probability')}
              className="text-xs"
            >
              Probability
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Final Portfolio</p>
                <p className={`text-xl font-bold ${metrics.finalValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.finalValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lowest Point</p>
                <p className={`text-xl font-bold ${metrics.minValue > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.minValue)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Result</p>
                <p className={`text-xl font-bold ${metrics.netResult > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.netResult)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {metrics.depletionYear ? 'Depletion Year' : 'Survives'}
                </p>
                <p className={`text-xl font-bold ${metrics.depletionYear ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.depletionYear || '✓ Full Term'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Visualization */}
      {!showDetailed ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {selectedMetric === 'portfolio' && <DollarSign className="h-5 w-5" />}
                {selectedMetric === 'cashflow' && <TrendingUp className="h-5 w-5" />}
                {selectedMetric === 'probability' && <Eye className="h-5 w-5" />}
                {selectedMetric === 'portfolio' && 'Portfolio Value Over Time'}
                {selectedMetric === 'cashflow' && 'Cash Flow Analysis'}
                {selectedMetric === 'probability' && 'Success Probability Trajectory'}
              </span>
              <Badge variant="outline">Under Stress: {stressScenarioName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              {selectedMetric === 'portfolio' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="Portfolio Value" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Real Value" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3}
                  />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                  {/* Add milestone markers */}
                  {chartData.filter(d => d.milestone).map((d, i) => (
                    <ReferenceLine
                      key={i}
                      x={d.year}
                      stroke="#666"
                      strokeDasharray="3 3"
                      label={{ value: d.milestone, position: 'top', fontSize: 10 }}
                    />
                  ))}
                  <Brush dataKey="year" height={30} stroke="#3b82f6" />
                </AreaChart>
              ) : selectedMetric === 'cashflow' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" />
                  <Bar dataKey="Expenses" fill="#ef4444" />
                  <Line 
                    type="monotone" 
                    dataKey="Net Cash Flow" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                  <ReferenceLine y={0} stroke="#666" />
                  <Brush dataKey="year" height={30} stroke="#3b82f6" />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Survival Probability" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <ReferenceLine 
                    y={50} 
                    stroke="#f59e0b" 
                    strokeDasharray="5 5"
                    label="Critical Threshold"
                  />
                  <ReferenceLine 
                    y={80} 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    label="Target Threshold"
                  />
                  <Brush dataKey="year" height={30} stroke="#3b82f6" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        /* Detailed Table View */
        <Card>
          <CardHeader>
            <CardTitle>Detailed Year-by-Year Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Year</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Age</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Portfolio</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Income</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Expenses</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Net CF</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Survival %</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((projection, index) => {
                    const isExpanded = expandedYears.has(projection.year);
                    const isNegative = projection.portfolioValue < 0;
                    const isCritical = projection.portfolioValue < 50000;
                    
                    return (
                      <React.Fragment key={projection.year}>
                        <tr 
                          className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            isNegative ? 'bg-red-50' : isCritical ? 'bg-yellow-50' : ''
                          }`}
                          onClick={() => toggleYearExpansion(projection.year)}
                        >
                          <td className="py-3 px-4 font-medium">
                            {projection.year}
                            {projection.milestone && (
                              <Badge className="ml-2 text-xs" variant="outline">
                                {projection.milestone}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">{projection.age}</td>
                          <td className={`py-3 px-4 text-right font-medium ${
                            isNegative ? 'text-red-600' : isCritical ? 'text-yellow-600' : 'text-gray-900'
                          }`}>
                            {formatCurrency(projection.portfolioValue)}
                          </td>
                          <td className="py-3 px-4 text-right">{formatCurrency(projection.income)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(projection.expenses)}</td>
                          <td className={`py-3 px-4 text-right font-medium ${
                            projection.netCashFlow < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(projection.netCashFlow)}
                          </td>
                          <td className={`py-3 px-4 text-right ${
                            projection.survivalProbability < 50 ? 'text-red-600' : 
                            projection.survivalProbability < 80 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {projection.survivalProbability.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isNegative ? (
                              <Badge className="bg-red-100 text-red-800">Depleted</Badge>
                            ) : isCritical ? (
                              <Badge className="bg-yellow-100 text-yellow-800">Critical</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                            )}
                          </td>
                        </tr>
                        
                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="py-4 px-8">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Real Value:</span>
                                  <span className="ml-2 font-medium">
                                    {formatCurrency(projection.inflationAdjustedValue)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Cumulative CF:</span>
                                  <span className="ml-2 font-medium">
                                    {formatCurrency(projection.cumulativeCashFlow)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Years from Now:</span>
                                  <span className="ml-2 font-medium">{index}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Portfolio Change:</span>
                                  <span className={`ml-2 font-medium ${
                                    index > 0 && projection.portfolioValue < projections[index - 1].portfolioValue
                                      ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {index > 0 ? 
                                      formatCurrency(projection.portfolioValue - projections[index - 1].portfolioValue) : 
                                      'N/A'
                                    }
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Projections
        </Button>
      </div>
    </div>
  );
}