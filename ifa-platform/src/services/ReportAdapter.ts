// ================================================================
// src/services/ReportAdapter.ts
// SAFE WRAPPER - Does not modify existing services
// Routes report requests to appropriate existing service
// ================================================================

import { createClient } from '@/lib/supabase/client';
import { CashFlowReportService, type CashFlowReportOptions, type CashFlowReportResult } from './CashFlowReportService';
import { EnhancedCashFlowReportService, type EnhancedReportOptions, type EnhancedReportResult } from './EnhancedCashFlowReportService';
import { StressTestReportService } from './StressTestReportService';
import { ATRReportService } from './ATRReportService';

// ================================================================
// IMPORT INTERFACES (Use from types file to avoid duplication)
// ================================================================

import type {
  ReportType,
  UnifiedReportRequest,
  UnifiedReportResult
} from '@/types/reporting.types';

// ================================================================
// REPORT ADAPTER - ZERO BREAKING CHANGES
// Works alongside existing services
// ================================================================

export class ReportAdapter {
  private supabase;

  constructor() {
    this.supabase = createClient(); // Same pattern as existing services
  }

  /**
   * Main adapter method - routes to appropriate existing service
   * IMPORTANT: This doesn't modify existing services, just calls them
   */
  async generateReport(request: UnifiedReportRequest): Promise<UnifiedReportResult> {
    try {
      console.log(`[ReportAdapter] Routing ${request.type} report for ${request.dataId}`);

      switch (request.type) {
        case 'cashflow':
          return await this.handleCashFlowReport(request);

        case 'enhanced-cashflow':
          return await this.handleEnhancedCashFlowReport(request);

        case 'stress-test':
          return await this.handleStressTestReport(request);

        case 'atr':
          return await this.handleATRReport(request);

        case 'assessment':
        case 'suitability':
          // TODO: Route to assessment services when ready
          return {
            success: false,
            error: `Report type ${request.type} not yet implemented in adapter`,
            metadata: {
              reportType: request.type,
              generatedAt: new Date(),
              service: 'ReportAdapter'
            }
          };

        default:
          return {
            success: false,
            error: `Unknown report type: ${request.type}`,
            metadata: {
              reportType: request.type,
              generatedAt: new Date(),
              service: 'ReportAdapter'
            }
          };
      }

    } catch (error) {
      console.error('[ReportAdapter] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed',
        metadata: {
          reportType: request.type,
          generatedAt: new Date(),
          service: 'ReportAdapter'
        }
      };
    }
  }

  // ================================================================
  // EXISTING SERVICE WRAPPERS (No modification to original services)
  // ================================================================

  /**
   * Wraps existing CashFlowReportService - NO CHANGES to original service
   */
  private async handleCashFlowReport(request: UnifiedReportRequest): Promise<UnifiedReportResult> {
    const service = new CashFlowReportService();

    // Map unified request to existing service interface
    const options: CashFlowReportOptions = {
      includeCharts: request.options?.includeCharts ?? true,
      includeAssumptions: request.options?.includeAssumptions ?? true,
      includeRiskAnalysis: request.options?.includeRiskAnalysis ?? true,
      includeProjectionTable: request.options?.includeProjectionTable ?? true,
      reportPeriodYears: request.options?.reportPeriodYears ?? 20,
      comparisonScenarios: request.options?.comparisonScenarios
    };

    const templateType = (request.templateType || 'cashflow') as 'suitability' | 'cashflow' | 'review';

    // Call existing service method - NO MODIFICATION
    const result: CashFlowReportResult = await service.generateCashFlowReport(
      request.dataId,
      templateType,
      options
    );

    // Convert to unified format
    return {
      success: result.success,
      document: result.document,
      downloadUrl: result.downloadUrl,
      error: result.error,
      metadata: {
        reportType: request.type,
        generatedAt: new Date(),
        service: 'CashFlowReportService'
      }
    };
  }

  /**
   * Wraps existing EnhancedCashFlowReportService - NO CHANGES to original service
   */
  private async handleEnhancedCashFlowReport(request: UnifiedReportRequest): Promise<UnifiedReportResult> {
    const service = EnhancedCashFlowReportService.getInstance();

    // Map unified request to existing service interface
    const options: EnhancedReportOptions = {
      includeCharts: request.options?.includeCharts ?? true,
      includeAssumptions: request.options?.includeAssumptions ?? true,
      includeRiskAnalysis: request.options?.includeRiskAnalysis ?? true,
      includeProjectionTable: request.options?.includeProjectionTable ?? true,
      reportPeriodYears: request.options?.reportPeriodYears ?? 20,
      comparisonScenarios: request.options?.comparisonScenarios,
      outputFormat: request.options?.outputFormat || 'pdf',
      chartTypes: (request.options?.chartTypes || ['portfolio', 'income_expense', 'asset_allocation', 'risk_analysis']) as ('portfolio' | 'income_expense' | 'asset_allocation' | 'risk_analysis')[],
      locale: request.options?.locale || 'en-GB',
      theme: request.options?.theme || 'light',
      accessibility: request.options?.accessibility || {
        highContrast: false,
        fontSize: 'medium' as const,
        screenReader: false
      }
    };

    const templateType = (request.templateType || 'cashflow') as 'suitability' | 'cashflow' | 'review';

    // Call existing service method - NO MODIFICATION
    const result: EnhancedReportResult = await service.generateCompleteReport(
      request.dataId,
      templateType,
      options,
      request.options?.onProgress
    );

    // Convert to unified format
    return {
      success: result.success,
      document: result.document,
      downloadUrl: result.downloadUrl,
      error: result.error,
      metadata: {
        reportType: request.type,
        generatedAt: new Date(),
        service: 'EnhancedCashFlowReportService'
      }
    };
  }

  /**
   * Wraps existing StressTestReportService - NO CHANGES to original service
   */
  private async handleStressTestReport(request: UnifiedReportRequest): Promise<UnifiedReportResult> {
    const service = new StressTestReportService();

    const options = {
      includeExecutiveSummary: true,
      includeDetailedResults: true,
      includeRecommendations: true,
      includeComplianceEvidence: true,
      includeCharts: true,
      reportFormat: request.format === 'html' ? 'html' as const : 'pdf' as const,
    };

    const result = await service.generateStressTestReport(request.dataId, options);

    return {
      success: result.success,
      downloadUrl: result.downloadUrl,
      error: result.error,
      metadata: {
        reportType: request.type,
        generatedAt: new Date(),
        service: 'StressTestReportService',
        reportId: result.reportId
      }
    };
  }

  /**
   * Wraps ATRReportService - Phase 2 Integration
   */
  private async handleATRReport(request: UnifiedReportRequest): Promise<UnifiedReportResult> {
    const service = new ATRReportService();

    // ATRReportService already uses the unified interface
    return await service.generateReport(request);
  }

  // ================================================================
  // UTILITY METHODS (Safe additions)
  // ================================================================

  /**
   * Get available report types
   */
  static getAvailableReportTypes(): ReportType[] {
    return ['cashflow', 'enhanced-cashflow', 'stress-test', 'atr', 'assessment', 'suitability'];
  }

  /**
   * Check if report type is supported
   */
  static isReportTypeSupported(type: string): type is ReportType {
    return this.getAvailableReportTypes().includes(type as ReportType);
  }

  /**
   * Get report status (for monitoring)
   */
  async getReportStatus(reportId: string): Promise<any> {
    // Query existing generated_documents table
    const { data, error } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('id', reportId)
      .single();

    return { data, error };
  }

  /**
   * List recent reports for a client (uses existing table structure)
   */
  async getClientReports(clientId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ReportAdapter] Error fetching client reports:', error);
      return [];
    }

    return data || [];
  }
}

// ================================================================
// CONVENIENCE FUNCTIONS (Optional - doesn't break anything)
// ================================================================

/**
 * Quick function to generate a cash flow report using adapter
 */
export async function generateCashFlowReport(
  scenarioId: string,
  options?: Partial<CashFlowReportOptions>
): Promise<UnifiedReportResult> {
  const adapter = new ReportAdapter();
  return adapter.generateReport({
    type: 'cashflow',
    dataId: scenarioId,
    templateType: 'cashflow',
    options
  });
}

/**
 * Quick function to generate enhanced cash flow report using adapter
 */
export async function generateEnhancedCashFlowReport(
  scenarioId: string,
  options?: Partial<EnhancedReportOptions>
): Promise<UnifiedReportResult> {
  const adapter = new ReportAdapter();
  return adapter.generateReport({
    type: 'enhanced-cashflow',
    dataId: scenarioId,
    templateType: 'cashflow',
    options
  });
}
