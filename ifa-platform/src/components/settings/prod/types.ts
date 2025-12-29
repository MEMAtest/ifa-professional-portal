export interface ProdDetails {
  governanceOwner: string
  governanceOwnerOther: string
  oversightBody: string
  oversightBodyOther: string
  reviewFrequency: string
  reviewFrequencyOther: string
  targetMarketDefinition: string
  targetMarketDefinitionOther: string
  distributionChannels: string[]
  distributionOther: string
  fairValueAssessment: string
  fairValueAssessmentOther: string
  monitoringCadence: string
  monitoringCadenceOther: string
  escalationProcess: string
  escalationProcessOther: string
  vulnerabilityApproach: string
  vulnerabilityApproachOther: string
  additionalNotes: string
}

export interface ProdVersion {
  id: string
  version: number
  saved_at: string
  summary: string
  details: ProdDetails
  services: Array<{
    id: string
    name: string
    description: string
    targetMarketChecks: string[]
    prodNotes: string
    active: boolean
  }>
  saved_by?: string | null
}

export interface ProdReviewTask {
  due_date: string
  status: string
  created_at: string
  updated_at: string
  version: number
}

export interface FirmService {
  id: string
  name: string
  description: string
  targetMarketChecks: string[]
  prodNotes: string
  active: boolean
}

export interface FirmServicesState {
  prodPolicy: string
  services: FirmService[]
}

export type ServicesSaveStatus = {
  state: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}

export interface LatestProdDocument {
  id?: string | null
  name: string
  path: string
  version?: number
  savedAt?: string
}
