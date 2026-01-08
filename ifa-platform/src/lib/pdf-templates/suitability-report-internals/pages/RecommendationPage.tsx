import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { PieChart, chartColors } from '@/lib/pdf/PDFCharts'
import { formatCurrency } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const RecommendationPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any; charts?: any }> = ({
  data,
  styles,
  brand,
  charts
}) => {
  const adviceInScope = data.scope.includeInvestments || data.scope.includePensions || data.scope.includeProtection
  const adviceAreasLabel = data.scope.selected.length ? data.scope.selected.join(', ') : 'Advice scope not selected'
  const suitabilityNarrative = data.aiGenerated?.whySuitable || data.recommendation.rationale
  const narrativeParagraphs =
    suitabilityNarrative?.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean) || []
  const objectives = [
    data.objectives.primaryObjective,
    ...(data.objectives.secondaryObjectives || [])
  ].filter(Boolean) as string[]
  const objectiveAlignments =
    data.aiGenerated?.objectiveAlignments ||
    objectives.map((objective) => ({
      objective,
      narrative: data.recommendation.products.length
        ? `This objective is supported by the recommended products: ${data.recommendation.products.map((p) => p.name).join(', ')}.`
        : 'This objective will be addressed through the recommended portfolio.',
      products: data.recommendation.products.map((p) => p.name)
    }))
  const productJustifications =
    data.aiGenerated?.productJustifications ||
    data.recommendation.products.map((product) => ({
      product: product.name,
      narrative: product.reason || 'Selected to meet your objectives and align with your risk profile.'
    }))

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.firmName}>{brand.firmName}</Text>
          <Text style={styles.footerText}>Suitability Report</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Recommendation</Text>

        {data.scope.selected.length === 0 && (
          <View style={[styles.warningCard, { marginTop: 12 }]}>
            <Text style={styles.boldText}>Scope of advice not selected</Text>
            <Text style={styles.text}>This report may be incomplete until the advice scope is confirmed.</Text>
          </View>
        )}

        {!adviceInScope && (
          <View style={[styles.infoCard, { marginTop: 12 }]}>
            <Text style={styles.boldText}>Recommendation module is out of scope</Text>
            <Text style={styles.text}>
              No Investment/Pension/Protection advice has been selected for this report.
            </Text>
          </View>
        )}

        {adviceInScope ? (
          <>
            <View style={styles.successCard}>
              <Text style={styles.label}>Advice areas in scope</Text>
              <Text style={[styles.text, { marginBottom: 8 }]}>{adviceAreasLabel}</Text>

              <Text style={[styles.boldText, { fontSize: 14, marginBottom: 8 }]}>
                Recommended Portfolio: {data.recommendation.portfolioName || 'Not provided'}
              </Text>

              <Text style={styles.subsectionTitle}>Asset Allocation</Text>
              {data.recommendation.assetAllocation ? (
                <View style={styles.grid2}>
                  <View style={styles.gridCol2}>
                    <Text style={styles.text}>Equities: {data.recommendation.assetAllocation.equities}%</Text>
                    <Text style={styles.text}>Bonds: {data.recommendation.assetAllocation.bonds}%</Text>
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={styles.text}>Cash: {data.recommendation.assetAllocation.cash}%</Text>
                    <Text style={styles.text}>Alternatives: {data.recommendation.assetAllocation.alternatives}%</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.text}>Asset allocation not provided.</Text>
              )}
            </View>

            {data.recommendation.assetAllocation && (
              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <PieChart
                  title="Asset Allocation"
                  data={[
                    {
                      label: 'Equities',
                      value: data.recommendation.assetAllocation.equities,
                      color: brand.accentColor || chartColors.primary
                    },
                    { label: 'Bonds', value: data.recommendation.assetAllocation.bonds, color: chartColors.success },
                    { label: 'Cash', value: data.recommendation.assetAllocation.cash, color: chartColors.warning },
                    {
                      label: 'Alternatives',
                      value: data.recommendation.assetAllocation.alternatives,
                      color: chartColors.purple
                    }
                  ]}
                  dimensions={{ width: 480, height: 220 }}
                  donut={false}
                  showLabels={true}
                  showLegend={true}
                  showPercentages={true}
                  formatValue={(v) => `${v}%`}
                  formatTotal={(t) => `${t}%`}
                />
              </View>
            )}

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Recommended Products</Text>
              {data.recommendation.products.length === 0 ? (
                <View style={styles.warningCard}>
                  <Text style={styles.boldText}>No products recorded</Text>
                  <Text style={styles.text}>Complete the recommendation products to generate a complete report.</Text>
                </View>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Product</Text>
                    <Text style={styles.tableHeaderCell}>Provider</Text>
                    <Text style={styles.tableHeaderCell}>Amount</Text>
                  </View>
                  {data.recommendation.products.map((product, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{product.name}</Text>
                      <Text style={styles.tableCell}>{product.provider || '—'}</Text>
                      <Text style={styles.tableCell}>{formatCurrency(product.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Why This Recommendation is Suitable</Text>
              {suitabilityNarrative ? (
                <View style={styles.card}>
                  {narrativeParagraphs.length > 0 ? (
                    narrativeParagraphs.map((paragraph, idx) => (
                      <Text key={idx} style={styles.text}>
                        {paragraph}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.text}>{suitabilityNarrative}</Text>
                  )}
                </View>
              ) : (
                <View style={styles.warningCard}>
                  <Text style={styles.boldText}>Recommendation rationale not completed</Text>
                  <Text style={styles.text}>
                    Add a personalised rationale linking the recommendation to objectives and risk profile.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Objective Alignment</Text>
              {objectiveAlignments.length === 0 ? (
                <Text style={styles.text}>No objectives have been recorded.</Text>
              ) : (
                objectiveAlignments.map((alignment, idx) => (
                  <View key={idx} style={styles.card}>
                    <Text style={styles.boldText}>Objective: {alignment.objective}</Text>
                    <Text style={styles.text}>{alignment.narrative}</Text>
                    {alignment.products && alignment.products.length > 0 && (
                      <Text style={styles.text}>Products: {alignment.products.join(', ')}</Text>
                    )}
                  </View>
                ))
              )}
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Product Justification</Text>
              {productJustifications.length === 0 ? (
                <Text style={styles.text}>No product justifications available.</Text>
              ) : (
                productJustifications.map((justification, idx) => (
                  <View key={idx} style={styles.card}>
                    <Text style={styles.boldText}>{justification.product}</Text>
                    <Text style={styles.text}>{justification.narrative}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </View>

      <PageFooter styles={styles} brand={brand} />
    </Page>
  )
}
