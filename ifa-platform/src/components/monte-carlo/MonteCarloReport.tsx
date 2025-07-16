// ================================================================
// File: ifa-platform/src/components/monte-carlo/MonteCarloReport.tsx
// Monte Carlo PDF Report Generator
// ================================================================

'use client';

import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
  PDFDownloadLink 
} from '@react-pdf/renderer';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 10,
    marginBottom: 10,
  },
  recommendation: {
    fontSize: 12,
    marginBottom: 5,
    paddingLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
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
}

interface Client {
  personalDetails?: {
    firstName?: string;
    lastName?: string;
  };
  clientRef?: string;
}

// PDF Document Component
const MonteCarloReportDocument = ({ scenario, client }: { scenario: MonteCarloScenario; client: Client }) => {
  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Monte Carlo Analysis Report</Text>
          <Text style={styles.subtitle}>
            {clientName} • {client.clientRef || 'No Reference'} • {date}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.bigNumber}>{scenario.success_probability.toFixed(1)}%</Text>
          <Text style={styles.subtitle}>Portfolio Success Probability</Text>
        </View>

        {/* Analysis Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Details</Text>
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
        </View>

        {/* Input Parameters */}
        {(scenario.initial_wealth || scenario.time_horizon || scenario.withdrawal_amount) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Input Parameters</Text>
            {scenario.initial_wealth && (
              <View style={styles.row}>
                <Text style={styles.label}>Initial Portfolio Value:</Text>
                <Text style={styles.value}>
                  £{scenario.initial_wealth.toLocaleString()}
                </Text>
              </View>
            )}
            {scenario.time_horizon && (
              <View style={styles.row}>
                <Text style={styles.label}>Time Horizon:</Text>
                <Text style={styles.value}>{scenario.time_horizon} years</Text>
              </View>
            )}
            {scenario.withdrawal_amount && (
              <View style={styles.row}>
                <Text style={styles.label}>Annual Withdrawal:</Text>
                <Text style={styles.value}>
                  £{scenario.withdrawal_amount.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Recommendations</Text>
          {scenario.success_probability >= 80 ? (
            <>
              <Text style={styles.recommendation}>
                • Portfolio has high probability of meeting objectives
              </Text>
              <Text style={styles.recommendation}>
                • Current strategy appears well-positioned
              </Text>
              <Text style={styles.recommendation}>
                • Consider maintaining current allocation
              </Text>
            </>
          ) : scenario.success_probability >= 60 ? (
            <>
              <Text style={styles.recommendation}>
                • Portfolio has moderate probability of success
              </Text>
              <Text style={styles.recommendation}>
                • Consider adjusting withdrawal rates or timeline
              </Text>
              <Text style={styles.recommendation}>
                • Review asset allocation for optimization
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.recommendation}>
                • Portfolio requires attention to improve outcomes
              </Text>
              <Text style={styles.recommendation}>
                • Strongly consider reducing withdrawal amounts
              </Text>
              <Text style={styles.recommendation}>
                • Extend time horizon or increase contributions
              </Text>
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This report is for informational purposes only and should not be considered as financial advice.
          Please consult with your financial advisor for personalized recommendations.
        </Text>
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
  const fileName = `monte-carlo-report-${client.clientRef || 'client'}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink 
      document={<MonteCarloReportDocument scenario={scenario} client={client} />} 
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => (
        <Button 
          variant={variant}
          disabled={loading}
          className={className}
        >
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Generating PDF...' : 'Export Report'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};

export default MonteCarloReportButton;