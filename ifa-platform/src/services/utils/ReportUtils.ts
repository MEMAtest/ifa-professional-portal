// ================================================================
// src/services/utils/ReportUtils.ts
// EXTRACTED PATTERNS - Copied from successful CashFlowReportService
// Does NOT modify original services - just extracts proven patterns
// ================================================================

import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/types/client';
import type { CashFlowScenario, CashFlowProjection } from '@/types/cashflow';

// ================================================================
// UTILITY CLASS - Extracted from your successful services
// ================================================================

export class ReportUtils {
  private static supabase = createClient(); // Same pattern as your existing services

  // ================================================================
  // CLIENT INFORMATION FORMATTING (Copied from CashFlowReportService)
  // ================================================================

  /**
   * Format client display name (extracted from CashFlowReportService)
   */
  static getClientDisplayName(client: Client): string {
    if (!client || !client.personalDetails) return '';
    const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : '';
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${title}${firstName} ${lastName}`.trim();
  }

  /**
   * Format client address (extracted from CashFlowReportService)
   */
  static formatClientAddress(client: Client): string {
    if (!client || !client.contactInfo?.address) return '';

    const addr = client.contactInfo.address;
    return [addr.line1, addr.line2, addr.city, addr.county, addr.postcode]
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Calculate client age (extracted from CashFlowReportService)
   */
  static calculateAge(dateOfBirth: string): number {
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

  // ================================================================
  // FORMATTING UTILITIES (Copied from CashFlowReportService)
  // ================================================================

  /**
   * Format currency with locale support (enhanced from CashFlowReportService)
   */
  static formatCurrency(amount: number, locale: string = 'en-GB'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: locale?.startsWith('en') ? 'GBP' : 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  /**
   * Format percentage with locale support (enhanced from CashFlowReportService)
   */
  static formatPercentage(rate: number, locale: string = 'en-GB'): string {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format((rate || 0) / 100);
  }

  /**
   * Format date with locale support (extracted pattern)
   */
  static formatDate(date: Date, locale: string = 'en-GB'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Format key insights as HTML list (copied from CashFlowReportService)
   */
  static formatKeyInsights(insights: string[], locale?: string): string {
    if (!Array.isArray(insights)) return '';
    return insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('');
  }

  // ================================================================
  // TABLE GENERATION (Copied from CashFlowReportService)
  // ================================================================

  /**
   * Build projection table HTML (copied from CashFlowReportService)
   */
  static buildProjectionTable(projections: CashFlowProjection[], locale?: string): string {
    if (!projections.length) return '';

    const headers = {
      year: ReportUtils.getLocalizedText('YEAR', locale),
      age: ReportUtils.getLocalizedText('AGE', locale),
      income: ReportUtils.getLocalizedText('TOTAL_INCOME', locale),
      expenses: ReportUtils.getLocalizedText('TOTAL_EXPENSES', locale),
      portfolio: ReportUtils.getLocalizedText('PORTFOLIO_VALUE', locale),
      surplus: ReportUtils.getLocalizedText('ANNUAL_SURPLUS', locale)
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
      const rowStyle = index % 2 === 0 ? 'background-color: #f9f9f9;' : '';
      const flowStyle = projection.annualSurplusDeficit >= 0 ? 'color: green;' : 'color: red;';

      table += `
        <tr style="${rowStyle}">
          <td style="border: 1px solid #dee2e6; padding: 8px;">${projection.projectionYear}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${projection.clientAge}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatCurrency(projection.totalIncome, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatCurrency(projection.totalExpenses, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatCurrency(projection.totalAssets, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; ${flowStyle}">${ReportUtils.formatCurrency(projection.annualSurplusDeficit, locale)}</td>
        </tr>
      `;
    });

    table += `</tbody></table>`;
    return table;
  }

  /**
   * Build assumptions table HTML (copied from CashFlowReportService)
   */
  static buildAssumptionsTable(scenario: CashFlowScenario, locale?: string): string {
    const labels = {
      inflation: ReportUtils.getLocalizedText('INFLATION_RATE', locale),
      equity: ReportUtils.getLocalizedText('REAL_EQUITY_RETURN', locale),
      bond: ReportUtils.getLocalizedText('REAL_BOND_RETURN', locale),
      cash: ReportUtils.getLocalizedText('REAL_CASH_RETURN', locale),
      retirement: ReportUtils.getLocalizedText('RETIREMENT_AGE', locale),
      life: ReportUtils.getLocalizedText('LIFE_EXPECTANCY', locale)
    };

    return `
      <table class="assumptions-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">${ReportUtils.getLocalizedText('ASSUMPTION', locale)}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.getLocalizedText('VALUE', locale)}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.inflation}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatPercentage(scenario.inflationRate, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.equity}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatPercentage(scenario.realEquityReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.bond}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatPercentage(scenario.realBondReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.cash}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${ReportUtils.formatPercentage(scenario.realCashReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.retirement}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${scenario.retirementAge}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.life}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${scenario.lifeExpectancy}</td></tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Build risk analysis section HTML (copied from CashFlowReportService)
   */
  static buildRiskAnalysisSection(riskMetrics: any, locale?: string): string {
    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'Low': return 'color: green; font-weight: bold;';
        case 'Medium': return 'color: orange; font-weight: bold;';
        case 'High': return 'color: red; font-weight: bold;';
        default: return '';
      }
    };

    const labels = {
      shortfall: ReportUtils.getLocalizedText('SHORTFALL_RISK', locale),
      longevity: ReportUtils.getLocalizedText('LONGEVITY_RISK', locale),
      inflation: ReportUtils.getLocalizedText('INFLATION_RISK', locale),
      sequence: ReportUtils.getLocalizedText('SEQUENCE_RISK', locale),
      summary: ReportUtils.getLocalizedText('RISK_ANALYSIS_SUMMARY', locale)
    };

    return `
      <div class="risk-analysis-section" style="margin: 20px 0;">
        <h4 style="color: #333; margin-bottom: 15px;">${labels.summary}</h4>
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
              <td style="padding: 8px; border: 1px solid #ddd;">${labels.shortfall}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.shortfallRisk)}">${riskMetrics.shortfallRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of portfolio depletion before life expectancy</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${labels.longevity}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.longevityRisk)}">${riskMetrics.longevityRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of outliving financial resources</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${labels.inflation}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.inflationRisk)}">${riskMetrics.inflationRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of purchasing power erosion</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${labels.sequence}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd; ${getRiskColor(riskMetrics.sequenceRisk)}">${riskMetrics.sequenceRisk}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Risk of poor returns early in retirement</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // ================================================================
  // TEMPLATE VARIABLE BUILDING (Pattern from CashFlowReportService)
  // ================================================================

  /**
   * Build common client variables (pattern from CashFlowReportService)
   */
  static buildClientVariables(client: Client, locale?: string): Record<string, any> {
    return {
      // Client Information
      CLIENT_NAME: ReportUtils.getClientDisplayName(client),
      CLIENT_EMAIL: client.contactInfo?.email || '',
      CLIENT_REF: client.clientRef || '',
      CLIENT_PHONE: client.contactInfo?.phone || '',
      CLIENT_ADDRESS: ReportUtils.formatClientAddress(client),
      CLIENT_AGE: ReportUtils.calculateAge(client.personalDetails?.dateOfBirth || ''),
      CLIENT_OCCUPATION: client.personalDetails?.occupation || '',

      // Report Metadata
      REPORT_DATE: ReportUtils.formatDate(new Date(), locale),
      ADVISOR_NAME: ReportUtils.getLocalizedText('PROFESSIONAL_ADVISOR', locale),
      FIRM_NAME: ReportUtils.getLocalizedText('FINANCIAL_ADVISORY_SERVICES', locale),
    };
  }

  /**
   * Build scenario variables (pattern from CashFlowReportService)
   */
  static buildScenarioVariables(scenario: CashFlowScenario, locale?: string): Record<string, any> {
    return {
      // Scenario Information
      SCENARIO_NAME: scenario.scenarioName,
      SCENARIO_TYPE: scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1),
      PROJECTION_YEARS: scenario.projectionYears,
      RETIREMENT_AGE: scenario.retirementAge,
      LIFE_EXPECTANCY: scenario.lifeExpectancy,

      // Financial Position with locale-aware formatting
      CURRENT_INCOME: ReportUtils.formatCurrency(scenario.currentIncome, locale),
      CURRENT_EXPENSES: ReportUtils.formatCurrency(scenario.currentExpenses, locale),
      CURRENT_SAVINGS: ReportUtils.formatCurrency(scenario.currentSavings, locale),
      PENSION_VALUE: ReportUtils.formatCurrency(scenario.pensionPotValue || scenario.pensionValue || 0, locale),
      INVESTMENT_VALUE: ReportUtils.formatCurrency(scenario.investmentValue, locale),

      // Market Assumptions
      INFLATION_RATE: ReportUtils.formatPercentage(scenario.inflationRate, locale),
      EQUITY_RETURN: ReportUtils.formatPercentage(scenario.realEquityReturn, locale),
      BOND_RETURN: ReportUtils.formatPercentage(scenario.realBondReturn, locale),
      CASH_RETURN: ReportUtils.formatPercentage(scenario.realCashReturn, locale),
    };
  }

  // ================================================================
  // LOCALIZATION (Pattern from EnhancedCashFlowReportService)
  // ================================================================

  /**
   * Get localized text (extracted pattern)
   */
  static getLocalizedText(key: string, locale?: string): string {
    // Basic localization - can be enhanced later
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

  // ================================================================
  // SUPABASE UTILITIES (Using your proven pattern)
  // ================================================================

  /**
   * Get document download URL (copied pattern)
   */
  static async getDocumentDownloadUrl(filePath: string): Promise<string> {
    const { data } = await ReportUtils.supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return data?.signedUrl || '';
  }

  /**
   * Save document to storage (using your proven pattern)
   */
  static async saveDocumentToStorage(
    content: string,
    fileName: string,
    clientId: string,
    contentType: string = 'text/html'
  ): Promise<{ filePath: string; error?: string }> {
    const filePath = `generated_documents/${clientId}/${fileName}`;

    const { error: uploadError } = await ReportUtils.supabase.storage
      .from('documents')
      .upload(filePath, content, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return { filePath, error: uploadError.message };
    }

    return { filePath };
  }

  // ================================================================
  // PDF GENERATION (Added for ATR service)
  // ================================================================

  /**
   * Generate PDF from HTML content
   */
  static async generatePDF(htmlContent: string, options?: {
    filename?: string;
    title?: string;
  }): Promise<{ downloadUrl: string; filename: string }> {
    // For now, create a simple blob URL - can be enhanced later
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);

    const filename = options?.filename || `report-${new Date().toISOString().split('T')[0]}.html`;

    return {
      downloadUrl,
      filename
    };
  }
}

// ================================================================
// TEMPLATE POPULATION (Pattern from your services)
// ================================================================

/**
 * Populate template with variables (extracted pattern)
 */
export function populateTemplate(content: string, variables: Record<string, any>): string {
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