import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const ComplianceReportPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.firmName}>{brand.firmName}</Text>
        <Text style={styles.footerText}>Compliance Summary</Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Suitability Compliance Summary</Text>
      <Text style={styles.text}>
        This page summarises the key suitability evidence captured and highlights any missing items prior to issue.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Client</Text>
        <Text style={styles.value}>{data.client.personalDetails.fullName || 'Client'}</Text>
        <Text style={styles.text}>Reference: {data.client.clientRef}</Text>
        <Text style={styles.text}>Report ref: {data.metadata.reportRef}</Text>
        <Text style={styles.text}>Version: {data.metadata.version}</Text>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Evidence Checklist</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Requirement</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
          </View>
          {[
            { label: 'Advice scope selected', key: 'scope.selected' },
            { label: 'Attitude to Risk assessed', key: 'riskAssessment.attitudeToRisk' },
            { label: 'Capacity for Loss assessed', key: 'riskAssessment.capacityForLoss' },
            { label: 'Recommendation products recorded', key: 'recommendation.products' },
            { label: 'Recommendation rationale completed', key: 'recommendation.rationale' },
            { label: 'Income recorded', key: 'client.financialDetails.annualIncome' },
            { label: 'Essential expenses recorded', key: 'client.financialDetails.essentialExpenses' }
          ].map((row, idx) => {
            const p = data.provenance[row.key]
            const status = p?.status || 'not_provided'
            const source = p?.source || 'system'
            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{row.label}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {status === 'provided' ? 'Provided' : status === 'not_applicable' ? 'N/A' : 'Missing'}
                </Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{source}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {(data.dataQuality.warnings.length > 0 || data.dataQuality.missing.length > 0) && (
        <View style={styles.warningCard}>
          <Text style={styles.boldText}>Outstanding items</Text>
          {data.dataQuality.missing.slice(0, 6).map((m, idx) => (
            <Text key={idx} style={styles.text}>
              • {m.message}
            </Text>
          ))}
          {data.dataQuality.missing.length > 6 && (
            <Text style={styles.text}>• …and {data.dataQuality.missing.length - 6} more</Text>
          )}
        </View>
      )}
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
)

