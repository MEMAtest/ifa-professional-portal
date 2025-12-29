import type { ProdDetails } from './types'

export const OTHER_OPTION = 'Other'

export const GOVERNANCE_OWNER_OPTIONS = [
  'PROD Champion',
  'Compliance Officer',
  'Adviser Lead',
  'Managing Partner',
  OTHER_OPTION
]

export const OVERSIGHT_BODY_OPTIONS = [
  'Board',
  'Investment Committee',
  'Compliance Committee',
  'Partners',
  OTHER_OPTION
]

export const REVIEW_FREQUENCY_OPTIONS = [
  'Quarterly',
  'Bi-annual',
  'Annual',
  'Ad-hoc',
  OTHER_OPTION
]

export const TARGET_MARKET_OPTIONS = [
  'By client segment (age, wealth, objectives)',
  'By objectives and time horizon',
  'By risk profile and capacity for loss',
  'By service eligibility criteria',
  OTHER_OPTION
]

export const DISTRIBUTION_CHANNEL_OPTIONS = [
  'Adviser-led (1:1 advice)',
  'Platform facilitated',
  'Introducer-led',
  'Direct to client',
  OTHER_OPTION
]

export const FAIR_VALUE_OPTIONS = [
  'Assessed per service and reviewed annually',
  'Assessed at onboarding and on material change',
  'Assessed with pricing committee sign-off',
  OTHER_OPTION
]

export const MONITORING_OPTIONS = [
  'Monthly MI review',
  'Quarterly MI review',
  'Annual review',
  'Event-driven review',
  OTHER_OPTION
]

export const ESCALATION_OPTIONS = [
  'Compliance escalation with board sign-off',
  'Remediation plan with client communication',
  'Service withdrawal criteria',
  OTHER_OPTION
]

export const VULNERABILITY_OPTIONS = [
  'Enhanced suitability and monitoring for vulnerable clients',
  'Vulnerability flag required before recommendation',
  'Exclude vulnerable clients from unsuitable services',
  OTHER_OPTION
]

export const createDefaultProdDetails = (): ProdDetails => ({
  governanceOwner: GOVERNANCE_OWNER_OPTIONS[0],
  governanceOwnerOther: '',
  oversightBody: OVERSIGHT_BODY_OPTIONS[0],
  oversightBodyOther: '',
  reviewFrequency: REVIEW_FREQUENCY_OPTIONS[2],
  reviewFrequencyOther: '',
  targetMarketDefinition: TARGET_MARKET_OPTIONS[0],
  targetMarketDefinitionOther: '',
  distributionChannels: [DISTRIBUTION_CHANNEL_OPTIONS[0]],
  distributionOther: '',
  fairValueAssessment: FAIR_VALUE_OPTIONS[0],
  fairValueAssessmentOther: '',
  monitoringCadence: MONITORING_OPTIONS[1],
  monitoringCadenceOther: '',
  escalationProcess: ESCALATION_OPTIONS[1],
  escalationProcessOther: '',
  vulnerabilityApproach: VULNERABILITY_OPTIONS[0],
  vulnerabilityApproachOther: '',
  additionalNotes: ''
})
