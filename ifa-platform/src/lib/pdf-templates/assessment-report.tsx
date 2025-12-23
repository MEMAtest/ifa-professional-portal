// src/lib/pdf-templates/assessment-report.tsx
// Standardized React-PDF templates for assessment reports (advisor/executive/compliance/full)

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer
} from '@react-pdf/renderer'

interface ClientPersonalDetails {
  title?: string
  firstName?: string
  lastName?: string
}

interface Client {
  id: string
  personal_details?: ClientPersonalDetails
  client_ref?: string
}

interface AssessmentReportProps {
  reportType: 'advisorReport' | 'executiveSummary' | 'complianceReport' | 'fullReport'
  assessmentType: string
  assessment: any
  client: Client
  branding?: {
    firmName?: string
    primaryColor?: string
    accentColor?: string
    footerText?: string
  }
  charts?: {
    riskChart?: string // data URL
    capacityChart?: string
    progressChart?: string
    categoryChart?: string // Radar chart for category scores
    alignmentChart?: string // Risk alignment comparison chart
  }
}

const defaultBrand = {
  firmName: 'Plannetic Advisory',
  primaryColor: '#0f172a',
  accentColor: '#2563eb',
  footerText: 'Confidential – Prepared for the client'
}

const createStyles = (brand = defaultBrand) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#0f172a'
    },
    header: {
      borderBottom: `2pt solid ${brand.accentColor}`,
      paddingBottom: 14,
      marginBottom: 18
    },
    firm: {
      fontSize: 16,
      fontWeight: 'bold',
      color: brand.primaryColor
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
      color: '#475569'
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: brand.primaryColor,
      marginBottom: 4
    },
    section: {
      marginTop: 18
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: brand.primaryColor,
      marginBottom: 8
    },
    card: {
      border: '1pt solid #e2e8f0',
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
      backgroundColor: '#f8fafc'
    },
    grid: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap'
    },
    gridItem: {
      width: '48%',
      marginRight: '4%',
      marginBottom: 8
    },
    metricLabel: {
      fontSize: 10,
      color: '#475569'
    },
    metricValue: {
      fontSize: 15,
      fontWeight: 'bold',
      color: brand.primaryColor
    },
    listItem: {
      fontSize: 11,
      marginBottom: 4,
      lineHeight: 1.4
    },
    barTrack: {
      height: 8,
      backgroundColor: '#e2e8f0',
      borderRadius: 4,
      marginTop: 4
    },
    footer: {
      marginTop: 30,
      paddingTop: 12,
      borderTop: '1pt solid #e2e8f0',
      fontSize: 10,
      color: '#475569'
    },
    chartWrapper: {
      marginTop: 12,
      marginBottom: 12,
      padding: 10,
      border: '1pt solid #e2e8f0',
      borderRadius: 6,
      backgroundColor: '#f8fafc'
    }
  })

const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const width = Math.max(0, Math.min(100, value))
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 10, color: '#475569' }}>{label}</Text>
      <View style={{ height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginTop: 4 }}>
        <View style={{ height: 8, width: `${width}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{width}%</Text>
    </View>
  )
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
  reportType,
  assessmentType,
  assessment,
  client,
  branding,
  charts
}) => {
  const brand = { ...defaultBrand, ...(branding || {}) }
  const styles = createStyles(brand)
  const clientName = `${client.personal_details?.title || ''} ${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Client'
  const date = new Date().toLocaleDateString('en-GB')

  const metrics = [
    { label: 'Total Score', value: assessment.total_score ?? 'N/A' },
    { label: 'Risk Category', value: assessment.risk_category ?? 'N/A' },
    { label: 'Risk Level', value: assessment.risk_level ?? 'N/A' },
    { label: 'Capacity for Loss', value: assessment.capacity_category ?? assessment.capacity_for_loss ?? 'N/A' }
  ]

  const findings: string[] = Array.isArray(assessment.findings) ? assessment.findings : []
  const recommendations: string[] = Array.isArray(assessment.recommendations) ? assessment.recommendations : []
  const warnings: string[] = Array.isArray(assessment.warnings) ? assessment.warnings : []

  const executiveSummary = [
    `Assessment Type: ${assessmentType}`,
    `Score: ${assessment.total_score ?? 'N/A'}`,
    `Risk: ${assessment.risk_category ?? 'N/A'}`
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.firm}>{brand.firmName}</Text>
          <View style={styles.metaRow}>
            <Text>{clientName}</Text>
            <Text>{date}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text>{assessment.client_ref || client.client_ref || client.id}</Text>
            <Text>{reportType}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {reportType === 'executiveSummary' ? 'Executive Summary' :
           reportType === 'advisorReport' ? 'Advisor Report' :
           reportType === 'complianceReport' ? 'Compliance Report' :
           'Assessment Report'}
        </Text>

        {/* Executive summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.card}>
            {executiveSummary.map((item, idx) => (
              <Text key={idx} style={styles.listItem}>• {item}</Text>
            ))}
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.grid}>
            {metrics.map((m, idx) => (
              <View key={idx} style={styles.gridItem}>
                <View style={styles.card}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricValue}>{String(m.value)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk & Capacity</Text>
        <View style={styles.card}>
          <Bar label="Risk Alignment" value={Number(assessment.risk_alignment || assessment.risk_level || 0) * 10} color={brand.accentColor} />
          <Bar label="Capacity for Loss" value={Number(assessment.capacity_score || 0) * 10} color="#22c55e" />
          <Bar label="Completion" value={Number(assessment.completion_percentage || 0)} color="#f97316" />
        </View>
        {charts?.riskChart && (
          <View style={styles.chartWrapper}>
            <Text style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Risk Distribution</Text>
            <Image src={charts.riskChart} style={{ width: '100%', height: 160 }} />
          </View>
        )}
        {charts?.capacityChart && (
          <View style={styles.chartWrapper}>
            <Text style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Capacity for Loss</Text>
            <Image src={charts.capacityChart} style={{ width: '100%', height: 160 }} />
          </View>
        )}
        {charts?.progressChart && (
          <View style={styles.chartWrapper}>
            <Text style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Assessment Progress</Text>
            <Image src={charts.progressChart} style={{ width: '100%', height: 160 }} />
          </View>
        )}
        {charts?.categoryChart && (
          <View style={styles.chartWrapper}>
            <Text style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Category Scores</Text>
            <Image src={charts.categoryChart} style={{ width: '100%', height: 180 }} />
          </View>
        )}
        {charts?.alignmentChart && (
          <View style={styles.chartWrapper}>
            <Text style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Risk Profile Alignment</Text>
            <Image src={charts.alignmentChart} style={{ width: '100%', height: 160 }} />
          </View>
        )}
      </View>

      {/* Findings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Findings</Text>
          <View style={styles.card}>
            {findings.length === 0 ? (
              <Text style={styles.listItem}>No findings recorded.</Text>
            ) : (
              findings.slice(0, 8).map((f, idx) => (
                <Text key={idx} style={styles.listItem}>• {f}</Text>
              ))
            )}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.card}>
            {recommendations.length === 0 ? (
              <Text style={styles.listItem}>No recommendations recorded.</Text>
            ) : (
              recommendations.slice(0, 8).map((r, idx) => (
                <Text key={idx} style={styles.listItem}>• {r}</Text>
              ))
            )}
          </View>
        </View>

        {/* Compliance focus */}
        {reportType === 'complianceReport' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compliance Notes</Text>
            <View style={styles.card}>
              {warnings.length === 0 ? (
                <Text style={styles.listItem}>No compliance warnings recorded.</Text>
              ) : (
                warnings.slice(0, 8).map((w, idx) => (
                  <Text key={idx} style={styles.listItem}>• {w}</Text>
                ))
              )}
              <Text style={[styles.listItem, { marginTop: 6 }]}>
                This report is prepared to support FCA Consumer Duty and suitability documentation.
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{brand.footerText}</Text>
        </View>
      </Page>
    </Document>
  )
}

export function renderAssessmentReportToBuffer(params: AssessmentReportProps) {
  return renderToBuffer(
    <AssessmentReport {...params} />
  )
}
