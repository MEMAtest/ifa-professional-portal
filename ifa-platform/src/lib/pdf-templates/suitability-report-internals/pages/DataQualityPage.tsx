import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const DataQualityPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => {
  const allScopes = ['Pension Planning', 'Investment Planning', 'Protection Review', 'Estate Planning', 'Tax Planning']
  const outOfScope = allScopes.filter((s) => !data.scope.selected.includes(s as any))

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.firmName}>{brand.firmName}</Text>
          <Text style={styles.footerText}>Suitability Report</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Quality & Scope Summary</Text>
        <Text style={styles.text}>
          This draft report highlights missing or incomplete information so you can complete the assessment before
          generating a final FCA-ready report. No placeholder values are inserted.
        </Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Advice Scope</Text>
          <Text style={styles.label}>In scope</Text>
          <Text style={styles.value}>{data.scope.selected.length > 0 ? data.scope.selected.join(', ') : 'Not provided'}</Text>
          <Text style={styles.label}>Out of scope</Text>
          <Text style={styles.value}>{outOfScope.join(', ')}</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Warnings</Text>
          {data.dataQuality.warnings.length === 0 ? (
            <Text style={styles.text}>No warnings.</Text>
          ) : (
            <View style={styles.bulletList}>
              {data.dataQuality.warnings.map((w, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{w}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Missing Items</Text>
          {data.dataQuality.missing.length === 0 ? (
            <Text style={styles.text}>No missing items.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Field</Text>
                <Text style={[styles.tableHeaderCell, { flex: 4 }]}>Action needed</Text>
              </View>
              {data.dataQuality.missing.map((m, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{m.key}</Text>
                  <Text style={[styles.tableCell, { flex: 4 }]}>{m.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <PageFooter styles={styles} brand={brand} />
    </Page>
  )
}

