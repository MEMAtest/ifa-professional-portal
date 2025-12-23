import type { ReportContext } from '@/services/AdvisorContextService'
import { calculateReconciledRisk } from '@/lib/assessments/riskReconciliation'
import { mapSuitabilityAssessmentRowToFormData } from '@/lib/suitability/mappers'
import { buildSuitabilityReportModel } from '@/lib/suitability/reporting/buildSuitabilityReportModel'
import type { PulledPlatformData } from '@/types/suitability'
import type {
  AtrRow,
  CflRow,
  ClientDossierAssessmentSummary,
  ClientDossierReportData,
  ClientRow,
  PersonaRow,
  SuitabilityRow
} from './types'

type JsonObject = Record<string, any>

function asObject(value: unknown): JsonObject {
  if (!value) return {}
  if (typeof value === 'object') return value as JsonObject
  return {}
}

function pickFirstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (v === null || v === undefined) continue
    if (typeof v === 'object') continue
    const s = typeof v === 'string' ? v : String(v)
    const t = s.trim()
    if (t) return t
  }
  return undefined
}

function formatDateISO(dateISO?: string | null): string | undefined {
  if (!dateISO) return undefined
  const d = new Date(dateISO)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

function formatAddress(address: unknown): string | undefined {
  if (!address) return undefined
  if (typeof address === 'string') {
    const raw = address.trim()
    if (!raw) return undefined
    if (raw.toLowerCase() === '[object object]') return undefined
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        return formatAddress(JSON.parse(raw))
      } catch {
        return raw
      }
    }
    return raw
  }
  if (typeof address !== 'object') return String(address)
  const a = address as any
  const candidate = a.address ?? a.value ?? a.location ?? a.formatted ?? a.formattedAddress
  if (candidate && candidate !== address) return formatAddress(candidate)

  const parts = [
    a.line1 ?? a.addressLine1,
    a.line2 ?? a.addressLine2,
    a.line3 ?? a.addressLine3,
    a.city ?? a.town,
    a.county ?? a.state,
    a.postcode ?? a.zip ?? a.postalCode,
    a.country
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
  return parts.join(', ') || undefined
}

function buildRef(clientRef: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CD-${clientRef || 'CLIENT'}-${datePart}-${random}`
}

function summarizeAssessment(input: {
  id: string
  status?: string | null
  completedAt?: string | null
  version?: number | null
  keyResult?: string | null
}): ClientDossierAssessmentSummary {
  return {
    id: input.id,
    status: input.status || undefined,
    completedAt: formatDateISO(input.completedAt) || undefined,
    version: typeof input.version === 'number' ? input.version : undefined,
    keyResult: input.keyResult || undefined
  }
}

function asFiniteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clampTenPoint(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score)))
}

function normalizeAtrScore(riskLevel: unknown): number | undefined {
  const raw = asFiniteNumber(riskLevel)
  if (raw === undefined) return undefined

  // ATR assessment UI currently yields a 1–5 risk level; normalize to 1–10.
  // If newer records already store >5, treat as ten-point.
  if (raw <= 5) return clampTenPoint(raw * 2)
  return clampTenPoint(raw)
}

function normalizeCflScore(capacityLevel: unknown): number | undefined {
  const raw = asFiniteNumber(capacityLevel)
  if (raw === undefined) return undefined
  return clampTenPoint(raw)
}

function scoreToCategory(score: unknown): string | undefined {
  const parsed = asFiniteNumber(score)
  if (parsed === undefined) return undefined
  if (parsed <= 2) return 'Very Low'
  if (parsed <= 3) return 'Low'
  if (parsed <= 4) return 'Low-Medium'
  if (parsed <= 6) return 'Medium'
  if (parsed <= 7) return 'Medium-High'
  if (parsed <= 8) return 'High'
  return 'Very High'
}

function scoreToFiveLevelCategory(score: number | undefined): string | undefined {
  if (score === undefined || score === null || !Number.isFinite(score)) return undefined
  if (score <= 2) return 'Very Low'
  if (score <= 4) return 'Low'
  if (score <= 6) return 'Medium'
  if (score <= 8) return 'High'
  return 'Very High'
}

function normalizeCategory(value?: string | null): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function buildClientDossierReportModel(params: {
  client: ClientRow
  suitability?: SuitabilityRow | null
  atr?: AtrRow | null
  cfl?: CflRow | null
  persona?: PersonaRow | null
  reportContext: ReportContext
  reportDateISO?: string
}): ClientDossierReportData {
  const reportDateISO = params.reportDateISO || new Date().toISOString()
  const personal = asObject(params.client.personal_details)
  const contact = asObject(params.client.contact_info)

  const firstName = pickFirstString(personal.firstName, personal.first_name)
  const lastName = pickFirstString(personal.lastName, personal.last_name)
  const title = pickFirstString(personal.title)
  const fullName =
    `${title || ''} ${firstName || ''} ${lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Client'

  const clientRef = pickFirstString(params.client.client_ref) || params.client.id

  const warnings: string[] = []

  const addWarning = (area: 'Client' | 'Risk' | 'Suitability', message: string) => {
    if (!message) return
    warnings.push(`${area}: ${message}`)
  }

  const atrScore = normalizeAtrScore(params.atr?.risk_level)
  const cflScore = normalizeCflScore(params.cfl?.capacity_level)

  const derivedAtrCategory = params.atr?.risk_category || scoreToCategory(atrScore) || undefined
  const derivedCflCategory = params.cfl?.capacity_category || scoreToCategory(cflScore) || undefined

  if (atrScore !== undefined && params.atr?.risk_category) {
    const expected = normalizeCategory(scoreToFiveLevelCategory(atrScore))
    const actual = normalizeCategory(params.atr.risk_category)
    if (expected && actual && expected !== actual) {
      addWarning('Risk', `ATR category "${params.atr.risk_category}" does not match score (${atrScore}/10).`)
    }
  }

  if (cflScore !== undefined && params.cfl?.capacity_category) {
    const expected = normalizeCategory(scoreToFiveLevelCategory(cflScore))
    const actual = normalizeCategory(params.cfl.capacity_category)
    if (expected && actual && expected !== actual) {
      addWarning(
        'Risk',
        `CFL category "${params.cfl.capacity_category}" does not match score (${cflScore}/10).`
      )
    }
  }

  const dossier: ClientDossierReportData = {
    metadata: {
      reportDateISO: reportDateISO.slice(0, 10),
      reportRef: buildRef(clientRef)
    },
    adviser: {
      name: params.reportContext.advisorName,
      title: params.reportContext.advisorTitle || undefined,
      qualifications: params.reportContext.advisorQualifications || undefined,
      firmName: params.reportContext.firmName,
      firmFcaNumber: params.reportContext.firmFcaNumber || undefined
    },
    client: {
      id: params.client.id,
      clientRef,
      fullName,
      dateOfBirth: pickFirstString(personal.dateOfBirth, personal.date_of_birth),
      email: pickFirstString(contact.email),
      phone: pickFirstString(contact.phone, contact.mobile),
      address: formatAddress(contact.address)
    },
    assessments: {},
    reconciledRisk: undefined,
    suitability: undefined,
    atr: params.atr ?? null,
    cfl: params.cfl ?? null,
    persona: params.persona ?? null,
    warnings
  }

  if (params.atr) {
    dossier.assessments.atr = summarizeAssessment({
      id: params.atr.id,
      status: 'completed',
      completedAt: params.atr.assessment_date ?? params.atr.created_at,
      version: params.atr.version ?? undefined,
      keyResult: `${derivedAtrCategory || 'Not assessed'} (${atrScore ?? '—'}/10)`
    })
  }

  if (params.cfl) {
    dossier.assessments.cfl = summarizeAssessment({
      id: params.cfl.id,
      status: 'completed',
      completedAt: params.cfl.assessment_date ?? params.cfl.created_at,
      version: params.cfl.version ?? undefined,
      keyResult: `${derivedCflCategory || 'Not assessed'} (${cflScore ?? params.cfl.capacity_level}/10)`
    })
  }

  if (params.persona) {
    dossier.assessments.persona = summarizeAssessment({
      id: params.persona.id,
      status: 'completed',
      completedAt: params.persona.assessment_date ?? params.persona.created_at,
      version: params.persona.version ?? undefined,
      keyResult: `${params.persona.persona_type} (${params.persona.persona_level})`
    })
  }

  if (params.suitability) {
    dossier.assessments.suitability = summarizeAssessment({
      id: params.suitability.id,
      status: params.suitability.status,
      completedAt: params.suitability.completed_at ?? params.suitability.updated_at,
      version: params.suitability.version_number,
      keyResult:
        typeof params.suitability.completion_percentage === 'number'
          ? `${Math.round(params.suitability.completion_percentage)}%`
          : params.suitability.status || undefined
    })

    const pulled: PulledPlatformData = {
      atrScore,
      atrCategory: derivedAtrCategory,
      cflScore,
      cflCategory: derivedCflCategory,
      lastAssessmentDates: {
        atr: params.atr?.assessment_date ?? params.atr?.created_at ?? undefined,
        cfl: params.cfl?.assessment_date ?? params.cfl?.created_at ?? undefined
      }
    }

    const formData = mapSuitabilityAssessmentRowToFormData(params.suitability as any)
    const suitabilityReport = buildSuitabilityReportModel({
      client: params.client as any,
      formData,
      reportContext: params.reportContext,
      reportDateISO,
      version: params.suitability.version_number ? String(params.suitability.version_number) : undefined,
      mode: 'draft',
      pulledDataOverride: pulled
    })

    dossier.suitability = { report: suitabilityReport }

    // If the suitability model has warnings/missing, surface them in the dossier warnings list.
    const warnings = suitabilityReport.dataQuality.warnings || []
    if (warnings.length) dossier.warnings.push(...warnings.slice(0, 8).map((w) => `Suitability: ${w}`))
  }

  dossier.reconciledRisk = calculateReconciledRisk({
    atrScore,
    atrCategory: derivedAtrCategory,
    cflScore,
    cflCategory: derivedCflCategory
  })

  if (dossier.reconciledRisk.flags.length) {
    dossier.warnings.push(...dossier.reconciledRisk.flags.map((f) => `Risk: ${f.message}`).slice(0, 4))
  }

  return dossier
}
