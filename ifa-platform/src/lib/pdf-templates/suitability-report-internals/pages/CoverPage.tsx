import React from 'react'
import { Page, Text, View, Image } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatDate } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const CoverPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => (
  <Page size="A4" style={[styles.page, styles.coverPage]}>
    {/* Firm Logo - render if provided */}
    {brand.logoUrl ? (
      <>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={brand.logoUrl} style={styles.firmLogo} />
      </>
    ) : (
      <View style={styles.firmLogoPlaceholder} />
    )}
    <Text style={styles.firmName}>{brand.firmName}</Text>
    <Text style={styles.coverTitle}>Suitability Report</Text>
    <Text style={styles.coverSubtitle}>Personal Investment Recommendation</Text>

    <View style={{ marginTop: 40 }}>
      <Text style={styles.label}>Prepared For</Text>
      <Text style={styles.coverClientName}>{data.client.personalDetails.fullName || 'Client'}</Text>
      <Text style={[styles.text, { textAlign: 'center' }]}>Client Reference: {data.client.clientRef}</Text>
    </View>

    <View style={{ marginTop: 40 }}>
      <Text style={styles.label}>Prepared By</Text>
      <Text style={styles.value}>{data.adviser.name}</Text>
      <Text style={styles.text}>{data.adviser.qualification || 'Financial Adviser'}</Text>
      <Text style={styles.text}>{data.adviser.firmName}</Text>
      {data.adviser.fcaNumber && <Text style={styles.text}>FCA: {data.adviser.fcaNumber}</Text>}
    </View>

    <View style={{ marginTop: 40 }}>
      <Text style={styles.label}>Report Date</Text>
      <Text style={styles.value}>{formatDate(data.metadata.reportDate)}</Text>
      <Text style={styles.text}>Reference: {data.metadata.reportRef}</Text>
    </View>

    <View style={{ marginTop: 24 }}>
      <Text style={styles.label}>Scope of Advice</Text>
      <Text style={styles.text}>{data.scope.selected.length > 0 ? data.scope.selected.join(', ') : 'Not provided'}</Text>
      <Text style={styles.label}>Report Status</Text>
      <Text style={styles.text}>{data.dataQuality.mode === 'final' ? 'Final' : 'Draft (data quality warnings may apply)'}</Text>
    </View>

    {data.dataQuality.warnings.some((w) => w.toLowerCase().includes('scope was inferred')) && (
      <View style={[styles.warningCard, { marginTop: 18 }]}>
        <Text style={styles.complianceTitle}>Legacy assessment note</Text>
        <Text style={styles.text}>
          Advice scope was inferred from the information captured at the time. Review the scope before relying on this report
          for regulated advice evidence.
        </Text>
      </View>
    )}

    {data.dataQuality.warnings.length > 0 && data.dataQuality.mode === 'draft' && (
      <View style={[styles.warningCard, { marginTop: 18 }]}>
        <Text style={styles.complianceTitle}>Data Quality Summary</Text>
        {data.dataQuality.warnings.slice(0, 5).map((w, idx) => (
          <Text key={idx} style={styles.text}>
            • {w}
          </Text>
        ))}
        {data.dataQuality.warnings.length > 5 && (
          <Text style={styles.text}>• …and {data.dataQuality.warnings.length - 5} more</Text>
        )}
      </View>
    )}

    <PageFooter styles={styles} brand={brand} />
  </Page>
)
