// ================================================================
// src/components/cashflow/SensitivityAnalysis.tsx - DEFINITIVE FIX
// Complete replacement for the problematic section
// ================================================================

'use client';
console.log("SensitivityAnalysis loaded - UPDATED VERSION");
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Badge } from '@/components/ui/Badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import type { CashFlowScenario } from '@/types/cashflow';

interface SensitivityParameter {
  id: string;
  name: string;
  baseValue: number;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

interface VariationData {
  value: number;
  finalPortfolioValue: number;
  successProbability: number;
  sustainabilityYears: number;
}

interface SensitivityResult {
  parameterId: string;
  parameterName: string;
  variations: VariationData[];
}

interface SensitivityAnalysisProps {
  scenario: CashFlowScenario;
  onParameterChange?: (parameterId: string, value: number) => void;
}

export const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({
  scenario,
  onParameterChange
}) => {
  const [parameters, setParameters] = useState<SensitivityParameter[]>([
    {
      id: 'inflationRate',
      name: 'Inflation Rate',
      baseValue: scenario.inflationRate,
      currentValue: scenario.inflationRate,
      min: 0,
      max: 10,
      step: 0.5,
      unit: '%',
      impact: 'high',
      description: 'Annual inflation rate affecting expenses and real returns'
    },
    {
      id: 'equityReturn',
      name: 'Equity Returns',
      baseValue: scenario.realEquityReturn,
      currentValue: scenario.realEquityReturn,
      min: -5,
      max: 15,
      step: 0.5,
      unit: '%',
      impact: 'high',
      description: 'Expected real return from equity investments'
    },
    {
      id: 'withdrawalRate',
      name: 'Withdrawal Rate',
      baseValue: 4,
      currentValue: 4,
      min: 2,
      max: 8,
      step: 0.25,
      unit: '%',
      impact: 'high',
      description: 'Annual withdrawal rate in retirement'
    },
    {
      id: 'retirementAge',
      name: 'Retirement Age',
      baseValue: scenario.retirementAge,
      currentValue: scenario.retirementAge,
      min: 55,
      max: 70,
      step: 1,
      unit: 'years',
      impact: 'medium',
      description: 'Age at which you plan to retire'
    },
    {
      id: 'expenseGrowth',
      name: 'Expense Growth',
      baseValue: 2,
      currentValue: 2,
      min: 0,
      max: 5,
      step: 0.25,
      unit: '%',
      impact: 'medium',
      description: 'Annual growth rate of living expenses'
    }
  ]);

  const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string>('inflationRate');

  // Calculate impact of parameter changes
  useEffect(() => {
    calculateSensitivity();
  }, [parameters]);

  const calculateSensitivity = () => {
    // FIX: Explicitly type the entire results array
    const results: SensitivityResult[] = [];
    
    for (const param of parameters) {
      // Create variations array with explicit type
      const paramVariations: VariationData[] = [];
      const steps = 5;
      const range = param.max - param.min;
      const stepSize = range / steps;

      for (let i = 0; i <= steps; i++) {
        const value = param.min + (stepSize * i);
        const impact = calculateImpact(param.id, value);
        
        // Create variation object
        const variationItem: VariationData = {
          value: value,
          finalPortfolioValue: impact.portfolioValue,
          successProbability: impact.successRate,
          sustainabilityYears: impact.sustainabilityYears
        };
        
        paramVariations.push(variationItem);
      }

      // Create result object
      const result: SensitivityResult = {
        parameterId: param.id,
        parameterName: param.name,
        variations: paramVariations
      };
      
      results.push(result);
    }

    setSensitivityResults(results);
  };

  const calculateImpact = (parameterId: string, value: number) => {
    // Simplified impact calculation - in production, this would recalculate projections
    const basePortfolioValue = 1000000;
    const baseSuccessRate = 75;
    const baseSustainability = 30;

    let multiplier = 1;
    const param = parameters.find(p => p.id === parameterId);
    if (!param) {
      return {
        portfolioValue: basePortfolioValue,
        successRate: baseSuccessRate,
        sustainabilityYears: baseSustainability
      };
    }
    
    const diff = value - param.baseValue;

    switch (parameterId) {
      case 'inflationRate':
        multiplier = 1 - (diff * 0.05); // 5% impact per 1% inflation
        break;
      case 'equityReturn':
        multiplier = 1 + (diff * 0.08); // 8% impact per 1% return
        break;
      case 'withdrawalRate':
        multiplier = 1 - (diff * 0.10); // 10% impact per 1% withdrawal
        break;
      case 'retirementAge':
        multiplier = 1 + (diff * 0.03); // 3% impact per year
        break;
      case 'expenseGrowth':
        multiplier = 1 - (diff * 0.04); // 4% impact per 1% growth
        break;
    }

    return {
      portfolioValue: basePortfolioValue * multiplier,
      successRate: Math.max(0, Math.min(100, baseSuccessRate * multiplier)),
      sustainabilityYears: Math.max(0, baseSustainability * multiplier)
    };
  };

  const handleParameterChange = (parameterId: string, value: number) => {
    setParameters(prev => prev.map(p => 
      p.id === parameterId ? { ...p, currentValue: value } : p
    ));
    
    if (onParameterChange) {
      onParameterChange(parameterId, value);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const selectedResult = sensitivityResults.find(r => r.parameterId === selectedParameter);

  return (
    <div className="space-y-6">
      {/* Parameter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Sensitivity Analysis
          </CardTitle>
          <p className="text-sm text-gray-600">
            Adjust parameters to see their impact on your financial plan
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {parameters.map(param => {
            const percentChange = param.baseValue !== 0 
              ? ((param.currentValue - param.baseValue) / param.baseValue * 100).toFixed(1)
              : '0';
            const isChanged = Math.abs(param.currentValue - param.baseValue) > 0.01;
            
            return (
              <div key={param.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{param.name}</h4>
                    <Badge 
                      variant="outline" 
                      className={getImpactColor(param.impact)}
                    >
                      {param.impact} impact
                    </Badge>
                    {isChanged && (
                      <span className={`text-sm ${param.currentValue > param.baseValue ? 'text-green-600' : 'text-red-600'}`}>
                        {param.currentValue > param.baseValue ? '+' : ''}{percentChange}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg">
                      {param.currentValue.toFixed(param.step < 1 ? 1 : 0)}{param.unit}
                    </span>
                  </div>
                </div>
                
                <Slider
                  value={[param.currentValue]}
                  onValueChange={([value]) => handleParameterChange(param.id, value)}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{param.min}{param.unit}</span>
                  <span>Base: {param.baseValue}{param.unit}</span>
                  <span>{param.max}{param.unit}</span>
                </div>
                
                <p className="text-sm text-gray-600">{param.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Impact Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Analysis</CardTitle>
          <div className="flex gap-2 mt-2">
            {parameters.map(param => (
              <button
                key={param.id}
                onClick={() => setSelectedParameter(param.id)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedParameter === param.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {param.name}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {selectedResult && (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedResult.variations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="value" 
                    label={{ value: selectedResult.parameterName, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine 
  yAxisId="left"
  x={parameters.find(p => p.id === selectedParameter)?.baseValue} 
  stroke="red" 
  strokeDasharray="5 5"
  label="Base"
/>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="finalPortfolioValue"
                    stroke="#8884d8"
                    name="Portfolio Value (£)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="successProbability"
                    stroke="#82ca9d"
                    name="Success Rate (%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Key Insights */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Impact</p>
                  <p className="text-xl font-bold text-blue-600">
                    {((parameters.find(p => p.id === selectedParameter)?.currentValue || 0) - 
                      (parameters.find(p => p.id === selectedParameter)?.baseValue || 0) > 0 ? '+' : '')}
                    {(((parameters.find(p => p.id === selectedParameter)?.currentValue || 0) - 
                      (parameters.find(p => p.id === selectedParameter)?.baseValue || 0)) * 10).toFixed(0)}%
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Sensitivity</p>
                  <p className="text-xl font-bold">
                    {parameters.find(p => p.id === selectedParameter)?.impact || 'medium'}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Optimal Range</p>
                  <p className="text-xl font-bold text-green-600">
                    {parameters.find(p => p.id === selectedParameter)?.baseValue}
                    {parameters.find(p => p.id === selectedParameter)?.unit}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Sensitivity Insights</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Inflation rate and equity returns have the highest impact on outcomes</li>
                <li>• A 1% change in withdrawal rate affects portfolio longevity by ~3 years</li>
                <li>• Delaying retirement by 2 years can increase success probability by 10-15%</li>
                <li>• Consider adjusting high-impact parameters first for plan optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};