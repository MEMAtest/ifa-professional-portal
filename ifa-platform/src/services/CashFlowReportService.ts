// ================================================================
// src/services/CashFlowReportService.ts
// Integrates with your existing DocumentGenerationService
// NOW WITH REAL PDF GENERATION using @react-pdf/renderer
// ================================================================

import { DocumentGenerationService, type DocumentGenerationParams } from './documentGenerationService';
import { ClientService } from './ClientService';
import { CashFlowDataService } from './CashFlowDataService';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { PDFGenerator, type PDFReportData } from '@/lib/pdf/PDFGenerator';
import type { CashFlowScenario, ProjectionResult } from '@/types/cashflow';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/types/client';
import { advisorContextService, type ReportContext } from './AdvisorContextService';

export interface CashFlowReportOptions {
  includeCharts: boolean;
  includeAssumptions: boolean;
  includeRiskAnalysis: boolean;
  includeProjectionTable: boolean;
  reportPeriodYears?: number;
  comparisonScenarios?: string[];
  outputFormat?: 'pdf' | 'html';
}

export interface CashFlowReportResult {
  success: boolean;
  document?: any;
  error?: string;
  downloadUrl?: string;
  pdfBlob?: Blob;
  pdfBase64?: string;
}

export class CashFlowReportService {
  private documentService: DocumentGenerationService;
  private clientService: ClientService;

  constructor() {
    this.documentService = new DocumentGenerationService();
    this.clientService = new ClientService();
  }

  /**
   * Generate comprehensive cash flow report using your existing document system
   */
  async generateCashFlowReport(
    scenarioId: string,
    templateType: 'cashflow' | 'suitability' | 'review',
    options: CashFlowReportOptions = {
      includeCharts: true,
      includeAssumptions: true,
      includeRiskAnalysis: true,
      includeProjectionTable: true,
      reportPeriodYears: 20
    }
  ): Promise<CashFlowReportResult> {
    try {
      // 1. Gather all required data
      const scenario = await CashFlowDataService.getScenario(scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      const client = await this.clientService.getClientById(scenario.clientId);
      const projectionResult = await ProjectionEngine.generateProjections(scenario);

      // 2. Get the appropriate template ID based on type
      const templateId = this.getTemplateIdForType(templateType);

      // 3. Build template variables using your {{variable}} syntax
      const variables = await this.buildTemplateVariables(
        client, 
        scenario, 
        projectionResult, 
        options
      );

      // 4. Use your existing DocumentGenerationService
      console.log('📄 Generating document with templateId:', templateId);
      console.log('📊 Variables keys:', Object.keys(variables));

      const document = await this.documentService.generateDocument({
        templateId,
        clientId: scenario.clientId,
        variables,
        outputFormat: 'html', // Will be enhanced to PDF later
        title: `Cash Flow Analysis - ${scenario.scenarioName || 'Report'}` // Added required title field
      });

      console.log('✅ Document generated:', { id: document.id, filePath: document.filePath });

      // 5. Generate download URL
      const downloadUrl = await this.getDocumentDownloadUrl(document.filePath);

      return {
        success: true,
        document,
        downloadUrl
      };

    } catch (error) {
      console.error('Error generating cash flow report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  /**
   * Build template variables that map to your {{variable}} system
   */
  private async buildTemplateVariables(
    client: Client,
    scenario: CashFlowScenario,
    projectionResult: ProjectionResult,
    options: CashFlowReportOptions
  ): Promise<Record<string, any>> {
    const summary = projectionResult.summary;
    const projections = projectionResult.projections;

    // Get advisor and firm context dynamically
    const reportContext = await advisorContextService.getReportContext();

    // Base client variables (already used in your system)
    const variables: Record<string, any> = {
      // Client Information
      CLIENT_NAME: this.getClientDisplayName(client),
      CLIENT_EMAIL: client.contactInfo.email,
      CLIENT_REF: client.clientRef,
      CLIENT_PHONE: client.contactInfo.phone,
      CLIENT_ADDRESS: this.formatClientAddress(client),
      CLIENT_AGE: this.calculateAge(client.personalDetails.dateOfBirth),
      CLIENT_OCCUPATION: client.personalDetails.occupation,

      // Report Metadata - now using dynamic context
      REPORT_DATE: new Date().toLocaleDateString('en-GB'),
      GENERATED_DATE: reportContext.generatedDate,
      REPORT_TYPE: 'Cash Flow Analysis',
      ADVISOR_NAME: reportContext.advisorName,
      FIRM_NAME: reportContext.firmName,
      COMPLIANCE_REF: reportContext.complianceRef,
      FIRM_FCA_NUMBER: reportContext.firmFcaNumber,
      FIRM_ADDRESS: reportContext.firmAddress,
      FIRM_PHONE: reportContext.firmPhone,
      FIRM_EMAIL: reportContext.firmEmail,

      // Scenario Information
      SCENARIO_NAME: scenario.scenarioName,
      SCENARIO_TYPE: scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1),
      PROJECTION_YEARS: scenario.projectionYears,
      RETIREMENT_AGE: scenario.retirementAge,
      LIFE_EXPECTANCY: scenario.lifeExpectancy,

      // Financial Position
      CURRENT_INCOME: this.formatCurrency(scenario.currentIncome),
      CURRENT_EXPENSES: this.formatCurrency(scenario.currentExpenses),
      CURRENT_SAVINGS: this.formatCurrency(scenario.currentSavings),
      PENSION_VALUE: this.formatCurrency(scenario.pensionPotValue),
      INVESTMENT_VALUE: this.formatCurrency(scenario.investmentValue),

      // Market Assumptions
      INFLATION_RATE: this.formatPercentage(scenario.inflationRate),
      EQUITY_RETURN: this.formatPercentage(scenario.realEquityReturn),
      BOND_RETURN: this.formatPercentage(scenario.realBondReturn),
      CASH_RETURN: this.formatPercentage(scenario.realCashReturn),

      // Key Results
      FINAL_PORTFOLIO_VALUE: this.formatCurrency(summary.finalPortfolioValue),
      TOTAL_CONTRIBUTIONS: this.formatCurrency(summary.totalContributions),
      TOTAL_WITHDRAWALS: this.formatCurrency(summary.totalWithdrawals),
      AVERAGE_ANNUAL_RETURN: this.formatPercentage(summary.averageAnnualReturn),
      MAX_WITHDRAWAL_RATE: this.formatPercentage(summary.maxWithdrawalRate),
      GOAL_ACHIEVEMENT_RATE: this.formatPercentage(summary.goalAchievementRate),
      SUSTAINABILITY_RATING: summary.sustainabilityRating,

      // Risk Analysis
      SHORTFALL_RISK: summary.riskMetrics.shortfallRisk,
      LONGEVITY_RISK: summary.riskMetrics.longevityRisk,
      INFLATION_RISK: summary.riskMetrics.inflationRisk,
      SEQUENCE_RISK: summary.riskMetrics.sequenceRisk,

      // Goal Status
      RETIREMENT_INCOME_ACHIEVED: summary.retirementIncomeAchieved ? 'Yes' : 'No',
      EMERGENCY_FUND_ACHIEVED: summary.emergencyFundAchieved ? 'Yes' : 'No',

      // Key Insights
      KEY_INSIGHTS: this.formatKeyInsights(summary.keyInsights),

      // Conditional Content
      INCLUDE_CHARTS: options.includeCharts ? 'true' : 'false',
      INCLUDE_ASSUMPTIONS: options.includeAssumptions ? 'true' : 'false',
      INCLUDE_RISK_ANALYSIS: options.includeRiskAnalysis ? 'true' : 'false',
    };

    // Add projection table if requested
    if (options.includeProjectionTable) {
      variables.PROJECTION_TABLE = this.buildProjectionTable(
        projections.slice(0, options.reportPeriodYears || 20)
      );
    }

    // Add assumptions table if requested
    if (options.includeAssumptions) {
      variables.ASSUMPTIONS_TABLE = this.buildAssumptionsTable(scenario);
    }

    // Add risk analysis section if requested
    if (options.includeRiskAnalysis) {
      variables.RISK_ANALYSIS_SECTION = this.buildRiskAnalysisSection(summary.riskMetrics);
    }

    // Build main report content that combines all sections
    let reportContent = '<div class="cash-flow-report">';

    if (options.includeProjectionTable) {
      reportContent += `<section class="projections">${variables.PROJECTION_TABLE}</section>`;
    }

    if (options.includeAssumptions) {
      reportContent += `<section class="assumptions">${variables.ASSUMPTIONS_TABLE}</section>`;
    }

    if (options.includeRiskAnalysis) {
      reportContent += `<section class="risk-analysis">${variables.RISK_ANALYSIS_SECTION}</section>`;
    }

    reportContent += '</div>';
    variables.REPORT_CONTENT = reportContent;

    return variables;
  }

  /**
   * Build HTML projection table for template
   */
  private buildProjectionTable(projections: any[]): string {
    let table = `
      <table class="projection-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Year</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Age</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total Income</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total Expenses</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Annual Flow</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Portfolio Value</th>
          </tr>
        </thead>
        <tbody>
    `;

    projections.forEach((projection, index) => {
      const rowStyle = index % 2 === 0 ? 'background-color: #f9f9f9;' : '';
      const flowStyle = projection.annualSurplusDeficit >= 0 ? 'color: green;' : 'color: red;';
      
      table += `
        <tr style="${rowStyle}">
          <td style="padding: 8px; border: 1px solid #ddd;">${projection.projectionYear + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${projection.clientAge}</td>
          <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatCurrency(projection.totalIncome)}</td>
          <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatCurrency(projection.totalExpenses)}</td>
          <td style="padding: 8px; text-align: right; border: 1px solid #ddd; ${flowStyle}">${this.formatCurrency(projection.annualSurplusDeficit)}</td>
          <td style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${this.formatCurrency(projection.totalAssets)}</td>
        </tr>
      `;
    });

    table += '</tbody></table>';
    return table;
  }

  /**
   * Build assumptions summary table
   */
  private buildAssumptionsTable(scenario: CashFlowScenario): string {
    return `
      <table class="assumptions-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd; width: 60%;">Assumption</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; width: 40%;">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Inflation Rate</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatPercentage(scenario.inflationRate)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Real Equity Return</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatPercentage(scenario.realEquityReturn)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Real Bond Return</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatPercentage(scenario.realBondReturn)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Real Cash Return</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatPercentage(scenario.realCashReturn)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Current Annual Income</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatCurrency(scenario.currentIncome)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Current Annual Expenses</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${this.formatCurrency(scenario.currentExpenses)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Retirement Age</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${scenario.retirementAge}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Life Expectancy</td><td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${scenario.lifeExpectancy}</td></tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Build risk analysis section
   */
  private buildRiskAnalysisSection(riskMetrics: any): string {
    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'Low': return 'color: green; font-weight: bold;';
        case 'Medium': return 'color: orange; font-weight: bold;';
        case 'High': return 'color: red; font-weight: bold;';
        default: return '';
      }
    };

    return `
      <div class="risk-analysis-section" style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">Risk Analysis Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Risk Type</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Level</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Shortfall Risk</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.shortfallRisk)}">${riskMetrics.shortfallRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of portfolio depletion before life expectancy</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Longevity Risk</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.longevityRisk)}">${riskMetrics.longevityRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of outliving financial resources</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Inflation Risk</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.inflationRisk)}">${riskMetrics.inflationRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of purchasing power erosion</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Sequence Risk</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.sequenceRisk)}">${riskMetrics.sequenceRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of poor returns early in retirement</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Helper methods using your existing patterns
  private getTemplateIdForType(templateType: string): string {
    // These are the actual UUIDs from your document_templates table
    const templateMap: Record<string, string> = {
      'cashflow': '431bb8f9-a82b-4b9a-81b8-73ea32acdd20', // cashflow-analysis-template UUID
      'suitability': 'suitability-report-template',
      'review': 'annual-review-template'
    };
    return templateMap[templateType] || templateMap['cashflow'];
  }

  private getClientDisplayName(client: Client): string {
    const title = client.personalDetails.title ? `${client.personalDetails.title} ` : '';
    return `${title}${client.personalDetails.firstName} ${client.personalDetails.lastName}`.trim();
  }

  private formatClientAddress(client: Client): string {
    const addr = client.contactInfo.address;
    return [addr.line1, addr.line2, addr.city, addr.county, addr.postcode]
      .filter(Boolean)
      .join(', ');
  }

  private calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private formatPercentage(rate: number): string {
    return `${rate.toFixed(1)}%`;
  }

  private formatKeyInsights(insights: string[]): string {
    return insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('');
  }

private async getDocumentDownloadUrl(filePath: string): Promise<string> {
  const supabase = createClient(); // createClient is not async

  // Add validation for filePath
  if (!filePath) {
    console.error('Invalid filePath provided to getDocumentDownloadUrl:', filePath);
    return '';
  }

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  return data?.signedUrl || '';
}

  // ================================================================
  // NEW: Real PDF Generation Methods using @react-pdf/renderer
  // ================================================================

  /**
   * Generate a real PDF report (not HTML masquerading as PDF)
   * This method generates actual PDF files that can be downloaded and viewed
   */
  async generatePDFReport(
    scenarioId: string,
    options: CashFlowReportOptions = {
      includeCharts: true,
      includeAssumptions: true,
      includeRiskAnalysis: true,
      includeProjectionTable: true,
      reportPeriodYears: 20,
      outputFormat: 'pdf'
    }
  ): Promise<CashFlowReportResult> {
    try {
      console.log('📄 Starting REAL PDF generation for scenario:', scenarioId);

      // 1. Gather all required data
      const scenario = await CashFlowDataService.getScenario(scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      const client = await this.clientService.getClientById(scenario.clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      const projectionResult = await ProjectionEngine.generateProjections(scenario);

      // 2. Build PDF report data
      const pdfData = await this.buildPDFReportData(client, scenario, projectionResult, options);

      // 3. Generate actual PDF
      console.log('🔧 Generating PDF with @react-pdf/renderer...');
      const pdfBlob = await PDFGenerator.generateCashFlowReport(pdfData, {
        includeAssumptions: options.includeAssumptions,
        includeRiskAnalysis: options.includeRiskAnalysis,
        includeProjectionTable: options.includeProjectionTable,
      });

      // 4. Upload PDF to Supabase Storage
      const fileName = `CashFlow_Report_${client.clientRef || scenario.clientId}_${Date.now()}.pdf`;
      const filePath = `generated_documents/${scenario.clientId}/${fileName}`;

      const supabase = createClient();

      // Convert blob to array buffer for upload
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uint8Array, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // 5. Create database record in documents table
      const { data: docRecord, error: dbError } = await supabase
        .from('documents')
        .insert({
          client_id: scenario.clientId,
          name: fileName,
          type: 'cashflow',
          document_type: 'cashflow',
          category: 'cashflow',
          file_name: fileName,
          file_path: filePath,
          storage_path: filePath,
          file_type: 'pdf',
          mime_type: 'application/pdf',
          compliance_status: 'approved',
          is_archived: false,
          is_template: false,
          metadata: {
            scenarioId: scenario.id,
            generatedAt: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Clean up uploaded file
        await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to save document record: ${dbError.message}`);
      }

      // 6. Generate download URL
      const downloadUrl = await this.getDocumentDownloadUrl(filePath);

      console.log('✅ PDF generated and uploaded successfully:', fileName);

      return {
        success: true,
        document: docRecord,
        downloadUrl,
        pdfBlob
      };

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      };
    }
  }

  /**
   * Generate PDF and return as Base64 (useful for email attachments)
   */
  async generatePDFBase64(
    scenarioId: string,
    options?: CashFlowReportOptions
  ): Promise<{ success: boolean; base64?: string; error?: string }> {
    try {
      const scenario = await CashFlowDataService.getScenario(scenarioId);
      if (!scenario) throw new Error('Scenario not found');

      const client = await this.clientService.getClientById(scenario.clientId);
      if (!client) throw new Error('Client not found');

      const projectionResult = await ProjectionEngine.generateProjections(scenario);
      const pdfData = await this.buildPDFReportData(client, scenario, projectionResult, options || {
        includeCharts: true,
        includeAssumptions: true,
        includeRiskAnalysis: true,
        includeProjectionTable: true,
        reportPeriodYears: 20
      });

      const base64 = await PDFGenerator.generateCashFlowReportBase64(pdfData);

      return { success: true, base64 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      };
    }
  }

  /**
   * Download PDF directly (client-side only)
   */
  async downloadPDF(
    scenarioId: string,
    filename?: string,
    options?: CashFlowReportOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const scenario = await CashFlowDataService.getScenario(scenarioId);
      if (!scenario) throw new Error('Scenario not found');

      const client = await this.clientService.getClientById(scenario.clientId);
      if (!client) throw new Error('Client not found');

      const projectionResult = await ProjectionEngine.generateProjections(scenario);
      const pdfData = await this.buildPDFReportData(client, scenario, projectionResult, options || {
        includeCharts: true,
        includeAssumptions: true,
        includeRiskAnalysis: true,
        includeProjectionTable: true,
        reportPeriodYears: 20
      });

      const defaultFilename = `CashFlow_Report_${this.getClientDisplayName(client).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

      await PDFGenerator.downloadCashFlowReport(pdfData, filename || defaultFilename);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF download failed'
      };
    }
  }

  /**
   * Build PDF report data from client, scenario, and projection results
   */
  private async buildPDFReportData(
    client: Client,
    scenario: CashFlowScenario,
    projectionResult: ProjectionResult,
    options: CashFlowReportOptions
  ): Promise<PDFReportData> {
    const summary = projectionResult.summary;
    const projections = projectionResult.projections;

    // Get advisor and firm context dynamically
    const reportContext = await advisorContextService.getReportContext();

    return {
      // Client Information
      clientName: this.getClientDisplayName(client),
      clientEmail: client.contactInfo?.email,
      clientRef: client.clientRef,
      clientAge: this.calculateAge(client.personalDetails?.dateOfBirth || ''),

      // Report Metadata - now using dynamic context
      reportDate: reportContext.generatedDate,
      reportType: 'Cash Flow Analysis',
      advisorName: reportContext.advisorName,
      firmName: reportContext.firmName,

      // Scenario Information
      scenarioName: scenario.scenarioName,
      scenarioType: scenario.scenarioType,
      projectionYears: scenario.projectionYears,
      retirementAge: scenario.retirementAge,
      lifeExpectancy: scenario.lifeExpectancy,

      // Financial Position
      currentIncome: scenario.currentIncome,
      currentExpenses: scenario.currentExpenses,
      currentSavings: scenario.currentSavings,
      pensionValue: scenario.pensionPotValue,
      investmentValue: scenario.investmentValue,

      // Market Assumptions
      inflationRate: scenario.inflationRate,
      equityReturn: scenario.realEquityReturn,
      bondReturn: scenario.realBondReturn,
      cashReturn: scenario.realCashReturn,

      // Key Results
      finalPortfolioValue: summary.finalPortfolioValue,
      totalContributions: summary.totalContributions,
      totalWithdrawals: summary.totalWithdrawals,
      averageAnnualReturn: summary.averageAnnualReturn,
      maxWithdrawalRate: summary.maxWithdrawalRate,
      goalAchievementRate: summary.goalAchievementRate,
      sustainabilityRating: this.convertSustainabilityRating(summary.sustainabilityRating),

      // Risk Analysis
      riskMetrics: {
        shortfallRisk: summary.riskMetrics?.shortfallRisk || 'Unknown',
        longevityRisk: summary.riskMetrics?.longevityRisk || 'Unknown',
        inflationRisk: summary.riskMetrics?.inflationRisk || 'Unknown',
        sequenceRisk: summary.riskMetrics?.sequenceRisk || 'Unknown',
      },

      // Projections (limit to reportPeriodYears)
      projections: projections.slice(0, options.reportPeriodYears || 20).map(p => ({
        year: p.projectionYear + 1,
        age: p.clientAge,
        income: p.totalIncome,
        expenses: p.totalExpenses,
        surplus: p.annualSurplusDeficit,
        portfolioValue: p.totalAssets
      })),

      // Key Insights
      keyInsights: summary.keyInsights || []
    };
  }

  /**
   * Convert sustainability rating from string to number
   */
  private convertSustainabilityRating(rating: string | number | undefined): number {
    if (typeof rating === 'number') return rating;
    if (!rating) return 0;

    const ratingMap: Record<string, number> = {
      'Excellent': 10,
      'Good': 8,
      'Adequate': 6,
      'Poor': 4,
      'Critical': 2
    };

    return ratingMap[rating] || 0;
  }
}
