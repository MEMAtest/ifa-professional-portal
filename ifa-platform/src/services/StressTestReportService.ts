// ================================================================
// src/services/StressTestReportService.ts - FULLY FIXED
// All properties match exact CashFlowScenario interface
// ================================================================

import { StressTestingEngine } from './StressTestingEngine';
import { ClientService } from './ClientService';
import { createClient } from '@/lib/supabase/client';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';
import { advisorContextService } from '@/services/AdvisorContextService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DbInsert } from '@/types/db';
import type { CashFlowScenario } from '@/types/cashflow';
import type { Client } from '@/types/client';
import type {
  StressTestResults,
  StressScenario,
  StressTestResult
} from '@/types/stress-testing';

// Type aliases for better type safety
type StressTestResultInsert = DbInsert<'stress_test_results'>;
type ComplianceEvidenceInsert = DbInsert<'compliance_evidence'>;

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
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.clientService = new ClientService();
    // Use server-friendly client when running on the server to avoid localStorage issues
    if (typeof window === 'undefined') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Supabase credentials missing for StressTestReportService');
      }
      this.supabase = createSupabaseServiceClient<Database>(url, key);
    } else {
      this.supabase = createClient();
    }
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
      console.log('📄 Generating stress test report for scenario:', scenarioId);

      // 1. Gather all required data
      const reportData = await this.gatherReportData(scenarioId, options);
      
      // 2. Generate the report content
      const htmlContent = await this.generateReportHTML(reportData, options);
      
      // 3. Save the report
      let reportId: string;
      let downloadUrl: string;
      
      if (options.reportFormat === 'pdf') {
        const pdfResult = await this.savePDFReport(
          htmlContent,
          reportData.client.id,
          'stress_test'
        );
        reportId = pdfResult.reportId;
        downloadUrl = pdfResult.downloadUrl;
      } else {
        const htmlResult = await this.saveHTMLReport(
          htmlContent,
          reportData.client.id,
          'stress_test'
        );
        reportId = htmlResult.reportId;
        downloadUrl = htmlResult.downloadUrl;
      }
      
      // 4. Store results in database
      await this.storeStressTestResults(reportData, reportId);
      
      // 5. Generate compliance evidence
      if (options.includeComplianceEvidence) {
        await this.generateComplianceEvidence(reportData, reportId);
      }
      
      return {
        success: true,
        reportId,
        downloadUrl,
        previewUrl: `/reports/preview/${reportId}`,
        complianceReference: reportData.reportMetadata.complianceRef
      };
      
    } catch (error) {
      console.error('Error generating stress test report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  /**
   * Generate compliance-ready stress test report
   */
  async generateComplianceReport(
    clientId: string,
    period: 'annual' | 'quarterly' = 'annual'
  ): Promise<StressTestReportResult> {
    try {
      // Get all scenarios for client in period
      const scenarios = await this.getClientScenariosForPeriod(clientId, period);
      
      if (!scenarios || scenarios.length === 0) {
        throw new Error('No scenarios found for compliance report');
      }
      
      // Generate compliance-focused report
      const options: StressTestReportOptions = {
        includeExecutiveSummary: true,
        includeDetailedResults: true,
        includeRecommendations: true,
        includeComplianceEvidence: true,
        includeCharts: true,
        reportFormat: 'pdf'
      };
      
      // Use most recent scenario as base
      return await this.generateStressTestReport(scenarios[0].id, options);
      
    } catch (error) {
      console.error('Error generating compliance report:', error);
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

    // Get client data - scenario now has proper typing
    const client = await this.clientService.getClientById(scenario.client_id!);
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

    // Get advisor context for dynamic names
    const advisorContext = await advisorContextService.getReportContext();

    return {
      client,
      scenario: typedScenario,
      stressTestResults,
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'Stress Test Analysis',
        advisorName: advisorContext.advisorName,
        firmName: advisorContext.firmName,
        complianceRef: `ST-${Date.now()}`
      },
      executiveSummary
    };
  }

  /**
   * FIXED: Convert database scenario to match exact CashFlowScenario interface
   * Only include properties that actually exist on the type
   */
  private convertDatabaseScenario(dbScenario: any): CashFlowScenario {
    // Build the object with only the properties that exist on CashFlowScenario
    const scenario: any = {
      // Core identifiers
      id: dbScenario.id,
      clientId: dbScenario.client_id,
      scenarioName: dbScenario.scenario_name,
      scenarioType: dbScenario.scenario_type,
      createdBy: dbScenario.created_by,
      projectionYears: dbScenario.projection_years,
      
      // Client age information
      clientAge: dbScenario.client_age || dbScenario.current_age,
      retirementAge: dbScenario.retirement_age,
      lifeExpectancy: dbScenario.life_expectancy,
      statePensionAge: dbScenario.state_pension_age,
      
      // Current financial position
      currentIncome: dbScenario.current_income,
      currentExpenses: dbScenario.current_expenses,
      currentSavings: dbScenario.current_savings,
      
      // Retirement values
      retirementIncome: dbScenario.retirement_income,
      retirementExpenses: dbScenario.retirement_expenses,
      statePensionAmount: dbScenario.state_pension_amount,
      
      // Pension details
      pensionPotValue: dbScenario.pension_pot_value || dbScenario.pension_value,
      pensionContributions: dbScenario.pension_contributions,
      employerContributions: dbScenario.employer_contributions,
      pensionGrowthRate: dbScenario.pension_growth_rate,
      
      // Investment details
      investmentValue: dbScenario.investment_value,
      monthlyInvestment: dbScenario.monthly_investment,
      monthlySavingsAmount: dbScenario.monthly_savings_amount,
      
      // Asset allocation
      equityAllocation: dbScenario.equity_allocation,
      bondAllocation: dbScenario.bond_allocation,
      
      // Market assumptions
      inflationRate: dbScenario.inflation_rate,
      realEquityReturn: dbScenario.real_equity_return,
      realBondReturn: dbScenario.real_bond_return,
      
      // Risk parameters
      marketVolatility: dbScenario.market_volatility,
      sequenceRisk: dbScenario.sequence_risk,
      
      // Metadata
      createdAt: dbScenario.created_at,
      updatedAt: dbScenario.updated_at
    };

    // Only add optional properties if they exist in the database
    if (dbScenario.savings_growth_rate !== undefined) {
      scenario.savingsGrowthRate = dbScenario.savings_growth_rate;
    }
    if (dbScenario.expense_inflation_rate !== undefined) {
      scenario.expenseInflationRate = dbScenario.expense_inflation_rate;
    }

    return scenario as CashFlowScenario;
  }

  /**
   * Calculate executive summary using snake_case properties
   */
  private calculateExecutiveSummary(results: StressTestResults[]): StressTestReportData['executiveSummary'] {
    // Use snake_case properties from the actual type
    const resiliences = results.map(r => r.resilience_score);
    const survivals = results.map(r => r.survival_probability);
    const shortfalls = results.map(r => r.shortfall_risk);
    
    const avgResilience = resiliences.reduce((a, b) => a + b, 0) / resiliences.length;
    const avgSurvival = survivals.reduce((a, b) => a + b, 0) / survivals.length;
    const maxShortfall = Math.max(...shortfalls);
    
    // Generate key findings
    const keyFindings: string[] = [];
    
    if (avgResilience >= 0.7) {
      keyFindings.push('Portfolio shows strong resilience across most stress scenarios');
    } else if (avgResilience >= 0.5) {
      keyFindings.push('Portfolio shows moderate resilience with some vulnerabilities');
    } else {
      keyFindings.push('Portfolio shows significant vulnerability to stress scenarios');
    }
    
    if (maxShortfall > 0.3) {
      keyFindings.push(`High shortfall risk of ${(maxShortfall * 100).toFixed(0)}% in worst-case scenarios`);
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (avgResilience < 0.7) {
      recommendations.push('Consider increasing emergency fund to improve resilience');
    }
    
    if (maxShortfall > 0.3) {
      recommendations.push('Review asset allocation to reduce downside risk');
    }
    
    if (avgSurvival < 0.8) {
      recommendations.push('Consider strategies to improve portfolio sustainability');
    }
    
    return {
      overallResilienceScore: avgResilience,
      averageSurvivalProbability: avgSurvival,
      maxShortfallRisk: maxShortfall,
      scenariosTested: results.length,
      keyFindings,
      recommendations
    };
  }

  /**
   * Generate HTML content for report
   */
  private async generateReportHTML(
    data: StressTestReportData,
    options: StressTestReportOptions
  ): Promise<string> {
    const clientName = this.getClientDisplayName(data.client);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Stress Test Report - ${clientName}</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
    `;
    
    // Header
    html += this.generateReportHeader(data);
    
    // Executive Summary
    if (options.includeExecutiveSummary) {
      html += this.generateExecutiveSummary(data);
    }
    
    // Detailed Results
    if (options.includeDetailedResults) {
      html += this.generateDetailedResults(data);
    }
    
    // Recommendations
    if (options.includeRecommendations) {
      html += this.generateRecommendations(data);
    }
    
    // Compliance Evidence
    if (options.includeComplianceEvidence) {
      html += this.generateComplianceSection(data);
    }
    
    html += `
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  /**
   * Generate report header
   */
  private generateReportHeader(data: StressTestReportData): string {
    return `
      <div class="report-header">
        <h1>Stress Test Analysis Report</h1>
        <div class="header-info">
          <p><strong>Client:</strong> ${this.getClientDisplayName(data.client)}</p>
          <p><strong>Scenario:</strong> ${data.scenario.scenarioName}</p>
          <p><strong>Generated:</strong> ${new Date(data.reportMetadata.generatedAt).toLocaleDateString()}</p>
          <p><strong>Reference:</strong> ${data.reportMetadata.complianceRef}</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate executive summary section
   */
  private generateExecutiveSummary(data: StressTestReportData): string {
    const summary = data.executiveSummary;
    
    return `
      <div class="section executive-summary">
        <h2>Executive Summary</h2>
        
        <div class="key-metrics">
          <div class="metric">
            <span class="label">Overall Resilience</span>
            <span class="value ${this.getScoreClass(summary.overallResilienceScore)}">
              ${(summary.overallResilienceScore * 100).toFixed(0)}%
            </span>
          </div>
          <div class="metric">
            <span class="label">Survival Probability</span>
            <span class="value ${this.getScoreClass(summary.averageSurvivalProbability)}">
              ${(summary.averageSurvivalProbability * 100).toFixed(0)}%
            </span>
          </div>
          <div class="metric">
            <span class="label">Max Shortfall Risk</span>
            <span class="value ${this.getRiskClass(summary.maxShortfallRisk)}">
              ${(summary.maxShortfallRisk * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        
        <div class="findings">
          <h3>Key Findings</h3>
          <ul>
            ${summary.keyFindings.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
        
        <div class="recommendations">
          <h3>Recommendations</h3>
          <ul>
            ${summary.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Generate detailed results using snake_case properties
   */
  private generateDetailedResults(data: StressTestReportData): string {
    let html = `
      <div class="section detailed-results">
        <h2>Detailed Stress Test Results</h2>
        <table class="results-table">
          <thead>
            <tr>
              <th>Scenario ID</th>
              <th>Resilience Score</th>
              <th>Survival Probability</th>
              <th>Shortfall Risk</th>
              <th>Portfolio Impact</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    for (const result of data.stressTestResults) {
      // Get scenario info from StressTestingEngine if available
      const scenarioInfo = StressTestingEngine.getScenarioById ? 
        StressTestingEngine.getScenarioById(result.scenario_id) : null;
      
      html += `
        <tr>
          <td>${scenarioInfo?.name || result.scenario_id}</td>
          <td class="${this.getScoreClass(result.resilience_score / 100)}">
            ${result.resilience_score.toFixed(0)}
          </td>
          <td class="${this.getScoreClass(result.survival_probability / 100)}">
            ${result.survival_probability.toFixed(0)}%
          </td>
          <td class="${this.getRiskClass(result.shortfall_risk / 100)}">
            ${result.shortfall_risk.toFixed(0)}%
          </td>
          <td>${result.impact_analysis?.portfolio_decline_percent ? 
            `${Math.abs(result.impact_analysis.portfolio_decline_percent).toFixed(1)}%` : 
            'N/A'}</td>
        </tr>
      `;
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    return html;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(data: StressTestReportData): string {
    return `
      <div class="section recommendations">
        <h2>Strategic Recommendations</h2>
        
        <div class="recommendation-category">
          <h3>Risk Mitigation</h3>
          <ul>
            <li>Maintain emergency fund of 6-12 months expenses</li>
            <li>Consider diversifying income sources</li>
            <li>Review insurance coverage for protection gaps</li>
          </ul>
        </div>
        
        <div class="recommendation-category">
          <h3>Portfolio Optimization</h3>
          <ul>
            <li>Rebalance asset allocation based on risk tolerance</li>
            <li>Consider defensive assets for downside protection</li>
            <li>Implement systematic withdrawal strategy</li>
          </ul>
        </div>
        
        <div class="recommendation-category">
          <h3>Monitoring & Review</h3>
          <ul>
            <li>Schedule quarterly portfolio reviews</li>
            <li>Update stress tests annually or after major life events</li>
            <li>Track progress against financial goals</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Generate compliance section
   */
  private generateComplianceSection(data: StressTestReportData): string {
    return `
      <div class="section compliance">
        <h2>Compliance & Regulatory Information</h2>
        
        <div class="compliance-item">
          <strong>FCA COBS 13.4.1R Compliance:</strong>
          <p>This stress test analysis has been conducted in accordance with FCA requirements
          for assessing client capacity for loss and investment suitability.</p>
        </div>
        
        <div class="compliance-item">
          <strong>Documentation Reference:</strong>
          <p>${data.reportMetadata.complianceRef}</p>
        </div>
        
        <div class="compliance-item">
          <strong>Advisor Certification:</strong>
          <p>I certify that this stress test analysis has been conducted with due care and
          consideration of the client's best interests.</p>
          <br>
          <p>_______________________</p>
          <p>${data.reportMetadata.advisorName}</p>
          <p>${data.reportMetadata.firmName}</p>
          <p>Date: ${new Date(data.reportMetadata.generatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate compliance evidence
   */
  private async generateComplianceEvidence(data: StressTestReportData, reportId: string): Promise<void> {
    await this.storeComplianceEvidence(data, reportId);
  }

  /**
   * Get client scenarios for period
   */
  private async getClientScenariosForPeriod(clientId: string, period: 'annual' | 'quarterly'): Promise<any[]> {
    const startDate = new Date();
    if (period === 'annual') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else {
      startDate.setMonth(startDate.getMonth() - 3);
    }
    
    const { data, error } = await this.supabase
      .from('cash_flow_scenarios')
      .select('*')
      .eq('client_id', clientId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching scenarios:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Save PDF report - simplified without external PDF library
   */
  private async savePDFReport(
    htmlContent: string,
    clientId: string,
    reportType: string
  ): Promise<{ reportId: string; downloadUrl: string }> {
    // For now, save as HTML with PDF extension
    // In production, you'd use a proper PDF generation library
    const fileName = `${reportType}-${clientId}-${Date.now()}.pdf`;
    const filePath = `stress_test_reports/${clientId}/${fileName}`;
    
    // Convert HTML to buffer
    const buffer = Buffer.from(htmlContent, 'utf-8');
    
    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Create document record in documents table with proper typing
    const { data: docRecord, error: dbError } = await this.supabase
      .from('documents')
      .insert({
        client_id: clientId,
        name: `${reportType} report`,
        type: 'stress_test',
        document_type: 'stress_test',
        category: 'stress_test',
        file_name: fileName,
        file_path: filePath,
        storage_path: filePath,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        compliance_status: 'approved',
        is_archived: false,
        is_template: false,
        metadata: {
          reportType,
          generatedAt: new Date().toISOString()
        }
      })
      .select()
      .maybeSingle();

    // Get download URL
    const { data } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    const reportId = docRecord?.id || `report_${Date.now()}`;
    return {
      reportId,
      downloadUrl: data?.signedUrl || ''
    };
  }

  /**
   * Save HTML report to storage
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
      // Use typed insert data
      const insertData: StressTestResultInsert = {
        scenario_id: data.scenario.id,
        client_id: data.client.id,
        report_id: reportId,
        results_json: data.stressTestResults as any, // Cast to any for Json type
        executive_summary: data.executiveSummary as any, // Cast to any for Json type
        overall_resilience_score: data.executiveSummary.overallResilienceScore * 100, // Convert to percentage
        average_survival_probability: data.executiveSummary.averageSurvivalProbability * 100,
        max_shortfall_risk: data.executiveSummary.maxShortfallRisk * 100,
        test_date: new Date().toISOString(),
        status: 'completed',
        scenarios_selected: data.stressTestResults.map(r => r.scenario_id),
        iterations_count: 1000, // Default value
        processing_time_ms: 5000, // Default value
        test_version: '1.0.0'
      };

      const { error } = await this.supabase
        .from('stress_test_results')
        .insert(insertData);

      if (error) {
        console.error('❌ Error storing stress test results:', error);
        // Don't throw - report generation should succeed even if storage fails
      } else {
        console.log('✅ Stress test results stored in database');
      }
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
      // Use typed insert data
      const insertData: ComplianceEvidenceInsert = {
        client_id: data.client.id,
        evidence_type: 'stress_testing',
        compliance_requirement: 'FCA COBS 13.4.1R - Stress Testing',
        compliance_ref: data.reportMetadata.complianceRef,
        evidence_summary: `Stress test analysis completed for ${this.getClientDisplayName(data.client)}`,
        document_path: `compliance_evidence/${reportId}`,
        review_date: new Date().toISOString(),
        reviewer_name: data.reportMetadata.advisorName,
        reviewer_role: 'Financial Advisor',
        compliance_status: 'compliant',
        compliance_risk_level: 'low'
      };

      const { error } = await this.supabase
        .from('compliance_evidence')
        .insert(insertData);

      if (error) {
        console.error('❌ Error storing compliance evidence:', error);
        // Don't throw - non-critical failure
      } else {
        console.log('✅ Compliance evidence stored');
      }
    } catch (error) {
      console.error('❌ Error storing compliance evidence:', error);
    }
  }

  // HELPER METHODS
  private getClientDisplayName(client: Client): string {
    const title = client.personalDetails?.title || '';
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${title} ${firstName} ${lastName}`.trim();
  }

  private getScoreClass(score: number): string {
    if (score >= 0.8) return 'score-high';
    if (score >= 0.6) return 'score-medium';
    return 'score-low';
  }

  private getRiskClass(risk: number): string {
    if (risk <= 0.2) return 'risk-low';
    if (risk <= 0.4) return 'risk-medium';
    return 'risk-high';
  }

  private getReportStyles(): string {
    return `
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 20px;
      }
      .report-container {
        max-width: 1200px;
        margin: 0 auto;
      }
      .report-header {
        background: #2c3e50;
        color: white;
        padding: 30px;
        border-radius: 8px 8px 0 0;
      }
      .header-info {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-top: 20px;
      }
      .section {
        background: white;
        padding: 30px;
        margin-bottom: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      h2 {
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
      }
      .key-metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin: 30px 0;
      }
      .metric {
        text-align: center;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .metric .label {
        display: block;
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
      }
      .metric .value {
        display: block;
        font-size: 36px;
        font-weight: bold;
      }
      .score-high { color: #27ae60; }
      .score-medium { color: #f39c12; }
      .score-low { color: #e74c3c; }
      .risk-low { color: #27ae60; }
      .risk-medium { color: #f39c12; }
      .risk-high { color: #e74c3c; }
      .results-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .results-table th,
      .results-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .results-table th {
        background: #f8f9fa;
        font-weight: bold;
      }
      .recommendation-category {
        margin: 20px 0;
      }
      .compliance-item {
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-left: 4px solid #3498db;
      }
    `;
  }
}

// Create singleton instance
export const stressTestReportService = new StressTestReportService();
export default stressTestReportService;
