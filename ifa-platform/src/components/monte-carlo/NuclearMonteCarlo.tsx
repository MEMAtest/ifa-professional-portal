// src/components/monte-carlo/NuclearMonteCarlo.tsx
// ENHANCED VERSION with intelligent helpers and validation

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Play, 
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  BarChart3,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calculator,
  BookOpen
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  validateParameters,
  calculateWithdrawalRate,
  calculateExpectedReturn,
  ValidationDisplay,
  HelperTooltip,
  MonteCarloQuickTips,
  PresetScenarios,
  SafeWithdrawalCalculator
} from './MonteCarloHelpers';

// Types
interface ClientDetails {
  name: string;
  age: number;
  netWorth: number;
  email?: string;
  notes?: string;
}

interface SimulationInputs {
  initialPortfolio: number;
  timeHorizon: number;
  annualWithdrawal: number;
  riskScore: number;
  inflationRate: number;
  simulationCount: number;
}

type SimulationParameters = Omit<SimulationInputs, 'simulationCount'> & {
  simulationCount?: number;
};

interface SimulationResults {
  successRate: number;
  averageFinalWealth: number;
  medianFinalWealth: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  failureRisk: number;
  maxDrawdown: number;
  yearlyData: YearlyProjection[];
  executionTime: number;
  simulationCount?: number;                    // ← ADD THIS LINE
  confidenceIntervals?: {                      // ← ADD THIS BLOCK
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfallRisk?: number;                      // ← ADD THIS LINE
  volatility?: number;                         // ← ADD THIS LINE
}

interface YearlyProjection {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  expectedWithdrawal: number;
}

// Props interface
interface NuclearMonteCarloProps {
  clientId?: string;
  clientName?: string;
  initialInputs?: Partial<SimulationInputs>;
  onComplete?: (results: SimulationResults) => void;
}

// Chart colors
const COLORS = {
  success: '#10b981',
  warning: '#f59e0b', 
  danger: '#ef4444',
  primary: '#3b82f6',
  secondary: '#6b7280',
  purple: '#8b5cf6',
  indigo: '#6366f1'
};

// Component
export default function NuclearMonteCarlo({
  clientId,
  clientName,
  initialInputs,
  onComplete
}: NuclearMonteCarloProps = {}) {
  const { toast } = useToast();
  
  // State
  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    name: clientName || '',
    age: 45,
    netWorth: initialInputs?.initialPortfolio || 500000,
    email: '',
    notes: ''
  });

  const [inputs, setInputs] = useState<SimulationInputs>({
    initialPortfolio: initialInputs?.initialPortfolio || 500000,
    timeHorizon: initialInputs?.timeHorizon || 30,
    annualWithdrawal: initialInputs?.annualWithdrawal || 20000,
    riskScore: initialInputs?.riskScore || 5,
    inflationRate: initialInputs?.inflationRate || 2.5,
    simulationCount: initialInputs?.simulationCount || 5000
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [persistResults, setPersistResults] = useState(false);
  const [showHelpers, setShowHelpers] = useState(true);
  const [showPresets, setShowPresets] = useState(false);

  // Validation
  const validation = validateParameters(inputs);
  const withdrawalRate = calculateWithdrawalRate(inputs.annualWithdrawal, inputs.initialPortfolio);
  const expectedReturn = calculateExpectedReturn(inputs.riskScore);

  // Auto-adjust withdrawal when portfolio changes
  useEffect(() => {
    if (inputs.initialPortfolio > 0) {
      const currentRate = withdrawalRate;
      // If rate is too high, suggest 4%
      if (currentRate > 6) {
        const suggestedWithdrawal = Math.round(inputs.initialPortfolio * 0.04);
        toast({
          title: "High Withdrawal Rate Detected",
          description: `Consider reducing annual withdrawal to £${suggestedWithdrawal.toLocaleString()} (4% rule)`,
          action: (
            <Button
              size="sm"
              onClick={() => setInputs({ ...inputs, annualWithdrawal: suggestedWithdrawal })}
            >
              Apply
            </Button>
          ),
        });
      }
    }
  }, [inputs.initialPortfolio]);

  // Helper functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get risk-based allocation
  const getRiskAllocation = (riskScore: number) => {
    const clampedScore = Math.max(1, Math.min(10, riskScore));
    return {
      equity: 0.1 + (clampedScore - 1) * 0.08,
      bonds: 0.8 - (clampedScore - 1) * 0.07,
      cash: 0.1
    };
  };

  // Simple random generator
  const random = () => Math.random();
  
  const normalRandom = (mean: number, stdDev: number) => {
    let u1 = random();
    let u2 = random();
    let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  };

  // Apply preset scenario
  const applyPreset = (params: SimulationParameters) => {
    setInputs({
      ...params,
      simulationCount: params.simulationCount || inputs.simulationCount // Use preset or keep current
    });
    setShowPresets(false);
    toast({
      title: "Preset Applied",
      description: "Scenario parameters have been loaded. Click 'Run Simulation' to begin.",
    });
  };

  // Run Monte Carlo simulation
  const runSimulation = async () => {
    // Validate before running
    if (!validation.isValid) {
      toast({
        title: "Invalid Parameters",
        description: validation.errors[0],
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    const startTime = Date.now();

    try {
      const allocation = getRiskAllocation(inputs.riskScore);
      const inflationRate = inputs.inflationRate / 100;
      
      // Asset parameters
      const assetParams = {
        equity: { return: 0.08, volatility: 0.16 },
        bonds: { return: 0.04, volatility: 0.05 },
        cash: { return: 0.02, volatility: 0.01 }
      };

      // Run simulations
      const simResults: { yearlyWealths: number[]; maxDrawdown: number }[] = [];
      const finalWealths: number[] = [];
      let successCount = 0;

      // Process in chunks for progress updates
      const chunkSize = 100;
      
      console.log('Starting simulation with:', {
        simulationCount: inputs.simulationCount,
        initialPortfolio: inputs.initialPortfolio,
        timeHorizon: inputs.timeHorizon,
        annualWithdrawal: inputs.annualWithdrawal,
        withdrawalRate: withdrawalRate.toFixed(2) + '%',
        expectedReturn: expectedReturn.toFixed(2) + '%'
      });
      
      for (let i = 0; i < inputs.simulationCount; i++) {
        let wealth = inputs.initialPortfolio;
        let yearlyWealths = [wealth];
        let failed = false;
        let peakWealth = wealth;
        let maxDrawdown = 0;

        // Simulate each year
        for (let year = 1; year <= inputs.timeHorizon; year++) {
          // Calculate portfolio return
          const equityReturn = normalRandom(assetParams.equity.return, assetParams.equity.volatility);
          const bondsReturn = normalRandom(assetParams.bonds.return, assetParams.bonds.volatility);
          const cashReturn = assetParams.cash.return;
          
          const portfolioReturn = 
            allocation.equity * equityReturn +
            allocation.bonds * bondsReturn +
            allocation.cash * cashReturn;

          // Apply return
          wealth = wealth * (1 + portfolioReturn);
          
          // Apply withdrawal (adjusted for inflation)
          const adjustedWithdrawal = inputs.annualWithdrawal * Math.pow(1 + inflationRate, year - 1);
          wealth -= adjustedWithdrawal;

          // Track peak and drawdown
          if (wealth > peakWealth) peakWealth = wealth;
          const drawdown = (peakWealth - wealth) / peakWealth;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;

          yearlyWealths.push(wealth);

          // Check failure
          if (wealth <= 0) {
            failed = true;
            break;
          }
        }

        if (!failed && wealth > 0) {
          successCount++;
        }
        
        // Store final wealth (0 if failed)
        finalWealths.push(wealth > 0 ? wealth : 0);
        simResults.push({ yearlyWealths, maxDrawdown });

        // Update progress
        if (i % chunkSize === 0 || i === inputs.simulationCount - 1) {
          const currentProgress = Math.round(((i + 1) / inputs.simulationCount) * 100);
          setProgress(currentProgress);
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Ensure progress reaches 100%
      setProgress(100);
      
      // Calculate statistics
      console.log('Simulation complete:', {
        successCount,
        totalSimulations: inputs.simulationCount,
        successRate: (successCount / inputs.simulationCount) * 100,
        finalWealthsLength: finalWealths.length
      });
      
      finalWealths.sort((a, b) => a - b);
      
      const successRate = inputs.simulationCount > 0 
        ? (successCount / inputs.simulationCount) * 100 
        : 0;
      const averageFinalWealth = finalWealths.length > 0
        ? finalWealths.reduce((sum, w) => sum + w, 0) / finalWealths.length
        : 0;
      const medianFinalWealth = finalWealths.length > 0
        ? finalWealths[Math.floor(finalWealths.length / 2)]
        : 0;
      
      // Percentiles
      const getPercentile = (p: number) => {
        const index = Math.floor((finalWealths.length - 1) * p / 100);
        return finalWealths[index];
      };

      // Generate yearly projections
      const yearlyData: YearlyProjection[] = [];
      for (let year = 0; year <= inputs.timeHorizon; year++) {
        const yearWealths = simResults
          .map(r => r.yearlyWealths[year] || 0)
          .filter(w => w > 0)
          .sort((a, b) => a - b);

        if (yearWealths.length > 0) {
          yearlyData.push({
            year,
            p10: yearWealths[Math.floor(yearWealths.length * 0.1)],
            p25: yearWealths[Math.floor(yearWealths.length * 0.25)],
            p50: yearWealths[Math.floor(yearWealths.length * 0.5)],
            p75: yearWealths[Math.floor(yearWealths.length * 0.75)],
            p90: yearWealths[Math.floor(yearWealths.length * 0.9)],
            expectedWithdrawal: inputs.annualWithdrawal * Math.pow(1 + inflationRate, year)
          });
        }
      }

      const maxDrawdown = Math.max(...simResults.map(r => r.maxDrawdown));

      const results: SimulationResults = {
        successRate,
        averageFinalWealth,
        medianFinalWealth,
        percentiles: {
          p10: getPercentile(10),
          p25: getPercentile(25),
          p50: getPercentile(50),
          p75: getPercentile(75),
          p90: getPercentile(90)
        },
        failureRisk: 100 - successRate,
        maxDrawdown: maxDrawdown * 100,
        yearlyData,
        executionTime: (Date.now() - startTime) / 1000
      };

      setResults(results);
      setProgress(100);
      setShowReport(true);
      setPersistResults(true);

      // Show success message with context
      const message = successRate >= 75 
        ? "Excellent! High probability of success" 
        : successRate >= 50 
        ? "Moderate success rate - consider adjustments"
        : "Low success rate - review your parameters";

      toast({
        title: "Simulation Complete",
        description: `${successRate.toFixed(1)}% success rate. ${message}`,
      });

      // Save to database if clientId provided
      if (clientId) {
        try {
          // Create scenario record
          const { data: scenario, error: scenarioError } = await supabase
            .from('monte_carlo_scenarios')
            .insert({
              client_id: clientId,
              scenario_name: `Scenario ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
              initial_wealth: inputs.initialPortfolio,
              time_horizon: inputs.timeHorizon,
              withdrawal_amount: inputs.annualWithdrawal,
              risk_score: inputs.riskScore,
              inflation_rate: inputs.inflationRate
            })
            .select()
            .single();

          if (scenarioError) throw scenarioError;

          // Save results
          const { error: resultsError } = await supabase
            .from('monte_carlo_results')
            .insert({
              scenario_id: scenario.id,
              simulation_count: inputs.simulationCount,
              success_probability: successRate,
              average_final_wealth: averageFinalWealth,
              median_final_wealth: medianFinalWealth,
              confidence_intervals: {
                p10: getPercentile(10),
                p25: getPercentile(25),
                p50: getPercentile(50),
                p75: getPercentile(75),
                p90: getPercentile(90)
              },
              shortfall_risk: 100 - successRate,
              average_shortfall_amount: 0,
              wealth_volatility: 15,
              maximum_drawdown: maxDrawdown * 100,
              simulation_duration_ms: (Date.now() - startTime),
              calculation_status: 'completed'
            });

          if (resultsError) throw resultsError;

          toast({
            title: "Results Saved",
            description: "Simulation results saved to client profile",
          });
        } catch (error) {
          console.error('Error saving results:', error);
          toast({
            title: "Save Failed",
            description: "Results displayed but could not be saved",
            variant: "destructive"
          });
        }
      }

      // Call completion callback if provided
      if (onComplete) {
        // Pass the full results object with the correct structure
        onComplete({
          successRate,
          averageFinalWealth,
          medianFinalWealth,
          percentiles: {
            p10: getPercentile(10),
            p25: getPercentile(25),
            p50: getPercentile(50),
            p75: getPercentile(75),
            p90: getPercentile(90)
          },
          failureRisk: 100 - successRate,
          maxDrawdown: maxDrawdown * 100,
          yearlyData,
          executionTime: results.executionTime,
          // Additional fields for compatibility
          simulationCount: inputs.simulationCount,
          confidenceIntervals: {
            p10: getPercentile(10),
            p25: getPercentile(25),
            p50: getPercentile(50),
            p75: getPercentile(75),
            p90: getPercentile(90)
          },
          shortfallRisk: 100 - successRate,
          volatility: 15
        });
      }

    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: "An error occurred during simulation",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Generate PDF report (placeholder)
  const generateReport = () => {
    toast({
      title: "Report Generated",
      description: "Report generation will be implemented",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      {!clientId && (
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Monte Carlo Simulation Engine</h1>
          <p className="text-gray-600">Professional retirement planning analysis with intelligent guidance</p>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHelpers(!showHelpers)}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          {showHelpers ? 'Hide' : 'Show'} Helpers
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPresets(!showPresets)}
        >
          <BookOpen className="h-4 w-4 mr-1" />
          Preset Scenarios
        </Button>
      </div>

      {/* Preset Scenarios */}
      {showPresets && (
        <PresetScenarios onSelect={applyPreset} />
      )}

      {/* Validation Display */}
      {validation.warnings.length > 0 || validation.errors.length > 0 ? (
        <ValidationDisplay 
          validation={validation} 
          withdrawalRate={withdrawalRate}
          expectedReturn={expectedReturn}
        />
      ) : withdrawalRate > 0 && withdrawalRate <= 5 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Your withdrawal rate of {withdrawalRate.toFixed(1)}% is within a sustainable range
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Details Card - Only show if no clientId provided */}
      {!clientId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Client Name</label>
                <Input
                  value={clientDetails.name}
                  onChange={(e) => setClientDetails({...clientDetails, name: e.target.value})}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Age</label>
                <Input
                  type="number"
                  value={clientDetails.age}
                  onChange={(e) => setClientDetails({...clientDetails, age: Number(e.target.value)})}
                  min="18"
                  max="100"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Net Worth</label>
                <Input
                  type="number"
                  value={clientDetails.netWorth}
                  onChange={(e) => setClientDetails({...clientDetails, netWorth: Number(e.target.value)})}
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  value={clientDetails.email}
                  onChange={(e) => setClientDetails({...clientDetails, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={clientDetails.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setClientDetails({...clientDetails, notes: e.target.value})}
                placeholder="Additional client notes..."
                rows={2}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Parameters with Helpers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Simulation Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Initial Portfolio Value
                <HelperTooltip
                  title="Starting Portfolio"
                  content="The total value of investments at the start of retirement."
                  example="£500,000 - £2,000,000 typical range"
                />
              </label>
              <Input
                type="number"
                value={inputs.initialPortfolio}
                onChange={(e) => setInputs({...inputs, initialPortfolio: Number(e.target.value)})}
                disabled={isRunning}
                className={validation.errors.some(e => e.includes('portfolio')) ? 'border-red-500' : ''}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Time Horizon (Years)
                <HelperTooltip
                  title="Retirement Duration"
                  content="How many years the money needs to last."
                  example="25-35 years typical for age 65 retiree"
                />
              </label>
              <Input
                type="number"
                value={inputs.timeHorizon}
                onChange={(e) => setInputs({...inputs, timeHorizon: Number(e.target.value)})}
                disabled={isRunning}
                min="1"
                max="50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Annual Withdrawal
                <HelperTooltip
                  title="Yearly Income Need"
                  content="Amount withdrawn each year, adjusted for inflation."
                  example="4% of portfolio is considered safe"
                  warning={`Current rate: ${withdrawalRate.toFixed(1)}%`}
                />
              </label>
              <Input
                type="number"
                value={inputs.annualWithdrawal}
                onChange={(e) => setInputs({...inputs, annualWithdrawal: Number(e.target.value)})}
                disabled={isRunning}
                className={withdrawalRate > 6 ? 'border-red-500' : withdrawalRate > 4.5 ? 'border-yellow-500' : ''}
              />
              {inputs.initialPortfolio > 0 && inputs.timeHorizon > 0 && (
                <SafeWithdrawalCalculator 
                  portfolio={inputs.initialPortfolio} 
                  timeHorizon={inputs.timeHorizon} 
                />
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <Target className="h-4 w-4" />
                Risk Score (1-10)
                <HelperTooltip
                  title="Investment Risk Level"
                  content="1 = Very Conservative (mostly bonds), 10 = Very Aggressive (mostly stocks)"
                  example="5-6 = Balanced portfolio"
                />
              </label>
              <Input
                type="number"
                value={inputs.riskScore}
                onChange={(e) => setInputs({...inputs, riskScore: Number(e.target.value)})}
                disabled={isRunning}
                min="1"
                max="10"
              />
              <p className="text-xs text-gray-600 mt-1">
                Expected return: {expectedReturn.toFixed(1)}% annually
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Inflation Rate (%)
                <HelperTooltip
                  title="Annual Inflation"
                  content="Expected yearly increase in cost of living."
                  example="2-3% historical average"
                />
              </label>
              <Input
                type="number"
                value={inputs.inflationRate}
                onChange={(e) => setInputs({...inputs, inflationRate: Number(e.target.value)})}
                disabled={isRunning}
                step="0.1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Number of Simulations
                <HelperTooltip
                  title="Simulation Runs"
                  content="More simulations = more accurate results but longer processing."
                  example="5,000 = good balance, 10,000 = very thorough"
                />
              </label>
              <Input
                type="number"
                value={inputs.simulationCount}
                onChange={(e) => setInputs({...inputs, simulationCount: Number(e.target.value)})}
                disabled={isRunning}
                min="1000"
                max="10000"
                step="1000"
              />
            </div>
          </div>

          {/* Run Button */}
          <div className="mt-6 flex gap-4">
            <Button 
              onClick={runSimulation}
              disabled={isRunning || (!clientId && !clientDetails.name) || !validation.isValid}
              size="lg"
              className="flex items-center gap-2"
            >
              <Play className="h-5 w-5" />
              {isRunning ? `Running... ${progress}%` : 'Run Simulation'}
            </Button>
            
            {results && (
              <Button 
                onClick={generateReport}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <FileText className="h-5 w-5" />
                Generate Report
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center text-xs text-white font-semibold"
                  style={{ width: `${progress}%` }}
                >
                  {progress}%
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips - Show when helpers enabled */}
      {showHelpers && !results && (
        <MonteCarloQuickTips />
      )}

      {/* Results Section */}
      {results && (showReport || persistResults) && (
        <>
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Simulation Results</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReport(false);
                    setPersistResults(false);
                    setResults(null);
                    setProgress(0);
                  }}
                >
                  Clear Results
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Success Rate - Big Display */}
                <div className="md:col-span-2 lg:col-span-1">
                  <Card className={`border-2 ${results.successRate >= 75 ? 'border-green-500' : results.successRate >= 50 ? 'border-yellow-500' : 'border-red-500'}`}>
                    <CardContent className="p-6 text-center">
                      <div className="text-sm text-gray-600 mb-2">Success Rate</div>
                      <div className={`text-5xl font-bold ${results.successRate >= 75 ? 'text-green-600' : results.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {results.successRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {results.successRate >= 75 ? 'High Confidence' : results.successRate >= 50 ? 'Moderate Risk' : 'High Risk'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Other Metrics */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Average Final Wealth</div>
                    <div className="text-2xl font-bold">{formatCurrency(results.averageFinalWealth)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Median Final Wealth</div>
                    <div className="text-2xl font-bold">{formatCurrency(results.medianFinalWealth)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Failure Risk</div>
                    <div className="text-2xl font-bold text-red-600">{formatPercent(results.failureRisk)}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Max Drawdown</div>
                    <div className="text-2xl font-bold text-orange-600">{formatPercent(results.maxDrawdown)}</div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Portfolio Allocation</div>
                  <div className="space-y-1 text-sm">
                    <div>Equity: {formatPercent(getRiskAllocation(inputs.riskScore).equity * 100)}</div>
                    <div>Bonds: {formatPercent(getRiskAllocation(inputs.riskScore).bonds * 100)}</div>
                    <div>Cash: {formatPercent(getRiskAllocation(inputs.riskScore).cash * 100)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Success/Failure Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Success vs Failure Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Success', value: results.successRate, fill: COLORS.success },
                          { name: 'Failure', value: results.failureRisk, fill: COLORS.danger }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[0, 1].map((index) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Percentile Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Final Wealth Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { percentile: '10th', value: results.percentiles.p10, fill: COLORS.danger },
                      { percentile: '25th', value: results.percentiles.p25, fill: COLORS.warning },
                      { percentile: '50th', value: results.percentiles.p50, fill: COLORS.purple },
                      { percentile: '75th', value: results.percentiles.p75, fill: COLORS.primary },
                      { percentile: '90th', value: results.percentiles.p90, fill: COLORS.success }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="percentile" />
                      <YAxis tickFormatter={(value) => `£${(value / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value">
                        {[0, 1, 2, 3, 4].map((index) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Wealth Projection Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                    <YAxis 
                      tickFormatter={(value) => `£${(value / 1000000).toFixed(1)}M`}
                      label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="p90" stackId="1" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.1} name="90th Percentile" />
                    <Area type="monotone" dataKey="p75" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.1} name="75th Percentile" />
                    <Area type="monotone" dataKey="p50" stackId="1" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.2} name="Median" strokeWidth={2} />
                    <Area type="monotone" dataKey="p25" stackId="1" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.1} name="25th Percentile" />
                    <Area type="monotone" dataKey="p10" stackId="1" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.1} name="10th Percentile" />
                    <Line type="monotone" dataKey="expectedWithdrawal" stroke={COLORS.secondary} strokeWidth={2} strokeDasharray="5 5" name="Annual Withdrawal" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Percentile Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 pb-2 border-b">
                  <div>Percentile</div>
                  <div>Final Wealth</div>
                  <div>Outcome</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="font-medium">10th (Worst Case)</div>
                  <div className="font-bold text-red-600">{formatCurrency(results.percentiles.p10)}</div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-600">High Risk</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="font-medium">25th</div>
                  <div className="font-bold text-orange-600">{formatCurrency(results.percentiles.p25)}</div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-600">Below Average</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="font-medium">50th (Median)</div>
                  <div className="font-bold">{formatCurrency(results.percentiles.p50)}</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Expected Case</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="font-medium">75th</div>
                  <div className="font-bold text-blue-600">{formatCurrency(results.percentiles.p75)}</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Good Outcome</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="font-medium">90th (Best Case)</div>
                  <div className="font-bold text-green-600">{formatCurrency(results.percentiles.p90)}</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Excellent Outcome</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Analysis completed with {inputs.simulationCount.toLocaleString()} simulations in {results.executionTime.toFixed(1)} seconds.
                  Based on a {inputs.timeHorizon}-year time horizon with {formatCurrency(inputs.annualWithdrawal)} annual withdrawals.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}