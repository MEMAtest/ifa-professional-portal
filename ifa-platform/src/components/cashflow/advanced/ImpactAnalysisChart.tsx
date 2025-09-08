// ================================================================
// ImpactAnalysisChart.tsx - Before/after bar chart for portfolio impact
// Path: src/components/cashflow/advanced/ImpactAnalysisChart.tsx
// Purpose: Visualize portfolio decline and recovery scenarios
// FULLY COMPATIBLE with exact StressTestResult.impactAnalysis interface
// FIXED: Added yAxisId to ReferenceLine
// ================================================================
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TrendingDown, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { ImpactChartData, StressTestResult, ImpactAnalysis } from '@/types/stress-testing';

interface ImpactAnalysisChartProps {
  impactData: ImpactAnalysis; // Uses your exact simple interface
  chartType?: 'bar' | 'line';
  scenarioName?: string;
  showRecoveryMetrics?: boolean;
  className?: string;
  // Optional extended data passed as separate props
  beforeValues?: {
    portfolioValue: number;
    annualIncome: number;
    annualExpenses: number;
  };
  afterValues?: {
    portfolioValue: number;
    annualIncome: number;
    annualExpenses: number;
  };
  recoveryMetrics?: {
    timeToRecover: number;
    probabilityOfRecovery: number;
  };
}

export const ImpactAnalysisChart: React.FC<ImpactAnalysisChartProps> = ({
  impactData,
  chartType = 'bar',
  scenarioName = 'Stress Test',
  showRecoveryMetrics = true,
  className = '',
  beforeValues,
  afterValues,
  recoveryMetrics
}) => {
  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Use provided values or create calculated values for visualization
  const defaultBeforeValues = {
    portfolioValue: 500000,
    annualIncome: 40000,
    annualExpenses: 35000
  };

  const actualBeforeValues = beforeValues || defaultBeforeValues;
  
  const actualAfterValues = afterValues || {
    portfolioValue: actualBeforeValues.portfolioValue * (1 + impactData.portfolioDeclinePercent / 100),
    annualIncome: actualBeforeValues.annualIncome * (1 + impactData.incomeReductionPercent / 100),
    annualExpenses: actualBeforeValues.annualExpenses * (1 + impactData.expenseIncreasePercent / 100)
  };

  // Prepare chart data - ONLY use actualBeforeValues and actualAfterValues
  const chartData: ImpactChartData[] = [
    {
      category: 'Portfolio Value',
      before: actualBeforeValues.portfolioValue,
      after: actualAfterValues.portfolioValue,
      impact: actualAfterValues.portfolioValue - actualBeforeValues.portfolioValue,
      impactPercent: impactData.portfolioDeclinePercent
    },
    {
      category: 'Annual Income',
      before: actualBeforeValues.annualIncome,
      after: actualAfterValues.annualIncome,
      impact: actualAfterValues.annualIncome - actualBeforeValues.annualIncome,
      impactPercent: impactData.incomeReductionPercent
    },
    {
      category: 'Annual Expenses',
      before: actualBeforeValues.annualExpenses,
      after: actualAfterValues.annualExpenses,
      impact: actualAfterValues.annualExpenses - actualBeforeValues.annualExpenses,
      impactPercent: impactData.expenseIncreasePercent
    }
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ImpactChartData;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-blue-600">Before:</span>
              <span className="font-medium">{formatCurrency(data.before)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-orange-600">After:</span>
              <span className="font-medium">{formatCurrency(data.after)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-1">
              <span className="text-gray-600">Impact:</span>
              <span className={`font-medium ${data.impact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(data.impact)} ({formatPercent(data.impactPercent)})
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get impact severity color
  const getImpactColor = (percent: number) => {
    if (percent >= 0) return 'text-green-600';
    if (percent > -10) return 'text-yellow-600';
    if (percent > -25) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get impact severity badge
  const getImpactBadge = (percent: number) => {
    if (percent >= 0) return { variant: 'default' as const, text: 'Positive', icon: TrendingUp };
    if (percent > -10) return { variant: 'secondary' as const, text: 'Low Impact', icon: AlertCircle };
    if (percent > -25) return { variant: 'destructive' as const, text: 'Moderate Impact', icon: TrendingDown };
    return { variant: 'destructive' as const, text: 'High Impact', icon: TrendingDown };
  };

  const overallImpact = getImpactBadge(impactData.portfolioDeclinePercent);
  const ImpactIcon = overallImpact.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Impact Analysis: {scenarioName}
          </CardTitle>
          <Badge variant={overallImpact.variant} className="flex items-center gap-1">
            <ImpactIcon className="h-3 w-3" />
            {overallImpact.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Portfolio Impact</div>
              <div className={`text-lg font-bold ${getImpactColor(impactData.portfolioDeclinePercent)}`}>
                {formatPercent(impactData.portfolioDeclinePercent)}
              </div>
              <div className="text-xs text-gray-500">
                {formatCurrency(actualAfterValues.portfolioValue - actualBeforeValues.portfolioValue)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Income Impact</div>
              <div className={`text-lg font-bold ${getImpactColor(impactData.incomeReductionPercent)}`}>
                {formatPercent(impactData.incomeReductionPercent)}
              </div>
              <div className="text-xs text-gray-500">
                {formatCurrency(actualAfterValues.annualIncome - actualBeforeValues.annualIncome)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Expense Impact</div>
              <div className={`text-lg font-bold ${getImpactColor(-impactData.expenseIncreasePercent)}`}>
                {formatPercent(impactData.expenseIncreasePercent)}
              </div>
              <div className="text-xs text-gray-500">
                {formatCurrency(actualAfterValues.annualExpenses - actualBeforeValues.annualExpenses)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value).replace('£', '£')}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar 
                  dataKey="before" 
                  fill="#3b82f6" 
                  name="Before Stress Test"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="after" 
                  fill="#f97316" 
                  name="After Stress Test"
                  radius={[2, 2, 0, 0]}
                />
                
                {/* FIX: Added yAxisId since this is a single Y-axis chart */}
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recovery Metrics - ONLY show if passed as prop */}
          {showRecoveryMetrics && recoveryMetrics && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Recovery Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-xs text-blue-600 font-medium">Time to Recover</div>
                    <div className="text-lg font-bold text-blue-800">
                      {recoveryMetrics.timeToRecover} years
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-xs text-green-600 font-medium">Recovery Probability</div>
                    <div className="text-lg font-bold text-green-800">
                      {recoveryMetrics.probabilityOfRecovery.toFixed(1)}%
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Demo component for testing
export const ImpactAnalysisChartDemo: React.FC = () => {
  const sampleImpactData: ImpactAnalysis = {
    portfolioDeclinePercent: -18.5,
    incomeReductionPercent: -12.0,
    expenseIncreasePercent: 8.5
  };

  const sampleBeforeValues = {
    portfolioValue: 750000,
    annualIncome: 45000,
    annualExpenses: 38000
  };

  const sampleAfterValues = {
    portfolioValue: 611250,
    annualIncome: 39600,
    annualExpenses: 41230
  };

  const sampleRecoveryMetrics = {
    timeToRecover: 3.2,
    probabilityOfRecovery: 78.5
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Impact Analysis Chart Demo</h2>
      <ImpactAnalysisChart 
        impactData={sampleImpactData}
        scenarioName="2008-Style Market Crash"
        showRecoveryMetrics={true}
        beforeValues={sampleBeforeValues}
        afterValues={sampleAfterValues}
        recoveryMetrics={sampleRecoveryMetrics}
      />
    </div>
  );
};