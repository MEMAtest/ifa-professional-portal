// ================================================================
// src/lib/export/ExcelGenerator.ts
// Excel Export Generator using xlsx package
// ================================================================

import * as XLSX from 'xlsx';
import type { CashFlowScenario, ProjectionResult, CashFlowProjection } from '@/types/cashflow';
import type { Client } from '@/types/client';
import clientLogger from '@/lib/logging/clientLogger'

export interface ExcelReportData {
  client: Client;
  scenario: CashFlowScenario;
  projectionResult: ProjectionResult;
  options?: ExcelExportOptions;
}

export interface ExcelExportOptions {
  includeCharts?: boolean;
  includeAssumptions?: boolean;
  includeRiskAnalysis?: boolean;
  sheetNames?: {
    summary?: string;
    projections?: string;
    assumptions?: string;
    riskAnalysis?: string;
  };
  locale?: string;
}

export interface ExcelExportResult {
  success: boolean;
  buffer?: Buffer;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// ================================================================
// FORMATTING UTILITIES
// ================================================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatPercentage = (rate: number): string => {
  return `${(rate || 0).toFixed(1)}%`;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

// ================================================================
// EXCEL GENERATOR CLASS
// ================================================================

export class ExcelGenerator {
  /**
   * Generate Excel workbook from cash flow report data
   */
  static generateCashFlowReport(data: ExcelReportData): ExcelExportResult {
    try {
      const { client, scenario, projectionResult, options = {} } = data;
      const {
        includeAssumptions = true,
        includeRiskAnalysis = true,
        sheetNames = {},
      } = options;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summarySheet = this.createSummarySheet(client, scenario, projectionResult);
      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        sheetNames.summary || 'Executive Summary'
      );

      // 2. Projections Sheet
      const projectionsSheet = this.createProjectionsSheet(projectionResult.projections);
      XLSX.utils.book_append_sheet(
        workbook,
        projectionsSheet,
        sheetNames.projections || 'Year-by-Year Projections'
      );

      // 3. Assumptions Sheet (optional)
      if (includeAssumptions) {
        const assumptionsSheet = this.createAssumptionsSheet(scenario);
        XLSX.utils.book_append_sheet(
          workbook,
          assumptionsSheet,
          sheetNames.assumptions || 'Assumptions'
        );
      }

      // 4. Risk Analysis Sheet (optional)
      if (includeRiskAnalysis && projectionResult.summary.riskMetrics) {
        const riskSheet = this.createRiskAnalysisSheet(projectionResult.summary);
        XLSX.utils.book_append_sheet(
          workbook,
          riskSheet,
          sheetNames.riskAnalysis || 'Risk Analysis'
        );
      }

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Generate filename
      const clientName = this.getClientDisplayName(client).replace(/\s+/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `CashFlow_Report_${clientName}_${dateStr}.xlsx`;

      return {
        success: true,
        buffer: Buffer.from(buffer),
        filename,
      };
    } catch (error) {
      clientLogger.error('Excel generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Excel generation failed',
      };
    }
  }

  /**
   * Generate Excel and return as Blob (for client-side download)
   */
  static generateCashFlowReportBlob(data: ExcelReportData): ExcelExportResult {
    const result = this.generateCashFlowReport(data);

    if (result.success && result.buffer) {
      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      return {
        ...result,
        blob,
      };
    }

    return result;
  }

  /**
   * Trigger download in browser (client-side only)
   */
  static downloadCashFlowReport(data: ExcelReportData): void {
    if (typeof window === 'undefined') {
      throw new Error('downloadCashFlowReport can only be used in browser');
    }

    const result = this.generateCashFlowReportBlob(data);

    if (result.success && result.blob && result.filename) {
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      throw new Error(result.error || 'Failed to generate Excel file');
    }
  }

  // ================================================================
  // SHEET CREATION METHODS
  // ================================================================

  private static createSummarySheet(
    client: Client,
    scenario: CashFlowScenario,
    projectionResult: ProjectionResult
  ): XLSX.WorkSheet {
    const summary = projectionResult.summary;
    const clientName = this.getClientDisplayName(client);

    const data = [
      // Header
      ['CASH FLOW ANALYSIS REPORT'],
      [''],
      ['Report Generated:', formatDate(new Date())],
      [''],

      // Client Information
      ['CLIENT INFORMATION'],
      ['Client Name:', clientName],
      ['Email:', client.contactInfo?.email || 'N/A'],
      ['Reference:', client.clientRef || 'N/A'],
      [''],

      // Scenario Details
      ['SCENARIO DETAILS'],
      ['Scenario Name:', scenario.scenarioName || 'N/A'],
      ['Scenario Type:', scenario.scenarioType || 'N/A'],
      ['Projection Years:', scenario.projectionYears],
      ['Retirement Age:', scenario.retirementAge],
      ['Life Expectancy:', scenario.lifeExpectancy],
      [''],

      // Key Results
      ['KEY RESULTS'],
      ['Final Portfolio Value:', formatCurrency(summary.finalPortfolioValue)],
      ['Total Contributions:', formatCurrency(summary.totalContributions)],
      ['Total Withdrawals:', formatCurrency(summary.totalWithdrawals)],
      ['Average Annual Return:', formatPercentage(summary.averageAnnualReturn)],
      ['Sustainability Rating:', `${summary.sustainabilityRating}/10`],
      ['Goal Achievement Rate:', formatPercentage(summary.goalAchievementRate)],
      [''],

      // Financial Position
      ['CURRENT FINANCIAL POSITION'],
      ['Annual Income:', formatCurrency(scenario.currentIncome)],
      ['Annual Expenses:', formatCurrency(scenario.currentExpenses)],
      ['Current Savings:', formatCurrency(scenario.currentSavings)],
      ['Pension Value:', formatCurrency(scenario.pensionPotValue || 0)],
      ['Investment Value:', formatCurrency(scenario.investmentValue || 0)],
      [''],

      // Key Insights
      ['KEY INSIGHTS'],
      ...(summary.keyInsights || []).map((insight: string) => [insight]),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    sheet['!cols'] = [{ wch: 25 }, { wch: 40 }];

    return sheet;
  }

  private static createProjectionsSheet(projections: CashFlowProjection[]): XLSX.WorkSheet {
    const headers = [
      'Year',
      'Age',
      'Total Income',
      'Total Expenses',
      'Annual Surplus/Deficit',
      'Total Assets',
      'Pension Value',
      'Investment Value',
      'Cash/Savings',
    ];

    const data = [
      headers,
      ...projections.map((p) => [
        p.projectionYear,
        p.clientAge,
        p.totalIncome,
        p.totalExpenses,
        p.annualSurplusDeficit,
        p.totalAssets,
        p.pensionPotValue || 0,
        p.investmentPortfolio || 0,
        p.cashSavings || 0,
      ]),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);

    // Format currency columns
    const currencyColumns = [2, 3, 4, 5, 6, 7, 8]; // C through I
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let row = 1; row <= range.e.r; row++) {
      for (const col of currencyColumns) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (sheet[cellRef]) {
          sheet[cellRef].z = '£#,##0';
        }
      }
    }

    // Set column widths
    sheet['!cols'] = [
      { wch: 8 },  // Year
      { wch: 6 },  // Age
      { wch: 15 }, // Total Income
      { wch: 15 }, // Total Expenses
      { wch: 18 }, // Annual Surplus
      { wch: 15 }, // Total Assets
      { wch: 15 }, // Pension
      { wch: 15 }, // Investments
      { wch: 15 }, // Cash
    ];

    return sheet;
  }

  private static createAssumptionsSheet(scenario: CashFlowScenario): XLSX.WorkSheet {
    const data = [
      ['MARKET & ECONOMIC ASSUMPTIONS'],
      [''],
      ['Assumption', 'Value'],
      ['Inflation Rate', formatPercentage(scenario.inflationRate)],
      ['Real Equity Return', formatPercentage(scenario.realEquityReturn)],
      ['Real Bond Return', formatPercentage(scenario.realBondReturn)],
      ['Real Cash Return', formatPercentage(scenario.realCashReturn)],
      [''],
      ['SCENARIO PARAMETERS'],
      [''],
      ['Parameter', 'Value'],
      ['Retirement Age', scenario.retirementAge],
      ['Life Expectancy', scenario.lifeExpectancy],
      ['Projection Years', scenario.projectionYears],
      ['Current Age', scenario.clientAge || 'N/A'],
      [''],
      ['INCOME ASSUMPTIONS'],
      [''],
      ['Income Source', 'Annual Amount'],
      ['Employment Income', formatCurrency(scenario.currentIncome)],
      ['State Pension (from age)', `${scenario.statePensionAge || 67}`],
      ['State Pension Amount', formatCurrency(scenario.statePensionAmount || 0)],
      ['Pension Contributions', formatCurrency(scenario.pensionContributions || 0)],
      [''],
      ['EXPENSE ASSUMPTIONS'],
      [''],
      ['Expense Category', 'Annual Amount'],
      ['Total Annual Expenses', formatCurrency(scenario.currentExpenses)],
      ['Essential Expenses', formatCurrency(scenario.essentialExpenses || 0)],
      ['Lifestyle Expenses', formatCurrency(scenario.lifestyleExpenses || 0)],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{ wch: 30 }, { wch: 20 }];

    return sheet;
  }

  private static createRiskAnalysisSheet(summary: ProjectionResult['summary']): XLSX.WorkSheet {
    const riskMetrics = summary.riskMetrics;

    const data = [
      ['RISK ANALYSIS'],
      [''],
      ['Risk Type', 'Level', 'Description'],
      [
        'Shortfall Risk',
        riskMetrics.shortfallRisk,
        'Risk of portfolio running out before life expectancy',
      ],
      [
        'Longevity Risk',
        riskMetrics.longevityRisk,
        'Risk of outliving your financial resources',
      ],
      [
        'Inflation Risk',
        riskMetrics.inflationRisk,
        'Risk of purchasing power erosion over time',
      ],
      [
        'Sequence Risk',
        riskMetrics.sequenceRisk,
        'Risk of poor returns early in retirement',
      ],
      [''],
      ['SUSTAINABILITY METRICS'],
      [''],
      ['Metric', 'Value'],
      ['Sustainability Rating', `${summary.sustainabilityRating}/10`],
      ['Goal Achievement Rate', formatPercentage(summary.goalAchievementRate)],
      ['Maximum Safe Withdrawal Rate', formatPercentage(summary.maxWithdrawalRate)],
      ['Retirement Income Achieved', summary.retirementIncomeAchieved ? 'Yes' : 'No'],
      ['Emergency Fund Achieved', summary.emergencyFundAchieved ? 'Yes' : 'No'],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 50 }];

    return sheet;
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  private static getClientDisplayName(client: Client): string {
    const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : '';
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${title}${firstName} ${lastName}`.trim() || 'Unknown Client';
  }
}

export default ExcelGenerator;
