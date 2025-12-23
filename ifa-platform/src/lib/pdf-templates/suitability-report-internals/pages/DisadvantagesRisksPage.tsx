import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const DisadvantagesRisksPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
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
        <Text style={styles.sectionTitle}>Disadvantages and Risks</Text>
        <Text style={styles.text}>
          It is important that you understand the potential disadvantages and risks associated with our recommendation. All
          investments carry some level of risk.
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

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Key Disadvantages</Text>
              <View style={styles.warningCard}>
                <View style={styles.bulletList}>
                  {data.disadvantagesRisks.disadvantages.length === 0 ? (
                    <View style={styles.bulletItem}>
                      <Text style={styles.bullet}>-</Text>
                      <Text style={styles.bulletText}>Not provided</Text>
                    </View>
                  ) : (
                    data.disadvantagesRisks.disadvantages.map((disadvantage, index) => (
                      <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>-</Text>
                        <Text style={styles.bulletText}>{disadvantage}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Investment Risks</Text>
              <View style={styles.warningCard}>
                <View style={styles.bulletList}>
                  {data.disadvantagesRisks.risks.length === 0 ? (
                    <View style={styles.bulletItem}>
                      <Text style={styles.bullet}>-</Text>
                      <Text style={styles.bulletText}>Not provided</Text>
                    </View>
                  ) : (
                    data.disadvantagesRisks.risks.map((risk, index) => (
                      <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>-</Text>
                        <Text style={styles.bulletText}>{risk}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>How We Mitigate These Risks</Text>
              <View style={styles.infoCard}>
                <View style={styles.bulletList}>
                  {data.disadvantagesRisks.mitigations.length === 0 ? (
                    <View style={styles.bulletItem}>
                      <Text style={styles.bullet}>+</Text>
                      <Text style={styles.bulletText}>Not provided</Text>
                    </View>
                  ) : (
                    data.disadvantagesRisks.mitigations.map((mitigation, index) => (
                      <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>+</Text>
                        <Text style={styles.bulletText}>{mitigation}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>

            {data.disadvantagesRisks.notes ? (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Additional Notes</Text>
                <View style={styles.card}>
                  <Text style={styles.text}>{data.disadvantagesRisks.notes}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.complianceBox}>
              <Text style={styles.complianceTitle}>Important Warning</Text>
              <Text style={styles.text}>
                The value of investments can go down as well as up, and you may get back less than you invest. Past
                performance is not a reliable indicator of future results. Tax treatment depends on individual
                circumstances and may change in the future.
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <PageFooter styles={styles} brand={brand} />
    </Page>
  )
}
