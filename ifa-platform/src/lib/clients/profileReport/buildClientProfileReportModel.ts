import type { DbRow } from '@/types/db'
import type { ClientProfileReportData } from './types'
import { calculateReconciledRisk } from '@/lib/assessments/riskReconciliation'

type ClientRow = DbRow<'clients'>

function safeFileToken(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'client'
  return trimmed.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function formatAddress(address: unknown): string | undefined {
  if (!address) return undefined
  if (typeof address === 'string') {
    const trimmed = address.trim()
    if (!trimmed) return undefined
    if (trimmed.toLowerCase() === '[object object]') return undefined
    try {
      const maybeObject = JSON.parse(trimmed)
      return formatAddress(maybeObject)
    } catch {
      return trimmed
    }
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

function buildReportRef(clientRef?: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CP-${safeFileToken(clientRef || 'CLIENT')}-${datePart}-${random}`
}

function asFiniteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clampTenPoint(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score)))
}

// ATR currently stores a 1–5 risk_level (from the standalone ATR assessment UI).
// Normalize to a 1–10 scale for cross-assessment reporting (risk reconciliation, PDFs, dashboards).
function normalizeAtrScore(riskLevel: unknown): number | undefined {
  const raw = asFiniteNumber(riskLevel)
  if (raw === undefined) return undefined
  if (raw <= 5) return clampTenPoint(raw * 2)
  return clampTenPoint(raw)
}

function normalizeCflScore(capacityLevel: unknown): number | undefined {
  const raw = asFiniteNumber(capacityLevel)
  if (raw === undefined) return undefined
  return clampTenPoint(raw)
}

export function buildClientProfileReportModel(params: {
  client: ClientRow
  reportContext: {
    firmName: string
    advisorName?: string
  }
  reportDateISO?: string
  suitability?: DbRow<'suitability_assessments'> | null
  atr?: DbRow<'atr_assessments'> | null
  cfl?: DbRow<'cfl_assessments'> | null
  persona?: DbRow<'persona_assessments'> | null
}): ClientProfileReportData {
  const reportDateISO = params.reportDateISO || new Date().toISOString()

  const personalDetails = (params.client.personal_details as any) || {}
  const contactInfo = (params.client.contact_info as any) || {}
  const financialProfile = ((params.client as any).financial_profile as any) || {}
  const riskProfile = ((params.client as any).risk_profile as any) || {}
  const assessmentSummary = ((params.client as any).assessment_summary as any) || {}

  const title = String(personalDetails.title || '').trim()
  const firstName = String(personalDetails.firstName || personalDetails.first_name || '').trim()
  const lastName = String(personalDetails.lastName || personalDetails.last_name || '').trim()
  const fullName =
    `${title} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim() ||
    String(params.client.client_ref || params.client.id)

  const clientRef = String(params.client.client_ref || '').trim() || undefined

  const atrScore = normalizeAtrScore(params.atr?.risk_level) ?? null
  const atrCategory = params.atr?.risk_category ?? null

  const cflScore = normalizeCflScore(params.cfl?.capacity_level) ?? null
  const cflCategory = params.cfl?.capacity_category ?? null

  const reconciled = calculateReconciledRisk({
    atrScore: typeof atrScore === 'number' ? atrScore : undefined,
    atrCategory: atrCategory ?? undefined,
    cflScore: typeof cflScore === 'number' ? cflScore : undefined,
    cflCategory: cflCategory ?? undefined
  })

  return {
    client: {
      id: String(params.client.id),
      clientRef,
      fullName,
      dateOfBirth: String(personalDetails.dateOfBirth || personalDetails.date_of_birth || '').trim() || undefined,
      email: String(contactInfo.email || '').trim() || undefined,
      phone: String(contactInfo.phone || contactInfo.mobile || '').trim() || undefined,
      address: formatAddress(contactInfo.address),
      personalDetails,
      contactInfo,
      financialProfile,
      vulnerabilityAssessment: (params.client.vulnerability_assessment as any) || undefined,
      riskProfile: riskProfile && typeof riskProfile === 'object' ? riskProfile : undefined,
      assessmentSummary: assessmentSummary && typeof assessmentSummary === 'object' ? assessmentSummary : undefined,
      status: String(params.client.status || '').trim() || undefined,
      createdAt: params.client.created_at || undefined,
      updatedAt: params.client.updated_at || undefined,
      nextReviewDate: params.client.next_review_date || undefined,
      notes: String((params.client as any).notes || '').trim() || undefined,
      rawClient: (params.client as any) && typeof params.client === 'object' ? (params.client as any) : undefined
    },
    assessments: {
      suitability: params.suitability
        ? {
            status: params.suitability.status,
            completion:
              typeof (params.suitability as any).completion_percentage === 'number'
                ? (params.suitability as any).completion_percentage
                : null,
            version: params.suitability.version_number,
            updatedAt: params.suitability.updated_at || params.suitability.completed_at || null
          }
        : undefined,
      atr: params.atr
        ? {
            category: params.atr.risk_category,
            // Prefer the normalized ten-point score for reporting consistency.
            score: normalizeAtrScore(params.atr.risk_level) ?? null,
            date: params.atr.assessment_date,
            version: params.atr.version
          }
        : undefined,
      cfl: params.cfl
        ? {
            category: params.cfl.capacity_category,
            // Prefer the ten-point capacity level (total_score is 0–100).
            score: normalizeCflScore(params.cfl.capacity_level) ?? null,
            date: params.cfl.assessment_date,
            version: params.cfl.version
          }
        : undefined,
      persona: params.persona
        ? {
            type: params.persona.persona_type,
            level: params.persona.persona_level,
            confidence: (params.persona as any).confidence ?? null,
            date: params.persona.assessment_date,
            version: (params.persona as any).version ?? null
          }
        : undefined
    },
    risk: {
      atrScore: typeof atrScore === 'number' && Number.isFinite(atrScore) ? atrScore : null,
      atrCategory,
      cflScore: typeof cflScore === 'number' && Number.isFinite(cflScore) ? cflScore : null,
      cflCategory,
      reconciled: {
        finalRiskScore: reconciled.finalRiskScore ?? null,
        finalRiskCategory: reconciled.finalRiskCategory ?? null,
        alignment: reconciled.alignment ?? null,
        flags: reconciled.flags?.map((f) => ({ severity: f.severity, message: f.message })) ?? []
      }
    },
    report: {
      firmName: params.reportContext.firmName,
      advisorName: params.reportContext.advisorName,
      reportDateISO,
      reportRef: buildReportRef(clientRef)
    }
  }
}
