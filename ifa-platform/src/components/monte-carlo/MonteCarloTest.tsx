'use client';

import { useState } from 'react';

export function MonteCarloTest() {
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/monte-carlo/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_id: 'test-123',
          simulation_count: 1000,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || 'Simulation failed');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">🎲 Monte Carlo Test</h2>
        <p className="text-gray-600 text-sm mt-1">
          Test the Monte Carlo simulation engine
        </p>
      </div>
      
      <div className="space-y-4">
        <button 
          onClick={runSimulation} 
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '🎲 Running Simulation...' : '🚀 Run Monte Carlo Test'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-800 font-bold text-lg mb-3">
                ✅ Simulation Complete!
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.success_probability}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    £{(results.median_final_wealth / 1000).toFixed(0)}k
                  </div>
                  <div className="text-sm text-gray-600">Median Wealth</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Execution time: {results.simulation_duration_ms}ms
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer font-medium">📊 Full Results</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}