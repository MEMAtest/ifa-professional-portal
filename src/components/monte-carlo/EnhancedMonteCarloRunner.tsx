// src/components/monte-carlo/EnhancedMonteCarloRunner.tsx
// Professional Monte Carlo component with Web Worker support

'use client';

import React, { useState, useRef, useCallback } from 'react';

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

const EnhancedMonteCarloRunner: React.FC = () => {
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

  // Form inputs
  const [input, setInput] = useState<MonteCarloInput>({
    initialWealth: 500000,
    timeHorizon: 30,
    withdrawalAmount: 25000,
    riskScore: 5,
    inflationRate: 0.025,
    simulationCount: 5000
  });

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
    }

    workerRef.current = new Worker('/workers/monte-carlo-worker.js');
    
    workerRef.current.onmessage = (e) => {
      const { type, results: workerResults, progress: workerProgress, error: workerError } = e.data;
      
      switch (type) {
        case 'progress':
          if (workerProgress && typeof workerProgress.progress === 'number') {
            const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
            const estimatedTotal = timeElapsed / (workerProgress.progress / 100);
            const estimatedTimeRemaining = Math.max(0, estimatedTotal - timeElapsed);
            
            setProgress({
              progress: workerProgress.progress || 0,
              completed: workerProgress.completed || 0,
              total: workerProgress.total || 0,
              timeElapsed,
              estimatedTimeRemaining
            });
          }
          break;
          
        case 'complete':
          setIsRunning(false);
          setResults(workerResults);
          setProgress(prev => ({ ...prev, progress: 100 }));
          addLog(`Simulation completed: ${workerResults.simulationCount} runs in ${(workerResults.executionTime / 1000).toFixed(1)}s`);
          
          if (progressUpdateInterval.current) {
            clearInterval(progressUpdateInterval.current);
          }
          break;
          
        case 'error':
          setIsRunning(false);
          setError(workerError);
          addLog(`Error: ${workerError}`);
          
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
      }
    };

    workerRef.current.onerror = (error) => {
      setError(`Worker error: ${error.message}`);
      setIsRunning(false);
      addLog(`Worker error: ${error.message}`);
    };
  }, [addLog]);

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

      addLog(`Starting ${input.simulationCount} Monte Carlo simulations...`);
      startTimeRef.current = Date.now();

      // Initialize worker
      initializeWorker();

      // Start progress timer
      progressUpdateInterval.current = setInterval(() => {
        if (startTimeRef.current > 0) {
          const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
          setProgress(prev => ({ ...prev, timeElapsed }));
        }
      }, 100);

      // Send simulation request to worker
      const seed = Math.floor(Math.random() * 1000000);
      workerRef.current?.postMessage({
        type: 'simulate',
        data: { ...input, seed }
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsRunning(false);
      addLog(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Info Icon Component
  const InfoIcon: React.FC<{ tooltip: string }> = ({ tooltip }) => (
    <span className="info-icon">
      ?
      <div className="tooltip">{tooltip}</div>
    </span>
  );

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
    <div className="enhanced-monte-carlo-runner" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`
        .enhanced-monte-carlo-runner {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .input-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
        }
        .input-group label {
          font-weight: 500;
          margin-bottom: 5px;
          color: #374151;
        }
        .input-group input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }
        .input-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .control-panel {
          display: flex;
          gap: 15px;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .btn-danger {
          background: #dc2626;
          color: white;
        }
        .btn-danger:hover:not(:disabled) {
          background: #b91c1c;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .progress-container {
          margin-bottom: 20px;
        }
        .progress-bar-container {
          background: #e5e7eb;
          border-radius: 8px;
          height: 20px;
          overflow: hidden;
          position: relative;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          transition: width 0.3s ease;
          position: relative;
        }
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 500;
          font-size: 12px;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .progress-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 10px;
          font-size: 14px;
          color: #6b7280;
        }
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .result-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .result-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .result-label {
          font-size: 14px;
          color: #6b7280;
        }
        .success-probability { color: #059669; }
        .median-wealth { color: #2563eb; }
        .shortfall-risk { color: #dc2626; }
        .confidence-table {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .confidence-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .confidence-table th,
        .confidence-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .confidence-table th {
          background: #f9fafb;
          font-weight: 600;
        }
        .logs-container {
          background: #1f2937;
          color: #f3f4f6;
          border-radius: 8px;
          padding: 15px;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          height: 150px;
          overflow-y: auto;
        }
        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          font-size: 10px;
          font-weight: bold;
          margin-left: 5px;
          cursor: help;
          position: relative;
        }
        .info-icon:hover {
          background: #2563eb;
        }
        .tooltip {
          position: absolute;
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 12px;
          max-width: 280px;
          white-space: normal;
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          line-height: 1.4;
        }
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #1f2937;
        }
        .info-icon:hover .tooltip {
          opacity: 1;
        }
        .label-with-info {
          display: flex;
          align-items: center;
        }
      `}</style>

      <h1>🎯 Professional Monte Carlo Engine</h1>
      <p style={{ color: '#6b7280', marginBottom: '30px' }}>
        Enterprise-grade probability analysis with Web Workers - No UI freezing, unlimited simulations
      </p>

      {/* Input Parameters */}
      <div className="input-grid">
        <div className="input-group">
          <div className="label-with-info">
            <label>Initial Wealth</label>
            <InfoIcon tooltip="Starting amount of money to invest. This is your total savings/pension pot at the beginning." />
          </div>
          <input
            type="number"
            value={input.initialWealth}
            onChange={(e) => updateInput('initialWealth', Number(e.target.value))}
            disabled={isRunning}
          />
        </div>
        <div className="input-group">
          <div className="label-with-info">
            <label>Time Horizon (years)</label>
            <InfoIcon tooltip="How long you need the money to last. Typically retirement period (20-40 years) or until a specific age." />
          </div>
          <input
            type="number"
            value={input.timeHorizon}
            onChange={(e) => updateInput('timeHorizon', Number(e.target.value))}
            disabled={isRunning}
          />
        </div>
        <div className="input-group">
          <div className="label-with-info">
            <label>Annual Withdrawal</label>
            <InfoIcon tooltip="Amount withdrawn each year for living expenses. Industry rule of thumb: 3-4% of starting wealth is considered sustainable." />
          </div>
          <input
            type="number"
            value={input.withdrawalAmount}
            onChange={(e) => updateInput('withdrawalAmount', Number(e.target.value))}
            disabled={isRunning}
          />
        </div>
        <div className="input-group">
          <div className="label-with-info">
            <label>Risk Score (1-10)</label>
            <InfoIcon tooltip="Investment risk tolerance: 1-3 = Conservative (more bonds), 4-6 = Moderate (balanced), 7-10 = Aggressive (more stocks). Higher risk = higher potential returns but more volatility." />
          </div>
          <input
            type="number"
            min="1"
            max="10"
            value={input.riskScore}
            onChange={(e) => updateInput('riskScore', Number(e.target.value))}
            disabled={isRunning}
          />
        </div>
        <div className="input-group">
          <div className="label-with-info">
            <label>Inflation Rate (%)</label>
            <InfoIcon tooltip="Expected annual inflation rate. Withdrawals increase each year by this amount to maintain purchasing power. UK average: 2-3%." />
          </div>
          <input
            type="number"
            step="0.1"
            value={(input.inflationRate || 0.025) * 100}
            onChange={(e) => updateInput('inflationRate', Number(e.target.value) / 100)}
            disabled={isRunning}
          />
        </div>
        <div className="input-group">
          <div className="label-with-info">
            <label>Simulation Count</label>
            <InfoIcon tooltip="Number of different market scenarios to test. More simulations = more accurate results. 1,000+ recommended for reliable analysis." />
          </div>
          <input
            type="number"
            value={input.simulationCount}
            onChange={(e) => updateInput('simulationCount', Number(e.target.value))}
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="control-panel">
        <button
          className="btn btn-primary"
          onClick={runSimulation}
          disabled={isRunning}
        >
          🚀 Run Monte Carlo Analysis
        </button>
        
        {isRunning && (
          <button
            className="btn btn-danger"
            onClick={cancelSimulation}
          >
            ✋ Cancel Simulation
          </button>
        )}
        
        <span style={{ color: '#6b7280' }}>
          {isRunning ? 'Running...' : 'Ready'}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            Withdrawal Rate: <strong>{withdrawalRate}%</strong>
          </span>
          <span 
            style={{ 
              fontSize: '12px', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              background: rateAssessment.color + '20',
              color: rateAssessment.color,
              fontWeight: '500'
            }}
          >
            {rateAssessment.text}
          </span>
          <InfoIcon tooltip="Annual withdrawal as % of starting wealth. Industry guidelines: 2% = Very Safe, 3% = Safe, 4% = Standard, 5%+ = Risky" />
        </div>
      </div>

      {/* Validation Warning */}
      {parseFloat(withdrawalRate) > 10 && (
        <div className="error">
          <strong>⚠️ Unsustainable Withdrawal Rate:</strong> You're withdrawing {withdrawalRate}% per year. 
          Even with perfect 10% annual returns, this would deplete your funds. 
          Consider reducing your annual withdrawal or increasing your initial wealth.
          <br /><br />
          <strong>Industry Guidelines:</strong> 2-4% withdrawal rates are considered sustainable long-term.
        </div>
      )}

      {/* Progress */}
      {(isRunning || (progress && progress.progress > 0)) && (
        <div className="progress-container">
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progress.progress || 0}%` }}
            >
              <div className="progress-text">
                {(progress.progress || 0).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="progress-stats">
            <div>Completed: {(progress.completed || 0).toLocaleString()} / {(progress.total || 0).toLocaleString()}</div>
            <div>Time Elapsed: {formatTime(progress.timeElapsed || 0)}</div>
            <div>Estimated Remaining: {formatTime(progress.estimatedTimeRemaining || 0)}</div>
            <div>Rate: {Math.round((progress.completed || 1) / Math.max(progress.timeElapsed || 0.1, 0.1)).toLocaleString()} sims/sec</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <div className="results-grid">
            <div className="result-card">
              <div className="result-value success-probability">
                {results.successProbability.toFixed(1)}%
              </div>
              <div className="result-label">Success Probability</div>
              <InfoIcon tooltip="Percentage of scenarios where money lasted the full time period. 70%+ is generally considered good, 80%+ is excellent." />
            </div>
            <div className="result-card">
              <div className="result-value median-wealth">
                {formatCurrency(results.medianFinalWealth)}
              </div>
              <div className="result-label">Median Final Wealth</div>
              <InfoIcon tooltip="Most likely amount of money remaining at the end. Half of scenarios end with more, half with less than this amount." />
            </div>
            <div className="result-card">
              <div className="result-value shortfall-risk">
                {results.shortfallRisk.toFixed(1)}%
              </div>
              <div className="result-label">Shortfall Risk</div>
              <InfoIcon tooltip="Percentage of scenarios where money runs out before the end. Lower is better. Industry considers 20%+ risk as high." />
            </div>
            <div className="result-card">
              <div className="result-value">
                {results.maxDrawdown.toFixed(1)}%
              </div>
              <div className="result-label">Maximum Drawdown</div>
              <InfoIcon tooltip="Largest temporary decline from peak value. Shows worst-case portfolio drop you might experience during market downturns." />
            </div>
          </div>

          <div className="confidence-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <div className="label-with-info">
                      Confidence Level
                      <InfoIcon tooltip="Statistical ranges showing possible outcomes. 10th percentile = worst 10% of scenarios, 90th percentile = best 10% of scenarios." />
                    </div>
                  </th>
                  <th>Final Wealth</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10th Percentile (Worst 10%)</td>
                  <td>{formatCurrency(results.confidenceIntervals.p10)}</td>
                  <td>Pessimistic scenario</td>
                </tr>
                <tr>
                  <td>25th Percentile</td>
                  <td>{formatCurrency(results.confidenceIntervals.p25)}</td>
                  <td>Below average outcome</td>
                </tr>
                <tr>
                  <td>50th Percentile (Median)</td>
                  <td>{formatCurrency(results.confidenceIntervals.p50)}</td>
                  <td>Most likely outcome</td>
                </tr>
                <tr>
                  <td>75th Percentile</td>
                  <td>{formatCurrency(results.confidenceIntervals.p75)}</td>
                  <td>Above average outcome</td>
                </tr>
                <tr>
                  <td>90th Percentile (Best 10%)</td>
                  <td>{formatCurrency(results.confidenceIntervals.p90)}</td>
                  <td>Optimistic scenario</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
            Analysis completed with {results.simulationCount.toLocaleString()} simulations 
            in {formatTime(results.executionTime / 1000)}
          </p>
        </>
      )}

      {/* Logs */}
      <div>
        <h3>System Logs</h3>
        <div className="logs-container">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMonteCarloRunner;