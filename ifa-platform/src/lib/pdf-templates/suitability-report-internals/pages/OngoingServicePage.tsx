import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatDate } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const OngoingServicePage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
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
      <Text style={styles.sectionTitle}>Ongoing Service</Text>
      <Text style={styles.text}>We provide an ongoing service to ensure your arrangements continue to meet your needs.</Text>

      <View style={styles.card}>
        <Text style={styles.subsectionTitle}>Review Frequency</Text>
        <Text style={styles.value}>{data.ongoingService.reviewFrequency || 'Not provided'}</Text>
        <Text style={styles.text}>Next review date: {formatDate(data.ongoingService.nextReviewDateISO)}</Text>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Services Included</Text>
        <View style={styles.bulletList}>
          {data.ongoingService.servicesIncluded.length === 0 ? (
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>+</Text>
              <Text style={styles.bulletText}>Not provided</Text>
            </View>
          ) : (
            data.ongoingService.servicesIncluded.map((service, index) => (
              <View key={index} style={styles.bulletItem}>
                <Text style={styles.bullet}>+</Text>
                <Text style={styles.bulletText}>{service}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>How to Contact Us</Text>
        <View style={styles.bulletList}>
          {data.ongoingService.contactMethods.length === 0 ? (
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.bulletText}>Not provided</Text>
            </View>
          ) : (
            data.ongoingService.contactMethods.map((method, index) => (
              <View key={index} style={styles.bulletItem}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.bulletText}>{method}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Client Declaration</Text>
      <View style={styles.complianceBox}>
        <Text style={styles.text}>By signing below, I confirm that:</Text>
        <View style={[styles.bulletList, { marginTop: 8 }]}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>1.</Text>
            <Text style={styles.bulletText}>
              The information I have provided is accurate and complete to the best of my knowledge.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>2.</Text>
            <Text style={styles.bulletText}>
              I have read and understood this suitability report, including the risks and charges.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>3.</Text>
            <Text style={styles.bulletText}>
              I understand the recommendation is based on the information provided and my current circumstances.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>4.</Text>
            <Text style={styles.bulletText}>I will inform my adviser if my circumstances change materially.</Text>
          </View>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.grid2}>
            <View style={styles.gridCol2}>
              <Text style={styles.label}>Client Signature</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.label}>Date</Text>
            </View>
            <View style={styles.gridCol2}>
              <Text style={styles.label}>Adviser Signature</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.label}>Date</Text>
            </View>
          </View>
        </View>
      </View>
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
)

