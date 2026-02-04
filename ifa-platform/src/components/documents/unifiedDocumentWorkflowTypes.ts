export interface PersonalDetails {
  title?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  occupation?: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  address?: {
    line1?: string
    city?: string
    postcode?: string
  }
}

export interface FinancialProfile {
  netWorth?: number
  annualIncome?: number
  investmentAmount?: number
}

export interface RiskProfile {
  riskTolerance?: string
  attitudeToRisk?: number
}

export interface RealClient {
  id: string
  client_ref: string
  personal_details: PersonalDetails
  contact_info: ContactInfo
  financial_profile: FinancialProfile
  risk_profile: RiskProfile
  status: string
  created_at: string
}

export interface DocumentTemplate {
  id: string
  name: string
  description?: string | null
  template_content?: string | null
  requires_signature?: boolean
  template_variables?: Record<string, string> | null
  is_active?: boolean
}

export interface GeneratedDocument {
  id: string
  name: string
  file_path: string
  url: string
  content: string
}

export type WorkflowStep = 'select-client' | 'select-template' | 'preview-document' | 'confirm-send'
