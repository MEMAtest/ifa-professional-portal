// src/components/monte-carlo/MonteCarloWorkerTest.tsx
// Simple test component to verify worker functionality

'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function MonteCarloWorkerTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const workerRef = useRef<Worker | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const initializeWorker = () => {
    try {
      addLog('Creating worker...');
      const worker = new Worker('/workers/monte-carlo-worker.js');
      
      worker.onmessage = (e) => {
        addLog(`Worker message received: ${e.data.type}`);
        console.log('Full worker response:', e.data);
        
        if (e.data.type === 'test') {
          setIsWorkerReady(true);
          addLog('Worker is ready!');
        } else if (e.data.type === 'progress') {
          addLog(`Progress: ${e.data.progress.completed}/${e.data.progress.total} (${e.data.progress.progress}%)`);
        } else if (e.data.type === 'complete') {
          addLog('Simulation complete!');
          setTestResults(e.data.results);
        } else if (e.data.type === 'error') {
          addLog(`ERROR: ${e.data.error}`);
          console.error('Worker error:', e.data);
        }
      };
      
      worker.onerror = (error) => {
        addLog(`Worker error: ${error.message}`);
        console.error('Worker error event:', error);
      };
      
      workerRef.current = worker;
      addLog('Worker created, sending test message...');
      
      // Test worker
      worker.postMessage({ type: 'test' });
      
    } catch (err) {
      addLog(`Failed to create worker: ${err}`);
      console.error('Worker creation error:', err);
    }
  };

  const runSimpleTest = () => {
    if (!workerRef.current || !isWorkerReady) {
      addLog('Worker not ready!');
      return;
    }

    addLog('Starting simple simulation test...');
    setTestResults(null);
    
    const testData = {
      initialWealth: 100000,
      timeHorizon: 10,
      withdrawalAmount: 5000,
      riskScore: 5,
      inflationRate: 2.5,
      simulationCount: 100, // Small number for quick test
      seed: 12345
    };
    
    addLog(`Test parameters: ${JSON.stringify(testData)}`);
    
    try {
      workerRef.current.postMessage({
        type: 'simulate',
        data: testData
      });
      addLog('Message sent to worker');
    } catch (err) {
      addLog(`Failed to send message: ${err}`);
    }
  };

  const terminateWorker = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsWorkerReady(false);
      addLog('Worker terminated');
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Monte Carlo Worker Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={initializeWorker}
            disabled={isWorkerReady}
          >
            Initialize Worker
          </Button>
          
          <Button 
            onClick={runSimpleTest}
            disabled={!isWorkerReady}
            variant="default"
          >
            Run Test Simulation
          </Button>
          
          <Button 
            onClick={terminateWorker}
            disabled={!workerRef.current}
            variant="destructive"
          >
            Terminate Worker
          </Button>
          
          <Button 
            onClick={() => setLogs([])}
            variant="outline"
          >
            Clear Logs
          </Button>
        </div>

        {/* Status */}
        <div className="p-4 bg-gray-50 rounded">
          <p className="font-semibold">Status:</p>
          <p>Worker Ready: {isWorkerReady ? '✅ Yes' : '❌ No'}</p>
          <p>Worker Exists: {workerRef.current ? '✅ Yes' : '❌ No'}</p>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="font-semibold mb-2">Test Results:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Success Rate: {testResults.successProbability}%</div>
              <div>Avg Final Wealth: £{testResults.averageFinalWealth?.toLocaleString()}</div>
              <div>Median Wealth: £{testResults.medianFinalWealth?.toLocaleString()}</div>
              <div>Volatility: {testResults.volatility}%</div>
              <div>Shortfall Risk: {testResults.shortfallRisk}%</div>
              <div>Max Drawdown: {testResults.maxDrawdown}%</div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="border rounded p-4 bg-gray-900 text-gray-100">
          <p className="font-semibold mb-2">Logs:</p>
          <div className="h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click "Initialize Worker" to start.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="py-0.5">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded">
          <p className="font-semibold mb-1">Test Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Initialize Worker" - should show "Worker is ready!"</li>
            <li>Click "Run Test Simulation" - should show progress updates</li>
            <li>Check results appear in green box</li>
            <li>Check browser console for detailed logs</li>
          </ol>
          <p className="mt-2 font-semibold">If it doesn't work:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check browser console for errors</li>
            <li>Verify file exists at /public/workers/monte-carlo-worker.js</li>
            <li>Try the fixed worker code provided</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Add this to a test page to use it:
// src/app/test-worker/page.tsx
/*
import MonteCarloWorkerTest from '@/components/monte-carlo/MonteCarloWorkerTest';

export default function TestWorkerPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Monte Carlo Worker Test</h1>
      <MonteCarloWorkerTest />
    </div>
  );
}
*/