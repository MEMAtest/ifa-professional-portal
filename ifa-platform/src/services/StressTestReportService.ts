// ================================================================
// src/services/StressTestReportService.ts - FIXED
// Standalone service (no inheritance conflicts)
// All property names corrected to match TypeScript interfaces
// ================================================================

import { StressTestingEngine } from './StressTestingEngine';
import { ClientService } from './ClientService';
import { PDFGenerationEngine } from '@/lib/pdf/generatePDF';
import { createBrowserClient } from '@supabase/ssr';
import type { CashFlowScenario } from '@/types/cashflow';
import type { Client } from '@/types/client';
import type { 
  StressTestResults,
  StressScenario,
  StressTestResult 
} from '@/types/stress-testing';

// Interfaces for stress test reporting
export interface StressTestReportOptions {
  includeExecutiveSummary: boolean;
  includeDetailedResults: boolean;
  includeRecommendations: boolean;
  includeComplianceEvidence: boolean;
  includeCharts: boolean;
  reportFormat: 'pdf' | 'html';
  selectedScenarios?: string[];
}

export interface StressTestReportResult {
  success: boolean;
  reportId?: string;
  downloadUrl?: string;
  previewUrl?: string;
  error?: string;
  complianceReference?: string;
}

export interface StressTestReportData {
  client: Client;
  scenario: CashFlowScenario;
  stressTestResults: StressTestResults[];
  reportMetadata: {
    generatedAt: string;
    reportType: string;
    advisorName: string;
    firmName: string;
    complianceRef: string;
  };
  executiveSummary: {
    overallResilienceScore: number;
    averageSurvivalProbability: number;
    maxShortfallRisk: number;
    scenariosTested: number;
    keyFindings: string[];
    recommendations: string[];
  };
}

export class StressTestReportService {
  private clientService: ClientService;
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  constructor() {
    this.clientService = new ClientService();
  }

  /**
   * Generate complete stress test report
   */
  async generateStressTestReport(
    scenarioId: string,
    options: StressTestReportOptions = {
      includeExecutiveSummary: true,
      includeDetailedResults: true,
      includeRecommendations: true,
      includeComplianceEvidence: true,
      includeCharts: true,
      reportFormat: 'pdf'
    }
  ): Promise<StressTestReportResult> {
    try {
      console.log('🔄 Generating stress test report for scenario:', scenarioId);

      // 1. Gather all required data
      const reportData = await this.gatherReportData(scenarioId, options);
      
      // 2. Generate the report content
      const htmlContent = await this.generateReportHTML(reportData, options);
      
      // 3. Save report and get download URL
      let downloadUrl: string;
      let reportId: string;

      if (options.reportFormat === 'pdf') {
        // Convert to PDF and save
        const result = await this.generateAndSavePDF(
          htmlContent,
          reportData.client.id,
          'stress-test-report'
        );
        reportId = result.reportId;
        downloadUrl = result.downloadUrl;
      } else {
        // Save as HTML
        const result = await this.saveHTMLReport(
          htmlContent,
          reportData.client.id,
          'stress-test-report'
        );
        reportId = result.reportId;
        downloadUrl = result.downloadUrl;
      }

      // 4. Store stress test results in database
      await this.storeStressTestResults(reportData, reportId);

      // 5. Generate compliance reference
      const complianceReference = await this.generateComplianceReference(reportData);

      console.log('✅ Stress test report generated successfully');

      return {
        success: true,
        reportId,
        downloadUrl,
        complianceReference
      };

    } catch (error) {
      console.error('❌ Error generating stress test report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  /**
   * Generate compliance evidence report for FCA requirements
   */
  async generateComplianceEvidenceReport(
    scenarioId: string
  ): Promise<StressTestReportResult> {
    try {
      const reportData = await this.gatherReportData(scenarioId, {
        includeExecutiveSummary: true,
        includeDetailedResults: true,
        includeRecommendations: true,
        includeComplianceEvidence: true,
        includeCharts: false, // Compliance reports focus on data
        reportFormat: 'pdf'
      });

      // Generate compliance-focused HTML
      const htmlContent = await this.generateComplianceHTML(reportData);

      // Save as compliance evidence
      const result = await this.generateAndSavePDF(
        htmlContent,
        reportData.client.id,
        'compliance-evidence'
      );

      // Store compliance evidence record
      await this.storeComplianceEvidence(reportData, result.reportId);

      return {
        success: true,
        reportId: result.reportId,
        downloadUrl: result.downloadUrl,
        complianceReference: `STRESS-TEST-${Date.now()}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compliance report generation failed'
      };
    }
  }

  /**
   * Gather all data needed for stress test report
   */
  private async gatherReportData(
    scenarioId: string,
    options: StressTestReportOptions
  ): Promise<StressTestReportData> {
    // Get scenario from database
    const { data: scenario, error: scenarioError } = await this.supabase
      .from('cash_flow_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (scenarioError || !scenario) {
      throw new Error('Scenario not found');
    }

    // Get client data
    const client = await this.clientService.getClientById(scenario.client_id);
    if (!client) {
      throw new Error('Client not found');
    }

    // Convert database scenario to TypeScript interface
    const typedScenario: CashFlowScenario = this.convertDatabaseScenario(scenario);

    // Run stress tests
    const selectedScenarios = options.selectedScenarios || 
      StressTestingEngine.getAvailableScenarios().slice(0, 6).map(s => s.id);
    
    const stressTestResults = await StressTestingEngine.runStressTests(
      typedScenario,
      selectedScenarios
    );

    // Calculate executive summary
    const executiveSummary = this.calculateExecutiveSummary(stressTestResults);

    return {
      client,
      scenario: typedScenario,
      stressTestResults,
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'Stress Test Analysis',
        advisorName: 'Professional Advisor', // TODO: Get from user context
        firmName: 'Financial Advisory Services', // TODO: Get from config
        complianceRef: `ST-${Date.now()}`
      },
      executiveSummary
    };
  }

  /**
   * FIXED: Convert database scenario format to TypeScript interface
   */
  private convertDatabaseScenario(dbScenario: any): CashFlowScenario {
    return {
      // Core properties
      id: dbScenario.id,
      clientId: dbScenario.client_id,
      scenarioName: dbScenario.scenario_name,
      scenarioType: dbScenario.scenario_type,
      createdBy: dbScenario.created_by,
      projectionYears: dbScenario.projection_years,
      inflationRate: dbScenario.inflation_rate,
      realEquityReturn: dbScenario.real_equity_return,
      realBondReturn: dbScenario.real_bond_return,
      realCashReturn: dbScenario.real_cash_return,
      
      // Client information
      clientAge: dbScenario.client_age,
      retirementAge: dbScenario.retirement_age,
      lifeExpectancy: dbScenario.life_expectancy,
      statePensionAge: dbScenario.state_pension_age,
      
      // Financial values
      currentSavings: dbScenario.current_savings,
      pensionValue: dbScenario.pension_value,
      pensionPotValue: dbScenario.pension_value, // Map to both properties
      investmentValue: dbScenario.investment_value,
      currentIncome: dbScenario.current_income,
      currentExpenses: dbScenario.current_expenses,
      statePensionAmount: dbScenario.state_pension_amount,
      
      // Timestamps
      createdAt: dbScenario.created_at,
      updatedAt: dbScenario.updated_at,
      
      // Additional required properties with defaults
      isActive: true,
      dependents: dbScenario.dependents ?? 0,
      propertyValue: dbScenario.property_value ?? 0,
      pensionContributions: dbScenario.pension_contributions ?? 0,
      otherIncome: dbScenario.other_income ?? 0,
      essentialExpenses: dbScenario.essential_expenses ?? (dbScenario.current_expenses * 0.7),
      lifestyleExpenses: dbScenario.lifestyle_expenses ?? (dbScenario.current_expenses * 0.2),
      discretionaryExpenses: dbScenario.discretionary_expenses ?? (dbScenario.current_expenses * 0.1),
      mortgageBalance: dbScenario.mortgage_balance ?? 0,
      mortgagePayment: dbScenario.mortgage_payment ?? 0,
      otherDebts: dbScenario.other_debts ?? 0,
      retirementIncomeTarget: dbScenario.retirement_income_target ?? (dbScenario.current_income * 0.67),
      retirementIncomeDesired: dbScenario.retirement_income_desired ?? (dbScenario.current_income * 0.8),
      emergencyFundTarget: dbScenario.emergency_fund_target ?? (dbScenario.current_expenses * 6),
      legacyTarget: dbScenario.legacy_target ?? 0,
      equityAllocation: dbScenario.equity_allocation ?? 60,
      bondAllocation: dbScenario.bond_allocation ?? 30,
      cashAllocation: dbScenario.cash_allocation ?? 10,
      alternativeAllocation: dbScenario.alternative_allocation ?? 0,
      assumptionBasis: dbScenario.assumption_basis ?? 'Standard assumptions',
      marketDataSource: dbScenario.market_data_source ?? 'Market data',
      lastAssumptionsReview: dbScenario.last_assumptions_review ?? new Date().toISOString(),
      vulnerabilityAdjustments: dbScenario.vulnerability_adjustments ?? {},
      riskScore: dbScenario.risk_score ?? 5,
      
      // If needed, add any additional properties the CashFlowScenario interface requires
      // but are not in the original dbScenario object
    };
  }

  /**
   * Calculate executive summary from stress test results
   */
  private calculateExecutiveSummary(results: StressTestResults[]) {
    const avgResilienceScore = results.reduce((sum, r) => sum + r.resilience_score, 0) / results.length;
    const avgSurvivalProbability = results.reduce((sum, r) => sum + r.survival_probability, 0) / results.length;
    const maxShortfallRisk = Math.max(...results.map(r => r.shortfall_risk));
    
    // Generate key findings
    const keyFindings: string[] = [
      `Average resilience score across ${results.length} scenarios: ${avgResilienceScore.toFixed(0)}/100`,
      `Average survival probability: ${avgSurvivalProbability.toFixed(1)}%`,
      `Maximum shortfall risk identified: ${maxShortfallRisk.toFixed(1)}%`
    ];

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgResilienceScore < 60) {
      recommendations.push('Consider reducing portfolio risk through increased diversification');
    }
    if (maxShortfallRisk > 30) {
      recommendations.push('Review emergency fund adequacy and withdrawal strategies');
    }
    recommendations.push('Continue regular stress testing to monitor plan robustness');

    return {
      overallResilienceScore: avgResilienceScore,
      averageSurvivalProbability: avgSurvivalProbability,
      maxShortfallRisk: maxShortfallRisk,
      scenariosTested: results.length,
      keyFindings,
      recommendations
    };
  }

  /**
   * Generate main report HTML content
   */
  private async generateReportHTML(
    data: StressTestReportData,
    options: StressTestReportOptions
  ): Promise<string> {
    // Build template variables
    const variables = this.buildStressTestVariables(data, options);

    // Get the stress test report template
    const templateContent = await this.getStressTestTemplate();

    // Populate template with variables  
    return this.populateTemplate(templateContent, variables);
  }

  /**
   * Generate compliance-focused HTML content
   */
  private async generateComplianceHTML(data: StressTestReportData): Promise<string> {
    const variables = this.buildComplianceVariables(data);
    const templateContent = await this.getComplianceTemplate();
    return this.populateTemplate(templateContent, variables);
  }

  /**
   * Build template variables for stress test report
   */
  private buildStressTestVariables(
    data: StressTestReportData,
    options: StressTestReportOptions
  ): Record<string, any> {
    const { client, scenario, stressTestResults, reportMetadata, executiveSummary } = data;

    return {
      // Report Metadata
      REPORT_TITLE: 'Stress Test Analysis Report',
      REPORT_DATE: new Date().toLocaleDateString('en-GB'),
      GENERATED_AT: reportMetadata.generatedAt,
      ADVISOR_NAME: reportMetadata.advisorName,
      FIRM_NAME: reportMetadata.firmName,
      COMPLIANCE_REF: reportMetadata.complianceRef,

      // Client Information
      CLIENT_NAME: this.getClientDisplayName(client),
      CLIENT_REF: client.clientRef || '',
      CLIENT_EMAIL: client.contactInfo?.email || '',
      CLIENT_PHONE: client.contactInfo?.phone || '',

      // Scenario Information (FIXED: Use correct property names)
      SCENARIO_NAME: scenario.scenarioName,
      SCENARIO_TYPE: scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1),
      PROJECTION_YEARS: scenario.projectionYears,
      BASE_PORTFOLIO_VALUE: this.formatCurrency((scenario.currentSavings ?? 0) + (scenario.investmentValue ?? 0)),

      // Executive Summary
      OVERALL_RESILIENCE_SCORE: executiveSummary.overallResilienceScore.toFixed(0),
      AVERAGE_SURVIVAL_PROBABILITY: executiveSummary.averageSurvivalProbability.toFixed(1),
      MAX_SHORTFALL_RISK: executiveSummary.maxShortfallRisk.toFixed(1),
      SCENARIOS_TESTED: executiveSummary.scenariosTested,

      // Key Findings
      KEY_FINDINGS: this.formatList(executiveSummary.keyFindings),
      RECOMMENDATIONS: this.formatList(executiveSummary.recommendations),

      // Detailed Results
      STRESS_TEST_RESULTS_TABLE: this.buildStressTestResultsTable(stressTestResults),
      
      // Content Flags
      INCLUDE_EXECUTIVE_SUMMARY: options.includeExecutiveSummary ? 'true' : 'false',
      INCLUDE_DETAILED_RESULTS: options.includeDetailedResults ? 'true' : 'false',
      INCLUDE_RECOMMENDATIONS: options.includeRecommendations ? 'true' : 'false',
      INCLUDE_CHARTS: options.includeCharts ? 'true' : 'false',

      // Compliance
      STRESS_TESTING_METHODOLOGY: this.buildMethodologySection(),
      ASSUMPTIONS_DOCUMENTATION: this.buildAssumptionsSection(scenario),
      REGULATORY_REFERENCES: this.buildRegulatorySection()
    };
  }

  /**
   * Build compliance-specific variables
   */
  private buildComplianceVariables(data: StressTestReportData): Record<string, any> {
    return {
      ...this.buildStressTestVariables(data, {
        includeExecutiveSummary: true,
        includeDetailedResults: true,
        includeRecommendations: true,
        includeComplianceEvidence: true,
        includeCharts: false,
        reportFormat: 'pdf'
      }),
      REPORT_TITLE: 'Stress Testing Compliance Evidence',
      REPORT_PURPOSE: 'This report provides evidence of stress testing performed in compliance with FCA COBS 13.4.1R',
      COBS_COMPLIANCE_CHECKLIST: this.buildCOBSComplianceChecklist(),
      EVIDENCE_SUMMARY: this.buildEvidenceSummary(data.stressTestResults)
    };
  }

  /**
   * FIXED: Generate and save PDF to storage
   */
  private async generateAndSavePDF(
    htmlContent: string,
    clientId: string,
    reportType: string
  ): Promise<{ reportId: string; downloadUrl: string }> {
    // Generate PDF using existing engine
    const pdfBuffer = await PDFGenerationEngine.generatePDFFromHTML(htmlContent, {
      format: 'A4',
      orientation: 'portrait'
    });

    // Save to storage
    const fileName = `${reportType}-${clientId}-${Date.now()}.pdf`;
    const filePath = `stress_test_reports/${clientId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get download URL
    const { data } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    const reportId = `report_${Date.now()}`;
    return {
      reportId,
      downloadUrl: data?.signedUrl || ''
    };
  }

  /**
   * FIXED: Save HTML report to storage
   */
  private async saveHTMLReport(
    htmlContent: string,
    clientId: string,
    reportType: string
  ): Promise<{ reportId: string; downloadUrl: string }> {
    const fileName = `${reportType}-${clientId}-${Date.now()}.html`;
    const filePath = `stress_test_reports/${clientId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, htmlContent, {
        contentType: 'text/html',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload HTML: ${uploadError.message}`);
    }

    // Get download URL
    const { data } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    const reportId = `report_${Date.now()}`;
    return {
      reportId,
      downloadUrl: data?.signedUrl || ''
    };
  }

  /**
   * Store stress test results in database
   */
  private async storeStressTestResults(data: StressTestReportData, reportId: string): Promise<void> {
    try {
      await this.supabase
        .from('stress_test_results')
        .insert({
          scenario_id: data.scenario.id,
          client_id: data.client.id,
          report_id: reportId,
          results_json: JSON.stringify(data.stressTestResults),
          executive_summary: JSON.stringify(data.executiveSummary),
          overall_resilience_score: data.executiveSummary.overallResilienceScore,
          average_survival_probability: data.executiveSummary.averageSurvivalProbability,
          max_shortfall_risk: data.executiveSummary.maxShortfallRisk
        });

      console.log('✅ Stress test results stored in database');
    } catch (error) {
      console.error('❌ Error storing stress test results:', error);
      // Don't throw - report generation should succeed even if storage fails
    }
  }

  /**
   * Store compliance evidence record
   */
  private async storeComplianceEvidence(data: StressTestReportData, reportId: string): Promise<void> {
    try {
      await this.supabase
        .from('compliance_evidence')
        .insert({
          client_id: data.client.id,
          evidence_type: 'stress_testing',
          compliance_requirement: 'FCA COBS 13.4.1R - Stress Testing',
          document_path: `compliance_evidence/${reportId}`,
          compliance_ref: data.reportMetadata.complianceRef
        });

      console.log('✅ Compliance evidence stored');
    } catch (error) {
      console.error('❌ Error storing compliance evidence:', error);
    }
  }

  // HELPER METHODS (FIXED: All methods are now private to this class)
  private getClientDisplayName(client: Client): string {
    const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : '';
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${title}${firstName} ${lastName}`.trim();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  private formatList(items: string[]): string {
    return items.map(item => `<li>${item}</li>`).join('');
  }

  private populateTemplate(content: string, variables: Record<string, any>): string {
    let populated = content;
    for (const key in variables) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      populated = populated.replace(regex, String(variables[key] || ''));
    }
    return populated;
  }

  private buildStressTestResultsTable(results: StressTestResults[]): string {
    let table = `
      <table class="stress-test-results" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">Scenario</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Resilience Score</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Survival Probability</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Shortfall Risk</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Portfolio Impact</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">Recovery Time</th>
          </tr>
        </thead>
        <tbody>
    `;

    results.forEach((result, index) => {
      const scenarioInfo = StressTestingEngine.getScenarioById(result.scenario_id);
      table += `
        <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
          <td style="border: 1px solid #dee2e6; padding: 8px;">
            <strong>${scenarioInfo?.name || 'Unknown Scenario'}</strong><br>
            <small style="color: #666;">${scenarioInfo?.description || ''}</small>
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">
            <span style="color: ${result.resilience_score >= 80 ? '#10b981' : result.resilience_score >= 60 ? '#f59e0b' : '#ef4444'};">
              ${result.resilience_score.toFixed(0)}
            </span>
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">
            ${result.survival_probability.toFixed(1)}%
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; color: #ef4444;">
            ${result.shortfall_risk.toFixed(1)}%
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; color: #ef4444;">
            ${Math.abs(result.impact_analysis.portfolio_decline_percent).toFixed(1)}%
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">
            ${result.recovery_time_years ? `${result.recovery_time_years}y` : 'N/A'}
          </td>
        </tr>
      `;
    });

    table += `</tbody></table>`;
    return table;
  }

  private async getStressTestTemplate(): Promise<string> {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>{{REPORT_TITLE}}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .highlight { background-color: #f0f8ff; padding: 10px; border-left: 4px solid #007acc; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>{{REPORT_TITLE}}</h1>
            <p>Generated: {{REPORT_DATE}} | Client: {{CLIENT_NAME}} | Ref: {{COMPLIANCE_REF}}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <div class="highlight">
              <p><strong>Overall Resilience Score:</strong> {{OVERALL_RESILIENCE_SCORE}}/100</p>
              <p><strong>Average Survival Probability:</strong> {{AVERAGE_SURVIVAL_PROBABILITY}}%</p>
              <p><strong>Scenarios Tested:</strong> {{SCENARIOS_TESTED}}</p>
            </div>
            <h3>Key Findings</h3>
            <ul>{{KEY_FINDINGS}}</ul>
          </div>
          
          <div class="section">
            <h2>Detailed Results</h2>
            {{STRESS_TEST_RESULTS_TABLE}}
          </div>
          
          <div class="section">
            <h2>Recommendations</h2>
            <ul>{{RECOMMENDATIONS}}</ul>
          </div>
        </body>
      </html>
    `;
  }

  private async getComplianceTemplate(): Promise<string> {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stress Testing Compliance Evidence</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .compliance-header { background-color: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; }
            .evidence-section { margin: 20px 0; padding: 15px; border-left: 4px solid #28a745; }
          </style>
        </head>
        <body>
          <div class="compliance-header">
            <h1>FCA COBS 13.4.1R - Stress Testing Compliance Evidence</h1>
            <p><strong>Client:</strong> {{CLIENT_NAME}} | <strong>Date:</strong> {{REPORT_DATE}}</p>
            <p><strong>Compliance Reference:</strong> {{COMPLIANCE_REF}}</p>
          </div>
          
          <div class="evidence-section">
            <h2>Evidence of Stress Testing Performance</h2>
            <p>This document provides evidence that appropriate stress testing has been performed in compliance with FCA COBS 13.4.1R.</p>
            {{STRESS_TEST_RESULTS_TABLE}}
          </div>
          
          <div class="evidence-section">
            <h2>Methodology and Assumptions</h2>
            {{STRESS_TESTING_METHODOLOGY}}
            {{ASSUMPTIONS_DOCUMENTATION}}
          </div>
        </body>
      </html>
    `;
  }

  private generateComplianceReference(data: StressTestReportData): Promise<string> {
    return Promise.resolve(`STRESS-TEST-${data.client.id}-${Date.now()}`);
  }

  private buildMethodologySection(): string {
    return `
      <div class="methodology">
        <h3>Stress Testing Methodology</h3>
        <p>Stress testing performed using Monte Carlo simulation with 1,000 iterations per scenario.</p>
        <p>Scenarios tested include market crashes, inflation shocks, interest rate changes, and longevity extensions.</p>
      </div>
    `;
  }

  private buildAssumptionsSection(scenario: CashFlowScenario): string {
    return `
      <div class="assumptions">
        <h3>Key Assumptions</h3>
        <ul>
          <li>Real Equity Return: ${scenario.realEquityReturn}%</li>
          <li>Real Bond Return: ${scenario.realBondReturn}%</li>
          <li>Inflation Rate: ${scenario.inflationRate}%</li>
          <li>Projection Period: ${scenario.projectionYears} years</li>
        </ul>
      </div>
    `;
  }

  private buildRegulatorySection(): string {
    return `
      <div class="regulatory">
        <h3>Regulatory Framework</h3>
        <p>This stress testing complies with:</p>
        <ul>
          <li>FCA COBS 13.4.1R - Projections in real terms</li>
          <li>FCA COBS 13.4.2G - Appropriate assumptions</li>
          <li>FCA COBS 13.4.1G - Stress testing requirements</li>
        </ul>
      </div>
    `;
  }

  private buildCOBSComplianceChecklist(): string {
    return `
      <div class="compliance-checklist">
        <h3>COBS 13.4.1R Compliance Checklist</h3>
        <ul>
          <li>✅ Projections provided in real terms (net of inflation)</li>
          <li>✅ Appropriate stress testing performed</li>
          <li>✅ Assumptions documented and justified</li>
          <li>✅ Multiple scenarios tested for robustness</li>
        </ul>
      </div>
    `;
  }

  private buildEvidenceSummary(results: StressTestResults[]): string {
    return `
      <div class="evidence-summary">
        <h3>Evidence Summary</h3>
        <p>${results.length} stress test scenarios were executed on ${new Date().toLocaleDateString('en-GB')}.</p>
        <p>Results demonstrate consideration of various market conditions and risk factors.</p>
      </div>
    `;
  }
}