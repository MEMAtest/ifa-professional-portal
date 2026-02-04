// ================================================================
// src/services/EnhancedCashFlowReportService.ts - PRODUCTION READY & FIXED
// Uses robust client-side initialization.
// ================================================================

import { ClientService } from './ClientService';
import { CashFlowDataService } from './CashFlowDataService';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { PDFGenerationEngine } from '@/lib/pdf/generatePDF';
import { EnhancedChartService, type ChartImageResult } from './EnhancedChartService';
import { ExcelGenerator } from '@/lib/export/ExcelGenerator';
import { createClient } from '@/lib/supabase/client'
import type { CashFlowScenario, ProjectionResult } from '@/types/cashflow';
import type { Client } from '@/types/client';
import type { SupabaseClient } from '@supabase/supabase-js'; // FIX: Import type
import { buildAriaLabels, buildAssumptionsTable, buildChartsSection, buildCustomCSS, buildProjectionTable, buildRiskAnalysisSection, buildTimelineEvents } from './cashflow-report/sections';
import { calculateAge, formatClientAddress, getClientDisplayName } from './cashflow-report/client';
import { calculateAnnualPerformance, formatKeyInsights } from './cashflow-report/insights';
import { formatCurrency, formatDate, formatPercentage, formatSignedPercentage, getLocalizedText } from './cashflow-report/formatters';
import { generateDynamicTemplate } from './cashflow-report/templates';
import { generateChartPlaceholders, inferTemplateType, populateTemplate } from './cashflow-report/template-utils';
import type { EnhancedReportOptions, EnhancedReportResult, ReportGenerationError, ReportMetadata, ReportProgress, ReportTemplateType } from './cashflow-report/types';
import clientLogger from '@/lib/logging/clientLogger'
export type { EnhancedReportOptions, EnhancedReportResult, ReportGenerationError, ReportMetadata, ReportProgress, ReportTemplateType } from './cashflow-report/types';
export { useReportGeneration, useReportHistory, useReportPreview } from './cashflow-report/hooks';

// ================================================================
// MAIN SERVICE CLASS
// ================================================================

export class EnhancedCashFlowReportService {
  private static instance: EnhancedCashFlowReportService;
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
        await this.saveReportMetadata(reportId, scenarioId, scenario.clientId, templateType, result);
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
        clientLogger.error('❌ EnhancedCashFlowReportService error details:', {
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

      let chartResults: ChartImageResult[] = [];
      if (options.includeCharts && options.chartTypes?.length) {
        try {
          chartResults = await this.generateChartsWithProgress(
            projectionResult,
            scenario,
            options
          );
        } catch (chartError) {
          const placeholders = generateChartPlaceholders(options.chartTypes || []);
          chartResults = placeholders.map((url) => ({
            base64: url,
            blob: new Blob(),
            mimeType: 'image/svg+xml',
            width: 800,
            height: 400,
            url
          }));
        }
      }

      const variables = await this.buildEnhancedTemplateVariables(
        client,
        scenario,
        projectionResult,
        options,
        chartResults
      );

      // Use dynamic template generation
      const templateContent = generateDynamicTemplate(templateType as ReportTemplateType, options);
      
      // Populate the template with variables
      const htmlContent = populateTemplate(templateContent, variables);

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
    const mapMetadataRow = (row: any): ReportMetadata => ({
      id: row.id,
      scenarioId: row.scenario_id || '',
      clientId: row.client_id,
      templateType: row.template_type || inferTemplateType(row.template_id || row.title || 'cashflow'),
      version: row.version || '2.0',
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : (row.created_at ? new Date(row.created_at) : new Date()),
      createdBy: row.created_by || 'system',
      fileSize: row.file_size || 0,
      pageCount: row.page_count ?? undefined,
      language: row.language || 'en-GB',
      accessibility: Boolean(row.accessibility)
    });

    try {
      const { data, error } = await this.supabase
        .from('report_metadata')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(mapMetadataRow);
      }

      if (error) {
        console.warn('Report metadata fetch failed, falling back to generated documents:', error);
      }
    } catch (error) {
      console.warn('Report metadata fetch failed, falling back to generated documents:', error);
    }

    try {
      const { data, error } = await this.supabase
        .from('generated_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch generated documents: ${error.message}`);
      }

      return (data || []).map((row: any) =>
        mapMetadataRow({
          ...row,
          template_type: inferTemplateType(row.template_id || row.title || 'cashflow'),
          version: '2.0',
          created_by: row.created_by || 'system',
          file_size: row.file_size || 0,
          language: 'en-GB',
          accessibility: false
        })
      );
    } catch (error) {
      clientLogger.error('Error fetching report history:', error);
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
        const templateContent = generateDynamicTemplate(
          templateType as ReportTemplateType,
          options
        );

        const htmlContent = populateTemplate(templateContent, variables);

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
    const finalProjection = projections[projections.length - 1];
    const finalPortfolioReal = finalProjection?.realTermsValue ?? summary.finalPortfolioValue;

    // Base variables with i18n support
    const variables: Record<string, any> = {
      // Client Information
      CLIENT_NAME: getClientDisplayName(client),
      CLIENT_EMAIL: client.contactInfo?.email || '',
      CLIENT_REF: client.clientRef || '',
      CLIENT_PHONE: client.contactInfo?.phone || '',
      CLIENT_ADDRESS: formatClientAddress(client),
      CLIENT_AGE: calculateAge(client.personalDetails?.dateOfBirth || ''),
      CLIENT_OCCUPATION: client.personalDetails?.occupation || '',

      // Report Metadata with i18n
      REPORT_DATE: formatDate(new Date(), options.locale || 'en-GB'),
      REPORT_TYPE: getLocalizedText('ENHANCED_CASH_FLOW_ANALYSIS', options.locale),
      ADVISOR_NAME: getLocalizedText('PROFESSIONAL_ADVISOR', options.locale),
      FIRM_NAME: getLocalizedText('FINANCIAL_ADVISORY_SERVICES', options.locale),

      // Scenario Information
      SCENARIO_NAME: scenario.scenarioName,
      SCENARIO_TYPE: scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1),
      PROJECTION_YEARS: scenario.projectionYears,
      RETIREMENT_AGE: scenario.retirementAge,
      LIFE_EXPECTANCY: scenario.lifeExpectancy,

      // Financial Position with locale-aware formatting
      CURRENT_INCOME: formatCurrency(scenario.currentIncome, options.locale),
      CURRENT_EXPENSES: formatCurrency(scenario.currentExpenses, options.locale),
      CURRENT_SAVINGS: formatCurrency(scenario.currentSavings, options.locale),
      PENSION_VALUE: formatCurrency(scenario.pensionPotValue || scenario.pensionValue || 0, options.locale),
      INVESTMENT_VALUE: formatCurrency(scenario.investmentValue, options.locale),

      // Market Assumptions
      INFLATION_RATE: formatPercentage(scenario.inflationRate, options.locale),
      EQUITY_RETURN: formatPercentage(scenario.realEquityReturn, options.locale),
      BOND_RETURN: formatPercentage(scenario.realBondReturn, options.locale),
      CASH_RETURN: formatPercentage(scenario.realCashReturn, options.locale),

      // Key Results
      FINAL_PORTFOLIO_VALUE: formatCurrency(summary.finalPortfolioValue, options.locale),
      FINAL_PORTFOLIO_VALUE_REAL: formatCurrency(finalPortfolioReal, options.locale),
      TOTAL_CONTRIBUTIONS: formatCurrency(summary.totalContributions, options.locale),
      TOTAL_WITHDRAWALS: formatCurrency(summary.totalWithdrawals, options.locale),
      AVERAGE_ANNUAL_RETURN: formatPercentage(summary.averageAnnualReturn, options.locale),
      MAX_WITHDRAWAL_RATE: formatPercentage(summary.maxWithdrawalRate, options.locale),
      GOAL_ACHIEVEMENT_RATE: formatPercentage(summary.goalAchievementRate, options.locale),
      SUSTAINABILITY_RATING: String(summary.sustainabilityRating),

      // Risk Analysis
      SHORTFALL_RISK: String(summary.riskMetrics.shortfallRisk),
      LONGEVITY_RISK: String(summary.riskMetrics.longevityRisk),
      INFLATION_RISK: String(summary.riskMetrics.inflationRisk),
      SEQUENCE_RISK: String(summary.riskMetrics.sequenceRisk),

      // Goal Status
      RETIREMENT_INCOME_ACHIEVED: summary.retirementIncomeAchieved ? 
        getLocalizedText('YES', options.locale) : 
        getLocalizedText('NO', options.locale),
      EMERGENCY_FUND_ACHIEVED: summary.emergencyFundAchieved ? 
        getLocalizedText('YES', options.locale) : 
        getLocalizedText('NO', options.locale),

      // Key Insights
      KEY_INSIGHTS: formatKeyInsights(summary.keyInsights, options.locale),

      // Enhanced: Chart URLs with accessibility
      CHARTS_SECTION: buildChartsSection(chartResults, options),

      // Content flags
      INCLUDE_CHARTS: options.includeCharts ? 'true' : 'false',
      INCLUDE_ASSUMPTIONS: options.includeAssumptions ? 'true' : 'false',
      INCLUDE_RISK_ANALYSIS: options.includeRiskAnalysis ? 'true' : 'false',
      INCLUDE_PROJECTION_TABLE: options.includeProjectionTable ? 'true' : 'false',
      includeProjectionTable: options.includeProjectionTable ? 'true' : 'false',

      // Accessibility enhancements
      ARIA_LABELS: buildAriaLabels(options.locale),
      HIGH_CONTRAST: options.accessibility?.highContrast ? 'true' : 'false',
      FONT_SIZE: options.accessibility?.fontSize || 'medium',

      // Theme variables
      THEME: options.theme || 'light',
      CUSTOM_CSS: buildCustomCSS(options),
      
      // Additional variables for other template types
      RISK_PROFILE: (scenario as any).riskProfile || 'Moderate',
      INVESTMENT_OBJECTIVE: (scenario as any).investmentObjective || 'Growth',
      TIME_HORIZON: `${scenario.projectionYears} years`,
      CAPACITY_FOR_LOSS: (scenario as any).capacityForLoss || 'Medium',
      PORTFOLIO_RECOMMENDATION: 'Diversified portfolio aligned with risk profile',
      REVIEW_PERIOD: new Date().getFullYear(),
      ANNUAL_PERFORMANCE: formatSignedPercentage(
        calculateAnnualPerformance(projections, summary),
        options.locale
      ),
      TIMELINE_EVENTS: buildTimelineEvents(scenario)
    };

    // Add conditional content
    if (options.includeProjectionTable) {
      variables.PROJECTION_TABLE = buildProjectionTable(
        projections.slice(0, options.reportPeriodYears || 20),
        options.locale
      );
    }

    if (options.includeAssumptions) {
      variables.ASSUMPTIONS_TABLE = buildAssumptionsTable(scenario, options.locale);
    }

    if (options.includeRiskAnalysis) {
      variables.RISK_ANALYSIS_SECTION = buildRiskAnalysisSection(
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
      const templateContent = generateDynamicTemplate(
        templateType as ReportTemplateType,
        options
      );
      
      // Populate with variables
      const htmlContent = populateTemplate(templateContent, variables);
      
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
    clientId: string,
    templateType: string,
    result: EnhancedReportResult
  ): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REPORT_METADATA !== 'true') {
        return;
      }

      const { data: { user } } = await this.supabase.auth.getUser();
      const createdBy = user?.id || null;
      const fileSize = (result.document as any)?.fileSize
        || (result.document as any)?.size
        || result.metadata?.fileSize
        || 0;

      const metadata = {
        id: reportId,
        scenario_id: scenarioId,
        client_id: clientId,
        template_type: templateType,
        version: '2.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: createdBy,
        file_size: fileSize,
        page_count: result.metadata?.pageCount ?? null,
        language: 'en-GB',
        accessibility: false
      };

      const { error } = await this.supabase
        .from('report_metadata')
        .insert(metadata);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.warn('Failed to save report metadata:', error);
    }
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
      clientLogger.error('❌ getDocumentDownloadUrl: Invalid filePath:', filePath);
      return '';
    }

    const { data } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    return data?.signedUrl || '';
  }
}
