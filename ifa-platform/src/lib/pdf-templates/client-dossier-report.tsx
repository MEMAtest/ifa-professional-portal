import React from 'react'
import { Document, Page, StyleSheet, Text, View, Image, renderToBuffer } from '@react-pdf/renderer'

import type { ClientDossierReportData } from '@/lib/assessments/clientDossier/types'

type Branding = {
  firmName?: string
  fcaNumber?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  footerText?: string
}

const defaultBrand: Required<Branding> = {
  firmName: 'Financial Advisory Services',
  fcaNumber: '',
  logoUrl: '',
  primaryColor: '#0f172a',
  accentColor: '#2563eb',
  footerText: 'Confidential – Prepared for the client'
}

/**
 * Validate that a URL is safe for rendering (https only)
 */
function isValidLogoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('https://')) return false
  try {
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

/**
 * Validate hex color format
 */
function isValidHexColor(color?: string): boolean {
  if (!color || typeof color !== 'string') return false
  return /^#[0-9A-Fa-f]{6}$/.test(color.trim())
}

function formatDate(dateISO?: string): string {
  if (!dateISO) return 'Not provided'
  const d = new Date(dateISO)
  if (Number.isNaN(d.getTime())) return 'Not provided'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return 'Not provided'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(
    amount
  )
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
  if (typeof value === 'string') return valueOrNotProvided(value)
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

function renderWarnings(warnings: string[]): string {
  if (!warnings.length) return ''
  const prioritized = ['Risk:', 'Suitability:', 'Client:']
  const sorted = [...warnings].sort((a, b) => {
    const ai = Math.min(...prioritized.map((p, idx) => (a.startsWith(p) ? idx : 99)))
    const bi = Math.min(...prioritized.map((p, idx) => (b.startsWith(p) ? idx : 99)))
    return ai - bi
  })
  return sorted
    .slice(0, 4)
    .map((w) => w.replace(/^[^:]+:\s*/, ''))
    .join(' • ')
}

const createStyles = (brand: Required<Branding>) => {
  // Validate colors - use defaults if invalid
  const primaryColor = isValidHexColor(brand.primaryColor) ? brand.primaryColor : defaultBrand.primaryColor
  const accentColor = isValidHexColor(brand.accentColor) ? brand.accentColor : defaultBrand.accentColor

  return StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: primaryColor
    },
    header: {
      borderBottom: `2pt solid ${accentColor}`,
      paddingBottom: 12,
      marginBottom: 16
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    },
    firmName: {
      fontSize: 16,
      fontWeight: 'bold'
    },
    firmLogo: {
      maxWidth: 160,
      maxHeight: 50,
      marginBottom: 8,
      objectFit: 'contain' as const
    },
    docTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 6
    },
    subtitle: {
      fontSize: 12,
      color: '#475569',
      marginTop: 4
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 16,
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
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 8
    },
    text: {
      fontSize: 11,
      lineHeight: 1.4
    },
    table: {
      border: '1pt solid #e2e8f0',
      borderRadius: 6,
      overflow: 'hidden'
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: accentColor,
      color: '#ffffff',
      padding: 8
    },
    tableHeaderCell: {
      fontSize: 10,
      fontWeight: 'bold'
    },
    tableRow: {
      flexDirection: 'row',
      borderBottom: '1pt solid #e2e8f0',
      padding: 8
    },
    tableCell: {
      fontSize: 10
    },
    badgeCritical: {
      backgroundColor: '#fee2e2',
      border: '1pt solid #fecaca',
      color: '#991b1b',
      padding: 6,
      borderRadius: 6,
      marginTop: 6
    },
    badgeWarning: {
      backgroundColor: '#fef3c7',
      border: '1pt solid #fde68a',
      color: '#92400e',
      padding: 6,
      borderRadius: 6,
      marginTop: 6
    },
    footer: {
      marginTop: 22,
      paddingTop: 10,
      borderTop: '1pt solid #e2e8f0',
      fontSize: 10,
      color: '#475569'
    }
  })
}

const PageHeader = ({ brand, styles, title }: { brand: Required<Branding>; styles: any; title: string }) => (
  <View style={styles.header}>
    <View style={styles.headerRow}>
      <Text style={styles.firmName}>{brand.firmName}</Text>
      <Text style={styles.subtitle}>{title}</Text>
    </View>
  </View>
)

const PageFooter = ({
  styles,
  brand,
  reportRef
}: {
  styles: any
  brand: Required<Branding>
  reportRef: string
}) => (
  <View style={styles.footer}>
    <Text>
      {brand.footerText} • Ref: {reportRef}
    </Text>
  </View>
)

const CoverPage = ({ data, styles, brand }: { data: ClientDossierReportData; styles: any; brand: Required<Branding> }) => (
  <Page size="A4" style={styles.page}>
    {/* Firm Logo - render only if valid https URL */}
    {isValidLogoUrl(brand.logoUrl) && (
      /* eslint-disable-next-line jsx-a11y/alt-text */
      <Image src={brand.logoUrl} style={styles.firmLogo} />
    )}
    <Text style={styles.firmName}>{brand.firmName}</Text>
    <Text style={styles.docTitle}>Client Assessment Dossier</Text>
    <Text style={styles.subtitle}>Combined assessment export (Suitability, ATR, CFL, Investor Persona)</Text>

    <View style={[styles.card, { marginTop: 22 }]}>
      <View style={styles.grid2}>
        <View style={styles.col}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{data.client.fullName}</Text>
          <Text style={styles.label}>Client reference</Text>
          <Text style={styles.value}>{data.client.clientRef}</Text>
          <Text style={styles.label}>Date of birth</Text>
          <Text style={styles.value}>{valueOrNotProvided(data.client.dateOfBirth)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Prepared by</Text>
          <Text style={styles.value}>{data.adviser.name}</Text>
          <Text style={styles.label}>Firm</Text>
          <Text style={styles.value}>{data.adviser.firmName}</Text>
          <Text style={styles.label}>Report date</Text>
          <Text style={styles.value}>{formatDate(data.metadata.reportDateISO)}</Text>
        </View>
      </View>
    </View>

    {data.warnings.length > 0 && (
      <View style={[styles.badgeWarning, { marginTop: 16 }]}>
        <Text style={styles.text}>
          Data quality notes: {renderWarnings(data.warnings)}
        </Text>
      </View>
    )}

    <PageFooter styles={styles} brand={brand} reportRef={data.metadata.reportRef} />
  </Page>
)

const ClientProfilePage = ({ data, styles, brand }: { data: ClientDossierReportData; styles: any; brand: Required<Branding> }) => (
  <Page size="A4" style={styles.page}>
    <PageHeader brand={brand} styles={styles} title="Client Overview" />

    <Text style={styles.sectionTitle}>Client Profile</Text>
    <View style={styles.card}>
      <View style={styles.grid2}>
        <View style={styles.col}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{data.client.fullName}</Text>
          <Text style={styles.label}>DOB</Text>
          <Text style={styles.value}>{valueOrNotProvided(data.client.dateOfBirth)}</Text>
          <Text style={styles.label}>Client ref</Text>
          <Text style={styles.value}>{data.client.clientRef}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{valueOrNotProvided(data.client.email)}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{valueOrNotProvided(data.client.phone)}</Text>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.text}>{formatAddress(data.client.address)}</Text>
        </View>
      </View>
    </View>

    <Text style={styles.sectionTitle}>Assessment Snapshot</Text>
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assessment</Text>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Completed</Text>
        <Text style={[styles.tableHeaderCell, { flex: 4 }]}>Result</Text>
      </View>
      {(['suitability', 'atr', 'cfl', 'persona'] as const).map((key) => {
        const summary = data.assessments[key]
        return (
          <View key={key} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{key.toUpperCase()}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>{summary?.status || 'Not available'}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>{summary?.completedAt || '—'}</Text>
            <Text style={[styles.tableCell, { flex: 4 }]}>{summary?.keyResult || '—'}</Text>
          </View>
        )
      })}
    </View>

    <PageFooter styles={styles} brand={brand} reportRef={data.metadata.reportRef} />
  </Page>
)

const RiskProfilePage = ({ data, styles, brand }: { data: ClientDossierReportData; styles: any; brand: Required<Branding> }) => (
  <Page size="A4" style={styles.page}>
    <PageHeader brand={brand} styles={styles} title="Risk Profile" />

    <Text style={styles.sectionTitle}>Attitude to Risk (ATR)</Text>
    <View style={styles.card}>
      <Text style={styles.text}>
        Score: {data.reconciledRisk?.atrScore !== undefined ? `${data.reconciledRisk.atrScore}/10` : 'Not assessed'} • Category:{' '}
        {data.reconciledRisk?.atrCategory || 'Not assessed'}
      </Text>
      {data.atr?.assessment_date && (
        <Text style={styles.text}>Assessed: {formatDate(data.atr.assessment_date)}</Text>
      )}
    </View>

    <Text style={styles.sectionTitle}>Capacity for Loss (CFL)</Text>
    <View style={styles.card}>
      <Text style={styles.text}>
        Score: {data.reconciledRisk?.cflScore !== undefined ? `${data.reconciledRisk.cflScore}/10` : 'Not assessed'} • Category:{' '}
        {data.reconciledRisk?.cflCategory || 'Not assessed'}
      </Text>
      {data.cfl?.max_loss_percentage !== undefined && (
        <Text style={styles.text}>Maximum acceptable loss: {data.cfl.max_loss_percentage}%</Text>
      )}
      {data.cfl?.assessment_date && (
        <Text style={styles.text}>Assessed: {formatDate(data.cfl.assessment_date)}</Text>
      )}
    </View>

    <Text style={styles.sectionTitle}>Reconciled Risk Profile</Text>
    <View style={styles.card}>
      <Text style={styles.text}>
        Final score: {data.reconciledRisk?.finalRiskScore !== undefined ? `${data.reconciledRisk.finalRiskScore}/10` : 'Not assessed'} • Category:{' '}
        {data.reconciledRisk?.finalRiskCategory || 'Not assessed'}
      </Text>
      <Text style={styles.text}>Alignment: {data.reconciledRisk?.alignment || 'aligned'}</Text>
      <Text style={[styles.text, { marginTop: 6 }]}>{data.reconciledRisk?.explanation || 'Not available'}</Text>

      {data.reconciledRisk?.flags?.length ? (
        <View style={data.reconciledRisk.flags.some((f) => f.severity === 'critical') ? styles.badgeCritical : styles.badgeWarning}>
          <Text style={styles.text}>
            {data.reconciledRisk.flags
              .slice(0, 4)
              .map((f) => `${f.severity.toUpperCase()}: ${f.message}${f.fcaReference ? ` (${f.fcaReference})` : ''}`)
              .join(' • ')}
          </Text>
        </View>
      ) : null}
    </View>

    <PageFooter styles={styles} brand={brand} reportRef={data.metadata.reportRef} />
  </Page>
)

const InvestorPersonaPage = ({ data, styles, brand }: { data: ClientDossierReportData; styles: any; brand: Required<Branding> }) => (
  <Page size="A4" style={styles.page}>
    <PageHeader brand={brand} styles={styles} title="Investor Persona" />

    <Text style={styles.sectionTitle}>Investor Persona</Text>
    {!data.persona ? (
      <View style={styles.card}>
        <Text style={styles.text}>No current investor persona assessment found.</Text>
      </View>
    ) : (
      <>
        <View style={styles.card}>
          <Text style={styles.label}>Persona Type</Text>
          <Text style={styles.value}>{valueOrNotProvided(data.persona.persona_type)}</Text>
          <Text style={styles.label}>Persona Level</Text>
          <Text style={styles.value}>{valueOrNotProvided(data.persona.persona_level)}</Text>
          <Text style={styles.label}>Confidence</Text>
          <Text style={styles.value}>{Number.isFinite(data.persona.confidence) ? `${data.persona.confidence}%` : 'Not provided'}</Text>
        </View>

        <View style={[styles.grid2, { marginTop: 12 }]}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Motivations</Text>
            <View style={styles.card}>
              {(data.persona.motivations?.length ? data.persona.motivations : ['Not provided']).slice(0, 6).map((m, idx) => (
                <Text key={idx} style={styles.text}>• {m}</Text>
              ))}
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Concerns</Text>
            <View style={styles.card}>
              {(data.persona.fears?.length ? data.persona.fears : ['Not provided']).slice(0, 6).map((m, idx) => (
                <Text key={idx} style={styles.text}>• {m}</Text>
              ))}
            </View>
          </View>
        </View>
      </>
    )}

    <PageFooter styles={styles} brand={brand} reportRef={data.metadata.reportRef} />
  </Page>
)

const SuitabilitySummaryPage = ({ data, styles, brand }: { data: ClientDossierReportData; styles: any; brand: Required<Branding> }) => {
  const report = data.suitability?.report
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader brand={brand} styles={styles} title="Suitability Summary" />

      {!report ? (
        <View style={styles.card}>
          <Text style={styles.text}>No suitability assessment found for this client.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Objectives & Scope</Text>
          <View style={styles.card}>
            <Text style={styles.text}>Scope: {report.scope.selected.length ? report.scope.selected.join(', ') : 'Not provided'}</Text>
            <Text style={styles.text}>Primary objective: {report.objectives.primaryObjective || 'Not provided'}</Text>
            <Text style={styles.text}>Time horizon: {report.objectives.investmentTimeline || 'Not provided'}</Text>
          </View>

          <Text style={styles.sectionTitle}>Recommendation</Text>
          <View style={styles.card}>
            <Text style={styles.text}>Portfolio: {report.recommendation.portfolioName || 'Not provided'}</Text>
            <Text style={styles.text}>
              Investment amount: {formatCurrency(report.client.financialDetails.investmentAmount)}
            </Text>
            <Text style={[styles.text, { marginTop: 6 }]}>
              Rationale: {report.recommendation.rationale || 'Not provided'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Costs & Charges</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              Total first-year cost: {formatCurrency(report.costsCharges.totalFirstYearCost)}
            </Text>
            <Text style={styles.text}>
              Projected 5 years: {formatCurrency(report.costsCharges.projectedCosts5Years)} • 10 years:{' '}
              {formatCurrency(report.costsCharges.projectedCosts10Years)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Disadvantages & Risks</Text>
          <View style={styles.card}>
            <Text style={styles.text}>
              Disadvantages: {report.disadvantagesRisks.disadvantages.length ? report.disadvantagesRisks.disadvantages.slice(0, 3).join(' • ') : 'Not provided'}
            </Text>
            <Text style={styles.text}>
              Risks: {report.disadvantagesRisks.risks.length ? report.disadvantagesRisks.risks.slice(0, 3).join(' • ') : 'Not provided'}
            </Text>
            <Text style={styles.text}>
              Mitigations: {report.disadvantagesRisks.mitigations.length ? report.disadvantagesRisks.mitigations.slice(0, 3).join(' • ') : 'Not provided'}
            </Text>
          </View>
        </>
      )}

      <PageFooter styles={styles} brand={brand} reportRef={data.metadata.reportRef} />
    </Page>
  )
}

export const ClientDossierReportDocument = ({
  data,
  branding
}: {
  data: ClientDossierReportData
  branding?: Branding
}) => {
  const brand = { ...defaultBrand, ...(branding || {}) }
  const styles = createStyles(brand)

  return (
    <Document>
      <CoverPage data={data} styles={styles} brand={brand} />
      <ClientProfilePage data={data} styles={styles} brand={brand} />
      <RiskProfilePage data={data} styles={styles} brand={brand} />
      <InvestorPersonaPage data={data} styles={styles} brand={brand} />
      <SuitabilitySummaryPage data={data} styles={styles} brand={brand} />
    </Document>
  )
}

export async function generateClientDossierReportPDF(
  data: ClientDossierReportData,
  branding?: Branding
): Promise<Buffer> {
  const buffer = await renderToBuffer(<ClientDossierReportDocument data={data} branding={branding} />)
  return buffer as Buffer
}

export default ClientDossierReportDocument
