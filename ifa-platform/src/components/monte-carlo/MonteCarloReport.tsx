// src/components/monte-carlo/MonteCarloReport.tsx
// Enhanced Monte Carlo PDF Report Generator with Charts

'use client';

import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
  PDFDownloadLink,
  Image,
  Font,
  Canvas,
  Line,
  Rect
} from '@react-pdf/renderer';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';

// Register fonts if needed
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-all-400-normal.woff'
// });

// Define enhanced styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  companyInfo: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 5,
  },
  section: {
    margin: 10,
    padding: 10,
    borderBottom: '1 solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontSize: 12,
    color: '#6b7280',
  },
  value: {
    width: '60%',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  successText: {
    color: '#059669',
  },
  warningText: {
    color: '#d97706',
  },
  dangerText: {
    color: '#dc2626',
  },
  recommendation: {
    fontSize: 12,
    marginBottom: 5,
    paddingLeft: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  metricBox: {
    width: '33%',
    padding: 10,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricSubtext: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
  },
  chartContainer: {
    marginTop: 20,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 5,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  confidenceTable: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
  },
  tableCellHeader: {
    fontWeight: 'bold',
    color: '#374151',
  },
  disclaimer: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 5,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#92400e',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 30,
    right: 40,
    color: '#9ca3af',
  },
  executiveSummary: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  executiveSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0c4a6e',
  },
  executiveSummaryText: {
    fontSize: 11,
    color: '#075985',
    lineHeight: 1.6,
  },
  keyFinding: {
    marginBottom: 8,
    paddingLeft: 10,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#2563eb',
    marginRight: 5,
  },
  // Chart styles
  miniChart: {
    width: '100%',
    height: 150,
    marginVertical: 10,
  },
  barChart: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  bar: {
    width: 40,
    backgroundColor: '#3b82f6',
    marginHorizontal: 5,
  },
  barLabel: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
  }
});

// Define types
interface MonteCarloScenario {
  id: string;
  client_id: string;
  scenario_name: string;
  created_at: string;
  success_probability: number;
  simulation_count: number;
  initial_wealth?: number;
  time_horizon?: number;
  withdrawal_amount?: number;
  risk_score?: number;
  average_final_wealth?: number;
  median_final_wealth?: number;
  confidence_intervals?: any;
  shortfall_risk?: number;
  volatility?: number;
  max_drawdown?: number;
}

interface Client {
  personalDetails?: {
    firstName?: string;
    lastName?: string;
    age?: number;
  };
  clientRef?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

interface FirmDetails {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  fcaNumber?: string;
}

// Firm details - customize this
const FIRM_DETAILS: FirmDetails = {
  name: "Professional Financial Advisors Ltd",
  address: "123 Finance Street, London, EC2A 4BX",
  phone: "020 1234 5678",
  email: "info@pfa-advisors.com",
  website: "www.pfa-advisors.com",
  fcaNumber: "123456"
};

// Simple bar chart component
const SimpleBarChart = ({ data, height = 100 }: { data: any[], height?: number }) => (
  <View style={[styles.barChart, { height }]}>
    {data.map((item, index) => {
      const barHeight = (item.value / Math.max(...data.map(d => d.value))) * height;
      const color = item.color || '#3b82f6';
      
      return (
        <View key={index} style={{ alignItems: 'center' }}>
          <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
          <Text style={styles.barLabel}>{item.label}</Text>
        </View>
      );
    })}
  </View>
);

// Success gauge component
const SuccessGauge = ({ percentage }: { percentage: number }) => {
  const getColor = () => {
    if (percentage >= 75) return '#059669';
    if (percentage >= 50) return '#d97706';
    return '#dc2626';
  };

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Text style={[styles.bigNumber, { color: getColor() }]}>
        {percentage.toFixed(1)}%
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280' }}>
        Portfolio Success Probability
      </Text>
      <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>
        {percentage >= 75 ? 'High Confidence' :
         percentage >= 50 ? 'Moderate Confidence' :
         'Low Confidence - Action Required'}
      </Text>
    </View>
  );
};

// Enhanced PDF Document Component
const MonteCarloReportDocument = ({ scenario, client }: { scenario: MonteCarloScenario; client: Client }) => {
  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRecommendationCategory = (successRate: number) => {
    if (successRate >= 80) return 'excellent';
    if (successRate >= 60) return 'good';
    if (successRate >= 40) return 'moderate';
    return 'poor';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Firm Branding */}
        <View style={styles.header}>
          <Text style={styles.title}>Monte Carlo Analysis Report</Text>
          <Text style={styles.subtitle}>
            {clientName} • {client.clientRef || 'No Reference'} • {date}
          </Text>
          <Text style={styles.companyInfo}>
            {FIRM_DETAILS.name} • FCA No: {FIRM_DETAILS.fcaNumber}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.executiveSummary}>
          <Text style={styles.executiveSummaryTitle}>Executive Summary</Text>
          <Text style={styles.executiveSummaryText}>
            Based on {scenario.simulation_count.toLocaleString()} probabilistic simulations, 
            this analysis indicates a {scenario.success_probability.toFixed(1)}% probability 
            that the portfolio will successfully meet the stated retirement objectives over 
            the {scenario.time_horizon}-year time horizon.
          </Text>
        </View>

        {/* Success Gauge */}
        <SuccessGauge percentage={scenario.success_probability} />

        {/* Key Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Average Final Wealth</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(scenario.average_final_wealth || 0)}
              </Text>
              <Text style={styles.metricSubtext}>Mean outcome</Text>
            </View>
            
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Median Final Wealth</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(scenario.median_final_wealth || 0)}
              </Text>
              <Text style={styles.metricSubtext}>50th percentile</Text>
            </View>
            
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Shortfall Risk</Text>
              <Text style={[styles.metricValue, styles.dangerText]}>
                {(scenario.shortfall_risk || 0).toFixed(1)}%
              </Text>
              <Text style={styles.metricSubtext}>Depletion chance</Text>
            </View>
            
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Portfolio Volatility</Text>
              <Text style={styles.metricValue}>
                {(scenario.volatility || 0).toFixed(1)}%
              </Text>
              <Text style={styles.metricSubtext}>Standard deviation</Text>
            </View>
            
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Max Drawdown</Text>
              <Text style={[styles.metricValue, styles.warningText]}>
                {(scenario.max_drawdown || 0).toFixed(1)}%
              </Text>
              <Text style={styles.metricSubtext}>Worst decline</Text>
            </View>
            
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Time Horizon</Text>
              <Text style={styles.metricValue}>
                {scenario.time_horizon} years
              </Text>
              <Text style={styles.metricSubtext}>Analysis period</Text>
            </View>
          </View>
        </View>

        {/* Confidence Intervals Chart */}
        {scenario.confidence_intervals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wealth Distribution Analysis</Text>
            
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Final Wealth by Confidence Level</Text>
              <SimpleBarChart 
                data={[
                  { label: '10th', value: scenario.confidence_intervals.p10, color: '#dc2626' },
                  { label: '25th', value: scenario.confidence_intervals.p25, color: '#f59e0b' },
                  { label: '50th', value: scenario.confidence_intervals.p50, color: '#8b5cf6' },
                  { label: '75th', value: scenario.confidence_intervals.p75, color: '#3b82f6' },
                  { label: '90th', value: scenario.confidence_intervals.p90, color: '#10b981' }
                ]}
                height={120}
              />
            </View>

            <View style={styles.confidenceTable}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableCellHeader]}>Percentile</Text>
                <Text style={[styles.tableCell, styles.tableCellHeader]}>Final Wealth</Text>
                <Text style={[styles.tableCell, styles.tableCellHeader]}>Interpretation</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>10th (Worst Case)</Text>
                <Text style={[styles.tableCell, styles.dangerText]}>
                  {formatCurrency(scenario.confidence_intervals.p10)}
                </Text>
                <Text style={styles.tableCell}>90% of outcomes exceed this</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>25th</Text>
                <Text style={[styles.tableCell, styles.warningText]}>
                  {formatCurrency(scenario.confidence_intervals.p25)}
                </Text>
                <Text style={styles.tableCell}>75% of outcomes exceed this</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>50th (Median)</Text>
                <Text style={styles.tableCell}>
                  {formatCurrency(scenario.confidence_intervals.p50)}
                </Text>
                <Text style={styles.tableCell}>Most likely outcome</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>75th</Text>
                <Text style={[styles.tableCell, { color: '#2563eb' }]}>
                  {formatCurrency(scenario.confidence_intervals.p75)}
                </Text>
                <Text style={styles.tableCell}>25% of outcomes exceed this</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>90th (Best Case)</Text>
                <Text style={[styles.tableCell, styles.successText]}>
                  {formatCurrency(scenario.confidence_intervals.p90)}
                </Text>
                <Text style={styles.tableCell}>10% of outcomes exceed this</Text>
              </View>
            </View>
          </View>
        )}

        {/* Page Number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>

      {/* Second Page - Recommendations and Details */}
      <Page size="A4" style={styles.page}>
        {/* Analysis Parameters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Parameters</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Scenario Name:</Text>
            <Text style={styles.value}>{scenario.scenario_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Analysis Date:</Text>
            <Text style={styles.value}>
              {new Date(scenario.created_at).toLocaleDateString('en-GB')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Simulations Run:</Text>
            <Text style={styles.value}>{scenario.simulation_count.toLocaleString()}</Text>
          </View>
          {scenario.initial_wealth && (
            <View style={styles.row}>
              <Text style={styles.label}>Initial Portfolio Value:</Text>
              <Text style={styles.value}>
                {formatCurrency(scenario.initial_wealth)}
              </Text>
            </View>
          )}
          {scenario.withdrawal_amount && (
            <View style={styles.row}>
              <Text style={styles.label}>Annual Withdrawal:</Text>
              <Text style={styles.value}>
                {formatCurrency(scenario.withdrawal_amount)}
              </Text>
            </View>
          )}
          {scenario.risk_score && (
            <View style={styles.row}>
              <Text style={styles.label}>Risk Profile Score:</Text>
              <Text style={styles.value}>{scenario.risk_score}/10</Text>
            </View>
          )}
        </View>

        {/* Detailed Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strategic Recommendations</Text>
          
          {scenario.success_probability >= 80 ? (
            <>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.successText}>Excellent outlook:</Text> The portfolio demonstrates 
                  a high probability of meeting all stated objectives
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Current withdrawal strategy appears sustainable with comfortable margin
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Consider maintaining current allocation with regular annual reviews
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Monitor for opportunities to optimize tax efficiency
                </Text>
              </View>
            </>
          ) : scenario.success_probability >= 60 ? (
            <>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.warningText}>Moderate confidence:</Text> Portfolio has reasonable 
                  probability of success but improvements recommended
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Consider reducing annual withdrawal by 10-15% to improve success rate
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Review asset allocation for potential optimization opportunities
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Implement dynamic withdrawal strategy based on portfolio performance
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.dangerText}>Immediate action required:</Text> Current plan shows 
                  high risk of portfolio depletion
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Strongly recommend reducing withdrawal amount by 20-30%
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Consider extending retirement timeline or increasing contributions
                </Text>
              </View>
              <View style={styles.keyFinding}>
                <Text style={styles.recommendation}>
                  <Text style={styles.bulletPoint}>•</Text>
                  Schedule urgent review meeting to discuss alternative strategies
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Risk Considerations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Considerations</Text>
          <View style={styles.keyFinding}>
            <Text style={styles.recommendation}>
              <Text style={styles.bulletPoint}>•</Text>
              Market volatility: {(scenario.volatility || 0).toFixed(1)}% portfolio volatility indicates 
              {scenario.volatility && scenario.volatility > 15 ? ' high' : ' moderate'} market risk exposure
            </Text>
          </View>
          <View style={styles.keyFinding}>
            <Text style={styles.recommendation}>
              <Text style={styles.bulletPoint}>•</Text>
              Sequence of returns risk: Early market downturns could significantly impact outcomes
            </Text>
          </View>
          <View style={styles.keyFinding}>
            <Text style={styles.recommendation}>
              <Text style={styles.bulletPoint}>•</Text>
              Inflation risk: Analysis assumes consistent inflation; actual rates may vary
            </Text>
          </View>
          <View style={styles.keyFinding}>
            <Text style={styles.recommendation}>
              <Text style={styles.bulletPoint}>•</Text>
              Longevity risk: Consider implications if retirement period exceeds {scenario.time_horizon} years
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Important: This report is based on Monte Carlo simulation using historical data and 
            assumptions about future returns. Past performance is not indicative of future results. 
            Actual outcomes may vary significantly from projections. This analysis should not be 
            considered as personal financial advice. Please consult with your financial advisor 
            before making any investment decisions.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {FIRM_DETAILS.name} • {FIRM_DETAILS.phone} • {FIRM_DETAILS.email} • {FIRM_DETAILS.website}
        </Text>

        {/* Page Number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

// Export Button Component
interface MonteCarloReportButtonProps {
  scenario: MonteCarloScenario;
  client: Client;
  variant?: 'default' | 'outline';
  className?: string;
}

export const MonteCarloReportButton: React.FC<MonteCarloReportButtonProps> = ({ 
  scenario, 
  client, 
  variant = 'outline',
  className = ''
}) => {
  const fileName = `monte-carlo-report-${client.clientRef || 'client'}-${scenario.scenario_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink 
      document={<MonteCarloReportDocument scenario={scenario} client={client} />} 
      fileName={fileName}
      onClick={(e) => e.stopPropagation()}
    >
      {({ blob, url, loading, error }) => (
        <Button 
          variant={variant}
          disabled={loading}
          className={className}
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Generating...' : 'Export'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};

export default MonteCarloReportButton;