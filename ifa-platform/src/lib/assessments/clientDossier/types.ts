import type { DbRow } from '@/types/db'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import type { RiskReconciliationResult } from '@/lib/assessments/riskReconciliation'

export type ClientRow = DbRow<'clients'>
export type SuitabilityRow = DbRow<'suitability_assessments'>
export type AtrRow = DbRow<'atr_assessments'>
export type CflRow = DbRow<'cfl_assessments'>
export type PersonaRow = DbRow<'persona_assessments'>

export interface ClientDossierAssessmentSummary {
  id: string
  status?: string
  completedAt?: string
  version?: number
  keyResult?: string
}

export interface ClientDossierReportData {
  metadata: {
    reportDateISO: string
    reportRef: string
  }
  adviser: {
    name: string
    title?: string
    qualifications?: string
    firmName: string
    firmFcaNumber?: string
  }
  client: {
    id: string
    clientRef: string
    fullName: string
    dateOfBirth?: string
    email?: string
    phone?: string
    address?: string
  }
  assessments: {
    suitability?: ClientDossierAssessmentSummary
    atr?: ClientDossierAssessmentSummary
    cfl?: ClientDossierAssessmentSummary
    persona?: ClientDossierAssessmentSummary
  }
  reconciledRisk?: RiskReconciliationResult
  suitability?: {
    report: SuitabilityReportData
  }
  atr?: AtrRow | null
  cfl?: CflRow | null
  persona?: PersonaRow | null
  warnings: string[]
}
