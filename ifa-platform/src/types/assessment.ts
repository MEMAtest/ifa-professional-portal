// ================================================================
// src/types/assessment.ts - FIXED
// This version adds the required 'export' keyword to all types.
// ================================================================

// This creates a separate assessment namespace to avoid conflicts
export interface ATRQuestion {
  id: string
  text: string
  options: string[]
  scores: number[]
  category: 'attitude' | 'experience' | 'knowledge' | 'emotional'
  weight: number
}

export interface CFLQuestion {
  id: string
  text: string
  options: string[]
  category: 'financial' | 'timeframe' | 'objectives' | 'circumstances'
  explanation: string
}

export interface ATRAnswers {
  [questionId: string]: number
}

export interface CFLAnswers {
  [questionId: string]: string
}

// FIX: Added 'export' so this type can be imported by other files.
export interface RiskMetrics {
  atrScore: number
  atrCategory: string
  behavioralBias: 'conservative' | 'neutral' | 'aggressive'
  finalRiskProfile: number
  confidenceLevel: number
}

export interface ClientAssessmentData {
  name: string
  email: string
  phone: string
  age: number
  occupation: string
  annualIncome: number
  investmentAmount: number
  investmentExperience: string
  timeHorizon: string
  objectives: string[]
}

export interface InvestorPersonaType {
  type: string
  avatar: string
  description: string
  motivations: string[]
  fears: string[]
  communicationStyle: string
  suitableStrategies: string[]
  warningTriggers: string[]
  emotionalDrivers: {
    primary: string
    secondary: string
    deepFear: string
  }
  psychologicalProfile: {
    decisionMaking: string
    stressResponse: string
    trustBuilding: string
    confidence: string
  }
  emotionalTriggers: {
    positive: string[]
    negative: string[]
  }
  communicationNeeds: {
    frequency: string
    style: string
    format: string
    meetingPreference: string
  }
  consumerDutyAlignment: {
    products: string
    value: string
    outcome: string
    support: string
  }
  behavioralTraits: string[]
  monitoringNeeds: string
}

// FIX: Added 'export' to the main assessment result type.
export interface AssessmentResult {
  id?: string
  clientData: ClientAssessmentData
  atrAnswers: ATRAnswers
  cflAnswers: CFLAnswers
  riskMetrics: RiskMetrics
  persona?: InvestorPersonaType
  createdAt: string
  updatedAt: string
  // FIX: Added clientId to link back to the main client record.
  clientId?: string;
}