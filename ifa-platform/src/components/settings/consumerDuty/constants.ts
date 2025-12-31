// Consumer Duty framework constants for firm settings

import type { ConsumerDutyFramework } from './types'

export const OTHER_OPTION = 'Other'

// Products & Services pillar options
export const TARGET_MARKET_APPROACH_OPTIONS = [
  'Segment by client characteristics (age, wealth, objectives)',
  'Define by investment needs and risk tolerance',
  'Use service eligibility criteria matrix',
  'Combine multiple factors with documented rationale',
  OTHER_OPTION
]

export const PRODUCT_CATEGORY_OPTIONS = [
  'Pensions & Retirement',
  'Investments & Savings',
  'Protection & Insurance',
  'Mortgages & Lending',
  'Estate Planning',
  'Tax Planning',
  OTHER_OPTION
]

export const HARM_MITIGATION_OPTIONS = [
  'Pre-sale suitability assessment with documented rationale',
  'Product governance with ongoing monitoring',
  'Risk warnings and client acknowledgements',
  'Regular portfolio reviews against objectives',
  OTHER_OPTION
]

export const DISTRIBUTION_STRATEGY_OPTIONS = [
  'Adviser-led advice with full fact-find',
  'Guided service with limited advice scope',
  'Execution-only with appropriateness check',
  'Hybrid model with clear boundaries',
  OTHER_OPTION
]

// Price & Value pillar options
export const ASSESSMENT_METHOD_OPTIONS = [
  'Annual value assessment with client outcomes data',
  'Per-service value analysis against objectives',
  'Comparative market benchmarking',
  'Client feedback and satisfaction surveys',
  OTHER_OPTION
]

export const REVIEW_FREQUENCY_OPTIONS = [
  'Annual comprehensive review',
  'Bi-annual pricing review',
  'Quarterly monitoring with annual deep dive',
  'Triggered by material changes',
  OTHER_OPTION
]

export const TRANSPARENCY_APPROACH_OPTIONS = [
  'Clear fee disclosure at every touchpoint',
  'Illustrated total cost of ownership',
  'Comparison with industry averages',
  'Plain English explanation of charges',
  OTHER_OPTION
]

export const BENCHMARKING_APPROACH_OPTIONS = [
  'Industry standard comparisons',
  'Platform fee comparisons',
  'Service-level benchmarking',
  'Peer group analysis',
  OTHER_OPTION
]

// Consumer Understanding pillar options
export const COMMUNICATION_STYLE_OPTIONS = [
  'Plain English communications',
  'Visual aids and infographics',
  'Jargon-free explanations',
  'Multiple format options (written, video, audio)',
  'Personalised to client preferences',
  OTHER_OPTION
]

export const PRODUCT_EXPLANATION_OPTIONS = [
  'Step-by-step product guides',
  'Risk-reward visualisations',
  'Case studies and examples',
  'Interactive tools and calculators',
  OTHER_OPTION
]

export const VULNERABLE_CLIENT_COMMUNICATION_OPTIONS = [
  'Enhanced explanation with more time',
  'Simplified documentation options',
  'Nominated contact involvement',
  'Regular check-ins and support',
  OTHER_OPTION
]

export const TESTING_APPROACH_OPTIONS = [
  'Client comprehension testing',
  'Feedback surveys after key communications',
  'Mystery shopping exercises',
  'Focus groups for new materials',
  OTHER_OPTION
]

// Consumer Support pillar options
export const SERVICE_QUALITY_OPTIONS = [
  'Defined SLAs for response times',
  'Multiple contact channels available',
  'Regular service satisfaction surveys',
  'Dedicated relationship managers',
  OTHER_OPTION
]

export const COMPLAINT_HANDLING_OPTIONS = [
  'Documented complaint procedure with timelines',
  'Root cause analysis for all complaints',
  'Regular complaint trend analysis',
  'FOS escalation pathway clearly explained',
  OTHER_OPTION
]

export const VULNERABLE_SUPPORT_OPTIONS = [
  'Trained staff for vulnerable client interactions',
  'Flexible service adjustments',
  'Third-party support coordination',
  'Regular vulnerability reassessment',
  OTHER_OPTION
]

export const ACCESS_CHANNEL_OPTIONS = [
  'Phone support during business hours',
  'Email with guaranteed response time',
  'Online portal with self-service',
  'Face-to-face meetings available',
  'Video calls offered',
  OTHER_OPTION
]

// Default framework values
export const createDefaultConsumerDutyFramework = (): ConsumerDutyFramework => ({
  products: {
    targetMarketApproach: TARGET_MARKET_APPROACH_OPTIONS[0],
    targetMarketApproachOther: '',
    productCategories: [PRODUCT_CATEGORY_OPTIONS[0], PRODUCT_CATEGORY_OPTIONS[1]],
    productCategoriesOther: '',
    harmMitigationStrategy: HARM_MITIGATION_OPTIONS[0],
    harmMitigationStrategyOther: '',
    distributionStrategy: DISTRIBUTION_STRATEGY_OPTIONS[0],
    distributionStrategyOther: ''
  },
  pricing: {
    assessmentMethod: ASSESSMENT_METHOD_OPTIONS[0],
    assessmentMethodOther: '',
    reviewFrequency: REVIEW_FREQUENCY_OPTIONS[0],
    reviewFrequencyOther: '',
    transparencyApproach: TRANSPARENCY_APPROACH_OPTIONS[0],
    transparencyApproachOther: '',
    benchmarkingApproach: BENCHMARKING_APPROACH_OPTIONS[0],
    benchmarkingApproachOther: ''
  },
  communication: {
    communicationStyle: [COMMUNICATION_STYLE_OPTIONS[0], COMMUNICATION_STYLE_OPTIONS[2]],
    communicationStyleOther: '',
    productExplanationMethod: PRODUCT_EXPLANATION_OPTIONS[0],
    productExplanationMethodOther: '',
    vulnerableClientApproach: VULNERABLE_CLIENT_COMMUNICATION_OPTIONS[0],
    vulnerableClientApproachOther: '',
    testingApproach: TESTING_APPROACH_OPTIONS[0],
    testingApproachOther: ''
  },
  support: {
    serviceQualityStandards: SERVICE_QUALITY_OPTIONS[0],
    serviceQualityStandardsOther: '',
    complaintHandlingProcess: COMPLAINT_HANDLING_OPTIONS[0],
    complaintHandlingProcessOther: '',
    vulnerableClientSupport: VULNERABLE_SUPPORT_OPTIONS[0],
    vulnerableClientSupportOther: '',
    accessChannels: [ACCESS_CHANNEL_OPTIONS[0], ACCESS_CHANNEL_OPTIONS[1]],
    accessChannelsOther: ''
  },
  additionalNotes: '',
  lastReviewDate: null,
  nextReviewDate: null
})
