import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatCurrency, formatPercentage } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const CostsChargesPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => {
  const adviceInScope = data.scope.includeInvestments || data.scope.includePensions || data.scope.includeProtection
  const adviceAreasLabel = data.scope.selected.length ? data.scope.selected.join(', ') : 'Advice scope not selected'

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.firmName}>{brand.firmName}</Text>
          <Text style={styles.footerText}>Suitability Report</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Costs and Charges</Text>
        <Text style={styles.text}>
          This section sets out all the costs and charges associated with our recommendation. Under MiFID II regulations,
          we are required to provide you with a clear breakdown of all costs.
        </Text>

        {!adviceInScope && (
          <View style={[styles.infoCard, { marginTop: 12 }]}>
            <Text style={styles.boldText}>Out of scope</Text>
            <Text style={styles.text}>
              No Investment/Pension/Protection advice has been selected for this report.
            </Text>
          </View>
        )}

        {adviceInScope ? (
          <>
            <View style={[styles.infoCard, { marginTop: 12 }]}>
              <Text style={styles.boldText}>Advice areas in scope</Text>
              <Text style={styles.text}>{adviceAreasLabel}</Text>
            </View>

            {/* FIX Issue 19: Show FCA compliance warning when critical cost data is missing */}
            {(data.costsCharges.initialFee === undefined ||
              data.costsCharges.ongoingFee === undefined ||
              data.costsCharges.platformFee === undefined ||
              data.costsCharges.fundCharges === undefined) && (
              <View style={[styles.infoCard, { marginTop: 12, borderColor: '#FFA500', backgroundColor: '#FFF8E1' }]}>
                <Text style={[styles.boldText, { color: '#E65100' }]}>⚠ Data Quality Warning</Text>
                <Text style={styles.text}>
                  Some cost and charge information has not been provided. Under FCA COBS 6.1ZA, firms must disclose
                  all costs and charges to clients before providing services. Please ensure all applicable charges
                  are documented before finalising this report.
                </Text>
              </View>
            )}

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Adviser Charges</Text>
              <View style={styles.card}>
                <View style={styles.grid2}>
                  <View style={styles.gridCol2}>
                    <Text style={styles.label}>Initial Fee</Text>
                    <Text style={styles.value}>
                      {data.costsCharges.initialFeeType === 'fixed'
                        ? formatCurrency(data.costsCharges.initialFee)
                        : data.costsCharges.initialFee !== undefined
                          ? `${data.costsCharges.initialFee}%`
                          : 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={styles.label}>Ongoing Annual Fee</Text>
                    <Text style={styles.value}>
                      {data.costsCharges.ongoingFeeType === 'fixed'
                        ? formatCurrency(data.costsCharges.ongoingFee)
                        : data.costsCharges.ongoingFee !== undefined
                          ? `${data.costsCharges.ongoingFee}% per annum`
                          : 'Not provided'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Product Charges</Text>
              <View style={styles.card}>
                <View style={styles.grid2}>
                  <View style={styles.gridCol2}>
                    <Text style={styles.label}>Platform Fee</Text>
                    <Text style={styles.value}>
                      {data.costsCharges.platformFee === undefined ? 'Not provided' : `${formatPercentage(data.costsCharges.platformFee)} per annum`}
                    </Text>
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={styles.label}>Fund Charges (OCF)</Text>
                    <Text style={styles.value}>
                      {data.costsCharges.fundCharges === undefined ? 'Not provided' : `${formatPercentage(data.costsCharges.fundCharges)} per annum`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Total Cost Summary</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Period</Text>
                  <Text style={styles.tableHeaderCell}>Estimated Total Cost</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>First Year</Text>
                  <Text style={styles.tableCell}>{formatCurrency(data.costsCharges.totalFirstYearCost)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>5 Year Projection</Text>
                  <Text style={styles.tableCell}>{formatCurrency(data.costsCharges.projectedCosts5Years)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>10 Year Projection</Text>
                  <Text style={styles.tableCell}>{formatCurrency(data.costsCharges.projectedCosts10Years)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.boldText}>Impact of Costs</Text>
              <Text style={styles.text}>
                The costs and charges shown above will reduce the overall return on your investment. For example, if your
                portfolio achieves a 6% return but total charges are 1.5%, your net return would be approximately 4.5%.
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <PageFooter styles={styles} brand={brand} />
    </Page>
  )
}
