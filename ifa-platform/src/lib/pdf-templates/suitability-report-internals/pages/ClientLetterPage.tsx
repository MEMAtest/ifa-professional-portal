import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatCurrency, formatDate } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const ClientLetterPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
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
        <Text style={styles.footerText}>Suitability Letter</Text>
      </View>
    </View>

    <Text style={styles.text}>{formatDate(data.metadata.reportDate)}</Text>

    <View style={{ marginTop: 14 }}>
      <Text style={styles.text}>{data.client.personalDetails.fullName || 'Client'}</Text>
      {data.client.contactDetails.address && <Text style={styles.text}>{data.client.contactDetails.address}</Text>}
    </View>

    <View style={{ marginTop: 16 }}>
      <Text style={styles.subsectionTitle}>Dear {data.client.personalDetails.fullName || 'Client'},</Text>
      <Text style={styles.text}>
        Thank you for allowing us to review your circumstances and objectives. This letter summarises our recommendations
        and the key points you should consider before proceeding.
      </Text>
    </View>

    <View style={styles.infoCard}>
      <Text style={styles.boldText}>Your Profile Summary</Text>
      <Text style={styles.text}>Scope: {data.scope.selected.length ? data.scope.selected.join(', ') : 'Not provided'}</Text>
      <Text style={styles.text}>Primary objective: {data.objectives.primaryObjective || 'Not provided'}</Text>
      <Text style={styles.text}>Risk profile: {data.riskAssessment.riskCategory}</Text>
      <Text style={styles.text}>
        Investment amount: {adviceInScope ? formatCurrency(data.client.financialDetails.investmentAmount) : 'Not applicable'}
      </Text>
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Our Recommendation</Text>
      {!adviceInScope ? (
        <View style={styles.infoCard}>
          <Text style={styles.boldText}>Out of scope</Text>
          <Text style={styles.text}>
            No Investment/Pension/Protection advice has been selected for this report.
          </Text>
        </View>
      ) : (
        <>
          {data.recommendation.products.length === 0 ? (
            <Text style={styles.text}>No recommendation has been recorded yet.</Text>
          ) : (
            <View style={styles.bulletList}>
              {data.recommendation.products.map((p, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    {p.name} {p.provider ? `(${p.provider})` : ''} — {formatCurrency(p.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {data.recommendation.rationale ? (
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.text}>{data.recommendation.rationale}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Next Steps</Text>
      <View style={styles.bulletList}>
        <View style={styles.bulletItem}>
          <Text style={styles.bullet}>1.</Text>
          <Text style={styles.bulletText}>Review this letter and the accompanying suitability report.</Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bullet}>2.</Text>
          <Text style={styles.bulletText}>Contact us with any questions or if anything is incorrect.</Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bullet}>3.</Text>
          <Text style={styles.bulletText}>Confirm you wish to proceed so we can implement the recommendation.</Text>
        </View>
      </View>
    </View>

    <View style={{ marginTop: 18 }}>
      <Text style={styles.text}>Yours sincerely,</Text>
      <Text style={[styles.text, { marginTop: 10 }]}>{data.adviser.name}</Text>
      <Text style={styles.text}>{data.adviser.firmName}</Text>
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
  )
}
