// ================================================================
// ATR TEST COMPONENT - PHASE 2 FOCUSED TESTING
// Tests only ATR report generation with detailed logging
// ================================================================

'use client';

import { useState } from 'react';
import { ReportAdapter } from '@/services/ReportAdapter';
import { ATRReportService } from '@/services/ATRReportService';
import type { UnifiedReportRequest, UnifiedReportResult } from '@/types/reporting.types';

const TEST_CONFIG = {
  REAL_CLIENT_ID: '2e68b4b0-357a-4a80-b519-95f184f5e263', // Client with ATR assessment
};

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  result?: UnifiedReportResult;
  error?: string;
}

export function ATRTestComponent() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runATRTest = async (
    testName: string,
    useAdapter: boolean = true
  ): Promise<TestResult> => {
    setCurrentTest(testName);
    const startTime = Date.now();

    try {
      console.log(`🚀 Running ${testName}...`);

      const request: UnifiedReportRequest = {
        type: 'atr',
        dataId: TEST_CONFIG.REAL_CLIENT_ID,
        options: {
          includeCharts: true,
          outputFormat: 'pdf'
        }
      };

      let result: UnifiedReportResult;

      if (useAdapter) {
        console.log('📋 Using ReportAdapter...');
        const adapter = new ReportAdapter();
        result = await adapter.generateReport(request);
      } else {
        console.log('📋 Using ATRReportService directly...');
        const atrService = new ATRReportService();
        result = await atrService.generateReport(request);
      }

      const duration = Date.now() - startTime;

      console.log(`✅ ${testName} completed in ${duration}ms`);
      console.log('Result:', {
        success: result.success,
        hasContent: !!result.reportContent,
        hasDownload: !!result.downloadUrl,
        metadata: result.metadata
      });

      return {
        testName,
        success: result.success,
        duration,
        result,
        error: result.error
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${testName} failed:`, error);

      return {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runAllATRTests = async () => {
    setIsRunning(true);
    setResults([]);
    setCurrentTest('');

    console.log('🎯 Starting Phase 2 ATR Tests...');

    // Test 1: Direct ATRReportService
    const directResult = await runATRTest('Direct ATRReportService', false);
    addResult(directResult);

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Via ReportAdapter
    const adapterResult = await runATRTest('Via ReportAdapter', true);
    addResult(adapterResult);

    setCurrentTest('');
    setIsRunning(false);

    console.log('🏁 Phase 2 ATR Tests completed');
  };

  const getTestIcon = (result: TestResult) => {
    return result.success ? '✅' : '❌';
  };

  const getTestStatus = (result: TestResult) => {
    return result.success ? 'PASS' : 'FAIL';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🎯 PHASE 2: ATR Report Generation Test
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Test Configuration</h2>
          <div className="text-sm">
            <div><strong>Client ID:</strong> {TEST_CONFIG.REAL_CLIENT_ID}</div>
            <div><strong>Client:</strong> CLI465526</div>
            <div><strong>Report Type:</strong> ATR Assessment</div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={runAllATRTests}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isRunning
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Running ATR Tests...' : 'Run Phase 2 ATR Tests'}
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
                  result.success
                    ? 'border-green-200 bg-green-50'
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

                  {result.result?.metadata && (
                    <>
                      <div>
                        <strong>Service:</strong> {result.result.metadata.service || 'Unknown'}
                      </div>
                      {result.result.metadata.riskLevel && (
                        <div>
                          <strong>Risk Level:</strong> {result.result.metadata.riskLevel}/10
                        </div>
                      )}
                      {result.result.metadata.riskCategory && (
                        <div>
                          <strong>Risk Category:</strong> {result.result.metadata.riskCategory}
                        </div>
                      )}
                    </>
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
                        View ATR Report
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
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-40">
                      {JSON.stringify({
                        success: result.result.success,
                        hasContent: !!result.result.reportContent,
                        contentLength: result.result.reportContent?.length,
                        hasDownloadUrl: !!result.result.downloadUrl,
                        metadata: result.result.metadata
                      }, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Phase 2 ATR Completion Status</h3>
              <div className="space-y-1 text-sm">
                <div>
                  {results.filter(r => r.success).length >= 2 ? '✅' : '⏳'} ATR service tests:
                  {results.length > 0 ? ` ${results.filter(r => r.success).length}/${results.length} PASSED` : ' PENDING'}
                </div>
                <div>
                  {results.some(r => r.result?.downloadUrl) ? '✅' : '⏳'} Report generation:
                  {results.some(r => r.result?.downloadUrl) ? 'WORKING' : 'PENDING'}
                </div>
              </div>

              {results.length >= 2 && results.filter(r => r.success).length >= 2 && (
                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded">
                  <div className="text-green-800 font-semibold">
                    🎉 PHASE 2 ATR: COMPLETE!
                  </div>
                  <div className="text-green-700 text-sm mt-1">
                    ATR report generation validated. Both direct service and adapter working correctly.
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