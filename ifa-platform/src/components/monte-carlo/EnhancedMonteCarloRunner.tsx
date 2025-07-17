// src/components/monte-carlo/EnhancedMonteCarloRunner.tsx
// FIXED VERSION - Complete working implementation

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Info,
  Save
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
  inputParameters?: MonteCarloInput;
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

const EnhancedMonteCarloRunner: React.FC<EnhancedMonteCarloRunnerProps> = ({
  clientId,
  clientName,
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
    inflationRate: 2.5,
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
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    try {
      const worker = new Worker('/workers/monte-carlo-worker.js');
      workerRef.current = worker;
      
      worker.onmessage = (e) => {
        const messageData = e.data;
        const { type } = messageData;
        
        switch (type) {
          case 'test':
            addLog('✅ Worker initialized successfully');
            break;
            
          case 'progress':
            // Handle progress updates
            if (messageData.progress) {
              const progressData = messageData.progress;
              const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
              const estimatedTotal = progressData.progress > 0 ? 
                timeElapsed / (progressData.progress / 100) : 0;
              const estimatedTimeRemaining = Math.max(0, estimatedTotal - timeElapsed);
              
              setProgress({
                progress: progressData.progress || 0,
                completed: progressData.completed || 0,
                total: progressData.total || input.simulationCount || 0,
                timeElapsed,
                estimatedTimeRemaining
              });
            }
            break;
            
          case 'complete':
            // Handle completion
            if (messageData.results) {
              handleSimulationComplete(messageData.results);
            }
            break;
            
          case 'error':
            // Handle errors - check multiple possible locations
            const errorMessage = messageData.error || 
                               messageData.message || 
                               'Unknown error occurred';
            setError(errorMessage);
            setIsRunning(false);
            addLog(`❌ Error: ${errorMessage}`);
            
            if (progressUpdateInterval.current) {
              clearInterval(progressUpdateInterval.current);
            }
            break;
            
          case 'cancelled':
            setIsRunning(false);
            addLog('Simulation cancelled');
            
            if (progressUpdateInterval.current) {
              clearInterval(progressUpdateInterval.current);
            }
            break;
            
          case 'log':
            if (messageData.message) {
              addLog(messageData.message);
            }
            break;
            
          default:
            console.warn('Unknown message type from worker:', type, messageData);
        }
      };
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setError('Worker initialization failed');
        setIsRunning(false);
        addLog('❌ Worker initialization failed');
      };
      
      // Test worker is ready
      worker.postMessage({ type: 'test' });
      
    } catch (err) {
      console.error('Failed to create worker:', err);
      setError('Failed to initialize simulation engine');
      addLog('❌ Failed to initialize simulation engine');
    }
  }, [addLog, input.simulationCount]);

  // Handle simulation completion
  const handleSimulationComplete = async (data: MonteCarloResults) => {
    const executionTime = data.executionTime || (Date.now() - startTimeRef.current);
    const finalResults = { ...data, executionTime };
    
    setResults(finalResults);
    setIsRunning(false);
    setProgress(prev => ({ ...prev, progress: 100 }));
    
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }
    
    addLog(`✅ Simulation completed in ${(executionTime / 1000).toFixed(2)}s`);
    addLog(`Success probability: ${data.successProbability.toFixed(1)}%`);
    
    // Save results if clientId is provided
    if (clientId && scenarioName) {
      await saveResults(finalResults);
    }
    
    // Call completion callback
    if (onComplete) {
      onComplete(finalResults);
    }
    
    // Show success toast
    toast({
      title: "Simulation Complete",
      description: `Success probability: ${data.successProbability.toFixed(1)}%`,
      variant: "default"
    });
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
          input_parameters: input,
          results: results,
          success_probability: results.successProbability,
          simulation_count: results.simulationCount,
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('Error saving results:', saveError);
        toast({
          title: "Save Error",
          description: "Failed to save simulation results",
          variant: "destructive"
        });
      } else {
        addLog(`💾 Results saved: ${name}`);
        toast({
          title: "Results Saved",
          description: `Saved as: ${name}`,
          variant: "default"
        });
      }
    } catch (err) {
      console.error('Error saving results:', err);
    }
  };

  // Run simulation
  const runSimulation = useCallback(async () => {
    try {
      setError(null);
      setResults(null);
      setIsRunning(true);
      setProgress({
        progress: 0,
        completed: 0,
        total: input.simulationCount || 1000,
        timeElapsed: 0,
        estimatedTimeRemaining: 0
      });

      addLog(`🎲 Starting ${input.simulationCount} Monte Carlo simulations...`);
      startTimeRef.current = Date.now();

      // Initialize worker
      initializeWorker();

      // Wait for worker to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!workerRef.current) {
        throw new Error('Worker not initialized');
      }

      // Start progress timer
      progressUpdateInterval.current = setInterval(() => {
        if (startTimeRef.current > 0) {
          const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
          setProgress(prev => ({ ...prev, timeElapsed }));
        }
      }, 100);

      // Send simulation request to worker
      const seed = Math.floor(Math.random() * 1000000);
      workerRef.current.postMessage({
        type: 'simulate',
        data: { 
          ...input, 
          inflationRate: (input.inflationRate || 2.5) / 100, // Convert percentage to decimal
          seed 
        }
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsRunning(false);
      addLog(`❌ Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    }
  }, [input, addLog, initializeWorker]);

  // Cancel simulation
  const cancelSimulation = useCallback(() => {
    if (workerRef.current && isRunning) {
      workerRef.current.postMessage({ type: 'cancel' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }
    
    setIsRunning(false);
    addLog('Simulation cancelled by user');
  }, [isRunning, addLog]);

  // Update input values
  const updateInput = (field: keyof MonteCarloInput, value: number) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  // Calculate withdrawal rate
  const withdrawalRate = input.initialWealth > 0 
    ? (input.withdrawalAmount / input.initialWealth) * 100 
    : 0;

  // Clean up on unmount
  useEffect(() => {
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
    <div className="space-y-6">
      {/* Client Info Header */}
      {(clientId || clientName) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  Running simulation for: {clientName || 'Client'}
                </p>
                <p className="text-sm text-blue-700">
                  The inputs have been pre-populated based on the client's financial profile
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Initial Wealth (£)
              </label>
              <Input
                type="number"
                value={input.initialWealth}
                onChange={(e) => updateInput('initialWealth', parseFloat(e.target.value) || 0)}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Time Horizon (years)
              </label>
              <Input
                type="number"
                value={input.timeHorizon}
                onChange={(e) => updateInput('timeHorizon', parseInt(e.target.value) || 0)}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Annual Withdrawal (£)
              </label>
              <Input
                type="number"
                value={input.withdrawalAmount}
                onChange={(e) => updateInput('withdrawalAmount', parseFloat(e.target.value) || 0)}
                disabled={isRunning}
              />
              <p className="text-xs text-gray-500 mt-1">
                Withdrawal Rate: {withdrawalRate.toFixed(2)}%
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Risk Score (1-10)
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={input.riskScore}
                onChange={(e) => updateInput('riskScore', parseInt(e.target.value) || 5)}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Inflation Rate (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={input.inflationRate}
                onChange={(e) => updateInput('inflationRate', parseFloat(e.target.value) || 0)}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Simulations
              </label>
              <Input
                type="number"
                min="100"
                max="100000"
                step="100"
                value={input.simulationCount}
                onChange={(e) => updateInput('simulationCount', parseInt(e.target.value) || 1000)}
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Scenario Name for Saving */}
          {clientId && (
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium mb-2">
                Scenario Name (optional)
              </label>
              <Input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Conservative Retirement Plan"
                disabled={isRunning}
              />
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button
              onClick={runSimulation}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </Button>
            
            {isRunning && (
              <Button
                onClick={cancelSimulation}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {(isRunning || progress.progress > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progress.progress} className="h-2" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Progress</p>
                  <p className="font-medium">{progress.progress.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Completed</p>
                  <p className="font-medium">
                    {progress.completed.toLocaleString()} / {progress.total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Time Elapsed</p>
                  <p className="font-medium">{progress.timeElapsed.toFixed(1)}s</p>
                </div>
                <div>
                  <p className="text-gray-500">Est. Remaining</p>
                  <p className="font-medium">{progress.estimatedTimeRemaining.toFixed(1)}s</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Error</p>
            </div>
            <p className="text-sm text-red-700 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Simulation Results</span>
              {results.successProbability >= 75 ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  High Success Rate
                </Badge>
              ) : results.successProbability >= 50 ? (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Moderate Success Rate
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Low Success Rate
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Success Probability</p>
                <p className="text-2xl font-bold text-blue-900">{results.successProbability}%</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Median Final Wealth</p>
                <p className="text-2xl font-bold text-green-900">
                  £{results.medianFinalWealth.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700 font-medium">Average Final Wealth</p>
                <p className="text-2xl font-bold text-purple-900">
                  £{results.averageFinalWealth.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700 font-medium">Shortfall Risk</p>
                <p className="text-2xl font-bold text-red-900">{results.shortfallRisk}%</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-700 font-medium">Max Drawdown</p>
                <p className="text-2xl font-bold text-orange-900">{results.maxDrawdown}%</p>
              </div>
              
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700 font-medium">Volatility</p>
                <p className="text-2xl font-bold text-indigo-900">{results.volatility}%</p>
              </div>
            </div>
            
            {/* Confidence Intervals */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Confidence Intervals</h4>
              <div className="space-y-2">
                {Object.entries(results.confidenceIntervals).map(([percentile, value]) => (
                  <div key={percentile} className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">
                      {percentile.replace('p', '')}th Percentile
                    </span>
                    <span className="font-medium">
                      £{value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Execution Time */}
            {results.executionTime && (
              <div className="mt-4 text-sm text-gray-500">
                Simulation completed in {(results.executionTime / 1000).toFixed(2)} seconds
                ({results.simulationCount.toLocaleString()} simulations)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Logs */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm">Simulation Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-xs font-mono text-gray-600">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedMonteCarloRunner;