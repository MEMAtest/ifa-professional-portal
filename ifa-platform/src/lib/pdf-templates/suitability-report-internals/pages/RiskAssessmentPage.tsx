import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { GaugeChart, chartColors } from '@/lib/pdf/PDFCharts'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const RiskAssessmentPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any; charts?: any }> = ({
  data,
  styles,
  brand,
  charts
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.firmName}>{brand.firmName}</Text>
        <Text style={styles.footerText}>Suitability Report</Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Risk Assessment</Text>
      <Text style={styles.text}>
        We assess your suitability for investment by considering two key factors: your Attitude to Risk (ATR) - your
        willingness to take investment risk, and your Capacity for Loss (CFL) - your ability to absorb potential losses
        without materially impacting your standard of living.
      </Text>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Attitude to Risk (ATR)</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.gridCol2}>
              <Text style={styles.label}>Your ATR Score</Text>
              <Text style={[styles.value, { fontSize: 24, color: brand.accentColor }]}>
                {data.riskAssessment.attitudeToRisk !== undefined ? `${data.riskAssessment.attitudeToRisk}/10` : 'Not assessed'}
              </Text>
            </View>
            <View style={styles.gridCol2}>
              <Text style={styles.label}>Risk Category</Text>
              <Text style={[styles.value, { fontSize: 14 }]}>{data.riskAssessment.attitudeCategory}</Text>
            </View>
          </View>

          <Text style={[styles.text, { marginTop: 10 }]}>
            Investment Experience: {data.riskAssessment.investmentExperience || 'Not assessed'}
          </Text>
          <Text style={styles.text}>
            Time Horizon:{' '}
            {data.riskAssessment.timeHorizonYears ? `${data.riskAssessment.timeHorizonYears} years` : 'Not assessed'}
          </Text>
        </View>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Capacity for Loss (CFL)</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.gridCol2}>
              <Text style={styles.label}>Your CFL Score</Text>
              <Text style={[styles.value, { fontSize: 24, color: brand.accentColor }]}>
                {data.riskAssessment.capacityForLoss !== undefined ? `${data.riskAssessment.capacityForLoss}/10` : 'Not assessed'}
              </Text>
            </View>
            <View style={styles.gridCol2}>
              <Text style={styles.label}>Assessment</Text>
              <Text style={[styles.value, { fontSize: 14 }]}>
                {data.riskAssessment.capacityCategory === 'Not assessed' ? 'Not assessed' : `${data.riskAssessment.capacityCategory} Capacity`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <View style={{ width: 240 }}>
          {data.riskAssessment.attitudeToRisk !== undefined ? (
            <GaugeChart
              title="Attitude to Risk (ATR)"
              value={data.riskAssessment.attitudeToRisk}
              maxValue={10}
              dimensions={{ width: 240, height: 140 }}
              label={data.riskAssessment.attitudeCategory}
              colors={{
                low: chartColors.success,
                medium: brand.accentColor || chartColors.warning,
                high: chartColors.danger
              }}
            />
          ) : (
            <View style={styles.card}>
              <Text style={styles.boldText}>Attitude to Risk</Text>
              <Text style={styles.text}>Not assessed</Text>
            </View>
          )}
        </View>
        <View style={{ width: 240 }}>
          {data.riskAssessment.capacityForLoss !== undefined ? (
            <GaugeChart
              title="Capacity for Loss (CFL)"
              value={data.riskAssessment.capacityForLoss}
              maxValue={10}
              dimensions={{ width: 240, height: 140 }}
              label={
                data.riskAssessment.capacityForLoss >= 7
                  ? 'High Capacity'
                  : data.riskAssessment.capacityForLoss >= 4
                    ? 'Medium Capacity'
                    : 'Low Capacity'
              }
              colors={{
                low: chartColors.success,
                medium: chartColors.warning,
                high: chartColors.danger
              }}
            />
          ) : (
            <View style={styles.card}>
              <Text style={styles.boldText}>Capacity for Loss</Text>
              <Text style={styles.text}>Not assessed</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.subsectionTitle}>FCA Requirement (COBS 9.2)</Text>
        <Text style={styles.text}>
          The FCA requires that where a client&apos;s attitude to risk differs from their capacity for loss, we must give
          appropriate weight to capacity for loss. Our recommendation reflects this requirement by ensuring any investment
          strategy does not exceed your capacity to absorb potential losses.
        </Text>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Combined Risk Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Overall Risk Score</Text>
          <Text style={[styles.value, { fontSize: 18 }]}>
            {data.riskAssessment.riskScore !== undefined ? `${data.riskAssessment.riskScore}/10` : 'Not assessed'} -{' '}
            {data.riskAssessment.combinedRiskCategory}
          </Text>
          <Text style={styles.text}>
            This score takes into account both your willingness and ability to take investment risk. Our recommendation is
            designed to align with this risk profile.
          </Text>
          {data.riskAssessment.riskScore === undefined &&
            (data.riskAssessment.attitudeToRisk !== undefined || data.riskAssessment.capacityForLoss !== undefined) && (
              <Text style={styles.text}>
                Combined risk profiling requires both ATR and CFL. The summary risk profile uses the available
                assessment(s).
              </Text>
            )}
        </View>
      </View>
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
)

