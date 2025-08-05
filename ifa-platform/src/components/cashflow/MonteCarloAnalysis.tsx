// ================================================================
// src/components/cashflow/MonteCarloAnalysis.tsx
// Complete file - copy this entire content
// ================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { MonteCarloRunner } from '@/components/monte-carlo/MonteCarloRunner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, 
  AlertTriangle, 
  Shield,
  Info,
  Save,
  History
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
  Area,
  ComposedChart
} from 'recharts';
import type { CashFlowScenario } from '@/types/cashflow';

interface MonteCarloAnalysisProps {
  scenario: CashFlowScenario;
  projectionYears?: number;
}

// Main component
const MonteCarloAnalysis: React.FC<MonteCarloAnalysisProps> = ({
  scenario,
  projectionYears = 30
}) => {
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);
  const [showInterpretation, setShowInterpretation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load historical Monte Carlo results
  useEffect(() => {
    loadHistoricalResults();
  }, [scenario.id]);

  // Check for results periodically when MonteCarloRunner is running
  useEffect(() => {
    const checkForResults = async () => {
      try {
        const response = await fetch(`/api/monte-carlo/results/${scenario.id}?latest=true`);
        const data = await response.json();
        if (data.result && data.result.created_at > (simulationResults?.created_at || 0)) {
          setSimulationResults(data.result);
        }
      } catch (error) {
        console.error('Error checking for results:', error);
      }
    };

    // Check every 2 seconds if we don't have results
    const interval = setInterval(checkForResults, 2000);
    return () => clearInterval(interval);
  }, [scenario.id, simulationResults]);

  const loadHistoricalResults = async () => {
    try {
      const response = await fetch(`/api/monte-carlo/results/${scenario.id}`);
      const data = await response.json();
      if (data.results) {
        setHistoricalResults(data.results);
        // Set the latest result if we don't have one
        if (!simulationResults && data.results.length > 0) {
          setSimulationResults(data.results[0]);
        }
      }
    } catch (error) {
      console.error('Error loading historical results:', error);
    }
  };

  // Generate interpretation based on results
  const getInterpretation = (results: any) => {
    const successRate = results?.success_probability || 0;
    const shortfallRisk = results?.shortfall_risk || 0;
    
    let interpretation = {
      overall: '',
      recommendations: [] as string[],
      riskLevel: 'medium' as 'low' | 'medium' | 'high'
    };

    if (successRate >= 85) {
      interpretation.overall = 'Your financial plan shows excellent resilience with a high probability of success.';
      interpretation.riskLevel = 'low';
      interpretation.recommendations = [
        'Consider if you\'re being overly conservative',
        'You may have room to increase spending or retire earlier',
        'Review if your risk tolerance allows for higher returns'
      ];
    } else if (successRate >= 70) {
      interpretation.overall = 'Your plan has a good probability of success with manageable risks.';
      interpretation.riskLevel = 'medium';
      interpretation.recommendations = [
        'Build a 2-3 year cash buffer for market downturns',
        'Consider dynamic withdrawal strategies',
        'Review plan annually and adjust as needed'
      ];
    } else {
      interpretation.overall = 'Your plan faces significant risks that need addressing.';
      interpretation.riskLevel = 'high';
      interpretation.recommendations = [
        'Consider delaying retirement by 2-3 years',
        'Reduce planned expenses by 10-15%',
        'Increase current savings rate if possible',
        'Explore part-time work in early retirement'
      ];
    }

    return interpretation;
  };

  // Transform confidence intervals for visualization
  const getConfidenceData = (results: any) => {
    if (!results?.confidence_intervals) return [];
    
    const years = Array.from({ length: projectionYears }, (_, i) => i + 1);
    const startValue = scenario.currentSavings + scenario.pensionPotValue + scenario.investmentValue;
    
    return years.map(year => {
      const growthFactor = Math.pow(1.05, year); // Simplified growth
      return {
        year,
        age: scenario.clientAge + year,
        p10: (results.confidence_intervals.p10 || startValue) * growthFactor * 0.7,
        p25: (results.confidence_intervals.p25 || startValue) * growthFactor * 0.85,
        p50: (results.confidence_intervals.p50 || startValue) * growthFactor,
        p75: (results.confidence_intervals.p75 || startValue) * growthFactor * 1.15,
        p90: (results.confidence_intervals.p90 || startValue) * growthFactor * 1.3
      };
    });
  };

  const interpretation = simulationResults ? getInterpretation(simulationResults) : null;
  const confidenceData = simulationResults ? getConfidenceData(simulationResults) : [];

  return (
    <div className="space-y-6">
      {/* Monte Carlo Runner Integration - Without onComplete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Monte Carlo Simulation
            </span>
            {historicalResults.length > 0 && (
              <Badge variant="outline">
                {historicalResults.length} previous {historicalResults.length === 1 ? 'run' : 'runs'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Use existing MonteCarloRunner without onComplete */}
          <MonteCarloRunner 
            scenarioId={scenario.id}
            simulationCount={5000}
          />
          
          {/* Add refresh button to manually check for new results */}
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistoricalResults}
              disabled={isLoading}
            >
              <History className="w-4 h-4 mr-2" />
              Refresh Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Results Visualization */}
      {simulationResults && (
        <>
          {/* Interpretation Panel */}
          {showInterpretation && (
            <Card className={`border-2 ${
              interpretation?.riskLevel === 'low' ? 'border-green-200 bg-green-50' :
              interpretation?.riskLevel === 'high' ? 'border-red-200 bg-red-50' :
              'border-yellow-200 bg-yellow-50'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className={`w-5 h-5 mt-0.5 ${
                    interpretation?.riskLevel === 'low' ? 'text-green-600' :
                    interpretation?.riskLevel === 'high' ? 'text-red-600' :
                    'text-yellow-600'
                  }`} />
                  <div>
                    <h4 className="font-medium mb-2">Analysis Interpretation</h4>
                    <p className="text-sm mb-3">{interpretation?.overall}</p>
                    <h5 className="font-medium text-sm mb-1">Recommendations:</h5>
                    <ul className="text-sm space-y-1">
                      {interpretation?.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confidence Intervals Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Projected Wealth Distribution</CardTitle>
              <p className="text-sm text-gray-600">
                Shows the range of possible outcomes based on {simulationResults.simulation_count?.toLocaleString()} simulations
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={confidenceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="age" 
                    label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                    label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => `£${(value / 1000).toFixed(0)}k`}
                    labelFormatter={(label) => `Age ${label}`}
                  />
                  <Legend />
                  
                  {/* Confidence bands */}
                  <Area
                    type="monotone"
                    dataKey="p90"
                    stackId="1"
                    stroke="none"
                    fill="#bbf7d0"
                    name="90th Percentile"
                  />
                  <Area
                    type="monotone"
                    dataKey="p75"
                    stackId="2"
                    stroke="none"
                    fill="#86efac"
                    name="75th Percentile"
                  />
                  
                  {/* Median line */}
                  <Line
                    type="monotone"
                    dataKey="p50"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    name="Median (50th)"
                  />
                  
                  {/* Lower bounds */}
                  <Line
                    type="monotone"
                    dataKey="p25"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="25th Percentile"
                  />
                  <Line
                    type="monotone"
                    dataKey="p10"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name="10th Percentile"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Historical Comparison */}
          {historicalResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historical Analysis Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historicalResults.slice(0, 3).map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(result.run_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {result.simulation_count} simulations
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{result.success_probability}%</p>
                          <p className="text-xs text-gray-600">Success Rate</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            £{(result.confidence_intervals?.p50 / 1000).toFixed(0)}k
                          </p>
                          <p className="text-xs text-gray-600">Median</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// CRITICAL: Named export - this is what was missing!
export { MonteCarloAnalysis };

// Also add default export for flexibility
export default MonteCarloAnalysis;