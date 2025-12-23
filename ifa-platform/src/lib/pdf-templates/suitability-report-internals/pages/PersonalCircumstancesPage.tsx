import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatCurrency, formatDate } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'

export const PersonalCircumstancesPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
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
      <Text style={styles.sectionTitle}>Your Personal Circumstances</Text>
      <Text style={styles.text}>
        This section summarises the information you have provided to us about your personal and financial circumstances.
        It is important that this information is accurate and up-to-date, as our recommendations are based on it.
      </Text>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Personal Details</Text>
        <View style={styles.grid2}>
          <View style={styles.gridCol2}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{data.client.personalDetails.fullName || 'Client'}</Text>

            <Text style={styles.label}>Date of Birth</Text>
            <Text style={styles.value}>{formatDate(data.client.personalDetails.dateOfBirth)}</Text>

            <Text style={styles.label}>Marital Status</Text>
            <Text style={styles.value}>{data.client.personalDetails.maritalStatus || 'Not provided'}</Text>
          </View>
          <View style={styles.gridCol2}>
            <Text style={styles.label}>Employment Status</Text>
            <Text style={styles.value}>{data.client.personalDetails.employmentStatus || 'Not provided'}</Text>

            <Text style={styles.label}>Target Retirement Age</Text>
            <Text style={styles.value}>{data.client.personalDetails.retirementAge || 'Not provided'}</Text>

            <Text style={styles.label}>National Insurance Number</Text>
            <Text style={styles.value}>{data.client.personalDetails.niNumber || 'Not provided'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Contact Details</Text>
        <Text style={styles.label}>Address</Text>
        <Text style={styles.value}>{data.client.contactDetails.address || 'Not provided'}</Text>
        <View style={styles.grid2}>
          <View style={styles.gridCol2}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{data.client.contactDetails.phone || 'Not provided'}</Text>
          </View>
          <View style={styles.gridCol2}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.client.contactDetails.email || 'Not provided'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Financial Summary</Text>
        <View style={styles.card}>
          <View style={styles.grid3}>
            <View style={styles.gridCol3}>
              <Text style={styles.label}>Annual Income</Text>
              <Text style={styles.value}>{formatCurrency(data.client.financialDetails.annualIncome)}</Text>
            </View>
            <View style={styles.gridCol3}>
              <Text style={styles.label}>Essential Expenses</Text>
              <Text style={styles.value}>{formatCurrency(data.client.financialDetails.essentialExpenses)}</Text>
            </View>
            <View style={styles.gridCol3}>
              <Text style={styles.label}>Discretionary Income</Text>
              <Text style={styles.value}>{formatCurrency(data.client.financialDetails.discretionaryIncome)}</Text>
            </View>
          </View>
          <View style={[styles.grid3, { marginTop: 10 }]}>
            <View style={styles.gridCol3}>
              <Text style={styles.label}>Total Assets</Text>
              <Text style={styles.value}>{formatCurrency(data.client.financialDetails.totalAssets)}</Text>
            </View>
            <View style={styles.gridCol3}>
              <Text style={styles.label}>Total Liabilities</Text>
              <Text style={styles.value}>{formatCurrency(data.client.financialDetails.totalLiabilities)}</Text>
            </View>
            <View style={styles.gridCol3}>
              <Text style={styles.label}>Emergency Fund</Text>
              <Text style={styles.value}>{formatCurrency(data.client.financialDetails.emergencyFund)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Objectives and Key Facts</Text>
        <View style={styles.infoCard}>
          <Text style={styles.text}>Primary objective: {data.objectives.primaryObjective || 'Not provided'}</Text>
          <Text style={styles.text}>Investment time horizon: {data.objectives.investmentTimeline || 'Not provided'}</Text>
          <Text style={styles.text}>Dependants: {data.client.personalDetails.dependants ?? 'Not provided'}</Text>
          <Text style={styles.text}>Partner: {data.conditionality.showPartnerDetails ? 'Yes' : 'No'}</Text>
          {data.conditionality.showPartnerDetails && data.client.personalDetails.partnerName && (
            <Text style={styles.text}>Partner name: {data.client.personalDetails.partnerName}</Text>
          )}
        </View>
      </View>

      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Existing Arrangements Summary</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Pensions</Text>
          <Text style={styles.value}>
            {data.facts.hasPensions === false
              ? 'None declared'
              : data.facts.hasPensions === true
                ? `${formatCurrency(data.client.financialDetails.pensionValue)}${data.existingArrangements.pensionTypes.length ? ` • ${data.existingArrangements.pensionTypes.join(', ')}` : ''}`
                : 'Not provided'}
          </Text>

          {data.facts.hasPensions === true && data.existingArrangements.pensionArrangements?.length ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Provider</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Type</Text>
                <Text style={styles.tableHeaderCell}>Value</Text>
              </View>
              {data.existingArrangements.pensionArrangements.slice(0, 6).map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{row.provider || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{row.type || '—'}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(row.currentValue)}</Text>
                </View>
              ))}
              {data.existingArrangements.pensionArrangements.length > 6 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 5 }]}>
                    …and {data.existingArrangements.pensionArrangements.length - 6} more
                  </Text>
                </View>
              )}
            </View>
          ) : data.facts.hasPensions === true ? (
            <Text style={styles.text}>Pension arrangement details not provided.</Text>
          ) : null}

          <Text style={styles.label}>Protection</Text>
          <Text style={styles.value}>
            {data.facts.hasProtection === false
              ? 'None declared'
              : data.facts.hasProtection === true
                ? data.existingArrangements.protectionTypes.join(', ') || 'Provided'
                : 'Not provided'}
          </Text>

          {data.facts.hasProtection === true && data.existingArrangements.insurancePolicies?.length ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Provider</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Type</Text>
                <Text style={styles.tableHeaderCell}>Cover</Text>
              </View>
              {data.existingArrangements.insurancePolicies.slice(0, 6).map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{row.provider || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{row.type || '—'}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(row.coverAmount)}</Text>
                </View>
              ))}
              {data.existingArrangements.insurancePolicies.length > 6 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 5 }]}>
                    …and {data.existingArrangements.insurancePolicies.length - 6} more
                  </Text>
                </View>
              )}
            </View>
          ) : data.facts.hasProtection === true ? (
            <Text style={styles.text}>Protection policy details not provided.</Text>
          ) : null}

          {data.conditionality.showDbTransferQuestion && (
            <>
              <Text style={styles.label}>DB Transfer Considered</Text>
              <Text style={styles.value}>
                {data.existingArrangements.dbTransferConsidered ? 'Yes' : 'No'}
                {data.conditionality.showDbTransferDetails && data.existingArrangements.transferValue
                  ? ` • Transfer value: ${formatCurrency(data.existingArrangements.transferValue)}`
                  : ''}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
)
