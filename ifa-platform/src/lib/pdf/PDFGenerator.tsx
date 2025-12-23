// ================================================================
// src/lib/pdf/PDFGenerator.tsx
// Professional PDF Generation Service using @react-pdf/renderer
// Supports server-side and client-side PDF generation
// ================================================================

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
  Image,
} from '@react-pdf/renderer';

// Import chart components
import {
  LineChart,
  MultiLineChart,
  BarChart,
  PieChart,
  GaugeChart,
  chartColors,
  type ChartDataPoint,
  type LineChartDataPoint,
} from './PDFCharts';

// ================================================================
// FONT REGISTRATION (Optional - for custom fonts)
// ================================================================

// Register default fonts for professional appearance
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf', fontWeight: 700 },
  ],
});

// ================================================================
// SHARED STYLES
// ================================================================

const colors = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  white: '#ffffff',
};

const baseStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.text,
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  headerColumn: {
    width: '30%',
  },
  label: {
    fontSize: 8,
    color: colors.textLight,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: colors.text,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
    color: colors.text,
  },
  // Table styles
  table: {
    width: '100%',
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 25,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
  },
  tableCellHeader: {
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Metric cards
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  metricCard: {
    width: '23%',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    color: colors.textLight,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Risk indicators
  riskLow: {
    color: colors.success,
    fontWeight: 'bold',
  },
  riskMedium: {
    color: colors.warning,
    fontWeight: 'bold',
  },
  riskHigh: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
  },
  pageNumber: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 5,
  },
  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  listBullet: {
    width: 15,
    fontSize: 10,
    color: colors.primary,
  },
  listContent: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
});

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface PDFReportData {
  // Client Information
  clientName: string;
  clientEmail?: string;
  clientRef?: string;
  clientAge?: number;

  // Report Metadata
  reportDate: string;
  reportType: string;
  advisorName: string;
  firmName: string;

  // Scenario Information
  scenarioName?: string;
  scenarioType?: string;
  projectionYears?: number;
  retirementAge?: number;
  lifeExpectancy?: number;

  // Financial Position
  currentIncome?: number;
  currentExpenses?: number;
  currentSavings?: number;
  pensionValue?: number;
  investmentValue?: number;

  // Market Assumptions
  inflationRate?: number;
  equityReturn?: number;
  bondReturn?: number;
  cashReturn?: number;

  // Key Results
  finalPortfolioValue?: number;
  totalContributions?: number;
  totalWithdrawals?: number;
  averageAnnualReturn?: number;
  maxWithdrawalRate?: number;
  goalAchievementRate?: number;
  sustainabilityRating?: number;

  // Risk Analysis
  riskMetrics?: {
    shortfallRisk: string;
    longevityRisk: string;
    inflationRisk: string;
    sequenceRisk: string;
  };

  // Projections Table
  projections?: Array<{
    year: number;
    age: number;
    income: number;
    expenses: number;
    surplus: number;
    portfolioValue: number;
  }>;

  // Key Insights
  keyInsights?: string[];

  // ATR Specific
  riskLevel?: number;
  riskCategory?: string;
  riskDescription?: string;
  totalScore?: number;
  categoryScores?: Record<string, number>;
  recommendations?: string[];
}

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
  includeAssumptions?: boolean;
  includeRiskAnalysis?: boolean;
  includeProjectionTable?: boolean;
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '£0';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (rate: number | undefined): string => {
  if (rate === undefined || rate === null) return '0%';
  return `${rate.toFixed(1)}%`;
};

const getRiskStyle = (risk: string) => {
  switch (risk?.toLowerCase()) {
    case 'low':
      return baseStyles.riskLow;
    case 'medium':
      return baseStyles.riskMedium;
    case 'high':
      return baseStyles.riskHigh;
    default:
      return {};
  }
};

// ================================================================
// PDF COMPONENTS
// ================================================================

// Page Footer Component
const PageFooter = ({ firmName, pageNumber }: { firmName: string; pageNumber?: number }) => (
  <View style={baseStyles.footer} fixed>
    <Text style={baseStyles.footerText}>
      This report has been prepared by {firmName}. Past performance is not indicative of future results.
    </Text>
    <Text
      style={baseStyles.pageNumber}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);

// Metric Card Component
const MetricCard = ({ value, label }: { value: string; label: string }) => (
  <View style={baseStyles.metricCard}>
    <Text style={baseStyles.metricValue}>{value}</Text>
    <Text style={baseStyles.metricLabel}>{label}</Text>
  </View>
);

// List Item Component
const ListItem = ({ children }: { children: string }) => (
  <View style={baseStyles.listItem}>
    <Text style={baseStyles.listBullet}>•</Text>
    <Text style={baseStyles.listContent}>{children}</Text>
  </View>
);

// ================================================================
// CASH FLOW REPORT DOCUMENT
// ================================================================

export const CashFlowReportDocument = ({
  data,
  options = {}
}: {
  data: PDFReportData;
  options?: PDFGenerationOptions;
}) => {
  const {
    includeCharts = true,
    includeAssumptions = true,
    includeRiskAnalysis = true,
    includeProjectionTable = true,
  } = options;

  // Prepare chart data from projections
  const portfolioChartData: LineChartDataPoint[] = data.projections?.map(p => ({
    x: p.year,
    y: p.portfolioValue,
    label: `Yr ${p.year}`,
  })) || [];

  const incomeExpenseData: ChartDataPoint[] = [
    { label: 'Income', value: data.currentIncome || 0, color: chartColors.success },
    { label: 'Expenses', value: data.currentExpenses || 0, color: chartColors.danger },
    { label: 'Savings', value: data.currentSavings || 0, color: chartColors.primary },
  ];

  const assetAllocationData: ChartDataPoint[] = [
    { label: 'Pension', value: data.pensionValue || 0, color: chartColors.primary },
    { label: 'Investments', value: data.investmentValue || 0, color: chartColors.success },
    { label: 'Savings', value: data.currentSavings || 0, color: chartColors.warning },
  ].filter(d => d.value > 0);

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <Text style={baseStyles.title}>Cash Flow Analysis Report</Text>
          <Text style={baseStyles.subtitle}>Comprehensive Financial Projection Analysis</Text>

          <View style={baseStyles.headerInfo}>
            <View style={baseStyles.headerColumn}>
              <Text style={baseStyles.label}>Client</Text>
              <Text style={baseStyles.value}>{data.clientName}</Text>
              {data.clientEmail && <Text style={baseStyles.value}>{data.clientEmail}</Text>}
            </View>
            <View style={baseStyles.headerColumn}>
              <Text style={baseStyles.label}>Report Date</Text>
              <Text style={baseStyles.value}>{data.reportDate}</Text>
            </View>
            <View style={baseStyles.headerColumn}>
              <Text style={baseStyles.label}>Prepared By</Text>
              <Text style={baseStyles.value}>{data.advisorName}</Text>
              <Text style={baseStyles.value}>{data.firmName}</Text>
            </View>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Executive Summary</Text>

          <View style={baseStyles.metricsRow}>
            <MetricCard
              value={formatCurrency(data.finalPortfolioValue)}
              label="Final Portfolio"
            />
            <MetricCard
              value={String(data.projectionYears || 0)}
              label="Years Projected"
            />
            <MetricCard
              value={formatPercentage(data.averageAnnualReturn)}
              label="Avg Return"
            />
            <MetricCard
              value={`${data.sustainabilityRating || 0}/10`}
              label="Sustainability"
            />
          </View>

          {data.keyInsights && data.keyInsights.length > 0 && (
            <View style={{ marginTop: 15 }}>
              <Text style={baseStyles.sectionSubtitle}>Key Findings</Text>
              {data.keyInsights.map((insight, index) => (
                <ListItem key={index}>{insight}</ListItem>
              ))}
            </View>
          )}
        </View>

        {/* Assumptions Section */}
        {includeAssumptions && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Assumptions & Parameters</Text>

            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeader}>
                <Text style={[baseStyles.tableCellHeader, { width: '50%' }]}>Assumption</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '50%', textAlign: 'right' }]}>Value</Text>
              </View>

              {[
                { label: 'Inflation Rate', value: formatPercentage(data.inflationRate) },
                { label: 'Real Equity Return', value: formatPercentage(data.equityReturn) },
                { label: 'Real Bond Return', value: formatPercentage(data.bondReturn) },
                { label: 'Real Cash Return', value: formatPercentage(data.cashReturn) },
                { label: 'Retirement Age', value: String(data.retirementAge || '-') },
                { label: 'Life Expectancy', value: String(data.lifeExpectancy || '-') },
                { label: 'Current Annual Income', value: formatCurrency(data.currentIncome) },
                { label: 'Current Annual Expenses', value: formatCurrency(data.currentExpenses) },
              ].map((row, index) => (
                <View
                  key={index}
                  style={[baseStyles.tableRow, index % 2 === 1 ? baseStyles.tableRowAlt : {}]}
                >
                  <Text style={[baseStyles.tableCell, { width: '50%' }]}>{row.label}</Text>
                  <Text style={[baseStyles.tableCell, { width: '50%', textAlign: 'right' }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <PageFooter firmName={data.firmName} />
      </Page>

      {/* Charts Page */}
      {includeCharts && portfolioChartData.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Financial Projections Overview</Text>

            {/* Portfolio Growth Chart */}
            <View style={{ marginBottom: 25 }}>
              <LineChart
                data={portfolioChartData}
                dimensions={{ width: 515, height: 180 }}
                title="Portfolio Value Over Time"
                color={chartColors.primary}
                showArea={true}
                showDots={portfolioChartData.length <= 15}
                showGrid={true}
              />
            </View>

            {/* Income vs Expenses and Asset Allocation side by side */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              {/* Income/Expenses Bar Chart */}
              <View style={{ width: '48%' }}>
                <BarChart
                  data={incomeExpenseData}
                  dimensions={{ width: 240, height: 160 }}
                  title="Current Financial Position"
                  showValues={true}
                />
              </View>

              {/* Asset Allocation Pie Chart */}
              {assetAllocationData.length > 0 && (
                <View style={{ width: '48%' }}>
                  <PieChart
                    data={assetAllocationData}
                    dimensions={{ width: 250, height: 160 }}
                    title="Asset Allocation"
                    donut={true}
                    showLegend={true}
                  />
                </View>
              )}
            </View>

            {/* Sustainability Gauge */}
            {data.sustainabilityRating !== undefined && (
              <View style={{ alignItems: 'center', marginTop: 25 }}>
                <GaugeChart
                  value={data.sustainabilityRating}
                  maxValue={10}
                  dimensions={{ width: 180, height: 110 }}
                  title="Plan Sustainability Score"
                  label={data.sustainabilityRating >= 7 ? 'Strong' : data.sustainabilityRating >= 4 ? 'Moderate' : 'At Risk'}
                />
              </View>
            )}
          </View>

          <PageFooter firmName={data.firmName} />
        </Page>
      )}

      {/* Risk Analysis Page */}
      {includeRiskAnalysis && data.riskMetrics && (
        <Page size="A4" style={baseStyles.page}>
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Risk Analysis</Text>

            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeader}>
                <Text style={[baseStyles.tableCellHeader, { width: '30%' }]}>Risk Type</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '20%', textAlign: 'center' }]}>Level</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '50%' }]}>Description</Text>
              </View>

              {[
                {
                  type: 'Shortfall Risk',
                  level: data.riskMetrics.shortfallRisk,
                  description: 'Risk of portfolio depletion before life expectancy'
                },
                {
                  type: 'Longevity Risk',
                  level: data.riskMetrics.longevityRisk,
                  description: 'Risk of outliving financial resources'
                },
                {
                  type: 'Inflation Risk',
                  level: data.riskMetrics.inflationRisk,
                  description: 'Risk of purchasing power erosion'
                },
                {
                  type: 'Sequence Risk',
                  level: data.riskMetrics.sequenceRisk,
                  description: 'Risk of poor returns early in retirement'
                },
              ].map((row, index) => (
                <View
                  key={index}
                  style={[baseStyles.tableRow, index % 2 === 1 ? baseStyles.tableRowAlt : {}]}
                >
                  <Text style={[baseStyles.tableCell, { width: '30%' }]}>{row.type}</Text>
                  <Text style={[baseStyles.tableCell, { width: '20%', textAlign: 'center' }, getRiskStyle(row.level)]}>
                    {row.level}
                  </Text>
                  <Text style={[baseStyles.tableCell, { width: '50%' }]}>{row.description}</Text>
                </View>
              ))}
            </View>
          </View>

          <PageFooter firmName={data.firmName} />
        </Page>
      )}

      {/* Projections Table Page */}
      {includeProjectionTable && data.projections && data.projections.length > 0 && (
        <Page size="A4" style={baseStyles.page}>
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Year-by-Year Projections</Text>

            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeader}>
                <Text style={[baseStyles.tableCellHeader, { width: '10%' }]}>Year</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '10%' }]}>Age</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Income</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Expenses</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Surplus</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Portfolio</Text>
              </View>

              {data.projections.slice(0, 25).map((row, index) => (
                <View
                  key={index}
                  style={[baseStyles.tableRow, index % 2 === 1 ? baseStyles.tableRowAlt : {}]}
                >
                  <Text style={[baseStyles.tableCell, { width: '10%' }]}>{row.year}</Text>
                  <Text style={[baseStyles.tableCell, { width: '10%' }]}>{row.age}</Text>
                  <Text style={[baseStyles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {formatCurrency(row.income)}
                  </Text>
                  <Text style={[baseStyles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {formatCurrency(row.expenses)}
                  </Text>
                  <Text style={[
                    baseStyles.tableCell,
                    { width: '20%', textAlign: 'right' },
                    row.surplus >= 0 ? baseStyles.riskLow : baseStyles.riskHigh
                  ]}>
                    {formatCurrency(row.surplus)}
                  </Text>
                  <Text style={[baseStyles.tableCell, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>
                    {formatCurrency(row.portfolioValue)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <PageFooter firmName={data.firmName} />
        </Page>
      )}
    </Document>
  );
};

// ================================================================
// ATR REPORT DOCUMENT
// ================================================================

export const ATRReportDocument = ({ data }: { data: PDFReportData }) => {
  const riskLevelPercentage = ((data.riskLevel || 0) / 10) * 100;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <Text style={baseStyles.title}>Attitude to Risk Assessment Report</Text>
          <Text style={baseStyles.subtitle}>{data.clientName}</Text>

          <View style={baseStyles.headerInfo}>
            <View style={baseStyles.headerColumn}>
              <Text style={baseStyles.label}>Assessment Date</Text>
              <Text style={baseStyles.value}>{data.reportDate}</Text>
            </View>
            <View style={baseStyles.headerColumn}>
              <Text style={baseStyles.label}>Risk Level</Text>
              <Text style={[baseStyles.value, { fontWeight: 'bold', color: colors.primary }]}>
                {data.riskLevel}/10 - {data.riskCategory}
              </Text>
            </View>
            <View style={baseStyles.headerColumn}>
              <Text style={baseStyles.label}>Prepared By</Text>
              <Text style={baseStyles.value}>{data.advisorName}</Text>
              <Text style={baseStyles.value}>{data.firmName}</Text>
            </View>
          </View>
        </View>

        {/* Risk Profile Summary */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Risk Profile Summary</Text>

          {/* Risk Level Visual */}
          <View style={{
            backgroundColor: colors.background,
            padding: 20,
            borderRadius: 4,
            alignItems: 'center',
            marginBottom: 15
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>
              Risk Level: {data.riskLevel}/10
            </Text>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 5 }}>
              {data.riskCategory}
            </Text>

            {/* Progress bar */}
            <View style={{
              width: '100%',
              height: 12,
              backgroundColor: colors.border,
              borderRadius: 6,
              marginTop: 10
            }}>
              <View style={{
                width: `${riskLevelPercentage}%`,
                height: '100%',
                backgroundColor: colors.primary,
                borderRadius: 6
              }} />
            </View>

            <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 8 }}>
              Score: {data.totalScore}/100
            </Text>
          </View>

          {/* Description */}
          <Text style={baseStyles.paragraph}>
            {data.riskDescription}
          </Text>
        </View>

        {/* Category Breakdown */}
        {data.categoryScores && Object.keys(data.categoryScores).length > 0 && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Category Breakdown</Text>

            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeader}>
                <Text style={[baseStyles.tableCellHeader, { width: '50%' }]}>Category</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '25%', textAlign: 'center' }]}>Score</Text>
                <Text style={[baseStyles.tableCellHeader, { width: '25%' }]}>Rating</Text>
              </View>

              {Object.entries(data.categoryScores).map(([category, score], index) => {
                const percentage = (Number(score) / 5) * 100;
                return (
                  <View
                    key={index}
                    style={[baseStyles.tableRow, index % 2 === 1 ? baseStyles.tableRowAlt : {}]}
                  >
                    <Text style={[baseStyles.tableCell, { width: '50%' }]}>
                      {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <Text style={[baseStyles.tableCell, { width: '25%', textAlign: 'center' }]}>
                      {score}/5
                    </Text>
                    <Text style={[baseStyles.tableCell, { width: '25%' }]}>
                      {/* Mini progress indicator */}
                      {percentage >= 80 ? 'High' : percentage >= 40 ? 'Medium' : 'Low'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>Recommendations</Text>

            <View style={{
              backgroundColor: '#fef3c7',
              padding: 15,
              borderRadius: 4,
              borderLeftWidth: 4,
              borderLeftColor: colors.warning
            }}>
              {data.recommendations.map((rec, index) => (
                <ListItem key={index}>{rec}</ListItem>
              ))}
            </View>
          </View>
        )}

        <PageFooter firmName={data.firmName} />
      </Page>
    </Document>
  );
};

// ================================================================
// PDF GENERATION SERVICE
// ================================================================

export class PDFGenerator {
  /**
   * Generate Cash Flow Report PDF
   */
  static async generateCashFlowReport(
    data: PDFReportData,
    options?: PDFGenerationOptions
  ): Promise<Blob> {
    const document = <CashFlowReportDocument data={data} options={options} />;
    return await pdf(document).toBlob();
  }

  /**
   * Generate ATR Report PDF
   */
  static async generateATRReport(data: PDFReportData): Promise<Blob> {
    const document = <ATRReportDocument data={data} />;
    return await pdf(document).toBlob();
  }

  /**
   * Generate PDF Buffer (for server-side use, email attachments)
   */
  static async generateCashFlowReportBuffer(
    data: PDFReportData,
    options?: PDFGenerationOptions
  ): Promise<Buffer> {
    const document = <CashFlowReportDocument data={data} options={options} />;
    const blob = await pdf(document).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate ATR PDF Buffer (for server-side use)
   */
  static async generateATRReportBuffer(data: PDFReportData): Promise<Buffer> {
    const document = <ATRReportDocument data={data} />;
    const blob = await pdf(document).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate PDF and trigger download (client-side only)
   */
  static async downloadCashFlowReport(
    data: PDFReportData,
    filename: string = 'cash-flow-report.pdf',
    options?: PDFGenerationOptions
  ): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('downloadCashFlowReport can only be used client-side');
    }

    const blob = await this.generateCashFlowReport(data, options);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate ATR PDF and trigger download (client-side only)
   */
  static async downloadATRReport(
    data: PDFReportData,
    filename: string = 'atr-report.pdf'
  ): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('downloadATRReport can only be used client-side');
    }

    const blob = await this.generateATRReport(data);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate PDF and return as Base64 (useful for email attachments)
   */
  static async generateCashFlowReportBase64(
    data: PDFReportData,
    options?: PDFGenerationOptions
  ): Promise<string> {
    const buffer = await this.generateCashFlowReportBuffer(data, options);
    return buffer.toString('base64');
  }

  /**
   * Generate ATR PDF and return as Base64
   */
  static async generateATRReportBase64(data: PDFReportData): Promise<string> {
    const buffer = await this.generateATRReportBuffer(data);
    return buffer.toString('base64');
  }
}

export default PDFGenerator;
