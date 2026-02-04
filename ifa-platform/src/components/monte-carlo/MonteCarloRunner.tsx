'use client';

import { useState } from 'react';
import clientLogger from '@/lib/logging/clientLogger'

interface MonteCarloRunnerProps {
  scenarioId: string;  // Required - must be a valid scenario ID from the database
  simulationCount?: number;
}

export function MonteCarloRunner({
  scenarioId,
  simulationCount = 5000
}: MonteCarloRunnerProps) {
  // All hooks must be called unconditionally before any early returns
  const [results, setResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Validate scenarioId is provided (after hooks)
  if (!scenarioId) {
    clientLogger.error('MonteCarloRunner: scenarioId is required');
    return null;
  }

  const runSimulation = async () => {
    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults(null);
    setStatusMessage('Initializing simulation...');

    try {
      await runWithFetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const runWithWebWorker = async () => {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/monte-carlo-worker.js');
      const batchSize = 1000;
      const totalBatches = Math.ceil(simulationCount / batchSize);
      let completedBatches = 0;
      const allResults: any[] = [];

      setStatusMessage('Running simulation with Web Workers...');

      worker.onmessage = (e) => {
        const { type, batchId, results: batchResults, progress: batchProgress } = e.data;

        if (type === 'BATCH_PROGRESS') {
          const overallProgress = ((completedBatches / totalBatches) + (batchProgress / 100 / totalBatches)) * 100;
          setProgress(overallProgress);
        } else if (type === 'BATCH_COMPLETE') {
          allResults.push(...batchResults);
          completedBatches++;
          const overallProgress = (completedBatches / totalBatches) * 100;
          setProgress(overallProgress);

          if (completedBatches === totalBatches) {
            // Analyze results
            const analysisResults = analyzeResults(allResults);
            setResults(analysisResults);
            worker.terminate();
            resolve(analysisResults);
          }
        } else if (type === 'BATCH_ERROR') {
          worker.terminate();
          reject(new Error(e.data.error));
        }
      };

      // Send batches to worker
      for (let i = 0; i < totalBatches; i++) {
        const batchStart = i * batchSize;
        const currentBatchSize = Math.min(batchSize, simulationCount - batchStart);
        
        worker.postMessage({
          type: 'RUN_SIMULATION_BATCH',
          payload: {
            scenario: {
              projection_years: 30,
              real_equity_return: 5.0,
              real_bond_return: 2.0
            },
            batchStart,
            batchSize: currentBatchSize,
            batchId: `batch_${i}`
          }
        });
      }
    });
  };

  const runWithFetch = async () => {
    setStatusMessage('Running simulation on main thread...');
    
    const response = await fetch('/api/monte-carlo/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_id: scenarioId,
        simulation_count: simulationCount
      })
    });

    const data = await response.json();
    
    if (data.success) {
      setResults(data.data);
      setProgress(100);
    } else {
      throw new Error(data.error);
    }
  };

  const analyzeResults = (simResults: any[]) => {
    const finalWealths = simResults.map(r => r.final_wealth).sort((a, b) => a - b);
    const successfulRuns = simResults.filter(r => r.success_achieved).length;
    const successProbability = (successfulRuns / simResults.length) * 100;
    
    return {
      success_probability: Math.round(successProbability * 10) / 10,
      median_final_wealth: finalWealths[Math.floor(finalWealths.length / 2)],
      confidence_intervals: {
        p10: finalWealths[Math.floor(finalWealths.length * 0.1)],
        p25: finalWealths[Math.floor(finalWealths.length * 0.25)],
        p50: finalWealths[Math.floor(finalWealths.length * 0.5)],
        p75: finalWealths[Math.floor(finalWealths.length * 0.75)],
        p90: finalWealths[Math.floor(finalWealths.length * 0.9)]
      },
      shortfall_risk: Math.round((100 - successProbability) * 10) / 10,
      simulation_count: simResults.length
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🎲 Monte Carlo Analysis</h2>
        <p className="text-gray-600">
          Professional probability-based cash flow modeling
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Simulations: <span className="font-medium">{simulationCount.toLocaleString()}</span>
          </div>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? '🎲 Running Analysis...' : '🚀 Run Monte Carlo Analysis'}
          </button>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{statusMessage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-medium">Error:</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {results.success_probability}%
              </div>
              <div className="text-sm text-green-800">Success Probability</div>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                £{(results.median_final_wealth / 1000).toFixed(0)}k
              </div>
              <div className="text-sm text-blue-800">Median Final Wealth</div>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {results.shortfall_risk}%
              </div>
              <div className="text-sm text-orange-800">Shortfall Risk</div>
            </div>
          </div>

          {/* Confidence Intervals */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-bold text-lg mb-3">Confidence Intervals</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">10th Percentile (Worst 10%)</span>
                <span className="font-medium">£{(results.confidence_intervals.p10 / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">25th Percentile</span>
                <span className="font-medium">£{(results.confidence_intervals.p25 / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">50th Percentile (Median)</span>
                <span className="font-medium">£{(results.confidence_intervals.p50 / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">75th Percentile</span>
                <span className="font-medium">£{(results.confidence_intervals.p75 / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">90th Percentile (Best 10%)</span>
                <span className="font-medium">£{(results.confidence_intervals.p90 / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Analysis completed with {results.simulation_count?.toLocaleString()} simulations
          </div>
        </div>
      )}
    </div>
  );
}
