// ===================================================================
// src/components/monte-carlo/EnhancedMonteCarloRunner.tsx - UPDATED
// ===================================================================

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

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
  initialInputs?: MonteCarloInput;
  onComplete?: (results: any) => void;
}

const EnhancedMonteCarloRunner: React.FC<EnhancedMonteCarloRunnerProps> = ({
  clientId,
  initialInputs,
  onComplete
}) => {
  const { toast } = useToast();
  
  // State
  const [isRunning, setIsRunning] = useState(false);
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
  const [scenarioName, setScenarioName] = useState('');

  // Form inputs - use provided initial values or defaults
  const [input, setInput] = useState<MonteCarloInput>(initialInputs || {
    initialWealth: 500000,
    timeHorizon: 30,
    withdrawalAmount: 25000,
    riskScore: 5,
    inflationRate: 0.025,
    simulationCount: 5000
  });

  // Update inputs if initialInputs prop changes
  useEffect(() => {
    if (initialInputs) {
      setInput(initialInputs);
    }
  }, [initialInputs]);

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  }, []);

  // Initialize Web Worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) return;

    try {
      workerRef.current = new Worker('/workers/monte-carlo-worker.js');
      
      workerRef.current.onmessage = (e) => {
        const { type, data } = e.data;
        
        switch (type) {
          case 'progress':
            setProgress(data);
            break;
            
          case 'complete':
            handleSimulationComplete(data);
            break;
            
          case 'error':
            setError(data.message);
            setIsRunning(false);
            addLog(`Error: ${data.message}`);
            break;
            
          case 'log':
            addLog(data.message);
            break;
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setError('Worker initialization failed');
        setIsRunning(false);
      };
      
      addLog('Web Worker initialized successfully');
    } catch (err) {
      console.error('Failed to create worker:', err);
      setError('Failed to initialize simulation engine');
    }
  }, [addLog]);

  // Handle simulation completion
  const handleSimulationComplete = async (data: MonteCarloResults) => {
    const executionTime = (Date.now() - startTimeRef.current) / 1000;
    const finalResults = { ...data, executionTime };
    
    setResults(finalResults);
    setIsRunning(false);
    
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }
    
    addLog(`Simulation completed in ${executionTime.toFixed(2)}s`);
    addLog(`Success probability: ${data.successProbability.toFixed(1)}%`);
    
    // Save results if clientId is provided
    if (clientId) {
      await saveResults(finalResults);
    }
    
    // Call completion callback
    if (onComplete) {
      onComplete(finalResults);
    }
  };

  // Save results to database
  const saveResults = async (results: MonteCarloResults) => {
    try {
      const scenarioId = `scenario-${Date.now()}`;
      const name = scenarioName || `Scenario ${new Date().toLocaleDateString()}`;
      
      const { error: saveError } = await supabase
        .from('monte_carlo_results')
        .insert({
          scenario_id: scenarioId,
          client_id: clientId,
          scenario_name: name,
          simulation_count: results.simulationCount,
          success_probability: results.successProbability,
          average_final_wealth: results.averageFinalWealth,
          median_final_wealth: results.medianFinalWealth,
          confidence_intervals: results.confidenceIntervals,
          shortfall_risk: results.shortfallRisk,
          average_shortfall_amount: results.averageShortfall,
          wealth_volatility: results.volatility,
          maximum_drawdown: results.maxDrawdown,
          simulation_duration_ms: results.executionTime * 1000,
          calculation_status: 'completed'
        });

      if (saveError) {
        console.error('Error saving results:', saveError);
        toast({
          title: 'Warning',
          description: 'Results calculated but could not be saved',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: 'Monte Carlo simulation completed and saved',
          variant: 'default'
        });
      }
    } catch (err) {
      console.error('Error saving results:', err);
    }
  };

  // Run simulation
  const runSimulation = useCallback(() => {
    if (!workerRef.current) {
      initializeWorker();
      setTimeout(runSimulation, 100);
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);
    setProgress({
      progress: 0,
      completed: 0,
      total: input.simulationCount || 5000,
      timeElapsed: 0,
      estimatedTimeRemaining: 0
    });
    
    startTimeRef.current = Date.now();
    
    // Update progress every 100ms
    progressUpdateInterval.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setProgress(prev => ({
        ...prev,
        timeElapsed: elapsed,
        estimatedTimeRemaining: prev.progress > 0
          ? (elapsed / prev.progress) * (100 - prev.progress)
          : 0
      }));
    }, 100);
    
    addLog(`Starting simulation with ${input.simulationCount} iterations...`);
    
    // Send configuration to worker
    workerRef.current.postMessage({
      type: 'start',
      config: {
        ...input,
        inflationRate: (input.inflationRate || 2.5) / 100
      }
    });
  }, [input, initializeWorker, addLog]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
    }
    setIsRunning(false);
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }
    addLog('Simulation stopped by user');
  }, [addLog]);

  // Get withdrawal rate percentage
  const withdrawalRate = input.initialWealth > 0
    ? ((input.withdrawalAmount / input.initialWealth) * 100).toFixed(1)
    : '0.0';

  // Get withdrawal rate assessment
  const getWithdrawalRateAssessment = (rate: number) => {
    if (rate <= 2) return { text: 'Very Conservative', color: '#059669' };
    if (rate <= 3) return { text: 'Conservative', color: '#0891b2' };
    if (rate <= 4) return { text: 'Moderate', color: '#ea580c' };
    if (rate <= 5) return { text: 'Aggressive', color: '#dc2626' };
    return { text: 'Very Aggressive', color: '#991b1b' };
  };

  const rateAssessment = getWithdrawalRateAssessment(parseFloat(withdrawalRate));

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, []);

  return (
    <div className="enhanced-monte-carlo-runner">
      {/* Scenario Name (only when saving results) */}
      {clientId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scenario Name (Optional)
          </label>
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="e.g., Conservative Retirement Plan"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Wealth
          </label>
          <input
            type="number"
            value={input.initialWealth}
            onChange={(e) => setInput({ ...input, initialWealth: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Horizon (Years)
          </label>
          <input
            type="number"
            value={input.timeHorizon}
            onChange={(e) => setInput({ ...input, timeHorizon: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Annual Withdrawal
          </label>
          <input
            type="number"
            value={input.withdrawalAmount}
            onChange={(e) => setInput({ ...input, withdrawalAmount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Risk Score (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={input.riskScore}
            onChange={(e) => setInput({ ...input, riskScore: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inflation Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={input.inflationRate || 2.5}
            onChange={(e) => setInput({ ...input, inflationRate: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulations
          </label>
          <input
            type="number"
            min="100"
            max="50000"
            step="100"
            value={input.simulationCount}
            onChange={(e) => setInput({ ...input, simulationCount: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Withdrawal Rate Assessment */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Withdrawal Rate</p>
            <p className="text-2xl font-bold" style={{ color: rateAssessment.color }}>
              {withdrawalRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Assessment</p>
            <p className="font-semibold" style={{ color: rateAssessment.color }}>
              {rateAssessment.text}
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={runSimulation}
          disabled={isRunning}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Run Simulation'}
        </button>
        <button
          onClick={stopSimulation}
          disabled={!isRunning}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop
        </button>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="mb-8">
          <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 relative"
              style={{ width: `${progress.progress}%` }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
                {progress.progress.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 text-sm text-gray-600">
            <div>
              <p className="font-medium">Completed</p>
              <p>{progress.completed.toLocaleString()} / {progress.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-medium">Time Elapsed</p>
              <p>{formatTime(progress.timeElapsed)}</p>
            </div>
            <div>
              <p className="font-medium">Time Remaining</p>
              <p>{formatTime(progress.estimatedTimeRemaining)}</p>
            </div>
            <div>
              <p className="font-medium">Speed</p>
              <p>{progress.timeElapsed > 0 
                ? `${Math.round(progress.completed / progress.timeElapsed).toLocaleString()}/s`
                : '0/s'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-4">Simulation Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Success Probability</p>
              <p className="text-2xl font-bold text-green-600">
                {results.successProbability.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Average Final Wealth</p>
              <p className="text-xl font-bold">
                {formatCurrency(results.averageFinalWealth)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Median Final Wealth</p>
              <p className="text-xl font-bold">
                {formatCurrency(results.medianFinalWealth)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Shortfall Risk</p>
              <p className="text-2xl font-bold text-red-600">
                {results.shortfallRisk.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Confidence Intervals */}
          <div className="bg-white p-6 rounded-lg border">
            <h4 className="font-semibold mb-4">Confidence Intervals</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">10th Percentile</span>
                <span className="font-medium">{formatCurrency(results.confidenceIntervals.p10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">25th Percentile</span>
                <span className="font-medium">{formatCurrency(results.confidenceIntervals.p25)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">50th Percentile (Median)</span>
                <span className="font-medium">{formatCurrency(results.confidenceIntervals.p50)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">75th Percentile</span>
                <span className="font-medium">{formatCurrency(results.confidenceIntervals.p75)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">90th Percentile</span>
                <span className="font-medium">{formatCurrency(results.confidenceIntervals.p90)}</span>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Average Shortfall</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(results.averageShortfall)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Max Drawdown</p>
              <p className="text-lg font-bold">
                {results.maxDrawdown.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Volatility</p>
              <p className="text-lg font-bold">
                {results.volatility.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="text-sm text-gray-600 text-center">
            Completed {results.simulationCount.toLocaleString()} simulations in {results.executionTime.toFixed(2)} seconds
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Debug Logs */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h4 className="font-semibold mb-2">Simulation Log</h4>
        <div className="space-y-1 text-sm font-mono text-gray-600">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMonteCarloRunner;