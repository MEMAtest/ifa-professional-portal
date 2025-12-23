// ================================================================
// PHASE 1 FUNCTIONAL TEST COMPONENT
// Tests ReportAdapter with your real data in the browser
// ================================================================

'use client';

import { useState } from 'react';
import { ReportAdapter } from '@/services/ReportAdapter';
import type { UnifiedReportRequest, UnifiedReportResult } from '@/types/reporting.types';

// Your real test data
const TEST_CONFIG = {
  REAL_SCENARIO_ID: '442e2c18-596d-4847-9b20-f1802d9d0079', // D E Ath - Base Case
  REAL_CLIENT_ID: '05b8095d-caa1-4bca-a4f0-c2cf2bf98f9c', // CLI465526
  ATR_CLIENT_ID: '2e68b4b0-357a-4a80-b519-95f184f5e263', // Client with ATR assessment
};

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  result?: UnifiedReportResult;
  error?: string;
}

export function Phase1TestComponent() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTest = async (
    testName: string,
    request: UnifiedReportRequest
  ): Promise<TestResult> => {
    setCurrentTest(testName);
    const startTime = Date.now();

    try {
      const adapter = new ReportAdapter();
      const result = await adapter.generateReport(request);
      const duration = Date.now() - startTime;

      return {
        testName,
        success: result.success,
        duration,
        result,
        error: result.error
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setCurrentTest('');

    const tests = [
      {
        name: '1. Basic Cash Flow Report',
        request: {
          type: 'cashflow' as const,
          dataId: TEST_CONFIG.REAL_SCENARIO_ID,
          templateType: 'cashflow' as const,
          options: {
            includeCharts: true,
            includeAssumptions: true,
            reportPeriodYears: 20
          }
        }
      },
      {
        name: '2. Enhanced Cash Flow Report',
        request: {
          type: 'enhanced-cashflow' as const,
          dataId: TEST_CONFIG.REAL_SCENARIO_ID,
          templateType: 'cashflow' as const,
          options: {
            outputFormat: 'pdf' as const,
            includeCharts: true,
            chartTypes: ['portfolio', 'income_expense'] as ('portfolio' | 'income_expense' | 'asset_allocation' | 'risk_analysis')[]
          }
        }
      },
      {
        name: '3. ATR Assessment Report',
        request: {
          type: 'atr' as const,
          dataId: TEST_CONFIG.ATR_CLIENT_ID,
          options: {
            includeCharts: true,
            outputFormat: 'pdf' as const
          }
        }
      },
      {
        name: '4. Error Handling Test',
        request: {
          type: 'cashflow' as const,
          dataId: 'invalid-scenario-id',
          options: {}
        }
      },
      {
        name: '5. Unsupported Report Type',
        request: {
          type: 'assessment' as const,
          dataId: TEST_CONFIG.REAL_SCENARIO_ID
        }
      }
    ];

    for (const test of tests) {
      const result = await runTest(test.name, test.request);
      addResult(result);
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  const getTestIcon = (result: TestResult) => {
    if (result.testName.includes('Error Handling') || result.testName.includes('Unsupported')) {
      // These tests should fail - success means they handled errors correctly
      return result.success === false ? '✅' : '⚠️';
    }
    return result.success ? '✅' : '❌';
  };

  const getTestStatus = (result: TestResult) => {
    if (result.testName.includes('Error Handling') || result.testName.includes('Unsupported')) {
      return result.success === false ? 'PASS (Error handled correctly)' : 'UNEXPECTED SUCCESS';
    }
    return result.success ? 'PASS' : 'FAIL';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🎯 PHASE 1 & 2: Unified Report Integration Test
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Test Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Scenario ID:</strong> {TEST_CONFIG.REAL_SCENARIO_ID}
              <br />
              <span className="text-blue-600">D E Ath - Base Case</span>
            </div>
            <div>
              <strong>Client ID:</strong> {TEST_CONFIG.REAL_CLIENT_ID}
              <br />
              <span className="text-blue-600">CLI465526</span>
            </div>
            <div>
              <strong>ATR Client ID:</strong> {TEST_CONFIG.ATR_CLIENT_ID}
              <br />
              <span className="text-blue-600">Client with ATR Assessment</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isRunning
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Running Tests...' : 'Run Phase 1 Tests'}
          </button>
        </div>

        {currentTest && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <span className="text-yellow-800">Currently running: {currentTest}</span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>

            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  getTestIcon(result) === '✅'
                    ? 'border-green-200 bg-green-50'
                    : getTestIcon(result) === '⚠️'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {getTestIcon(result)} {result.testName}
                  </h3>
                  <span className="text-sm text-gray-600">
                    {result.duration}ms
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <div>
                    <strong>Status:</strong> {getTestStatus(result)}
                  </div>

                  {result.result && (
                    <div>
                      <strong>Service:</strong> {result.result.metadata?.service || 'Unknown'}
                    </div>
                  )}

                  {result.result?.downloadUrl && (
                    <div>
                      <strong>Download URL:</strong>{' '}
                      <a
                        href={result.result.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Report
                      </a>
                    </div>
                  )}

                  {result.error && (
                    <div className="text-red-600">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>

                {result.result && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      View Full Result
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Phase 1 & 2 Completion Criteria</h3>
              <div className="space-y-1 text-sm">
                <div>✅ Infrastructure validation: COMPLETE</div>
                <div>
                  {results.filter(r =>
                    (r.testName.includes('Cash Flow') && r.success) ||
                    (r.testName.includes('ATR') && r.success) ||
                    (r.testName.includes('Error') && !r.success) ||
                    (r.testName.includes('Unsupported') && !r.success)
                  ).length >= 5 ? '✅' : '⏳'} Functional tests: {results.length > 0 ? 'TESTING' : 'PENDING'}
                </div>
                <div>
                  {results.length >= 5 ? '✅' : '⏳'} All test scenarios: {results.length >= 5 ? 'COMPLETE' : 'PENDING'}
                </div>
              </div>

              {results.length >= 5 && results.filter(r =>
                (r.testName.includes('Cash Flow') && r.success) ||
                (r.testName.includes('ATR') && r.success) ||
                (r.testName.includes('Error') && !r.success) ||
                (r.testName.includes('Unsupported') && !r.success)
              ).length >= 5 && (
                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded">
                  <div className="text-green-800 font-semibold">
                    🎉 PHASE 1 & 2: COMPLETE!
                  </div>
                  <div className="text-green-700 text-sm mt-1">
                    Cash flow and ATR integration validated. Ready for Phase 3: CFL Report Service.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}