// src/components/monte-carlo/EnhancedMonteCarloRunner.tsx
// COMPLETE FINAL VERSION - All fixes included

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Info,
  Loader2
} from 'lucide-react';

interface MonteCarloInput {
  initialWealth: number;
  timeHorizon: number;
  withdrawalAmount: number;
  riskScore: number;
  inflationRate?: number;
  simulationCount?: number;
}

interface MonteCarloResults {
  successProbability: number;
  averageFinalWealth: number;
  medianFinalWealth: number;
  confidenceIntervals: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfallRisk: number;
  averageShortfall: number;
  maxDrawdown: number;
  volatility: number;
  executionTime: number;
  simulationCount: number;
  simulations?: any[];
}

interface SimulationProgress {
  progress: number;
  completed: number;
  total: number;
  timeElapsed: number;
  estimatedTimeRemaining: number;
}

interface EnhancedMonteCarloRunnerProps {
  clientId?: string;
  clientName?: string;
  initialInputs?: MonteCarloInput;
  onComplete?: (results: MonteCarloResults) => void;
}

export default function EnhancedMonteCarloRunner({
  clientId,
  clientName = 'Client',
  initialInputs,
  onComplete
}: EnhancedMonteCarloRunnerProps) {
  const { toast } = useToast();
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // State
  const [inputs, setInputs] = useState<MonteCarloInput>(initialInputs || {
    initialWealth: 500000,
    timeHorizon: 30,
    withdrawalAmount: 25000,
    riskScore: 5,
    inflationRate: 2.5,
    simulationCount: 5000
  });

  const [scenarioName, setScenarioName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [progress, setProgress] = useState<SimulationProgress>({
    progress: 0,
    completed: 0,
    total: 0,
    timeElapsed: 0,
    estimatedTimeRemaining: 0
  });
  const [results, setResults] = useState<MonteCarloResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Add log helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Handle simulation completion
  const handleSimulationComplete = useCallback(async (data: MonteCarloResults) => {
    const executionTime = (Date.now() - startTimeRef.current) / 1000;
    const finalResults = { ...data, executionTime };
    
    setResults(finalResults);
    setIsRunning(false);
    
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }
    
    addLog(`Simulation completed in ${executionTime.toFixed(2)}s`);
    addLog(`Success probability: ${data.successProbability.toFixed(1)}%`);
    
    // Show success toast
    toast({
      title: "Simulation Complete",
      description: `Success probability: ${data.successProbability.toFixed(1)}%`,
    });
    
    // Save results if clientId is provided
    if (clientId) {
      await saveResults(finalResults);
    }
    
    // Call completion callback
    if (onComplete) {
      onComplete(finalResults);
    }
  }, [addLog, clientId, onComplete, toast]);

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      console.log('Worker already initialized');
      return;
    }

    try {
      console.log('Initializing Monte Carlo worker...');
      
      // Create the worker
      const worker = new Worker('/workers/monte-carlo-worker.js', { type: 'module' });
      
      worker.onmessage = ({ data }) => {
        console.log('Worker message received:', data);
        
        const { type } = data;
        
        switch (type) {
          case 'progress':
            // Worker sends progress as data.progress object
            if (data.progress) {
              setProgress(prev => ({
                progress: data.progress.progress,
                completed: data.progress.completed,
                total: data.progress.total,
                timeElapsed: (Date.now() - startTimeRef.current) / 1000,
                estimatedTimeRemaining: prev.total > 0 ? 
                  ((Date.now() - startTimeRef.current) / 1000) * 
                  (prev.total - data.progress.completed) / data.progress.completed : 0
              }));
            }
            break;
            
          case 'complete':
            // Worker sends results as data.results
            if (data.results) {
              handleSimulationComplete(data.results);
            }
            break;
            
          case 'error':
            // Worker sends error as data.error (not data.message)
            const errorMessage = data.error || 'Unknown error occurred';
            setError(errorMessage);
            setIsRunning(false);
            addLog(`Error: ${errorMessage}`);
            break;
            
          case 'test':
            addLog('Worker ready and responding to messages');
            setIsWorkerReady(true);
            break;
            
          case 'cancelled':
            setIsRunning(false);
            addLog('Simulation cancelled');
            break;
            
          default:
            console.warn('Unknown message type from worker:', type);
        }
      };
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setError('Worker crashed');
        setIsRunning(false);
        setIsWorkerReady(false);
        addLog('Worker crashed - check console for details');
      };
      
      // Store worker reference
      workerRef.current = worker;
      
      // Test worker is ready
      worker.postMessage({ type: 'test' });
      
      addLog('Web Worker initialized successfully');
      
    } catch (err) {
      console.error('Failed to create worker:', err);
      setError('Failed to initialize simulation engine');
      addLog('Failed to initialize worker');
    }
  }, [addLog, handleSimulationComplete]);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      initializeWorker();
    }
    
    return () => {
      if (workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch (e) {
          console.error('Error terminating worker:', e);
        }
        workerRef.current = null;
      }
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
        progressUpdateInterval.current = null;
      }
      setIsWorkerReady(false);
      isInitialized.current = false;
    };
  }, [initializeWorker]);

  // Save results to database
  const saveResults = async (results: MonteCarloResults) => {
    try {
      addLog('💾 Saving results to database...');
      
      const scenarioId = `scenario-${Date.now()}`;
      const name = scenarioName || `Scenario ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      
      // Create the record with all required fields
      const record = {
        scenario_id: scenarioId,
        client_id: clientId,
        scenario_name: name,
        success_probability: results.successProbability,
        simulation_count: results.simulationCount || inputs.simulationCount || 5000,
        created_at: new Date().toISOString(),
        
        // Add financial results
        average_final_wealth: results.averageFinalWealth || 0,
        median_final_wealth: results.medianFinalWealth || 0,
        confidence_intervals: results.confidenceIntervals || {},
        shortfall_risk: results.shortfallRisk || 0,
        average_shortfall_amount: results.averageShortfall || 0,
        wealth_volatility: results.volatility || 0,
        maximum_drawdown: results.maxDrawdown || 0,
        simulation_duration_ms: (results.executionTime || 0) * 1000,
        
        // Add input parameters
        initial_wealth: inputs.initialWealth,
        time_horizon: inputs.timeHorizon,
        withdrawal_amount: inputs.withdrawalAmount,
        risk_score: inputs.riskScore,
        inflation_rate: inputs.inflationRate || 2.5,
      };
      
      console.log('📊 Saving Monte Carlo results:', record);
      
      const { data, error: saveError } = await supabase
        .from('monte_carlo_results')
        .insert(record)
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving results:', saveError);
        addLog(`❌ Failed to save: ${saveError.message}`);
        
        toast({
          title: "Save Failed",
          description: `Could not save results: ${saveError.message}`,
          variant: "destructive",
        });
        
        return;
      }

      console.log('✅ Results saved successfully:', data);
      addLog('✅ Results saved successfully');
      
      toast({
        title: "Results Saved",
        description: `${name} saved successfully`,
      });
      
    } catch (error) {
      console.error('❌ Unexpected error saving results:', error);
      addLog(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Save Failed", 
        description: "An unexpected error occurred while saving results",
        variant: "destructive",
      });
    }
  };

  // Run simulation - FIXED to match worker format
  const handleRunSimulation = () => {
    if (!workerRef.current) {
      setError('Worker not initialized');
      return;
    }

    if (!isWorkerReady) {
      setError('Worker not ready yet. Please wait a moment and try again.');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);
    setProgress({
      progress: 0,
      completed: 0,
      total: inputs.simulationCount || 5000,
      timeElapsed: 0,
      estimatedTimeRemaining: 0
    });
    
    startTimeRef.current = Date.now();
    addLog(`Starting simulation with ${inputs.simulationCount} iterations...`);
    
    // Start progress updates
    progressUpdateInterval.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setProgress(prev => ({ ...prev, timeElapsed: elapsed }));
    }, 100);
    
    // Send message in the format the worker expects
    workerRef.current.postMessage({
      type: 'simulate',  // Worker expects 'simulate' not 'start'
      data: {            // Worker expects 'data' not 'inputs'
        initialWealth: inputs.initialWealth,
        timeHorizon: inputs.timeHorizon,
        withdrawalAmount: inputs.withdrawalAmount,
        riskScore: inputs.riskScore,
        inflationRate: inputs.inflationRate || 2.5,
        simulationCount: inputs.simulationCount || 5000,
        seed: Date.now() // Add seed for reproducibility
      }
    });
  };

  // Stop simulation
  const handleStopSimulation = () => {
    if (workerRef.current && isRunning) {
      workerRef.current.postMessage({ type: 'cancel' }); // Worker expects 'cancel' not 'stop'
      setIsRunning(false);
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
        progressUpdateInterval.current = null;
      }
      addLog('Simulation cancelled by user');
    }
  };

  // Reset simulation
  const handleReset = () => {
    setResults(null);
    setError(null);
    setProgress({
      progress: 0,
      completed: 0,
      total: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: 0
    });
    setLogs([]);
    addLog('Simulation reset');
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  // Simple info tooltip
  const InfoTooltip = ({ text }: { text: string }) => (
    <span className="inline-flex items-center ml-2 text-gray-400" title={text}>
      <Info className="h-4 w-4" />
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Inputs Section */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Scenario Name (Optional)
            </label>
            <Input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., Conservative Retirement Plan"
              disabled={isRunning}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Simulations
              <InfoTooltip text="More simulations = more accurate results but longer runtime" />
            </label>
            <Input
              type="number"
              value={inputs.simulationCount}
              onChange={(e) => setInputs({ ...inputs, simulationCount: parseInt(e.target.value) || 1000 })}
              min={1000}
              max={100000}
              step={1000}
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Initial Portfolio Value
              <InfoTooltip text="Current value of all investable assets" />
            </label>
            <Input
              type="number"
              value={inputs.initialWealth}
              onChange={(e) => setInputs({ ...inputs, initialWealth: parseFloat(e.target.value) || 0 })}
              min={0}
              step={10000}
              disabled={isRunning}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Time Horizon (Years)
              <InfoTooltip text="How many years the portfolio needs to last" />
            </label>
            <Input
              type="number"
              value={inputs.timeHorizon}
              onChange={(e) => setInputs({ ...inputs, timeHorizon: parseInt(e.target.value) || 1 })}
              min={1}
              max={50}
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Annual Withdrawal Amount
              <InfoTooltip text="Amount to withdraw each year (adjusted for inflation)" />
            </label>
            <Input
              type="number"
              value={inputs.withdrawalAmount}
              onChange={(e) => setInputs({ ...inputs, withdrawalAmount: parseFloat(e.target.value) || 0 })}
              min={0}
              step={1000}
              disabled={isRunning}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Inflation Rate (%)
              <InfoTooltip text="Expected annual inflation rate" />
            </label>
            <Input
              type="number"
              value={inputs.inflationRate}
              onChange={(e) => setInputs({ ...inputs, inflationRate: parseFloat(e.target.value) || 0 })}
              min={0}
              max={10}
              step={0.1}
              disabled={isRunning}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Risk Score: {inputs.riskScore}/10
            <InfoTooltip text="1 = Very Conservative, 10 = Very Aggressive" />
          </label>
          <input
            type="range"
            value={inputs.riskScore}
            onChange={(e) => setInputs({ ...inputs, riskScore: parseInt(e.target.value) })}
            min={1}
            max={10}
            step={1}
            disabled={isRunning}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(inputs.riskScore - 1) * 11.11}%, rgb(229 231 235) ${(inputs.riskScore - 1) * 11.11}%, rgb(229 231 235) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative</span>
            <span>Moderate</span>
            <span>Aggressive</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4">
        {!isRunning ? (
          <Button 
            onClick={handleRunSimulation}
            disabled={!inputs.initialWealth || !inputs.timeHorizon || !isWorkerReady}
            className="flex items-center gap-2"
          >
            {!isWorkerReady ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Simulation
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleStopSimulation}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Cancel
          </Button>
        )}
        
        <Button 
          onClick={handleReset}
          variant="outline"
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress: {progress.completed.toLocaleString()} / {progress.total.toLocaleString()}</span>
            <span>Time: {formatTime(progress.timeElapsed)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          {progress.estimatedTimeRemaining > 0 && (
            <p className="text-sm text-gray-600">
              Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Simulation Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Success Probability</div>
                <div className={`text-2xl font-bold ${
                  results.successProbability >= 75 ? 'text-green-600' : 
                  results.successProbability >= 50 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {results.successProbability.toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Average Final Wealth</div>
                <div className="text-2xl font-bold">{formatCurrency(results.averageFinalWealth)}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Median Final Wealth</div>
                <div className="text-2xl font-bold">{formatCurrency(results.medianFinalWealth)}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Shortfall Risk</div>
                <div className="text-2xl font-bold text-orange-600">{results.shortfallRisk.toFixed(1)}%</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Average Shortfall</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(results.averageShortfall)}</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Max Drawdown</div>
                <div className="text-2xl font-bold">{results.maxDrawdown.toFixed(1)}%</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-semibold mb-3">Confidence Intervals</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>10th Percentile (Worst Case)</span>
                  <span className="font-semibold">{formatCurrency(results.confidenceIntervals.p10)}</span>
                </div>
                <div className="flex justify-between">
                  <span>25th Percentile</span>
                  <span className="font-semibold">{formatCurrency(results.confidenceIntervals.p25)}</span>
                </div>
                <div className="flex justify-between">
                  <span>50th Percentile (Median)</span>
                  <span className="font-semibold">{formatCurrency(results.confidenceIntervals.p50)}</span>
                </div>
                <div className="flex justify-between">
                  <span>75th Percentile</span>
                  <span className="font-semibold">{formatCurrency(results.confidenceIntervals.p75)}</span>
                </div>
                <div className="flex justify-between">
                  <span>90th Percentile (Best Case)</span>
                  <span className="font-semibold">{formatCurrency(results.confidenceIntervals.p90)}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center mt-4">
              Analysis completed with {results.simulationCount.toLocaleString()} simulations 
              in {(results.executionTime / 1000).toFixed(2)} seconds
            </p>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-2">Simulation Log</h4>
          <div className="h-32 overflow-y-auto text-xs font-mono bg-gray-50 rounded p-2">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-gray-700">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}