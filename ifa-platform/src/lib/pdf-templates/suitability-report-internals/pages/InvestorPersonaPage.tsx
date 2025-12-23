import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatDate } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const InvestorPersonaPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.firmName}>{brand.firmName}</Text>
        <Text style={styles.footerText}>Suitability Report</Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Investor Persona</Text>
      <Text style={styles.text}>
        This section summarises your investor persona assessment and helps us tailor how we present information and manage
        behavioural risks alongside your objectives and risk profile.
      </Text>

      {!data.investorPersona ? (
        <View style={styles.card}>
          <Text style={styles.text}>No current investor persona assessment found.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.grid2}>
              <View style={styles.gridCol2}>
                <Text style={styles.label}>Persona Type</Text>
                <Text style={styles.value}>{data.investorPersona.personaType || 'Not provided'}</Text>
              </View>
              <View style={styles.gridCol2}>
                <Text style={styles.label}>Persona Level</Text>
                <Text style={styles.value}>{data.investorPersona.personaLevel || 'Not provided'}</Text>
              </View>
            </View>

            <View style={[styles.grid2, { marginTop: 10 }]}>
              <View style={styles.gridCol2}>
                <Text style={styles.label}>Confidence</Text>
                <Text style={styles.value}>
                  {typeof data.investorPersona.confidence === 'number' ? `${data.investorPersona.confidence}%` : 'Not provided'}
                </Text>
              </View>
              <View style={styles.gridCol2}>
                <Text style={styles.label}>Assessed</Text>
                <Text style={styles.value}>{formatDate(data.investorPersona.assessedAtISO)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.grid2, { marginTop: 12 }]}>
            <View style={styles.gridCol2}>
              <Text style={styles.subsectionTitle}>Motivations</Text>
              <View style={styles.card}>
                {(data.investorPersona.motivations.length ? data.investorPersona.motivations : ['Not provided'])
                  .slice(0, 8)
                  .map((m, idx) => (
                    <Text key={idx} style={styles.text}>
                      • {m}
                    </Text>
                  ))}
              </View>
            </View>
            <View style={styles.gridCol2}>
              <Text style={styles.subsectionTitle}>Concerns</Text>
              <View style={styles.card}>
                {(data.investorPersona.fears.length ? data.investorPersona.fears : ['Not provided'])
                  .slice(0, 8)
                  .map((m, idx) => (
                    <Text key={idx} style={styles.text}>
                      • {m}
                    </Text>
                  ))}
              </View>
            </View>
          </View>
        </>
      )}
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
)
