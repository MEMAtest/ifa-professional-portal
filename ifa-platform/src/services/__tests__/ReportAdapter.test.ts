// ================================================================
// src/services/__tests__/ReportAdapter.test.ts
// SAFE TESTING - Verifies adapter works with existing services
// ================================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { UnifiedReportRequest } from '@/types/reporting.types';

// ================================================================
// TESTS
// ================================================================

describe('ReportAdapter', () => {
  let ReportAdapter: typeof import('../ReportAdapter').ReportAdapter;
  let generateCashFlowReport: typeof import('../ReportAdapter').generateCashFlowReport;
  let generateEnhancedCashFlowReport: typeof import('../ReportAdapter').generateEnhancedCashFlowReport;
  let adapter: InstanceType<typeof ReportAdapter>;

  beforeAll(async () => {
    // Mock Supabase client
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        })),
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: vi.fn(() => Promise.resolve({
              data: { signedUrl: 'https://example.com/mock-url' }
            }))
          }))
        }
      }))
    }));

    // Mock existing services
    vi.doMock('../CashFlowReportService', () => ({
      __esModule: true,
      CashFlowReportService: class MockCashFlowReportService {
        generateCashFlowReport = vi.fn().mockResolvedValue({
          success: true,
          document: { id: 'mock-doc-id' },
          downloadUrl: 'https://example.com/mock-download'
        })
      }
    }));

    vi.doMock('../EnhancedCashFlowReportService', () => ({
      EnhancedCashFlowReportService: {
        getInstance: vi.fn(() => ({
          generateCompleteReport: vi.fn().mockResolvedValue({
            success: true,
            document: { id: 'mock-enhanced-doc-id' },
            downloadUrl: 'https://example.com/mock-enhanced-download'
          })
        }))
      }
    }));

    vi.doMock('../StressTestReportService', () => ({
      StressTestReportService: vi.fn().mockImplementation(() => ({
        generateReport: vi.fn().mockResolvedValue({
          success: true,
          document: { id: 'mock-stress-test-id' },
          downloadUrl: 'https://example.com/mock-stress-test'
        })
      }))
    }));

    // Import after mocking
    const importedModule = await import('../ReportAdapter');
    ReportAdapter = importedModule.ReportAdapter;
    generateCashFlowReport = importedModule.generateCashFlowReport;
    generateEnhancedCashFlowReport = importedModule.generateEnhancedCashFlowReport;
  });

  beforeEach(() => {
    adapter = new ReportAdapter();
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should create adapter instance without errors', () => {
      expect(adapter).toBeInstanceOf(ReportAdapter);
    });

    it('should support all expected report types', () => {
      const supportedTypes = ReportAdapter.getAvailableReportTypes();
      expect(supportedTypes).toContain('cashflow');
      expect(supportedTypes).toContain('enhanced-cashflow');
      expect(supportedTypes).toContain('stress-test');
      expect(supportedTypes).toContain('assessment');
      expect(supportedTypes).toContain('suitability');
    });

    it('should validate report types correctly', () => {
      expect(ReportAdapter.isReportTypeSupported('cashflow')).toBe(true);
      expect(ReportAdapter.isReportTypeSupported('invalid-type')).toBe(false);
    });
  });

  describe('Cash Flow Report Integration', () => {
    it('should route cashflow requests to CashFlowReportService', async () => {
      const request: UnifiedReportRequest = {
        type: 'cashflow',
        dataId: 'test-scenario-id',
        templateType: 'cashflow',
        options: {
          includeCharts: true,
          includeAssumptions: true
        }
      };

      const result = await adapter.generateReport(request);

      expect(result.success).toBe(true);
      expect(result.metadata?.service).toBe('CashFlowReportService');
      expect(result.document?.id).toBe('mock-doc-id');
      expect(result.downloadUrl).toBe('https://example.com/mock-download');
    });
  });

  describe('Enhanced Cash Flow Report Integration', () => {
    it('should route enhanced-cashflow requests to EnhancedCashFlowReportService', async () => {
      const request: UnifiedReportRequest = {
        type: 'enhanced-cashflow',
        dataId: 'test-scenario-id',
        templateType: 'cashflow',
        options: {
          includeCharts: true,
          outputFormat: 'pdf'
        }
      };

      const result = await adapter.generateReport(request);

      expect(result.success).toBe(true);
      expect(result.metadata?.service).toBe('EnhancedCashFlowReportService');
      expect(result.document?.id).toBe('mock-enhanced-doc-id');
    });
  });

  describe('Unsupported Report Types', () => {
    it('should handle unsupported report types gracefully', async () => {
      const request: UnifiedReportRequest = {
        type: 'assessment', // Not yet implemented
        dataId: 'test-id'
      };

      const result = await adapter.generateReport(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not yet implemented');
      expect(result.metadata?.service).toBe('ReportAdapter');
    });

    it('should handle unknown report types', async () => {
      const request = {
        type: 'unknown-type' as any,
        dataId: 'test-id'
      };

      const result = await adapter.generateReport(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown report type');
    });
  });

  describe('Utility Methods', () => {
    it('should get client reports without errors', async () => {
      const reports = await adapter.getClientReports('test-client-id');
      expect(Array.isArray(reports)).toBe(true);
    });

    it('should get report status without errors', async () => {
      const status = await adapter.getReportStatus('test-report-id');
      expect(status).toHaveProperty('data');
      expect(status).toHaveProperty('error');
    });
  });
});

describe('Convenience Functions', () => {
  let generateCashFlowReport: typeof import('../ReportAdapter').generateCashFlowReport;
  let generateEnhancedCashFlowReport: typeof import('../ReportAdapter').generateEnhancedCashFlowReport;

  beforeAll(async () => {
    const importedModule = await import('../ReportAdapter');
    generateCashFlowReport = importedModule.generateCashFlowReport;
    generateEnhancedCashFlowReport = importedModule.generateEnhancedCashFlowReport;
  });

  it('should generate cash flow report using convenience function', async () => {
    const result = await generateCashFlowReport('test-scenario-id', {
      includeCharts: true
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.service).toBe('CashFlowReportService');
  });

  it('should generate enhanced cash flow report using convenience function', async () => {
    const result = await generateEnhancedCashFlowReport('test-scenario-id', {
      outputFormat: 'pdf'
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.service).toBe('EnhancedCashFlowReportService');
  });
});
