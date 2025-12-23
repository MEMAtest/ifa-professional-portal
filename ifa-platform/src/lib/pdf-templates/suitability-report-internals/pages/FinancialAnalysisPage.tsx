import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatCurrency } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const FinancialAnalysisPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => {
  const incomeProvidedRows = data.financialAnalysis.income.rows.filter(
    (row) => row.current !== undefined || row.atRetirement !== undefined
  )
  const hasIncomeTotals =
    data.financialAnalysis.income.totalCurrent !== undefined || data.financialAnalysis.income.totalAtRetirement !== undefined

  const incomeRows =
    incomeProvidedRows.length > 0
      ? incomeProvidedRows
      : hasIncomeTotals
        ? [
            {
              label: 'Total income (provided)',
              current: data.financialAnalysis.income.totalCurrent,
              atRetirement: data.financialAnalysis.income.totalAtRetirement
            }
          ]
        : []

  const showIncomeTotalRow = incomeProvidedRows.length > 0

  const expenditureProvidedRows = data.financialAnalysis.expenditure.rows.filter(
    (row) => row.essential !== undefined || row.discretionary !== undefined
  )
  const hasExpenditureTotals =
    data.financialAnalysis.expenditure.totalEssential !== undefined ||
    data.financialAnalysis.expenditure.totalDiscretionary !== undefined

  const expenditureRows =
    expenditureProvidedRows.length > 0
      ? expenditureProvidedRows
      : hasExpenditureTotals
        ? [
            {
              label: 'Total expenditure (provided)',
              essential: data.financialAnalysis.expenditure.totalEssential,
              discretionary: data.financialAnalysis.expenditure.totalDiscretionary
            }
          ]
        : []

  const showExpenditureTotalRow = expenditureProvidedRows.length > 0

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.firmName}>{brand.firmName}</Text>
          <Text style={styles.footerText}>Suitability Report</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Income and Expenditure Analysis</Text>
        <Text style={styles.text}>
          The following summary is based on the information provided. Values are shown as annual figures unless stated
          otherwise.
        </Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Income Analysis</Text>
          {incomeRows.length === 0 ? (
            <View style={styles.warningCard}>
              <Text style={styles.boldText}>Income breakdown not provided</Text>
              <Text style={styles.text}>Complete the income breakdown to include an income analysis table.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Income Source</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Current</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>At Retirement</Text>
              </View>
              {incomeRows.map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{row.label}</Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                    {row.current === undefined ? '—' : formatCurrency(row.current)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                    {row.atRetirement === undefined ? '—' : formatCurrency(row.atRetirement)}
                  </Text>
                </View>
              ))}
              {showIncomeTotalRow ? (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3, fontWeight: 'bold' }]}>Total</Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                    {data.financialAnalysis.income.totalCurrent === undefined
                      ? '—'
                      : formatCurrency(data.financialAnalysis.income.totalCurrent)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                    {data.financialAnalysis.income.totalAtRetirement === undefined
                      ? '—'
                      : formatCurrency(data.financialAnalysis.income.totalAtRetirement)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Expenditure Analysis</Text>
          {expenditureRows.length === 0 ? (
            <View style={styles.warningCard}>
              <Text style={styles.boldText}>Expenditure breakdown not provided</Text>
              <Text style={styles.text}>Complete the expenditure breakdown to include an expenditure analysis table.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Essential</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Discretionary</Text>
              </View>
              {expenditureRows.map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{row.label}</Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                    {row.essential === undefined ? '—' : formatCurrency(row.essential)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                    {row.discretionary === undefined ? '—' : formatCurrency(row.discretionary)}
                  </Text>
                </View>
              ))}
              {showExpenditureTotalRow ? (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3, fontWeight: 'bold' }]}>Total</Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                    {data.financialAnalysis.expenditure.totalEssential === undefined
                      ? '—'
                      : formatCurrency(data.financialAnalysis.expenditure.totalEssential)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                    {data.financialAnalysis.expenditure.totalDiscretionary === undefined
                      ? '—'
                      : formatCurrency(data.financialAnalysis.expenditure.totalDiscretionary)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <PageFooter styles={styles} brand={brand} />
    </Page>
  )
}
