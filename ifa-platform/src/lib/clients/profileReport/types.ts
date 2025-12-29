import type { DbRow } from '@/types/db'

export type ClientRow = DbRow<'clients'>

export type ClientProfileReportData = {
  client: {
    id: string
    clientRef?: string
    fullName: string
    dateOfBirth?: string
    email?: string
    phone?: string
    address?: string
    status?: string
    createdAt?: string
    updatedAt?: string
    nextReviewDate?: string
    personalDetails?: Record<string, unknown>
    contactInfo?: Record<string, unknown>
    financialProfile?: Record<string, unknown>
    vulnerabilityAssessment?: Record<string, unknown>
    riskProfile?: Record<string, unknown>
    assessmentSummary?: Record<string, unknown>
    notes?: string
    rawClient?: Record<string, unknown>
  }
  assessments: {
    suitability?: { status?: string | null; completion?: number | null; version?: number | null; updatedAt?: string | null }
    atr?: { category?: string | null; score?: number | null; date?: string | null; version?: number | null }
    cfl?: { category?: string | null; score?: number | null; date?: string | null; version?: number | null }
    persona?: { type?: string | null; level?: string | null; confidence?: number | null; date?: string | null; version?: number | null }
  }
  risk: {
    atrScore?: number | null
    atrCategory?: string | null
    cflScore?: number | null
    cflCategory?: string | null
    reconciled?: {
      finalRiskScore?: number | null
      finalRiskCategory?: string | null
      alignment?: string | null
      flags?: { severity: 'warning' | 'critical'; message: string }[]
    }
  }
  report: {
    firmName: string
    advisorName?: string
    reportDateISO: string
    reportRef: string
  }
}
