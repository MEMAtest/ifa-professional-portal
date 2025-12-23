// ================================================================
// src/lib/export/PowerPointGenerator.ts
// PowerPoint Export Generator using pptxgenjs
// ================================================================

import PptxGenJS from 'pptxgenjs';
import type { CashFlowScenario, ProjectionResult, CashFlowProjection } from '@/types/cashflow';
import type { Client } from '@/types/client';

export interface PowerPointReportData {
  client: Client;
  scenario: CashFlowScenario;
  projectionResult: ProjectionResult;
  options?: PowerPointExportOptions;
}

export interface PowerPointExportOptions {
  includeCharts?: boolean;
  includeAssumptions?: boolean;
  includeRiskAnalysis?: boolean;
  includeDetailedProjections?: boolean;
  theme?: 'professional' | 'modern' | 'classic';
  locale?: string;
}

export interface PowerPointExportResult {
  success: boolean;
  buffer?: Buffer;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// ================================================================
// THEME DEFINITIONS
// ================================================================

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textLight: string;
  background: string;
  success: string;
  warning: string;
  danger: string;
}

const THEMES: Record<string, ThemeColors> = {
  professional: {
    primary: '1e3a5f',
    secondary: '2c5282',
    accent: '3182ce',
    text: '1a202c',
    textLight: '718096',
    background: 'f7fafc',
    success: '38a169',
    warning: 'd69e2e',
    danger: 'e53e3e',
  },
  modern: {
    primary: '667eea',
    secondary: '764ba2',
    accent: 'f687b3',
    text: '2d3748',
    textLight: 'a0aec0',
    background: 'edf2f7',
    success: '48bb78',
    warning: 'ed8936',
    danger: 'fc8181',
  },
  classic: {
    primary: '2f5496',
    secondary: '4472c4',
    accent: '5b9bd5',
    text: '000000',
    textLight: '595959',
    background: 'ffffff',
    success: '70ad47',
    warning: 'bf8f00',
    danger: 'c00000',
  },
};

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
// POWERPOINT GENERATOR CLASS
// ================================================================

export class PowerPointGenerator {
  private pptx: PptxGenJS;
  private theme: ThemeColors;
  private data: PowerPointReportData;

  constructor(data: PowerPointReportData) {
    this.data = data;
    this.theme = THEMES[data.options?.theme || 'professional'];
    this.pptx = new PptxGenJS();
    this.setupPresentation();
  }

  private setupPresentation(): void {
    const clientName = this.getClientDisplayName(this.data.client);

    this.pptx.author = 'IFA Professional Portal';
    this.pptx.company = 'Financial Advisory Services';
    this.pptx.subject = `Cash Flow Analysis - ${clientName}`;
    this.pptx.title = `Cash Flow Report - ${clientName}`;
    this.pptx.layout = 'LAYOUT_16x9';

    // Define master slide
    this.pptx.defineSlideMaster({
      title: 'MAIN_MASTER',
      background: { color: this.theme.background },
      objects: [
        // Footer line
        {
          rect: {
            x: 0,
            y: 5.1,
            w: '100%',
            h: 0.02,
            fill: { color: this.theme.primary },
          },
        },
        // Footer text
        {
          text: {
            text: 'Confidential - Prepared by IFA Professional Portal',
            options: {
              x: 0.3,
              y: 5.2,
              w: 6,
              h: 0.3,
              fontSize: 8,
              color: this.theme.textLight,
            },
          },
        },
        // Page number
        {
          text: {
            text: 'Slide ',
            options: {
              x: 9,
              y: 5.2,
              w: 0.5,
              h: 0.3,
              fontSize: 8,
              color: this.theme.textLight,
            },
          },
        },
      ],
    });
  }

  /**
   * Generate complete PowerPoint presentation
   */
  async generate(): Promise<PowerPointExportResult> {
    try {
      const { options = {} } = this.data;
      const {
        includeCharts = true,
        includeAssumptions = true,
        includeRiskAnalysis = true,
        includeDetailedProjections = true,
      } = options;

      // 1. Title Slide
      this.createTitleSlide();

      // 2. Executive Summary
      this.createExecutiveSummarySlide();

      // 3. Key Metrics
      this.createKeyMetricsSlide();

      // 4. Portfolio Overview Chart
      if (includeCharts) {
        this.createPortfolioChartSlide();
      }

      // 5. Income vs Expenses Chart
      if (includeCharts) {
        this.createIncomeExpenseChartSlide();
      }

      // 6. Projections Table
      if (includeDetailedProjections) {
        this.createProjectionsSlide();
      }

      // 7. Assumptions
      if (includeAssumptions) {
        this.createAssumptionsSlide();
      }

      // 8. Risk Analysis
      if (includeRiskAnalysis && this.data.projectionResult.summary.riskMetrics) {
        this.createRiskAnalysisSlide();
      }

      // 9. Recommendations
      this.createRecommendationsSlide();

      // 10. Contact/Next Steps
      this.createClosingSlide();

      // Generate buffer
      const buffer = await this.pptx.write({ outputType: 'nodebuffer' }) as Buffer;

      // Generate filename
      const clientName = this.getClientDisplayName(this.data.client).replace(/\s+/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `CashFlow_Report_${clientName}_${dateStr}.pptx`;

      return {
        success: true,
        buffer,
        filename,
      };
    } catch (error) {
      console.error('PowerPoint generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PowerPoint generation failed',
      };
    }
  }

  /**
   * Generate and return as Blob (for client-side download)
   */
  async generateBlob(): Promise<PowerPointExportResult> {
    try {
      const result = await this.generate();

      if (result.success && result.buffer) {
        const blob = new Blob([result.buffer], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });

        return {
          ...result,
          blob,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PowerPoint blob',
      };
    }
  }

  // ================================================================
  // SLIDE CREATION METHODS
  // ================================================================

  private createTitleSlide(): void {
    const slide = this.pptx.addSlide();
    const { client, scenario } = this.data;
    const clientName = this.getClientDisplayName(client);

    // Background gradient effect
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fill: { color: this.theme.primary },
    });

    // Decorative element
    slide.addShape('rect', {
      x: 0,
      y: 4.5,
      w: '100%',
      h: 1,
      fill: { color: this.theme.secondary },
    });

    // Main title
    slide.addText('Cash Flow Analysis Report', {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: 'ffffff',
    });

    // Client name
    slide.addText(`Prepared for: ${clientName}`, {
      x: 0.5,
      y: 2.6,
      w: 9,
      h: 0.6,
      fontSize: 24,
      color: 'ffffff',
    });

    // Scenario name
    slide.addText(`Scenario: ${scenario.scenarioName || 'Standard Analysis'}`, {
      x: 0.5,
      y: 3.2,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: 'e0e0e0',
    });

    // Date
    slide.addText(formatDate(new Date()), {
      x: 0.5,
      y: 4.6,
      w: 4,
      h: 0.4,
      fontSize: 14,
      color: 'ffffff',
    });

    // Firm branding
    slide.addText('IFA Professional Portal', {
      x: 5.5,
      y: 4.6,
      w: 4,
      h: 0.4,
      fontSize: 14,
      color: 'ffffff',
      align: 'right',
    });
  }

  private createExecutiveSummarySlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { scenario, projectionResult } = this.data;
    const summary = projectionResult.summary;

    // Title
    this.addSlideTitle(slide, 'Executive Summary');

    // Summary text box
    const summaryText = [
      `This comprehensive cash flow analysis projects your financial journey over ${scenario.projectionYears} years,`,
      `from your current age to age ${scenario.lifeExpectancy}.`,
      '',
      `Based on our analysis, your portfolio is projected to reach ${formatCurrency(summary.finalPortfolioValue)}`,
      `by the end of the projection period, with a sustainability rating of ${summary.sustainabilityRating}/10.`,
    ].join('\n');

    slide.addText(summaryText, {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 1.5,
      fontSize: 14,
      color: this.theme.text,
      valign: 'top',
    });

    // Key highlights in boxes
    const highlights = [
      { label: 'Final Portfolio', value: formatCurrency(summary.finalPortfolioValue), color: this.theme.primary },
      { label: 'Goal Achievement', value: formatPercentage(summary.goalAchievementRate), color: this.theme.success },
      { label: 'Sustainability', value: `${summary.sustainabilityRating}/10`, color: this.theme.accent },
    ];

    highlights.forEach((h, i) => {
      const x = 0.5 + i * 3.1;

      slide.addShape('roundRect', {
        x,
        y: 3,
        w: 2.9,
        h: 1.5,
        fill: { color: h.color },
        rectRadius: 0.1,
      });

      slide.addText(h.label, {
        x,
        y: 3.1,
        w: 2.9,
        h: 0.4,
        fontSize: 12,
        color: 'ffffff',
        align: 'center',
      });

      slide.addText(h.value, {
        x,
        y: 3.5,
        w: 2.9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: 'ffffff',
        align: 'center',
        valign: 'middle',
      });
    });
  }

  private createKeyMetricsSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { projectionResult } = this.data;
    const summary = projectionResult.summary;

    this.addSlideTitle(slide, 'Key Financial Metrics');

    // Left column - Portfolio metrics
    const leftMetrics = [
      ['Total Contributions', formatCurrency(summary.totalContributions)],
      ['Total Withdrawals', formatCurrency(summary.totalWithdrawals)],
      ['Average Annual Return', formatPercentage(summary.averageAnnualReturn)],
      ['Max Withdrawal Rate', formatPercentage(summary.maxWithdrawalRate)],
    ];

    slide.addText('Portfolio Performance', {
      x: 0.5,
      y: 1.1,
      w: 4,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: this.theme.primary,
    });

    leftMetrics.forEach((row, i) => {
      slide.addText(row[0], {
        x: 0.5,
        y: 1.6 + i * 0.6,
        w: 2.5,
        h: 0.5,
        fontSize: 12,
        color: this.theme.textLight,
      });
      slide.addText(row[1], {
        x: 3,
        y: 1.6 + i * 0.6,
        w: 1.5,
        h: 0.5,
        fontSize: 12,
        bold: true,
        color: this.theme.text,
        align: 'right',
      });
    });

    // Right column - Goal metrics
    const rightMetrics = [
      ['Retirement Income', summary.retirementIncomeAchieved ? '✓ Achieved' : '✗ At Risk'],
      ['Emergency Fund', summary.emergencyFundAchieved ? '✓ Achieved' : '✗ At Risk'],
      ['Goal Achievement', formatPercentage(summary.goalAchievementRate)],
      ['Sustainability Rating', `${summary.sustainabilityRating}/10`],
    ];

    slide.addText('Goal Progress', {
      x: 5.3,
      y: 1.1,
      w: 4,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: this.theme.primary,
    });

    rightMetrics.forEach((row, i) => {
      const isAchieved = row[1].startsWith('✓');
      slide.addText(row[0], {
        x: 5.3,
        y: 1.6 + i * 0.6,
        w: 2.5,
        h: 0.5,
        fontSize: 12,
        color: this.theme.textLight,
      });
      slide.addText(row[1], {
        x: 7.8,
        y: 1.6 + i * 0.6,
        w: 1.5,
        h: 0.5,
        fontSize: 12,
        bold: true,
        color: row[1].includes('✓') ? this.theme.success : row[1].includes('✗') ? this.theme.danger : this.theme.text,
        align: 'right',
      });
    });

    // Key insights
    if (summary.keyInsights && summary.keyInsights.length > 0) {
      slide.addText('Key Insights', {
        x: 0.5,
        y: 4,
        w: 9,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: this.theme.primary,
      });

      const insights = summary.keyInsights.slice(0, 3).map((insight: string) => `• ${insight}`).join('\n');
      slide.addText(insights, {
        x: 0.5,
        y: 4.4,
        w: 9,
        h: 0.8,
        fontSize: 11,
        color: this.theme.text,
        valign: 'top',
      });
    }
  }

  private createPortfolioChartSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { projectionResult } = this.data;

    this.addSlideTitle(slide, 'Portfolio Projection');

    // Prepare chart data - take every 5th year for readability
    const projections = projectionResult.projections;
    const step = Math.max(1, Math.floor(projections.length / 10));
    const sampledData = projections.filter((_, i) => i % step === 0 || i === projections.length - 1);

    const chartData = [
      {
        name: 'Total Assets',
        labels: sampledData.map(p => `Year ${p.projectionYear}`),
        values: sampledData.map(p => p.totalAssets),
      },
      {
        name: 'Pension',
        labels: sampledData.map(p => `Year ${p.projectionYear}`),
        values: sampledData.map(p => p.pensionPotValue || 0),
      },
      {
        name: 'Investments',
        labels: sampledData.map(p => `Year ${p.projectionYear}`),
        values: sampledData.map(p => p.investmentPortfolio || 0),
      },
    ];

    slide.addChart('line', chartData, {
      x: 0.5,
      y: 1.1,
      w: 9,
      h: 4,
      chartColors: [this.theme.primary, this.theme.accent, this.theme.success],
      lineDataSymbol: 'circle',
      lineDataSymbolSize: 6,
      showLegend: true,
      legendPos: 'b',
      showValue: false,
      catAxisTitle: 'Year',
      valAxisTitle: 'Value (£)',
      valAxisDisplayUnit: 'thousands',
    });
  }

  private createIncomeExpenseChartSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { projectionResult } = this.data;

    this.addSlideTitle(slide, 'Income vs Expenses Over Time');

    // Prepare chart data
    const projections = projectionResult.projections;
    const step = Math.max(1, Math.floor(projections.length / 10));
    const sampledData = projections.filter((_, i) => i % step === 0 || i === projections.length - 1);

    const chartData = [
      {
        name: 'Income',
        labels: sampledData.map(p => `Year ${p.projectionYear}`),
        values: sampledData.map(p => p.totalIncome),
      },
      {
        name: 'Expenses',
        labels: sampledData.map(p => `Year ${p.projectionYear}`),
        values: sampledData.map(p => p.totalExpenses),
      },
    ];

    slide.addChart('bar', chartData, {
      x: 0.5,
      y: 1.1,
      w: 9,
      h: 4,
      chartColors: [this.theme.success, this.theme.danger],
      barGrouping: 'clustered',
      showLegend: true,
      legendPos: 'b',
      showValue: false,
      catAxisTitle: 'Year',
      valAxisTitle: 'Amount (£)',
      valAxisDisplayUnit: 'thousands',
    });
  }

  private createProjectionsSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { projectionResult } = this.data;

    this.addSlideTitle(slide, 'Year-by-Year Projections');

    // Take first 12 years or all if less
    const projections = projectionResult.projections.slice(0, 12);

    // Table headers
    const headers = ['Year', 'Age', 'Income', 'Expenses', 'Net', 'Assets'].map(text => ({ text }));

    // Table data
    const rows = projections.map(p => [
      { text: p.projectionYear.toString() },
      { text: p.clientAge.toString() },
      { text: this.formatCompact(p.totalIncome) },
      { text: this.formatCompact(p.totalExpenses) },
      { text: this.formatCompact(p.annualSurplusDeficit) },
      { text: this.formatCompact(p.totalAssets) },
    ]);

    const tableData = [headers, ...rows];

    slide.addTable(tableData as any, {
      x: 0.3,
      y: 1.1,
      w: 9.4,
      colW: [0.8, 0.7, 1.5, 1.5, 1.5, 1.5],
      fontSize: 10,
      border: { type: 'solid', color: 'e0e0e0', pt: 0.5 },
      fill: { color: 'ffffff' },
      color: this.theme.text,
      align: 'center',
      valign: 'middle',
      rowH: 0.35,
      fontFace: 'Arial',
      autoPage: false,
    });

    // Style header row
    slide.addShape('rect', {
      x: 0.3,
      y: 1.1,
      w: 9.4,
      h: 0.35,
      fill: { color: this.theme.primary },
    });

    slide.addText(headers.join('          '), {
      x: 0.3,
      y: 1.1,
      w: 9.4,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: 'ffffff',
      align: 'center',
      valign: 'middle',
    });

    if (projectionResult.projections.length > 12) {
      slide.addText(`Showing first 12 of ${projectionResult.projections.length} years. See full report for complete data.`, {
        x: 0.5,
        y: 4.8,
        w: 9,
        h: 0.3,
        fontSize: 9,
        italic: true,
        color: this.theme.textLight,
      });
    }
  }

  private createAssumptionsSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { scenario } = this.data;

    this.addSlideTitle(slide, 'Planning Assumptions');

    // Market assumptions
    slide.addText('Market & Economic Assumptions', {
      x: 0.5,
      y: 1.1,
      w: 4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: this.theme.primary,
    });

    const marketAssumptions = [
      ['Inflation Rate', formatPercentage(scenario.inflationRate)],
      ['Equity Return (Real)', formatPercentage(scenario.realEquityReturn)],
      ['Bond Return (Real)', formatPercentage(scenario.realBondReturn)],
      ['Cash Return (Real)', formatPercentage(scenario.realCashReturn)],
    ];

    marketAssumptions.forEach((row, i) => {
      slide.addText(row[0], {
        x: 0.5,
        y: 1.6 + i * 0.5,
        w: 2.5,
        h: 0.4,
        fontSize: 11,
        color: this.theme.textLight,
      });
      slide.addText(row[1], {
        x: 3,
        y: 1.6 + i * 0.5,
        w: 1.2,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: this.theme.text,
        align: 'right',
      });
    });

    // Life assumptions
    slide.addText('Life Stage Assumptions', {
      x: 5.3,
      y: 1.1,
      w: 4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: this.theme.primary,
    });

    const lifeAssumptions = [
      ['Retirement Age', scenario.retirementAge.toString()],
      ['Life Expectancy', scenario.lifeExpectancy.toString()],
      ['Projection Years', scenario.projectionYears.toString()],
      ['Current Age', (scenario.clientAge || 'N/A').toString()],
    ];

    lifeAssumptions.forEach((row, i) => {
      slide.addText(row[0], {
        x: 5.3,
        y: 1.6 + i * 0.5,
        w: 2.5,
        h: 0.4,
        fontSize: 11,
        color: this.theme.textLight,
      });
      slide.addText(row[1], {
        x: 7.8,
        y: 1.6 + i * 0.5,
        w: 1.2,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: this.theme.text,
        align: 'right',
      });
    });

    // Current financial position
    slide.addText('Current Financial Position', {
      x: 0.5,
      y: 3.8,
      w: 9,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: this.theme.primary,
    });

    const financialPosition = [
      ['Annual Income', formatCurrency(scenario.currentIncome)],
      ['Annual Expenses', formatCurrency(scenario.currentExpenses)],
      ['Current Savings', formatCurrency(scenario.currentSavings)],
      ['Pension Value', formatCurrency(scenario.pensionPotValue || 0)],
    ];

    financialPosition.forEach((row, i) => {
      const x = 0.5 + (i % 2) * 4.8;
      const y = 4.3 + Math.floor(i / 2) * 0.5;

      slide.addText(row[0], {
        x,
        y,
        w: 2,
        h: 0.4,
        fontSize: 11,
        color: this.theme.textLight,
      });
      slide.addText(row[1], {
        x: x + 2,
        y,
        w: 2.5,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: this.theme.text,
      });
    });
  }

  private createRiskAnalysisSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { projectionResult } = this.data;
    const riskMetrics = projectionResult.summary.riskMetrics;

    this.addSlideTitle(slide, 'Risk Analysis');

    // Risk gauge cards
    const risks = [
      { name: 'Shortfall Risk', level: riskMetrics.shortfallRisk },
      { name: 'Longevity Risk', level: riskMetrics.longevityRisk },
      { name: 'Inflation Risk', level: riskMetrics.inflationRisk },
      { name: 'Sequence Risk', level: riskMetrics.sequenceRisk },
    ];

    risks.forEach((risk, i) => {
      const x = 0.5 + (i % 2) * 4.8;
      const y = 1.3 + Math.floor(i / 2) * 1.5;
      const color = this.getRiskColor(risk.level);

      slide.addShape('roundRect', {
        x,
        y,
        w: 4.5,
        h: 1.3,
        fill: { color: 'f8f9fa' },
        line: { color: color, pt: 2 },
        rectRadius: 0.1,
      });

      slide.addText(risk.name, {
        x,
        y: y + 0.1,
        w: 4.5,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: this.theme.text,
        align: 'center',
      });

      slide.addText(risk.level.toUpperCase(), {
        x,
        y: y + 0.5,
        w: 4.5,
        h: 0.6,
        fontSize: 20,
        bold: true,
        color: color,
        align: 'center',
        valign: 'middle',
      });
    });

    // Risk descriptions
    slide.addText('Risk Definitions', {
      x: 0.5,
      y: 4.3,
      w: 9,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: this.theme.primary,
    });

    const descriptions = [
      'Shortfall: Risk of running out of funds',
      'Longevity: Risk of outliving resources',
      'Inflation: Purchasing power erosion',
      'Sequence: Poor early returns impact',
    ];

    slide.addText(descriptions.join('  •  '), {
      x: 0.5,
      y: 4.6,
      w: 9,
      h: 0.4,
      fontSize: 9,
      color: this.theme.textLight,
    });
  }

  private createRecommendationsSlide(): void {
    const slide = this.pptx.addSlide({ masterName: 'MAIN_MASTER' });
    const { projectionResult } = this.data;
    const summary = projectionResult.summary;

    this.addSlideTitle(slide, 'Recommendations');

    // Generate recommendations based on analysis
    const recommendations = this.generateRecommendations(summary);

    recommendations.forEach((rec, i) => {
      const y = 1.2 + i * 0.9;

      // Number circle
      slide.addShape('ellipse', {
        x: 0.5,
        y: y + 0.1,
        w: 0.4,
        h: 0.4,
        fill: { color: this.theme.primary },
      });

      slide.addText((i + 1).toString(), {
        x: 0.5,
        y: y + 0.1,
        w: 0.4,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: 'ffffff',
        align: 'center',
        valign: 'middle',
      });

      // Recommendation text
      slide.addText(rec.title, {
        x: 1.1,
        y,
        w: 8.4,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: this.theme.text,
      });

      slide.addText(rec.description, {
        x: 1.1,
        y: y + 0.4,
        w: 8.4,
        h: 0.4,
        fontSize: 11,
        color: this.theme.textLight,
      });
    });
  }

  private createClosingSlide(): void {
    const slide = this.pptx.addSlide();

    // Background
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fill: { color: this.theme.primary },
    });

    // Thank you message
    slide.addText('Thank You', {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1,
      fontSize: 44,
      bold: true,
      color: 'ffffff',
      align: 'center',
    });

    slide.addText('Next Steps', {
      x: 0.5,
      y: 2.6,
      w: 9,
      h: 0.5,
      fontSize: 24,
      color: 'ffffff',
      align: 'center',
    });

    const nextSteps = [
      '• Review this analysis with your advisor',
      '• Discuss any questions or concerns',
      '• Consider the recommendations provided',
      '• Schedule your next review meeting',
    ].join('\n');

    slide.addText(nextSteps, {
      x: 2,
      y: 3.3,
      w: 6,
      h: 1.5,
      fontSize: 16,
      color: 'e0e0e0',
      align: 'left',
    });

    // Contact info
    slide.addText('IFA Professional Portal', {
      x: 0.5,
      y: 5,
      w: 9,
      h: 0.3,
      fontSize: 12,
      color: 'ffffff',
      align: 'center',
    });
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  private addSlideTitle(slide: PptxGenJS.Slide, title: string): void {
    // Title bar
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.9,
      fill: { color: this.theme.primary },
    });

    slide.addText(title, {
      x: 0.5,
      y: 0.2,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: 'ffffff',
    });
  }

  private getClientDisplayName(client: Client): string {
    const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : '';
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${title}${firstName} ${lastName}`.trim() || 'Unknown Client';
  }

  private formatCompact(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    }
    return `£${value.toFixed(0)}`;
  }

  private getRiskColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'low':
        return this.theme.success;
      case 'medium':
        return this.theme.warning;
      case 'high':
        return this.theme.danger;
      default:
        return this.theme.textLight;
    }
  }

  private generateRecommendations(summary: ProjectionResult['summary']): Array<{ title: string; description: string }> {
    const recommendations: Array<{ title: string; description: string }> = [];

    // sustainabilityRating is a string like 'Poor', 'Adequate', 'Good', 'Excellent'
    const lowRatings = ['Poor', 'Critical', 'Adequate'];
    if (lowRatings.includes(summary.sustainabilityRating)) {
      recommendations.push({
        title: 'Increase Savings Rate',
        description: 'Consider increasing monthly contributions to improve portfolio sustainability.',
      });
    }

    if (summary.goalAchievementRate < 80) {
      recommendations.push({
        title: 'Review Financial Goals',
        description: 'Some goals may need adjustment to align with your current financial trajectory.',
      });
    }

    if (!summary.emergencyFundAchieved) {
      recommendations.push({
        title: 'Build Emergency Fund',
        description: 'Prioritize building 3-6 months of expenses in easily accessible savings.',
      });
    }

    if (summary.riskMetrics?.shortfallRisk === 'High') {
      recommendations.push({
        title: 'Address Shortfall Risk',
        description: 'Review withdrawal strategy and consider reducing planned expenses.',
      });
    }

    // Add default recommendation if none generated
    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Maintain Current Strategy',
        description: 'Your financial plan is on track. Continue with regular reviews.',
      });
    }

    // Add annual review recommendation
    recommendations.push({
      title: 'Schedule Annual Review',
      description: 'Regular reviews ensure your plan adapts to changing circumstances.',
    });

    return recommendations.slice(0, 4);
  }

  // ================================================================
  // STATIC FACTORY METHODS
  // ================================================================

  /**
   * Generate PowerPoint report from data
   */
  static async generateCashFlowReport(data: PowerPointReportData): Promise<PowerPointExportResult> {
    const generator = new PowerPointGenerator(data);
    return generator.generate();
  }

  /**
   * Generate PowerPoint and return as Blob
   */
  static async generateCashFlowReportBlob(data: PowerPointReportData): Promise<PowerPointExportResult> {
    const generator = new PowerPointGenerator(data);
    return generator.generateBlob();
  }

  /**
   * Trigger download in browser (client-side only)
   */
  static async downloadCashFlowReport(data: PowerPointReportData): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('downloadCashFlowReport can only be used in browser');
    }

    const result = await PowerPointGenerator.generateCashFlowReportBlob(data);

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
      throw new Error(result.error || 'Failed to generate PowerPoint file');
    }
  }
}

export default PowerPointGenerator;
