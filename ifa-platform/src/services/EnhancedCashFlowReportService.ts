// ================================================================
// src/services/EnhancedCashFlowReportService.ts - PRODUCTION READY & FIXED
// Uses robust client-side initialization.
// ================================================================

import { DocumentGenerationService, type DocumentGenerationParams } from './documentGenerationService';
import { ClientService } from './ClientService';
import { CashFlowDataService } from './CashFlowDataService';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { PDFGenerationEngine } from '@/lib/pdf/generatePDF';
import { EnhancedChartService, type ChartImageResult } from './EnhancedChartService';
import { ExcelGenerator } from '@/lib/export/ExcelGenerator';
import { createClient } from '@/lib/supabase/client'
import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CashFlowScenario, ProjectionResult, CashFlowProjection } from '@/types/cashflow';
import type { Client } from '@/types/client';
import type { SupabaseClient } from '@supabase/supabase-js'; // FIX: Import type

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface EnhancedReportOptions {
  includeCharts: boolean;
  includeAssumptions: boolean;
  includeRiskAnalysis: boolean;
  includeProjectionTable: boolean;
  reportPeriodYears?: number;
  comparisonScenarios?: string[];
  outputFormat: 'html' | 'pdf' | 'excel' | 'powerpoint';
  chartTypes?: ('portfolio' | 'income_expense' | 'asset_allocation' | 'risk_analysis')[];
  locale?: string;
  theme?: 'light' | 'dark' | 'auto';
  accessibility?: {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    screenReader: boolean;
  };
  customizations?: {
    logo?: string;
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
  };
}

export interface EnhancedReportResult {
  success: boolean;
  document?: any;
  error?: string;
  downloadUrl?: string;
  previewUrl?: string;
  chartUrls?: string[];
  metadata?: ReportMetadata;
  version?: string;
  generatedAt?: Date;
  expiresAt?: Date;
}

export interface ReportMetadata {
  id: string;
  scenarioId: string;
  clientId: string;
  templateType: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  fileSize: number;
  pageCount?: number;
  language: string;
  accessibility: boolean;
}

export interface ReportProgress {
  stage: 'initializing' | 'gathering_data' | 'generating_charts' | 'creating_document' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  estimatedTimeRemaining?: number;
}

export interface ReportGenerationError extends Error {
  code: string;
  stage: string;
  recoverable: boolean;
  retryAfter?: number;
}

// ================================================================
// CUSTOM HOOKS FOR REACT QUERY INTEGRATION
// ================================================================

export const useReportGeneration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      scenarioId: string;
      templateType: 'cashflow' | 'suitability' | 'review';
      options: EnhancedReportOptions;
      onProgress?: (progress: ReportProgress) => void;
    }) => {
      const service = EnhancedCashFlowReportService.getInstance();
      return service.generateCompleteReport(
        params.scenarioId,
        params.templateType,
        params.options,
        params.onProgress
      );
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
    },
    onError: (error) => {
      console.error('Report generation failed:', error);
    }
  });
};

export const useReportHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['report-history', clientId],
    queryFn: async () => {
      const service = EnhancedCashFlowReportService.getInstance();
      return service.getReportHistory(clientId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

export const useReportPreview = (
  scenarioId: string,
  templateType: 'cashflow' | 'suitability' | 'review',
  options: EnhancedReportOptions
) => {
  return useQuery({
    queryKey: ['report-preview', scenarioId, templateType, options],
    queryFn: async () => {
      const service = EnhancedCashFlowReportService.getInstance();
      return service.generateReportPreview(scenarioId, templateType, options);
    },
    enabled: !!scenarioId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

// ================================================================
// MAIN SERVICE CLASS
// ================================================================

export class EnhancedCashFlowReportService {
  private static instance: EnhancedCashFlowReportService;
  private documentService: DocumentGenerationService;
  private clientService: ClientService;
  private chartService: EnhancedChartService;
  private supabase: SupabaseClient; // FIX: Declare supabase client property

  // Real-time subscriptions
  private reportSubscriptions = new Map<string, any>();
  private progressCallbacks = new Map<string, (progress: ReportProgress) => void>();

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000;

  private constructor() {
    this.supabase = createClient(); // FIX: Initialize client in constructor
    this.documentService = new DocumentGenerationService();
    this.clientService = new ClientService();
    this.chartService = EnhancedChartService.getInstance();
    this.setupRealtimeSubscriptions();
  }

  public static getInstance(): EnhancedCashFlowReportService {
    if (!EnhancedCashFlowReportService.instance) {
      EnhancedCashFlowReportService.instance = new EnhancedCashFlowReportService();
    }
    return EnhancedCashFlowReportService.instance;
  }

  /**
   * Generate complete report with comprehensive error handling and progress tracking
   */
  async generateCompleteReport(
    scenarioId: string,
    templateType: 'cashflow' | 'suitability' | 'review',
    options: EnhancedReportOptions = {
      includeCharts: true,
      includeAssumptions: true,
      includeRiskAnalysis: true,
      includeProjectionTable: true,
      reportPeriodYears: 20,
      outputFormat: 'pdf',
      chartTypes: ['portfolio', 'income_expense', 'asset_allocation', 'risk_analysis'],
      locale: 'en-GB',
      theme: 'light',
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        screenReader: false
      }
    },
    onProgress?: (progress: ReportProgress) => void
  ): Promise<EnhancedReportResult> {
    console.log('🔍 EnhancedCashFlowReportService.generateCompleteReport called with:', {
      scenarioId,
      templateType,
      outputFormat: options.outputFormat
    });

    const reportId = `${scenarioId}-${templateType}-${Date.now()}`;
    let currentRetry = 0;

    // Store progress callback
    if (onProgress) {
      this.progressCallbacks.set(reportId, onProgress);
    }

    const updateProgress = (stage: ReportProgress['stage'], progress: number, message: string, currentStep?: string) => {
      const progressUpdate: ReportProgress = {
        stage,
        progress,
        message,
        currentStep,
        totalSteps: 5,
        estimatedTimeRemaining: this.estimateTimeRemaining(progress)
      };
      
      onProgress?.(progressUpdate);
      this.broadcastProgress(reportId, progressUpdate);
    };

    while (currentRetry <= this.MAX_RETRIES) {
      try {
        updateProgress('initializing', 0, 'Initializing report generation...');

        // 1. Gather all required data with validation
        updateProgress('gathering_data', 10, 'Gathering scenario and client data...');
        const { scenario, client, projectionResult } = await this.gatherReportData(scenarioId);

        // 2. Generate chart images with progress tracking
        updateProgress('generating_charts', 30, 'Generating charts and visualizations...');
        const chartResults = await this.generateChartsWithProgress(
          projectionResult,
          scenario,
          options,
          (chartProgress) => {
            updateProgress('generating_charts', 30 + (chartProgress * 0.4), `Generating charts... ${chartProgress}%`);
          }
        );

        // 3. Build enhanced template variables
        updateProgress('creating_document', 70, 'Building report content...');
        const variables = await this.buildEnhancedTemplateVariables(
          client,
          scenario,
          projectionResult,
          options,
          chartResults
        );

        // 4. Generate the report based on output format
        updateProgress('finalizing', 85, 'Finalizing document...');
        const result = await this.generateFinalDocument(
          client,
          scenario,
          projectionResult,
          templateType,
          options,
          variables,
          chartResults
        );

        // 5. Save metadata and complete
        await this.saveReportMetadata(reportId, scenarioId, templateType, result);
        updateProgress('complete', 100, 'Report generated successfully!');

        // Clean up
        this.progressCallbacks.delete(reportId);

        return {
          ...result,
          metadata: {
            id: reportId,
            scenarioId,
            clientId: scenario.clientId,
            templateType,
            version: '2.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system', // TODO: Get from auth context
            fileSize: 0, // TODO: Calculate actual size
            language: options.locale || 'en-GB',
            accessibility: options.accessibility?.screenReader || false
          }
        };

      } catch (error) {
        console.error('❌ EnhancedCashFlowReportService error details:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace',
          templateType,
          scenarioId,
          attempt: currentRetry + 1
        });

        currentRetry++;

        const reportError = this.createReportError(error, 'generation', currentRetry <= this.MAX_RETRIES);
        
        if (currentRetry <= this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, currentRetry - 1);
          updateProgress('error', 0, `Error occurred. Retrying in ${delay/1000}s... (${currentRetry}/${this.MAX_RETRIES})`);
          
          await this.delay(delay);
          continue;
        }

        updateProgress('error', 0, `Report generation failed: ${reportError.message}`);
        this.progressCallbacks.delete(reportId);

        return {
          success: false,
          error: reportError.message
        };
      }
    }

    return {
      success: false,
      error: 'Maximum retries exceeded'
    };
  }

  /**
   * Generate report preview with caching
   */
  async generateReportPreview(
    scenarioId: string,
    templateType: 'cashflow' | 'suitability' | 'review',
    options: EnhancedReportOptions
  ): Promise<{
    success: boolean;
    htmlContent?: string;
    error?: string;
  }> {
    try {
      const { scenario, client, projectionResult } = await this.gatherReportData(scenarioId);

      // For preview, generate simplified chart placeholders
      const chartUrls = options.includeCharts ? 
        await this.generateChartPlaceholders(options.chartTypes || []) : [];

      const variables = await this.buildEnhancedTemplateVariables(
        client,
        scenario,
        projectionResult,
        options,
        chartUrls.map(url => ({ url } as ChartImageResult))
      );

      // Use dynamic template generation
      const templateContent = this.generateDynamicTemplate(templateType, options);
      
      // Populate the template with variables
      const htmlContent = this.populateTemplate(templateContent, variables);

      return {
        success: true,
        htmlContent
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview generation failed'
      };
    }
  }

  /**
   * Get report history for a client
   */
  async getReportHistory(clientId: string): Promise<ReportMetadata[]> {
    try {
      const { data, error } = await this.supabase
        .from('report_metadata')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch report history: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching report history:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time report progress updates
   */
  subscribeToReportProgress(reportId: string, callback: (progress: ReportProgress) => void): () => void {
    this.progressCallbacks.set(reportId, callback);

    const subscription = this.supabase
      .channel(`report-progress-${reportId}`)
      .on('broadcast', { event: 'progress-update' }, (payload) => {
        callback(payload.progress);
      })
      .subscribe();

    this.reportSubscriptions.set(reportId, subscription);

    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(reportId);
      subscription.unsubscribe();
      this.reportSubscriptions.delete(reportId);
    };
  }

  // ================================================================
  // DYNAMIC TEMPLATE GENERATION METHODS
  // ================================================================

  /**
   * Generate a complete HTML template dynamically based on report type and options
   */
  private generateDynamicTemplate(
    templateType: 'cashflow' | 'suitability' | 'review',
    options: EnhancedReportOptions
  ): string {
    switch (templateType) {
      case 'cashflow':
        return this.generateCashFlowTemplate(options);
      case 'suitability':
        return this.generateSuitabilityTemplate(options);
      case 'review':
        return this.generateReviewTemplate(options);
      default:
        return this.generateCashFlowTemplate(options);
    }
  }

  /**
   * Generate Cash Flow Analysis Template
   */
  private generateCashFlowTemplate(options: EnhancedReportOptions): string {
    const { theme = 'light', accessibility } = options;
    const isHighContrast = accessibility?.highContrast || false;
    const fontSize = accessibility?.fontSize || 'medium';
    
    return `
<!DOCTYPE html>
<html lang="${options.locale || 'en-GB'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cash Flow Analysis Report - {{CLIENT_NAME}}</title>
  <style>
    /* Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${isHighContrast ? '#000' : '#333'};
      background: ${theme === 'dark' ? '#1a1a1a' : '#fff'};
      font-size: ${this.getFontSize(fontSize, 'body')};
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: ${theme === 'dark' ? '#2a2a2a' : '#fff'};
    }
    
    /* Header Styles */
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid ${isHighContrast ? '#000' : '#007acc'};
    }
    
    .header h1 {
      font-size: ${this.getFontSize(fontSize, 'h1')};
      color: ${isHighContrast ? '#000' : '#007acc'};
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: ${this.getFontSize(fontSize, 'h3')};
      color: ${isHighContrast ? '#000' : '#666'};
      margin-bottom: 20px;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: ${this.getFontSize(fontSize, 'small')};
    }
    
    .header-info div {
      text-align: left;
    }
    
    .header-info .label {
      font-weight: 600;
      color: ${isHighContrast ? '#000' : '#555'};
    }
    
    /* Section Styles */
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      font-size: ${this.getFontSize(fontSize, 'h2')};
      color: ${isHighContrast ? '#000' : '#007acc'};
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${isHighContrast ? '#000' : '#e0e0e0'};
    }
    
    .section h3 {
      font-size: ${this.getFontSize(fontSize, 'h3')};
      color: ${isHighContrast ? '#000' : '#333'};
      margin-bottom: 15px;
    }
    
    /* Executive Summary */
    .executive-summary {
      background: ${isHighContrast ? '#f0f0f0' : theme === 'dark' ? '#333' : '#f8f9fa'};
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    
    .key-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .metric-card {
      background: ${theme === 'dark' ? '#444' : '#fff'};
      padding: 20px;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .metric-card .value {
      font-size: ${this.getFontSize(fontSize, 'h2')};
      font-weight: 700;
      color: ${isHighContrast ? '#000' : '#007acc'};
      margin-bottom: 5px;
    }
    
    .metric-card .label {
      font-size: ${this.getFontSize(fontSize, 'small')};
      color: ${isHighContrast ? '#000' : '#666'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: ${this.getFontSize(fontSize, 'small')};
    }
    
    thead {
      background: ${isHighContrast ? '#ddd' : theme === 'dark' ? '#444' : '#f8f9fa'};
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border: 1px solid ${isHighContrast ? '#000' : '#dee2e6'};
    }
    
    th {
      font-weight: 600;
      color: ${isHighContrast ? '#000' : '#333'};
    }
    
    tbody tr:nth-child(even) {
      background: ${isHighContrast ? '#f0f0f0' : theme === 'dark' ? '#333' : '#f8f9fa'};
    }
    
    .number {
      text-align: right;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    /* Charts */
    .chart-container {
      margin: 30px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    
    .chart-container img {
      max-width: 100%;
      height: auto;
      border: 1px solid ${isHighContrast ? '#000' : '#dee2e6'};
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      font-size: ${this.getFontSize(fontSize, 'h4')};
      color: ${isHighContrast ? '#000' : '#555'};
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    /* Risk Analysis */
    .risk-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    .risk-item {
      background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid ${isHighContrast ? '#000' : '#007acc'};
    }
    
    .risk-item h4 {
      font-size: ${this.getFontSize(fontSize, 'h4')};
      color: ${isHighContrast ? '#000' : '#333'};
      margin-bottom: 10px;
    }
    
    .risk-level {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: ${this.getFontSize(fontSize, 'small')};
      font-weight: 600;
      margin-top: 10px;
    }
    
    .risk-low {
      background: ${isHighContrast ? '#ddd' : '#d4edda'};
      color: ${isHighContrast ? '#000' : '#155724'};
    }
    
    .risk-medium {
      background: ${isHighContrast ? '#ddd' : '#fff3cd'};
      color: ${isHighContrast ? '#000' : '#856404'};
    }
    
    .risk-high {
      background: ${isHighContrast ? '#ddd' : '#f8d7da'};
      color: ${isHighContrast ? '#000' : '#721c24'};
    }
    
    /* Insights */
    .insights-list {
      list-style: none;
      padding: 0;
      margin-top: 20px;
    }
    
    .insights-list li {
      padding: 15px;
      margin-bottom: 10px;
      background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
      border-radius: 6px;
      border-left: 3px solid ${isHighContrast ? '#000' : '#007acc'};
      position: relative;
      padding-left: 40px;
    }
    
    .insights-list li:before {
      content: "✓";
      position: absolute;
      left: 15px;
      color: ${isHighContrast ? '#000' : '#28a745'};
      font-weight: bold;
      font-size: 18px;
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid ${isHighContrast ? '#000' : '#dee2e6'};
      text-align: center;
      font-size: ${this.getFontSize(fontSize, 'small')};
      color: ${isHighContrast ? '#000' : '#666'};
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
        color: black;
      }
      
      .container {
        padding: 0;
        max-width: 100%;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .chart-container {
        page-break-inside: avoid;
      }
    }
    
    /* Accessibility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
    
    /* Custom CSS */
    {{CUSTOM_CSS}}
  </style>
</head>
<body>
  <div class="container" role="main">
    <!-- Header -->
    <header class="header" role="banner">
      <h1>Cash Flow Analysis Report</h1>
      <div class="subtitle">Comprehensive Financial Projection Analysis</div>
      
      <div class="header-info">
        <div>
          <div class="label">Client</div>
          <div>{{CLIENT_NAME}}</div>
          <div>{{CLIENT_EMAIL}}</div>
        </div>
        <div>
          <div class="label">Report Date</div>
          <div>{{REPORT_DATE}}</div>
        </div>
        <div>
          <div class="label">Prepared By</div>
          <div>{{ADVISOR_NAME}}</div>
          <div>{{FIRM_NAME}}</div>
        </div>
      </div>
    </header>
    
    <!-- Executive Summary -->
    <section class="section executive-summary" aria-labelledby="exec-summary-title">
      <h2 id="exec-summary-title">Executive Summary</h2>
      
      <div class="key-metrics">
        <div class="metric-card">
          <div class="value">{{FINAL_PORTFOLIO_VALUE}}</div>
          <div class="label">Final Portfolio Value</div>
        </div>
        <div class="metric-card">
          <div class="value">{{PROJECTION_YEARS}}</div>
          <div class="label">Years Projected</div>
        </div>
        <div class="metric-card">
          <div class="value">{{AVERAGE_ANNUAL_RETURN}}</div>
          <div class="label">Avg Annual Return</div>
        </div>
        <div class="metric-card">
          <div class="value">{{SUSTAINABILITY_RATING}}/10</div>
          <div class="label">Sustainability Score</div>
        </div>
      </div>
      
      <h3>Key Findings</h3>
      <ul class="insights-list">
        {{KEY_INSIGHTS}}
      </ul>
    </section>
    
    <!-- Charts Section -->
    {{#if INCLUDE_CHARTS}}
    <section class="section" aria-labelledby="charts-title">
      <h2 id="charts-title">Visual Analysis</h2>
      {{CHARTS_SECTION}}
    </section>
    {{/if}}
    
    <!-- Assumptions Section -->
    {{#if INCLUDE_ASSUMPTIONS}}
    <section class="section" aria-labelledby="assumptions-title">
      <h2 id="assumptions-title">Assumptions & Parameters</h2>
      {{ASSUMPTIONS_TABLE}}
    </section>
    {{/if}}
    
    <!-- Risk Analysis Section -->
    {{#if INCLUDE_RISK_ANALYSIS}}
    <section class="section" aria-labelledby="risk-title">
      <h2 id="risk-title">Risk Analysis</h2>
      {{RISK_ANALYSIS_SECTION}}
    </section>
    {{/if}}
    
    <!-- Projection Table -->
    {{#if includeProjectionTable}}
    <section class="section" aria-labelledby="projections-title">
      <h2 id="projections-title">Year-by-Year Projections</h2>
      {{PROJECTION_TABLE}}
    </section>
    {{/if}}
    
    <!-- Footer -->
    <footer class="footer" role="contentinfo">
      <p>This report has been prepared for {{CLIENT_NAME}} by {{FIRM_NAME}}.</p>
      <p>Generated on {{REPORT_DATE}} | Scenario: {{SCENARIO_NAME}}</p>
      <p><strong>Important:</strong> Past performance is not indicative of future results. All projections are estimates based on current assumptions.</p>
    </footer>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate Suitability Report Template
   */
  private generateSuitabilityTemplate(options: EnhancedReportOptions): string {
    const { theme = 'light', accessibility } = options;
    const isHighContrast = accessibility?.highContrast || false;
    const fontSize = accessibility?.fontSize || 'medium';
    
    return `
<!DOCTYPE html>
<html lang="${options.locale || 'en-GB'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suitability Report - {{CLIENT_NAME}}</title>
  <style>
    /* Base styles from cash flow template */
    ${this.getBaseStyles(theme, isHighContrast, fontSize)}
    
    /* Suitability-specific styles */
    .recommendation-box {
      background: ${isHighContrast ? '#f0f0f0' : '#e3f2fd'};
      border: 2px solid ${isHighContrast ? '#000' : '#2196f3'};
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
    }
    
    .recommendation-box h3 {
      color: ${isHighContrast ? '#000' : '#1976d2'};
      margin-bottom: 15px;
    }
    
    .suitability-matrix {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 20px;
      margin: 30px 0;
    }
    
    .matrix-label {
      font-weight: 600;
      padding: 10px;
      background: ${theme === 'dark' ? '#444' : '#f5f5f5'};
      border-radius: 4px;
    }
    
    .matrix-value {
      padding: 10px;
      border-left: 3px solid ${isHighContrast ? '#000' : '#007acc'};
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Investment Suitability Report</h1>
      <div class="subtitle">Personalized Investment Recommendations</div>
      <div class="header-info">
        <div>
          <div class="label">Client</div>
          <div>{{CLIENT_NAME}}</div>
        </div>
        <div>
          <div class="label">Report Date</div>
          <div>{{REPORT_DATE}}</div>
        </div>
        <div>
          <div class="label">Prepared By</div>
          <div>{{ADVISOR_NAME}}</div>
          <div>{{FIRM_NAME}}</div>
        </div>
      </div>
    </header>
    
    <section class="section">
      <h2>Client Profile</h2>
      <div class="suitability-matrix">
        <div class="matrix-label">Risk Profile</div>
        <div class="matrix-value">{{RISK_PROFILE}}</div>
        
        <div class="matrix-label">Investment Objective</div>
        <div class="matrix-value">{{INVESTMENT_OBJECTIVE}}</div>
        
        <div class="matrix-label">Time Horizon</div>
        <div class="matrix-value">{{TIME_HORIZON}}</div>
        
        <div class="matrix-label">Capacity for Loss</div>
        <div class="matrix-value">{{CAPACITY_FOR_LOSS}}</div>
      </div>
    </section>
    
    <section class="section">
      <h2>Recommendations</h2>
      <div class="recommendation-box">
        <h3>Recommended Portfolio Allocation</h3>
        {{PORTFOLIO_RECOMMENDATION}}
      </div>
    </section>
    
    {{#if INCLUDE_CHARTS}}
    <section class="section">
      <h2>Portfolio Analysis</h2>
      {{CHARTS_SECTION}}
    </section>
    {{/if}}
    
    <footer class="footer">
      <p>This report has been prepared for {{CLIENT_NAME}} by {{FIRM_NAME}}.</p>
      <p>Generated on {{REPORT_DATE}}</p>
    </footer>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate Annual Review Template
   */
  private generateReviewTemplate(options: EnhancedReportOptions): string {
    const { theme = 'light', accessibility } = options;
    const isHighContrast = accessibility?.highContrast || false;
    const fontSize = accessibility?.fontSize || 'medium';
    
    return `
<!DOCTYPE html>
<html lang="${options.locale || 'en-GB'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annual Review - {{CLIENT_NAME}}</title>
  <style>
    /* Base styles from cash flow template */
    ${this.getBaseStyles(theme, isHighContrast, fontSize)}
    
    /* Review-specific styles */
    .performance-card {
      background: linear-gradient(135deg, ${isHighContrast ? '#f0f0f0' : '#007acc'} 0%, ${isHighContrast ? '#ddd' : '#0056b3'} 100%);
      color: ${isHighContrast ? '#000' : '#fff'};
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: center;
    }
    
    .performance-card h3 {
      color: ${isHighContrast ? '#000' : '#fff'};
      font-size: ${this.getFontSize(fontSize, 'h2')};
      margin-bottom: 10px;
    }
    
    .timeline {
      position: relative;
      padding: 20px 0;
      margin: 30px 0;
    }
    
    .timeline-item {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      position: relative;
    }
    
    .timeline-date {
      width: 120px;
      font-weight: 600;
      color: ${isHighContrast ? '#000' : '#007acc'};
    }
    
    .timeline-content {
      flex: 1;
      padding: 20px;
      background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
      border-radius: 8px;
      margin-left: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Annual Review Report</h1>
      <div class="subtitle">Year in Review: {{REVIEW_PERIOD}}</div>
      <div class="header-info">
        <div>
          <div class="label">Client</div>
          <div>{{CLIENT_NAME}}</div>
        </div>
        <div>
          <div class="label">Report Date</div>
          <div>{{REPORT_DATE}}</div>
        </div>
        <div>
          <div class="label">Prepared By</div>
          <div>{{ADVISOR_NAME}}</div>
          <div>{{FIRM_NAME}}</div>
        </div>
      </div>
    </header>
    
    <section class="section">
      <div class="performance-card">
        <h3>{{ANNUAL_PERFORMANCE}}</h3>
        <p>Total Portfolio Performance</p>
      </div>
    </section>
    
    <section class="section">
      <h2>Key Milestones</h2>
      <div class="timeline">
        {{TIMELINE_EVENTS}}
      </div>
    </section>
    
    {{#if INCLUDE_CHARTS}}
    <section class="section">
      <h2>Performance Analysis</h2>
      {{CHARTS_SECTION}}
    </section>
    {{/if}}
    
    <footer class="footer">
      <p>This report has been prepared for {{CLIENT_NAME}} by {{FIRM_NAME}}.</p>
      <p>Generated on {{REPORT_DATE}}</p>
    </footer>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get base styles that are shared across templates
   */
  private getBaseStyles(theme: string, isHighContrast: boolean, fontSize: string): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: ${isHighContrast ? '#000' : '#333'};
        background: ${theme === 'dark' ? '#1a1a1a' : '#fff'};
        font-size: ${this.getFontSize(fontSize, 'body')};
      }
      
      .container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        background: ${theme === 'dark' ? '#2a2a2a' : '#fff'};
      }
      
      .header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 30px;
        border-bottom: 3px solid ${isHighContrast ? '#000' : '#007acc'};
      }
      
      .section {
        margin-bottom: 40px;
        page-break-inside: avoid;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      
      th, td {
        padding: 12px;
        text-align: left;
        border: 1px solid ${isHighContrast ? '#000' : '#dee2e6'};
      }
    `;
  }

  // ================================================================
  // PRIVATE METHODS
  // ================================================================

  private async gatherReportData(scenarioId: string) {
    const scenario = await CashFlowDataService.getScenario(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    const client = await this.clientService.getClientById(scenario.clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    const projectionResult = await ProjectionEngine.generateProjections(scenario);
    if (!projectionResult) {
      throw new Error('Failed to generate projections');
    }

    return { scenario, client, projectionResult };
  }

  private async generateChartsWithProgress(
    projectionResult: ProjectionResult,
    scenario: CashFlowScenario,
    options: EnhancedReportOptions,
    onProgress?: (progress: number) => void
  ): Promise<ChartImageResult[]> {
    if (!options.includeCharts || !options.chartTypes) {
      return [];
    }

    return this.chartService.generateMultipleCharts(
      projectionResult,
      scenario,
      options.chartTypes,
      onProgress
    );
  }

  private async generateFinalDocument(
    client: Client,
    scenario: CashFlowScenario,
    projectionResult: ProjectionResult,
    templateType: string,
    options: EnhancedReportOptions,
    variables: Record<string, any>,
    chartResults: ChartImageResult[]
  ): Promise<EnhancedReportResult> {
    let document: any;
    let downloadUrl: string;
    const chartUrls = chartResults.map(chart => chart.url || '').filter(Boolean);

    switch (options.outputFormat) {
      case 'pdf':
        // Use dynamic template generation
        const templateContent = this.generateDynamicTemplate(
          templateType as 'cashflow' | 'suitability' | 'review',
          options
        );

        const htmlContent = this.populateTemplate(templateContent, variables);

        const pdfBuffer = await PDFGenerationEngine.generatePDFFromHTML(
          htmlContent,
          {
            format: 'A4',
            orientation: 'portrait',
            includeCharts: options.includeCharts,
            includeHeaderFooter: true
          }
        );

        document = await this.savePDFToStorage(
          pdfBuffer,
          `${templateType || 'report'}-report-${scenario.clientId}-${Date.now()}.pdf`,
          scenario.clientId
        );

        downloadUrl = await this.getDocumentDownloadUrl(document.file_path);
        break;

      case 'excel':
        // Generate Excel using ExcelGenerator
        const excelResult = ExcelGenerator.generateCashFlowReport({
          client,
          scenario,
          projectionResult,
          options: {
            includeAssumptions: options.includeAssumptions,
            includeRiskAnalysis: options.includeRiskAnalysis,
            locale: options.locale,
          },
        });

        if (!excelResult.success || !excelResult.buffer) {
          throw new Error(excelResult.error || 'Excel generation failed');
        }

        document = await this.saveExcelToStorage(
          excelResult.buffer,
          excelResult.filename || `report-${scenario.clientId}-${Date.now()}.xlsx`,
          scenario.clientId
        );

        downloadUrl = await this.getDocumentDownloadUrl(document.file_path);
        break;

      case 'powerpoint':
        // PowerPoint generation must be done via API route due to Node.js dependencies
        // This service method returns a download URL that triggers the API endpoint
        const pptApiUrl = `/api/export/powerpoint`;
        const pptResponse = await fetch(pptApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: scenario.id,
            options: {
              includeCharts: options.includeCharts,
              includeAssumptions: options.includeAssumptions,
              includeRiskAnalysis: options.includeRiskAnalysis,
              includeProjectionTable: options.includeProjectionTable,
              locale: options.locale,
            },
          }),
        });

        if (!pptResponse.ok) {
          const error = await pptResponse.json().catch(() => ({ error: 'PowerPoint generation failed' }));
          throw new Error(error.error || 'PowerPoint generation failed');
        }

        // Get the blob and save to storage
        const pptBlob = await pptResponse.blob();
        const pptBuffer = Buffer.from(await pptBlob.arrayBuffer());
        const pptFilename = `CashFlow_Report_${scenario.clientId}_${Date.now()}.pptx`;

        document = await this.savePowerPointToStorage(
          pptBuffer,
          pptFilename,
          scenario.clientId
        );

        downloadUrl = await this.getDocumentDownloadUrl(document.file_path);
        break;

      default: // HTML
        const result = await this.generateHTMLReport(
          scenario.clientId,
          templateType,
          variables,
          options
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate HTML report');
        }

        document = result.document;
        downloadUrl = result.downloadUrl || '';
    }

    return {
      success: true,
      document,
      downloadUrl,
      chartUrls
    };
  }

  private async buildEnhancedTemplateVariables(
    client: Client,
    scenario: CashFlowScenario,
    projectionResult: ProjectionResult,
    options: EnhancedReportOptions,
    chartResults: ChartImageResult[]
  ): Promise<Record<string, any>> {
    const summary = projectionResult.summary;
    const projections = projectionResult.projections;

    // Base variables with i18n support
    const variables: Record<string, any> = {
      // Client Information
      CLIENT_NAME: this.getClientDisplayName(client),
      CLIENT_EMAIL: client.contactInfo?.email || '',
      CLIENT_REF: client.clientRef || '',
      CLIENT_PHONE: client.contactInfo?.phone || '',
      CLIENT_ADDRESS: this.formatClientAddress(client),
      CLIENT_AGE: this.calculateAge(client.personalDetails?.dateOfBirth || ''),
      CLIENT_OCCUPATION: client.personalDetails?.occupation || '',

      // Report Metadata with i18n
      REPORT_DATE: this.formatDate(new Date(), options.locale || 'en-GB'),
      REPORT_TYPE: this.getLocalizedText('ENHANCED_CASH_FLOW_ANALYSIS', options.locale),
      ADVISOR_NAME: this.getLocalizedText('PROFESSIONAL_ADVISOR', options.locale),
      FIRM_NAME: this.getLocalizedText('FINANCIAL_ADVISORY_SERVICES', options.locale),

      // Scenario Information
      SCENARIO_NAME: scenario.scenarioName,
      SCENARIO_TYPE: scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1),
      PROJECTION_YEARS: scenario.projectionYears,
      RETIREMENT_AGE: scenario.retirementAge,
      LIFE_EXPECTANCY: scenario.lifeExpectancy,

      // Financial Position with locale-aware formatting
      CURRENT_INCOME: this.formatCurrency(scenario.currentIncome, options.locale),
      CURRENT_EXPENSES: this.formatCurrency(scenario.currentExpenses, options.locale),
      CURRENT_SAVINGS: this.formatCurrency(scenario.currentSavings, options.locale),
      PENSION_VALUE: this.formatCurrency(scenario.pensionPotValue || scenario.pensionValue || 0, options.locale),
      INVESTMENT_VALUE: this.formatCurrency(scenario.investmentValue, options.locale),

      // Market Assumptions
      INFLATION_RATE: this.formatPercentage(scenario.inflationRate, options.locale),
      EQUITY_RETURN: this.formatPercentage(scenario.realEquityReturn, options.locale),
      BOND_RETURN: this.formatPercentage(scenario.realBondReturn, options.locale),
      CASH_RETURN: this.formatPercentage(scenario.realCashReturn, options.locale),

      // Key Results
      FINAL_PORTFOLIO_VALUE: this.formatCurrency(summary.finalPortfolioValue, options.locale),
      TOTAL_CONTRIBUTIONS: this.formatCurrency(summary.totalContributions, options.locale),
      TOTAL_WITHDRAWALS: this.formatCurrency(summary.totalWithdrawals, options.locale),
      AVERAGE_ANNUAL_RETURN: this.formatPercentage(summary.averageAnnualReturn, options.locale),
      MAX_WITHDRAWAL_RATE: this.formatPercentage(summary.maxWithdrawalRate, options.locale),
      GOAL_ACHIEVEMENT_RATE: this.formatPercentage(summary.goalAchievementRate, options.locale),
      SUSTAINABILITY_RATING: String(summary.sustainabilityRating),

      // Risk Analysis
      SHORTFALL_RISK: String(summary.riskMetrics.shortfallRisk),
      LONGEVITY_RISK: String(summary.riskMetrics.longevityRisk),
      INFLATION_RISK: String(summary.riskMetrics.inflationRisk),
      SEQUENCE_RISK: String(summary.riskMetrics.sequenceRisk),

      // Goal Status
      RETIREMENT_INCOME_ACHIEVED: summary.retirementIncomeAchieved ? 
        this.getLocalizedText('YES', options.locale) : 
        this.getLocalizedText('NO', options.locale),
      EMERGENCY_FUND_ACHIEVED: summary.emergencyFundAchieved ? 
        this.getLocalizedText('YES', options.locale) : 
        this.getLocalizedText('NO', options.locale),

      // Key Insights
      KEY_INSIGHTS: this.formatKeyInsights(summary.keyInsights, options.locale),

      // Enhanced: Chart URLs with accessibility
      CHARTS_SECTION: this.buildChartsSection(chartResults, options),

      // Content flags
      INCLUDE_CHARTS: options.includeCharts ? 'true' : 'false',
      INCLUDE_ASSUMPTIONS: options.includeAssumptions ? 'true' : 'false',
      INCLUDE_RISK_ANALYSIS: options.includeRiskAnalysis ? 'true' : 'false',

      // Accessibility enhancements
      ARIA_LABELS: this.buildAriaLabels(options.locale),
      HIGH_CONTRAST: options.accessibility?.highContrast ? 'true' : 'false',
      FONT_SIZE: options.accessibility?.fontSize || 'medium',

      // Theme variables
      THEME: options.theme || 'light',
      CUSTOM_CSS: this.buildCustomCSS(options),
      
      // Additional variables for other template types
      RISK_PROFILE: (scenario as any).riskProfile || 'Moderate',
      INVESTMENT_OBJECTIVE: (scenario as any).investmentObjective || 'Growth',
      TIME_HORIZON: `${scenario.projectionYears} years`,
      CAPACITY_FOR_LOSS: (scenario as any).capacityForLoss || 'Medium',
      PORTFOLIO_RECOMMENDATION: 'Diversified portfolio aligned with risk profile',
      REVIEW_PERIOD: new Date().getFullYear(),
      ANNUAL_PERFORMANCE: '+8.5%', // Placeholder
      TIMELINE_EVENTS: '<div class="timeline-item">Key events</div>'
    };

    // Add conditional content
    if (options.includeProjectionTable) {
      variables.PROJECTION_TABLE = this.buildProjectionTable(
        projections.slice(0, options.reportPeriodYears || 20),
        options.locale
      );
    }

    if (options.includeAssumptions) {
      variables.ASSUMPTIONS_TABLE = this.buildAssumptionsTable(scenario, options.locale);
    }

    if (options.includeRiskAnalysis) {
      variables.RISK_ANALYSIS_SECTION = this.buildRiskAnalysisSection(
        summary.riskMetrics,
        options.locale
      );
    }

    return variables;
  }

  private setupRealtimeSubscriptions(): void {
    // Set up general report progress channel
    this.supabase
      .channel('report-progress')
      .on('broadcast', { event: 'progress-update' }, (payload) => {
        const callback = this.progressCallbacks.get(payload.reportId);
        if (callback) {
          callback(payload.progress);
        }
      })
      .subscribe();
  }

  private broadcastProgress(reportId: string, progress: ReportProgress): void {
    this.supabase
      .channel('report-progress')
      .send({
        type: 'broadcast',
        event: 'progress-update',
        payload: { reportId, progress }
      });
  }

  private createReportError(error: any, stage: string, recoverable: boolean): ReportGenerationError {
    const reportError = new Error(error instanceof Error ? error.message : 'Unknown error') as ReportGenerationError;
    reportError.code = error?.code || 'UNKNOWN_ERROR';
    reportError.stage = stage;
    reportError.recoverable = recoverable;
    reportError.retryAfter = recoverable ? 5000 : undefined;
    return reportError;
  }

  private estimateTimeRemaining(progress: number): number {
    // Simple time estimation based on progress
    const baseTime = 30000; // 30 seconds base time
    const remaining = Math.max(0, (100 - progress) / 100);
    return Math.round(baseTime * remaining);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getLocalizedText(key: string, locale?: string): string {
    // TODO: Implement proper i18n
    const translations: Record<string, Record<string, string>> = {
      'en-GB': {
        ENHANCED_CASH_FLOW_ANALYSIS: 'Enhanced Cash Flow Analysis',
        PROFESSIONAL_ADVISOR: 'Professional Advisor',
        FINANCIAL_ADVISORY_SERVICES: 'Financial Advisory Services',
        YES: 'Yes',
        NO: 'No',
        YEAR: 'Year',
        AGE: 'Age',
        TOTAL_INCOME: 'Total Income',
        TOTAL_EXPENSES: 'Total Expenses',
        PORTFOLIO_VALUE: 'Portfolio Value',
        ANNUAL_SURPLUS: 'Annual Surplus',
        INFLATION_RATE: 'Inflation Rate',
        REAL_EQUITY_RETURN: 'Real Equity Return',
        REAL_BOND_RETURN: 'Real Bond Return',
        REAL_CASH_RETURN: 'Real Cash Return',
        RETIREMENT_AGE: 'Retirement Age',
        LIFE_EXPECTANCY: 'Life Expectancy',
        ASSUMPTION: 'Assumption',
        VALUE: 'Value',
        SHORTFALL_RISK: 'Shortfall Risk',
        LONGEVITY_RISK: 'Longevity Risk',
        INFLATION_RISK: 'Inflation Risk',
        SEQUENCE_RISK: 'Sequence Risk',
        RISK_ANALYSIS_SUMMARY: 'Risk Analysis Summary'
      }
    };

    return translations[locale || 'en-GB']?.[key] || key;
  }

  private formatDate(date: Date, locale?: string): string {
    return new Intl.DateTimeFormat(locale || 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  private formatCurrency(amount: number, locale?: string): string {
    return new Intl.NumberFormat(locale || 'en-GB', {
      style: 'currency',
      currency: locale?.startsWith('en') ? 'GBP' : 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  private formatPercentage(rate: number, locale?: string): string {
    return new Intl.NumberFormat(locale || 'en-GB', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format((rate || 0) / 100);
  }

  private buildChartsSection(chartResults: ChartImageResult[], options: EnhancedReportOptions): string {
    if (!chartResults.length) return '';

    const isHighContrast = options.accessibility?.highContrast;
    const fontSize = options.accessibility?.fontSize || 'medium';
    
    let chartsHtml = `<div class="charts-section" style="margin: 20px 0;">`;
    chartsHtml += `<h3 style="color: ${isHighContrast ? '#000' : '#333'}; margin-bottom: 15px; font-size: ${this.getFontSize(fontSize, 'h3')};">`;
    chartsHtml += this.getLocalizedText('ANALYSIS_CHARTS', options.locale);
    chartsHtml += '</h3>';

    chartResults.forEach((result, index) => {
      const chartType = options.chartTypes?.[index] || 'chart';
      console.log('🔍 Chart processing:', { index, chartType, hasChartTypes: !!options.chartTypes });
      const title = (chartType || 'chart').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      chartsHtml += `
        <div style="margin: 20px 0; text-align: center; page-break-inside: avoid;">
          <h4 style="margin-bottom: 10px; color: ${isHighContrast ? '#000' : '#007acc'}; font-size: ${this.getFontSize(fontSize, 'h4')};">${title}</h4>
          <img 
            src="${result.url || result.base64}" 
            alt="${title} showing financial data visualization" 
            style="max-width: 100%; height: auto; border: 1px solid ${isHighContrast ? '#000' : '#ddd'}; border-radius: 4px;"
            role="img"
            aria-describedby="chart-${index}-desc"
          />
          ${options.accessibility?.screenReader ? `<div id="chart-${index}-desc" class="sr-only">Chart showing ${title.toLowerCase()} with detailed financial projections</div>` : ''}
        </div>
      `;
    });

    chartsHtml += '</div>';
    return chartsHtml;
  }

  private buildAriaLabels(locale?: string): Record<string, string> {
    return {
      REPORT_TITLE: this.getLocalizedText('FINANCIAL_REPORT', locale),
      CHART_SECTION: this.getLocalizedText('CHARTS_AND_VISUALIZATIONS', locale),
      DATA_TABLE: this.getLocalizedText('FINANCIAL_DATA_TABLE', locale),
      RISK_ANALYSIS: this.getLocalizedText('RISK_ANALYSIS_SECTION', locale)
    };
  }

  private buildCustomCSS(options: EnhancedReportOptions): string {
    const customizations = options.customizations || {};
    const accessibility = options.accessibility || {
      highContrast: false,
      fontSize: 'medium' as const,
      screenReader: false
    };
    
    let css = '';
    
    if (accessibility.highContrast) {
      css += `
        body { background: #fff !important; color: #000 !important; }
        .chart-container { border: 2px solid #000 !important; }
        h1, h2, h3, h4, h5, h6 { color: #000 !important; }
      `;
    }
    
    if (customizations.colors) {
      Object.entries(customizations.colors).forEach(([property, color]) => {
        css += `--${property}: ${color}; `;
      });
    }
    
    return css;
  }

  private getFontSize(size: string, element: string): string {
    const sizes = {
      small: { body: '12px', h1: '24px', h2: '20px', h3: '16px', h4: '14px', p: '12px', small: '10px' },
      medium: { body: '14px', h1: '28px', h2: '24px', h3: '18px', h4: '16px', p: '14px', small: '12px' },
      large: { body: '18px', h1: '36px', h2: '30px', h3: '22px', h4: '20px', p: '18px', small: '16px' }
    };
    
    return sizes[size as keyof typeof sizes]?.[element as keyof typeof sizes.small] || '14px';
  }

  // Additional helper methods (keeping existing ones but enhancing them)
  private async generateHTMLReport(
    clientId: string, 
    templateType: string, 
    variables: Record<string, any>,
    options: EnhancedReportOptions
  ): Promise<{ 
    success: boolean; 
    htmlContent?: string; 
    document?: any; 
    downloadUrl?: string; 
    error?: string 
  }> {
    try {
      // Generate template dynamically
      const templateContent = this.generateDynamicTemplate(
        templateType as 'cashflow' | 'suitability' | 'review',
        options
      );
      
      // Populate with variables
      const htmlContent = this.populateTemplate(templateContent, variables);
      
      // Save HTML to storage
      const fileName = `${templateType || 'report'}-report-${clientId}-${Date.now()}.html`;
      const filePath = `generated_documents/${clientId}/${fileName}`;
      
      const { error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
          contentType: 'text/html',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload HTML: ${uploadError.message}`);
      }

      // Create database record
      const { data: document, error: dbError } = await this.supabase
        .from('generated_documents')
        .insert({
          client_id: clientId,
          template_id: '431bb8f9-a82b-4b9a-81b8-73ea32acdd20',
          file_name: fileName,
          file_path: filePath,
          file_type: 'text/html',
          title: `Enhanced ${templateType || 'Report'} Report` // Added required title field
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to save document record: ${dbError.message}`);
      }

      const downloadUrl = await this.getDocumentDownloadUrl(filePath);

      return {
        success: true,
        document,
        downloadUrl,
        htmlContent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTML generation failed'
      };
    }
  }

  private async saveReportMetadata(
    reportId: string,
    scenarioId: string,
    templateType: string,
    result: EnhancedReportResult
  ): Promise<void> {
    try {
      const metadata: Partial<ReportMetadata> = {
        id: reportId,
        scenarioId,
        templateType,
        version: '2.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system', // TODO: Get from auth
        fileSize: 0, // TODO: Calculate
        language: 'en-GB',
        accessibility: false
      };

      await this.supabase
        .from('report_metadata')
        .insert(metadata);

    } catch (error) {
      console.warn('Failed to save report metadata:', error);
    }
  }

  // Keep all existing helper methods but enhance them with proper error handling and localization
  private getTemplateIdForType(templateType: string): string {
    const templateMap: Record<string, string> = {
      'cashflow': 'enhanced-cashflow-analysis-template',
      'suitability': 'enhanced-suitability-report-template',
      'review': 'enhanced-annual-review-template'
    };
    return templateMap[templateType] || templateMap['cashflow'];
  }

  /**
   * Enhanced template population with Handlebars-style conditionals
   */
  private populateTemplate(content: string, variables: Record<string, any>): string {
    console.log('🔍 populateTemplate called:', {
      contentLength: content?.length,
      variableKeys: Object.keys(variables || {}),
      contentType: typeof content
    });
    if (!content || typeof content !== 'string') {
      console.error('❌ populateTemplate: Invalid content:', { content, type: typeof content });
      return content || '';
    }

    let populated = content;

    // Handle conditional sections ({{#if CONDITION}} ... {{/if}})
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    populated = populated.replace(conditionalRegex, (match, condition, innerContent) => {
      const conditionValue = variables[condition];
      
      // Check if condition is truthy
      if (conditionValue === 'true' || conditionValue === true || 
          (typeof conditionValue === 'string' && conditionValue.length > 0) ||
          (typeof conditionValue === 'number' && conditionValue > 0)) {
        return innerContent;
      }
      return '';
    });
    
    // Replace all variables
    for (const key in variables) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      populated = populated.replace(regex, String(variables[key] || ''));
    }
    
    // Clean up any remaining unpopulated variables
    populated = populated.replace(/{{[^}]*}}/g, '');
    
    return populated;
  }

  private async generateChartPlaceholders(chartTypes: string[]): Promise<string[]> {
    console.log('🔍 generateChartPlaceholders called:', { chartTypes, length: chartTypes?.length });
    return chartTypes.map((type, index) => {
      console.log('🔍 Processing chart type:', { index, type, typeOf: typeof type });
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#6c757d">
            ${(type || 'chart').replace('_', ' ').toUpperCase()} CHART PREVIEW
          </text>
        </svg>
      `)}`
    });
  }

  /**
   * Infer template type from template ID
   */
  private inferTemplateType(templateId: string): 'cashflow' | 'suitability' | 'review' {
    if (templateId.includes('cashflow') || templateId.includes('cash-flow')) {
      return 'cashflow';
    }
    if (templateId.includes('suitability')) {
      return 'suitability';
    }
    if (templateId.includes('review')) {
      return 'review';
    }
    return 'cashflow'; // Default
  }

  // Keep all other existing helper methods with enhancements...
  private getClientDisplayName(client: Client): string {
    const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : '';
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${title}${firstName} ${lastName}`.trim();
  }

  private formatClientAddress(client: Client): string {
    if (!client.contactInfo?.address) return '';
    
    const addr = client.contactInfo.address;
    return [addr.line1, addr.line2, addr.city, addr.county, addr.postcode]
      .filter(Boolean)
      .join(', ');
  }

  private calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;
    
    try {
      const today = new Date();
      const birth = new Date(dateOfBirth);
      
      if (isNaN(birth.getTime())) return 0;
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return Math.max(0, age);
    } catch (error) {
      return 0;
    }
  }

  private formatKeyInsights(insights: string[], locale?: string): string {
    if (!Array.isArray(insights)) return '';
    return insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('');
  }

  private buildProjectionTable(projections: CashFlowProjection[], locale?: string): string {
    if (!projections.length) return '';

    const headers = {
      year: this.getLocalizedText('YEAR', locale),
      age: this.getLocalizedText('AGE', locale),
      income: this.getLocalizedText('TOTAL_INCOME', locale),
      expenses: this.getLocalizedText('TOTAL_EXPENSES', locale),
      portfolio: this.getLocalizedText('PORTFOLIO_VALUE', locale),
      surplus: this.getLocalizedText('ANNUAL_SURPLUS', locale)
    };

    let table = `
      <table class="projection-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">${headers.year}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.age}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.income}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.expenses}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.portfolio}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.surplus}</th>
          </tr>
        </thead>
        <tbody>
    `;

    projections.forEach((projection, index) => {
      table += `
        <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
          <td style="border: 1px solid #dee2e6; padding: 8px;">${projection.projectionYear}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${projection.clientAge}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatCurrency(projection.totalIncome, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatCurrency(projection.totalExpenses, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatCurrency(projection.totalAssets, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatCurrency(projection.annualSurplusDeficit, locale)}</td>
        </tr>
      `;
    });

    table += `</tbody></table>`;
    return table;
  }

  private buildAssumptionsTable(scenario: CashFlowScenario, locale?: string): string {
    const labels = {
      inflation: this.getLocalizedText('INFLATION_RATE', locale),
      equity: this.getLocalizedText('REAL_EQUITY_RETURN', locale),
      bond: this.getLocalizedText('REAL_BOND_RETURN', locale),
      cash: this.getLocalizedText('REAL_CASH_RETURN', locale),
      retirement: this.getLocalizedText('RETIREMENT_AGE', locale),
      life: this.getLocalizedText('LIFE_EXPECTANCY', locale)
    };

    return `
      <table class="assumptions-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">${this.getLocalizedText('ASSUMPTION', locale)}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.getLocalizedText('VALUE', locale)}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.inflation}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatPercentage(scenario.inflationRate, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.equity}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatPercentage(scenario.realEquityReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.bond}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatPercentage(scenario.realBondReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.cash}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${this.formatPercentage(scenario.realCashReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.retirement}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${scenario.retirementAge}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.life}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${scenario.lifeExpectancy}</td></tr>
        </tbody>
      </table>
    `;
  }

  private buildRiskAnalysisSection(riskMetrics: any, locale?: string): string {
    const labels = {
      shortfall: this.getLocalizedText('SHORTFALL_RISK', locale),
      longevity: this.getLocalizedText('LONGEVITY_RISK', locale),
      inflation: this.getLocalizedText('INFLATION_RISK', locale),
      sequence: this.getLocalizedText('SEQUENCE_RISK', locale),
      summary: this.getLocalizedText('RISK_ANALYSIS_SUMMARY', locale)
    };

    return `
      <div class="risk-analysis-section" style="margin: 20px 0;">
        <h4 style="color: #333; margin-bottom: 15px;">${labels.summary}</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.shortfall}:</strong> ${String(riskMetrics.shortfallRisk)}
          </div>
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.longevity}:</strong> ${String(riskMetrics.longevityRisk)}
          </div>
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.inflation}:</strong> ${String(riskMetrics.inflationRisk)}
          </div>
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.sequence}:</strong> ${String(riskMetrics.sequenceRisk)}
          </div>
        </div>
      </div>
    `;
  }

  private async savePDFToStorage(
    pdfBuffer: Buffer,
    fileName: string,
    clientId: string
  ): Promise<any> {
    const filePath = `generated_documents/${clientId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    const { data, error: dbError } = await this.supabase
      .from('generated_documents')
      .insert({
        client_id: clientId,
        template_id: '431bb8f9-a82b-4b9a-81b8-73ea32acdd20',
        file_name: fileName,
        file_path: filePath,
        file_type: 'application/pdf',
        title: 'Enhanced Cash Flow Report (PDF)' // Added required title field
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save PDF record: ${dbError.message}`);
    }

    return data;
  }

  private async saveExcelToStorage(
    excelBuffer: Buffer,
    fileName: string,
    clientId: string
  ): Promise<any> {
    const filePath = `generated_documents/${clientId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload Excel: ${uploadError.message}`);
    }

    const { data, error: dbError } = await this.supabase
      .from('generated_documents')
      .insert({
        client_id: clientId,
        template_id: '431bb8f9-a82b-4b9a-81b8-73ea32acdd20',
        file_name: fileName,
        file_path: filePath,
        file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        title: 'Cash Flow Report (Excel)'
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save Excel record: ${dbError.message}`);
    }

    return data;
  }

  private async savePowerPointToStorage(
    pptBuffer: Buffer,
    fileName: string,
    clientId: string
  ): Promise<any> {
    const filePath = `generated_documents/${clientId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, pptBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload PowerPoint: ${uploadError.message}`);
    }

    const { data, error: dbError } = await this.supabase
      .from('generated_documents')
      .insert({
        client_id: clientId,
        template_id: '431bb8f9-a82b-4b9a-81b8-73ea32acdd20',
        file_name: fileName,
        file_path: filePath,
        file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        title: 'Cash Flow Report (PowerPoint)'
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save PowerPoint record: ${dbError.message}`);
    }

    return data;
  }

  private async getDocumentDownloadUrl(filePath: string): Promise<string> {
    if (!filePath || typeof filePath !== 'string') {
      console.error('❌ getDocumentDownloadUrl: Invalid filePath:', filePath);
      return '';
    }

    const { data } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    return data?.signedUrl || '';
  }
}