import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const OptionsConsideredPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
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
        <Text style={styles.sectionTitle}>Options Considered</Text>
        <Text style={styles.text}>
          Before making our recommendation, we considered the following options that could potentially meet your needs and
          objectives:
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

            {data.optionsConsidered.options.length === 0 ? (
              <View style={[styles.warningCard, { marginTop: 12 }]}>
                <Text style={styles.boldText}>No options recorded</Text>
                <Text style={styles.text}>Complete the “Options Considered” section to document alternatives and rationale.</Text>
              </View>
            ) : null}

            {data.optionsConsidered.options.map((option, index) => (
              <View key={index} style={[styles.card, option.selected ? styles.successCard : styles.card]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.boldText}>{option.name}</Text>
                  {option.selected && <Text style={[styles.label, { color: '#059669' }]}>RECOMMENDED</Text>}
                </View>
                <Text style={styles.text}>{option.description}</Text>

                <View style={[styles.grid2, { marginTop: 8 }]}>
                  <View style={styles.gridCol2}>
                    <Text style={[styles.label, { color: '#059669' }]}>Advantages</Text>
                    {option.pros.map((pro, i) => (
                      <Text key={i} style={styles.text}>
                        + {pro}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.gridCol2}>
                    <Text style={[styles.label, { color: '#dc2626' }]}>Disadvantages</Text>
                    {option.cons.map((con, i) => (
                      <Text key={i} style={styles.text}>
                        - {con}
                      </Text>
                    ))}
                  </View>
                </View>

                {option.selected && option.reason && (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: '#d1fae5', borderRadius: 4 }}>
                    <Text style={[styles.text, { fontWeight: 'bold' }]}>Why this option:</Text>
                    <Text style={styles.text}>{option.reason}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        ) : null}
      </View>

      <PageFooter styles={styles} brand={brand} />
    </Page>
  )
}
