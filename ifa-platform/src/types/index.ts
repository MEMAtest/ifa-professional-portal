// src/types/index.ts
export interface ClientProfile {
  id: string;
  clientRef: string;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  occupation: string;
  maritalStatus: string;
  dependents: number;
  address: {
    street: string;
    city: string;
    postcode: string;
    country: string;
  };
  contactDetails: {
    phone: string;
    email: string;
    preferredContact: 'phone' | 'email' | 'post';
  };
  createdAt: string;
  updatedAt: string;
}

export interface FinancialProfile {
  investmentAmount: number;
  timeHorizon: number;
  primaryObjective: string;
  secondaryObjectives: string[];
  incomeRequirement: number;
  emergencyFund: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenditure: number;
  disposableIncome: number;
  pensionValue: number;
  propertyValue: number;
}

export interface RiskProfile {
  attitudeToRisk: number;
  capacityForLoss: number;
  maxAcceptableLoss: number;
  emergencyMonths: number;
  finalRiskProfile: number;
  riskReconciliation: string;
  volatilityTolerance: number;
  expectedReturn: number;
}

export interface VulnerabilityAssessment {
  is_vulnerable: boolean;
  vulnerabilityTypes: VulnerabilityType[];
  healthVulnerabilities: string;
  lifeEventVulnerabilities: string;
  resilienceVulnerabilities: string;
  capabilityVulnerabilities: string;
  adaptationsMade: string;
  supportRequired: string;
  reviewFrequency: 'standard' | 'enhanced' | 'frequent';
}

export type VulnerabilityType = 'health' | 'life_events' | 'resilience' | 'capability' | 'none';

export interface KnowledgeExperience {
  investmentKnowledge: 'basic' | 'good' | 'advanced' | 'expert';
  investmentExperience: number;
  productKnowledge: {
    shares: boolean;
    bonds: boolean;
    funds: boolean;
    derivatives: boolean;
    alternatives: boolean;
  };
  advisorReliance: 'low' | 'medium' | 'high';
  educationRequired: boolean;
  notes: string;
}

export interface SuitabilityAssessment {
  meetsObjectives: boolean;
  objectivesExplanation: string;
  suitableForRisk: boolean;
  riskExplanation: string;
  affordabilityConfirmed: boolean;
  affordabilityNotes: string;
  recommendationSuitable: boolean;
  suitabilityScore: number;
  complianceFlags: string[];
  consumerDutyOutcomes: ConsumerDutyOutcome[];
}

export interface ConsumerDutyOutcome {
  outcome: 'products_services' | 'price_value' | 'understanding' | 'support';
  status: 'met' | 'partially_met' | 'not_met';
  evidence: string;
  actions: string[];
}

export interface Assessment {
  id: string;
  clientId?: string
  formId: string;
  clientProfile: ClientProfile;
  financialProfile: FinancialProfile;
  riskProfile: RiskProfile;
  vulnerabilityAssessment: VulnerabilityAssessment;
  knowledgeExperience: KnowledgeExperience;
  suitabilityAssessment: SuitabilityAssessment;
  status: string  // Change from union type to string
  completionPercentage: number;
  adviceType: 'initial' | 'ongoing' | 'review' | 'pension_transfer' | 'protection';
  adviserId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  validationErrors: string[];
}

export interface AssessmentState {
  currentStep: number;
  steps: AssessmentStep[];
  assessment: Assessment;
  isDirty: boolean;
  isSubmitting: boolean;
  autoSaveEnabled: boolean;
  lastSaved?: string;
}