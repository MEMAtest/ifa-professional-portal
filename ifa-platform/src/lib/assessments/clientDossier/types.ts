import type { Database } from '@/types/database.types'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import type { RiskReconciliationResult } from '@/lib/assessments/riskReconciliation'

export type ClientRow = Database['public']['Tables']['clients']['Row']
export type SuitabilityRow = Database['public']['Tables']['suitability_assessments']['Row']
export type AtrRow = Database['public']['Tables']['atr_assessments']['Row']
export type CflRow = Database['public']['Tables']['cfl_assessments']['Row']
export type PersonaRow = Database['public']['Tables']['persona_assessments']['Row']

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

