// src/data/mockAssessments.ts - Realistic test data for assessments
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
  hasVulnerabilities: boolean;
  vulnerabilityTypes: string[];
  healthVulnerabilities: string;
  lifeEventVulnerabilities: string;
  resilienceVulnerabilities: string;
  capabilityVulnerabilities: string;
  adaptationsMade: string;
  supportRequired: string;
  reviewFrequency: 'standard' | 'enhanced' | 'frequent';
}

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
  formId: string;
  clientProfile: ClientProfile;
  financialProfile: FinancialProfile;
  riskProfile: RiskProfile;
  vulnerabilityAssessment: VulnerabilityAssessment;
  knowledgeExperience: KnowledgeExperience;
  suitabilityAssessment: SuitabilityAssessment;
  status: 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'archived';
  completionPercentage: number;
  adviceType: 'initial' | 'ongoing' | 'review' | 'pension_transfer' | 'protection';
  adviserId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 'assessment_001',
    formId: 'IFA-175693946408-7211',
    clientProfile: {
      id: 'client_001',
      clientRef: 'C250626917',
      title: 'Mr',
      firstName: 'Geoffrey',
      lastName: 'Clarkson',
      dateOfBirth: '1958-03-15',
      age: 66,
      occupation: 'Retired Engineer',
      maritalStatus: 'Married',
      dependents: 0,
      address: {
        street: '42 Meadowlands Drive',
        city: 'Stockton-on-Tees',
        postcode: 'TS18 3QJ',
        country: 'UK'
      },
      contactDetails: {
        phone: '01642 555123',
        email: 'g.clarkson@email.com',
        preferredContact: 'email'
      },
      createdAt: '2024-06-26T09:15:00Z',
      updatedAt: '2024-06-26T14:30:00Z'
    },
    financialProfile: {
      investmentAmount: 150000,
      timeHorizon: 7,
      primaryObjective: 'Generate supplementary retirement income while preserving capital for inheritance',
      secondaryObjectives: ['Inflation protection', 'Tax efficiency'],
      incomeRequirement: 8000,
      emergencyFund: 35000,
      totalAssets: 650000,
      totalLiabilities: 85000,
      netWorth: 565000,
      monthlyIncome: 3200,
      monthlyExpenditure: 2800,
      disposableIncome: 400,
      pensionValue: 280000,
      propertyValue: 320000
    },
    riskProfile: {
      attitudeToRisk: 4,
      capacityForLoss: 3,
      maxAcceptableLoss: 15,
      emergencyMonths: 12,
      finalRiskProfile: 3,
      riskReconciliation: 'Conservative approach taken due to age and retirement status',
      volatilityTolerance: 9,
      expectedReturn: 5.5
    },
    vulnerabilityAssessment: {
      hasVulnerabilities: false,
      vulnerabilityTypes: ['none'],
      healthVulnerabilities: '',
      lifeEventVulnerabilities: '',
      resilienceVulnerabilities: '',
      capabilityVulnerabilities: '',
      adaptationsMade: '',
      supportRequired: '',
      reviewFrequency: 'standard'
    },
    knowledgeExperience: {
      investmentKnowledge: 'good',
      investmentExperience: 15,
      productKnowledge: {
        shares: true,
        bonds: true,
        funds: true,
        derivatives: false,
        alternatives: false
      },
      advisorReliance: 'medium',
      educationRequired: false,
      notes: 'Previous experience with ISAs and basic pension planning'
    },
    suitabilityAssessment: {
      meetsObjectives: true,
      objectivesExplanation: 'Balanced portfolio approach suitable for retirement income needs',
      suitableForRisk: true,
      riskExplanation: 'Risk level 3 appropriate for client circumstances',
      affordabilityConfirmed: true,
      affordabilityNotes: 'Investment represents 26% of net worth - appropriate level',
      recommendationSuitable: true,
      suitabilityScore: 85,
      complianceFlags: [],
      consumerDutyOutcomes: [
        {
          outcome: 'products_services',
          status: 'met',
          evidence: 'Suitable investment strategy for retirement planning',
          actions: []
        }
      ]
    },
    status: 'completed',
    completionPercentage: 100,
    adviceType: 'review',
    adviserId: 'adviser_001',
    createdAt: '2024-06-26T09:15:00Z',
    updatedAt: '2024-06-26T14:30:00Z',
    submittedAt: '2024-06-26T14:30:00Z'
  },
  {
    id: 'assessment_002',
    formId: 'IFA-174863749597-2680',
    clientProfile: {
      id: 'client_002',
      clientRef: 'C250625166',
      title: 'Mr',
      firstName: 'Eddie',
      lastName: 'Sauna',
      dateOfBirth: '1982-11-08',
      age: 42,
      occupation: 'Business Consultant',
      maritalStatus: 'Single',
      dependents: 1,
      address: {
        street: '17 Victoria Gardens',
        city: 'Middlesbrough',
        postcode: 'TS1 2LK',
        country: 'UK'
      },
      contactDetails: {
        phone: '01642 555987',
        email: 'eddie.sauna@consulting.com',
        preferredContact: 'phone'
      },
      createdAt: '2024-06-25T11:20:00Z',
      updatedAt: '2024-06-25T16:45:00Z'
    },
    financialProfile: {
      investmentAmount: 75000,
      timeHorizon: 15,
      primaryObjective: 'Long-term wealth accumulation for child\'s education and early retirement',
      secondaryObjectives: ['Growth investment', 'Diversification'],
      incomeRequirement: 0,
      emergencyFund: 18000,
      totalAssets: 245000,
      totalLiabilities: 15000,
      netWorth: 230000,
      monthlyIncome: 5800,
      monthlyExpenditure: 3200,
      disposableIncome: 2600,
      pensionValue: 85000,
      propertyValue: 140000
    },
    riskProfile: {
      attitudeToRisk: 6,
      capacityForLoss: 5,
      maxAcceptableLoss: 25,
      emergencyMonths: 6,
      finalRiskProfile: 5,
      riskReconciliation: 'Good capacity supports growth-oriented approach',
      volatilityTolerance: 15,
      expectedReturn: 7.5
    },
    vulnerabilityAssessment: {
      hasVulnerabilities: true,
      vulnerabilityTypes: ['life_events'],
      healthVulnerabilities: '',
      lifeEventVulnerabilities: 'Recent divorce proceedings ongoing',
      resilienceVulnerabilities: '',
      capabilityVulnerabilities: '',
      adaptationsMade: 'Extended decision period provided, additional documentation review',
      supportRequired: 'Regular check-ins during transition period',
      reviewFrequency: 'enhanced'
    },
    knowledgeExperience: {
      investmentKnowledge: 'advanced',
      investmentExperience: 8,
      productKnowledge: {
        shares: true,
        bonds: true,
        funds: true,
        derivatives: true,
        alternatives: true
      },
      advisorReliance: 'low',
      educationRequired: false,
      notes: 'Self-directed investor with good market understanding'
    },
    suitabilityAssessment: {
      meetsObjectives: true,
      objectivesExplanation: 'Growth strategy aligns with long-term objectives',
      suitableForRisk: true,
      riskExplanation: 'Risk level 5 appropriate for age and time horizon',
      affordabilityConfirmed: true,
      affordabilityNotes: 'Investment represents 33% of net worth - acceptable for growth strategy',
      recommendationSuitable: true,
      suitabilityScore: 78,
      complianceFlags: ['VULNERABLE_CLIENT'],
      consumerDutyOutcomes: [
        {
          outcome: 'support',
          status: 'partially_met',
          evidence: 'Enhanced support during vulnerable period',
          actions: ['Regular progress reviews', 'Simplified communication']
        }
      ]
    },
    status: 'completed',
    completionPercentage: 100,
    adviceType: 'initial',
    adviserId: 'adviser_001',
    createdAt: '2024-06-25T11:20:00Z',
    updatedAt: '2024-06-25T16:45:00Z',
    submittedAt: '2024-06-25T16:45:00Z'
  }
]

export const RISK_CATEGORIES = {
  1: { name: 'Very Low Risk', expectedReturn: 3.5, maxVolatility: 3, description: 'Capital preservation priority' },
  2: { name: 'Low Risk', expectedReturn: 4.5, maxVolatility: 6, description: 'Minimal volatility tolerance' },
  3: { name: 'Low-Medium Risk', expectedReturn: 5.5, maxVolatility: 9, description: 'Some growth with stability' },
  4: { name: 'Medium Risk', expectedReturn: 6.5, maxVolatility: 12, description: 'Balanced approach' },
  5: { name: 'Medium-High Risk', expectedReturn: 7.5, maxVolatility: 15, description: 'Growth focus with volatility' },
  6: { name: 'High Risk', expectedReturn: 8.5, maxVolatility: 18, description: 'Aggressive growth strategy' },
  7: { name: 'Very High Risk', expectedReturn: 9.5, maxVolatility: 22, description: 'Maximum growth potential' }
}