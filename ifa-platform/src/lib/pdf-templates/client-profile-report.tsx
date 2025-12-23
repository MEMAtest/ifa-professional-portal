import React from 'react'
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import type { ClientProfileReportData } from '@/lib/clients/profileReport/types'

type Branding = {
  firmName?: string
  primaryColor?: string
  accentColor?: string
  footerText?: string
}

const defaultBrand: Required<Branding> = {
  firmName: 'Financial Advisory Services',
  primaryColor: '#0f172a',
  accentColor: '#2563eb',
  footerText: 'Confidential – Client profile'
}

function formatDate(dateISO?: string): string {
  if (!dateISO) return 'Not provided'
  const d = new Date(dateISO)
  if (Number.isNaN(d.getTime())) return 'Not provided'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function valueOrNotProvided(value: unknown): string {
  if (value === null || value === undefined) return 'Not provided'
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return 'Not provided'
    if (s.toLowerCase() === '[object object]') return 'Not provided'
    return s
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return 'Not provided'
}

function formatAddress(value: unknown): string {
  if (!value) return 'Not provided'
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return 'Not provided'
    if (raw.toLowerCase() === '[object object]') return 'Not provided'
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        return formatAddress(JSON.parse(raw))
      } catch {
        return raw
      }
    }
    return raw
  }
  if (typeof value !== 'object') return valueOrNotProvided(String(value))
  const address = value as any
  const candidate =
    address.address ?? address.value ?? address.location ?? address.formatted ?? address.formattedAddress
  if (candidate && candidate !== value) return formatAddress(candidate)

  const parts = [
    address.line1 ?? address.addressLine1,
    address.line2 ?? address.addressLine2,
    address.line3 ?? address.addressLine3,
    address.city ?? address.town,
    address.county ?? address.state,
    address.postcode ?? address.zip ?? address.postalCode,
    address.country
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)

  return parts.length ? parts.join(', ') : 'Not provided'
}

function formatCurrency(amount: unknown): string {
  const num = typeof amount === 'number' ? amount : amount != null ? Number(amount) : NaN
  if (!Number.isFinite(num)) return 'Not provided'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(num)
}

function formatPercent(value: unknown): string {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN
  if (!Number.isFinite(num)) return 'Not provided'
  return `${Math.round(num)}%`
}

function formatList(value: unknown, fallback = 'Not provided'): string {
  if (!value) return fallback
  if (Array.isArray(value)) {
    const parts = value.map((v) => (typeof v === 'string' ? v.trim() : String(v))).filter(Boolean)
    return parts.length ? parts.join(', ') : fallback
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : fallback
  }
  return fallback
}

const createStyles = (brand: Required<Branding>) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: brand.primaryColor
    },
    header: {
      borderBottom: `2pt solid ${brand.accentColor}`,
      paddingBottom: 12,
      marginBottom: 16
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    },
    firmName: {
      fontSize: 14,
      fontWeight: 'bold'
    },
    docTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 6
    },
    subtitle: {
      fontSize: 11,
      color: '#475569',
      marginTop: 4
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginTop: 14,
      marginBottom: 8
    },
    card: {
      border: '1pt solid #e2e8f0',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#f8fafc'
    },
    grid2: {
      flexDirection: 'row',
      gap: 12
    },
    col: {
      flex: 1
    },
    label: {
      fontSize: 10,
      color: '#475569',
      marginBottom: 2
    },
    value: {
      fontSize: 11,
      fontWeight: 'bold',
      marginBottom: 8
    },
    footer: {
      position: 'absolute',
      left: 40,
      right: 40,
      bottom: 24,
      borderTop: '1pt solid #e2e8f0',
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      color: '#64748b',
      fontSize: 9
    },
    mono: {
      fontFamily: 'Courier'
    }
  })

const Footer = ({ styles, brand, reportRef }: { styles: any; brand: Required<Branding>; reportRef: string }) => (
  <View style={styles.footer} fixed>
    <Text>{brand.footerText}</Text>
    <Text style={styles.mono}>{reportRef}</Text>
  </View>
)

const SectionKV = ({ styles, label, value }: { styles: any; label: string; value: string }) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
)

const JsonBlock = ({ styles, value }: { styles: any; value: unknown }) => {
  if (!value || typeof value !== 'object') {
    return <Text style={styles.subtitle}>No data recorded.</Text>
  }
  const text = JSON.stringify(value, null, 2)
  return (
    <Text style={[styles.subtitle, styles.mono]}>
      {text.length > 2500 ? `${text.slice(0, 2500)}\n…` : text}
    </Text>
  )
}

export async function generateClientProfileReportPDF(
  data: ClientProfileReportData,
  branding?: Branding
): Promise<Buffer> {
  const brand = { ...defaultBrand, ...branding }
  const styles = createStyles(brand)

  const financial = (data.client.financialProfile || {}) as any
  const vulnerability = (data.client.vulnerabilityAssessment || {}) as any

  const doc = (
    <Document>
      {/* Page 1: Overview */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.firmName}>{brand.firmName}</Text>
            <Text style={styles.subtitle}>Client Profile Export</Text>
          </View>
          <Text style={styles.docTitle}>{data.client.fullName}</Text>
          <Text style={styles.subtitle}>
            Report date: {formatDate(data.report.reportDateISO)} • Client ref: {data.client.clientRef || 'Not provided'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Client Overview</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Name" value={valueOrNotProvided(data.client.fullName)} />
              <SectionKV styles={styles} label="Date of birth" value={valueOrNotProvided(data.client.dateOfBirth)} />
              <SectionKV styles={styles} label="Client reference" value={valueOrNotProvided(data.client.clientRef)} />
              <SectionKV styles={styles} label="Status" value={valueOrNotProvided(data.client.status)} />
            </View>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Email" value={valueOrNotProvided(data.client.email)} />
              <SectionKV styles={styles} label="Phone" value={valueOrNotProvided(data.client.phone)} />
              <SectionKV styles={styles} label="Address" value={formatAddress(data.client.address)} />
              <SectionKV styles={styles} label="Next review date" value={valueOrNotProvided(data.client.nextReviewDate)} />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Assessment Snapshot</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Suitability</Text>
          <Text style={styles.value}>
            {data.assessments.suitability
              ? `${valueOrNotProvided(data.assessments.suitability.status)} • ${valueOrNotProvided(
                  data.assessments.suitability.completion
                )}% • v${valueOrNotProvided(data.assessments.suitability.version)}`
              : 'Not provided'}
          </Text>

          <Text style={styles.label}>ATR / CFL / Persona</Text>
          <Text style={styles.value}>
            ATR:{' '}
            {data.assessments.atr
              ? `${valueOrNotProvided(data.assessments.atr.category)} (${valueOrNotProvided(data.assessments.atr.score)}/10)`
              : 'Not provided'}{' '}
            • CFL:{' '}
            {data.assessments.cfl
              ? `${valueOrNotProvided(data.assessments.cfl.category)} (${valueOrNotProvided(data.assessments.cfl.score)}/10)`
              : 'Not provided'}{' '}
            • Persona:{' '}
            {data.assessments.persona ? `${valueOrNotProvided(data.assessments.persona.type)} (${valueOrNotProvided(data.assessments.persona.level)})` : 'Not provided'}
          </Text>
        </View>

        <Footer styles={styles} brand={brand} reportRef={data.report.reportRef} />
      </Page>

      {/* Page 2: Personal & contact details */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.firmName}>{brand.firmName}</Text>
            <Text style={styles.subtitle}>Client Details</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Title" value={valueOrNotProvided((data.client.personalDetails as any)?.title)} />
              <SectionKV styles={styles} label="First name" value={valueOrNotProvided((data.client.personalDetails as any)?.firstName || (data.client.personalDetails as any)?.first_name)} />
              <SectionKV styles={styles} label="Last name" value={valueOrNotProvided((data.client.personalDetails as any)?.lastName || (data.client.personalDetails as any)?.last_name)} />
            </View>
            <View style={styles.col}>
              <SectionKV styles={styles} label="DOB" value={valueOrNotProvided((data.client.personalDetails as any)?.dateOfBirth || (data.client.personalDetails as any)?.date_of_birth)} />
              <SectionKV styles={styles} label="Marital status" value={valueOrNotProvided((data.client.personalDetails as any)?.maritalStatus || (data.client.personalDetails as any)?.marital_status)} />
              <SectionKV styles={styles} label="Employment status" value={valueOrNotProvided((data.client.personalDetails as any)?.employmentStatus || (data.client.personalDetails as any)?.employment_status)} />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact Details</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Email" value={valueOrNotProvided((data.client.contactInfo as any)?.email)} />
              <SectionKV styles={styles} label="Phone" value={valueOrNotProvided((data.client.contactInfo as any)?.phone || (data.client.contactInfo as any)?.mobile)} />
            </View>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Preferred contact" value={valueOrNotProvided((data.client.contactInfo as any)?.preferredContact || (data.client.contactInfo as any)?.preferred_contact)} />
              <SectionKV styles={styles} label="Address" value={formatAddress(data.client.address)} />
            </View>
          </View>
        </View>

        <Footer styles={styles} brand={brand} reportRef={data.report.reportRef} />
      </Page>

      {/* Page 3: Financial summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.firmName}>{brand.firmName}</Text>
            <Text style={styles.subtitle}>Financial Summary</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Income & Expenditure</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Annual income" value={formatCurrency(financial.annualIncome ?? financial.annual_income)} />
              <SectionKV styles={styles} label="Monthly expenses" value={formatCurrency(financial.monthlyExpenses ?? financial.monthly_expenses)} />
              <SectionKV styles={styles} label="Monthly surplus" value={formatCurrency(financial.monthlySurplus ?? financial.monthly_surplus)} />
            </View>
            <View style={styles.col}>
              <SectionKV styles={styles} label="Savings / liquid assets" value={formatCurrency(financial.liquidAssets ?? financial.liquid_assets ?? financial.savings)} />
              <SectionKV styles={styles} label="Emergency fund" value={formatCurrency(financial.emergencyFund ?? financial.emergency_fund)} />
              <SectionKV styles={styles} label="Net worth" value={formatCurrency(financial.netWorth ?? financial.net_worth)} />
            </View>
          </View>
        </View>

        <Footer styles={styles} brand={brand} reportRef={data.report.reportRef} />
      </Page>

      {/* Page 4: Risk profile + vulnerability */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.firmName}>{brand.firmName}</Text>
            <Text style={styles.subtitle}>Risk & Vulnerability</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Risk Profile</Text>
        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <SectionKV styles={styles} label="ATR score" value={data.risk.atrScore != null ? `${data.risk.atrScore}/10` : 'Not provided'} />
              <SectionKV styles={styles} label="ATR category" value={valueOrNotProvided(data.risk.atrCategory)} />
            </View>
            <View style={styles.col}>
              <SectionKV styles={styles} label="CFL score" value={data.risk.cflScore != null ? `${data.risk.cflScore}/10` : 'Not provided'} />
              <SectionKV styles={styles} label="CFL category" value={valueOrNotProvided(data.risk.cflCategory)} />
            </View>
          </View>
          <Text style={styles.label}>Reconciled risk</Text>
          <Text style={styles.value}>
            {data.risk.reconciled?.finalRiskScore != null ? `${data.risk.reconciled.finalRiskScore}/10` : 'Not provided'} •{' '}
            {valueOrNotProvided(data.risk.reconciled?.finalRiskCategory)} •{' '}
            {valueOrNotProvided(data.risk.reconciled?.alignment)}
          </Text>
          {(data.risk.reconciled?.flags?.length || 0) > 0 && (
            <Text style={styles.subtitle}>
              Flags: {data.risk.reconciled?.flags?.map((f) => `${f.severity.toUpperCase()}: ${f.message}`).join(' • ')}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Vulnerability</Text>
        <View style={styles.card}>
          <SectionKV
            styles={styles}
            label="Vulnerable"
            value={valueOrNotProvided(vulnerability.is_vulnerable ?? vulnerability.isVulnerable)}
          />
          <SectionKV
            styles={styles}
            label="Drivers"
            value={formatList(vulnerability.drivers, 'Not provided')}
          />
          <SectionKV
            styles={styles}
            label="Notes"
            value={valueOrNotProvided(vulnerability.notes)}
          />
        </View>

        <Footer styles={styles} brand={brand} reportRef={data.report.reportRef} />
      </Page>

      {/* Page 5: Assessments + notes (plus raw appendix) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.firmName}>{brand.firmName}</Text>
            <Text style={styles.subtitle}>Assessments & Notes</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Assessment Summary</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Suitability</Text>
          <Text style={styles.value}>
            {data.assessments.suitability
              ? `${valueOrNotProvided(data.assessments.suitability.status)} • ${formatPercent(
                  data.assessments.suitability.completion
                )} • v${valueOrNotProvided(data.assessments.suitability.version)}`
              : 'Not provided'}
          </Text>
          <Text style={styles.label}>ATR</Text>
          <Text style={styles.value}>
            {data.assessments.atr
              ? `${valueOrNotProvided(data.assessments.atr.category)} • ${valueOrNotProvided(
                  data.assessments.atr.score
                )}/10 • v${valueOrNotProvided(data.assessments.atr.version)}`
              : 'Not provided'}
          </Text>
          <Text style={styles.label}>CFL</Text>
          <Text style={styles.value}>
            {data.assessments.cfl
              ? `${valueOrNotProvided(data.assessments.cfl.category)} • ${valueOrNotProvided(
                  data.assessments.cfl.score
                )}/10 • v${valueOrNotProvided(data.assessments.cfl.version)}`
              : 'Not provided'}
          </Text>
          <Text style={styles.label}>Investor Persona</Text>
          <Text style={styles.value}>
            {data.assessments.persona
              ? `${valueOrNotProvided(data.assessments.persona.type)} • Level ${valueOrNotProvided(
                  data.assessments.persona.level
                )} • Confidence ${valueOrNotProvided(data.assessments.persona.confidence)}%`
              : 'Not provided'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Client Notes</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>{data.client.notes ? data.client.notes : 'No notes recorded.'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Appendix (raw)</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Personal details</Text>
          <JsonBlock styles={styles} value={data.client.personalDetails} />
        </View>
        <View style={[styles.card, { marginTop: 10 }]}>
          <Text style={styles.label}>Contact info</Text>
          <JsonBlock styles={styles} value={data.client.contactInfo} />
        </View>
        <View style={[styles.card, { marginTop: 10 }]}>
          <Text style={styles.label}>Financial profile</Text>
          <JsonBlock styles={styles} value={data.client.financialProfile} />
        </View>

        <Footer styles={styles} brand={brand} reportRef={data.report.reportRef} />
      </Page>

      {/* Page 6: Full raw client record */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.firmName}>{brand.firmName}</Text>
            <Text style={styles.subtitle}>Client Record (Raw)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Client Row</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            This appendix is a full export of the current client record for audit/debug purposes.
          </Text>
          <JsonBlock styles={styles} value={data.client.rawClient} />
        </View>

        <Footer styles={styles} brand={brand} reportRef={data.report.reportRef} />
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)
  return buffer as Buffer
}
