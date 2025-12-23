import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatCurrency, formatDate } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const ExecutiveSummaryPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => {
  const adviceInScope = data.scope.includeInvestments || data.scope.includePensions || data.scope.includeProtection

  return (
    <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.firmName}>{brand.firmName}</Text>
        <Text style={styles.footerText}>Executive Summary</Text>
      </View>
    </View>

    <Text style={styles.sectionTitle}>Executive Summary</Text>
    <Text style={styles.text}>
      Client: {data.client.personalDetails.fullName || 'Client'} ({data.client.clientRef}) • Report date:{' '}
      {formatDate(data.metadata.reportDate)}
    </Text>

    <View style={[styles.grid2, { marginTop: 14 }]}>
      <View style={styles.card}>
        <Text style={styles.label}>Risk Profile</Text>
        <Text style={styles.value}>{data.riskAssessment.riskCategory}</Text>
        <Text style={styles.text}>
          ATR:{' '}
          {data.riskAssessment.attitudeToRisk !== undefined ? `${data.riskAssessment.attitudeToRisk}/10` : 'Not assessed'} •
          CFL:{' '}
          {data.riskAssessment.capacityForLoss !== undefined ? `${data.riskAssessment.capacityForLoss}/10` : 'Not assessed'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Objectives</Text>
        <Text style={styles.value}>{data.objectives.primaryObjective || 'Not provided'}</Text>
        <Text style={styles.text}>Time horizon: {data.objectives.investmentTimeline || 'Not provided'}</Text>
      </View>
    </View>

    <View style={[styles.grid2, { marginTop: 10 }]}>
      <View style={styles.card}>
        <Text style={styles.label}>Investment Amount</Text>
        <Text style={styles.value}>
          {adviceInScope ? formatCurrency(data.client.financialDetails.investmentAmount) : 'Not applicable'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Next Review</Text>
        <Text style={styles.value}>{formatDate(data.ongoingService.nextReviewDateISO)}</Text>
        <Text style={styles.text}>Frequency: {data.ongoingService.reviewFrequency || 'Not provided'}</Text>
      </View>
    </View>

    <View style={[styles.subsection, { marginTop: 16 }]}>
      <Text style={styles.subsectionTitle}>Recommendation Snapshot</Text>
      {!adviceInScope ? (
        <Text style={styles.text}>No Investment/Pension/Protection advice has been selected for this report.</Text>
      ) : data.recommendation.products.length === 0 ? (
        <Text style={styles.text}>No recommendation recorded yet.</Text>
      ) : (
        <View style={styles.bulletList}>
          {data.recommendation.products.slice(0, 4).map((p, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                {p.name} {p.provider ? `(${p.provider})` : ''} — {formatCurrency(p.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
  )
}
