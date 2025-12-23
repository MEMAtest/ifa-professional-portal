// src/config/consumerDuty/questions.ts
// ================================================================
// CONSUMER DUTY ASSESSMENT QUESTIONS CONFIG
// FCA Consumer Duty framework assessment questionnaire
// ================================================================

export interface QuestionOption {
  value: string
  label: string
  score: number
  description?: string
}

export interface AssessmentQuestion {
  id: string
  question: string
  type: 'radio' | 'checkbox' | 'textarea'
  options?: QuestionOption[]
  required: boolean
  evidenceRequired?: boolean
  helpText?: string
  fcaGuidance?: string
}

export interface OutcomeSection {
  id: string
  title: string
  shortTitle: string
  fcaReference: string
  description: string
  icon: string
  questions: AssessmentQuestion[]
  scoringThresholds: {
    compliant: number
    partiallyCompliant: number
    nonCompliant: number
  }
  maxScore: number
}

export const consumerDutyQuestions: Record<string, OutcomeSection> = {
  products_services: {
    id: 'products_services',
    title: 'Products & Services',
    shortTitle: 'Products',
    fcaReference: 'PRIN 2A.2',
    description: 'Products and services are designed to meet the needs, characteristics and objectives of customers in the target market, and avoid causing foreseeable harm.',
    icon: 'Package',
    questions: [
      {
        id: 'target_market',
        question: 'Has a target market assessment been completed for all products recommended?',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes, fully documented', score: 3, description: 'Target market clearly defined with documented rationale' },
          { value: 'partial', label: 'Partially completed', score: 1, description: 'Some products assessed but incomplete documentation' },
          { value: 'no', label: 'Not completed', score: 0, description: 'No target market assessment on file' }
        ],
        required: true,
        evidenceRequired: true,
        helpText: 'Review whether target market documentation exists for recommended products',
        fcaGuidance: 'Firms must identify a target market at a sufficiently granular level for each product'
      },
      {
        id: 'risk_alignment',
        question: 'Are the recommended products appropriate for the client\'s risk profile?',
        type: 'radio',
        options: [
          { value: 'aligned', label: 'Fully aligned', score: 3, description: 'Products match ATR and capacity for loss' },
          { value: 'minor_concerns', label: 'Minor concerns identified', score: 2, description: 'Products mostly appropriate with documented justification for any variance' },
          { value: 'concerns', label: 'Some concerns', score: 1, description: 'Notable mismatch requiring review' },
          { value: 'misaligned', label: 'Misaligned', score: 0, description: 'Products inappropriate for client\'s risk profile' }
        ],
        required: true,
        helpText: 'Compare product risk with client\'s assessed attitude to risk and capacity for loss'
      },
      {
        id: 'harm_assessment',
        question: 'Have potential harms been identified and mitigated?',
        type: 'radio',
        options: [
          { value: 'all_identified', label: 'All identified and mitigated', score: 3, description: 'Comprehensive harm assessment with mitigation strategies' },
          { value: 'partially', label: 'Partially assessed', score: 1, description: 'Some harms identified but mitigation incomplete' },
          { value: 'not_assessed', label: 'Not assessed', score: 0, description: 'No harm assessment completed' }
        ],
        required: true,
        evidenceRequired: true,
        fcaGuidance: 'Firms should consider what foreseeable harm could result from the product'
      },
      {
        id: 'distribution_strategy',
        question: 'Is the distribution strategy appropriate for the target market?',
        type: 'radio',
        options: [
          { value: 'appropriate', label: 'Fully appropriate', score: 3, description: 'Distribution method suits target market characteristics' },
          { value: 'mostly', label: 'Mostly appropriate', score: 2, description: 'Minor adjustments could improve accessibility' },
          { value: 'concerns', label: 'Some concerns', score: 1, description: 'Distribution may not reach target market effectively' },
          { value: 'inappropriate', label: 'Not appropriate', score: 0, description: 'Distribution strategy misaligned with target market' }
        ],
        required: true
      }
    ],
    scoringThresholds: {
      compliant: 10,           // Score >= 10 out of 12
      partiallyCompliant: 6,   // Score 6-9
      nonCompliant: 0          // Score < 6
    },
    maxScore: 12
  },

  price_value: {
    id: 'price_value',
    title: 'Price & Value',
    shortTitle: 'Value',
    fcaReference: 'PRIN 2A.3',
    description: 'Products and services provide fair value, with the price being reasonable relative to the benefits customers receive.',
    icon: 'PoundSterling',
    questions: [
      {
        id: 'value_assessment',
        question: 'Has a fair value assessment been completed?',
        type: 'radio',
        options: [
          { value: 'comprehensive', label: 'Comprehensive assessment completed', score: 3, description: 'Full value analysis with documented rationale' },
          { value: 'basic', label: 'Basic assessment completed', score: 2, description: 'Value considered but limited documentation' },
          { value: 'partial', label: 'Partial assessment', score: 1, description: 'Some elements of value considered' },
          { value: 'none', label: 'No assessment', score: 0, description: 'Value assessment not performed' }
        ],
        required: true,
        evidenceRequired: true,
        fcaGuidance: 'Firms must assess the relationship between the price paid and the benefits'
      },
      {
        id: 'fee_transparency',
        question: 'Are all fees and charges clearly disclosed to the client?',
        type: 'radio',
        options: [
          { value: 'full', label: 'Full disclosure provided', score: 3, description: 'All fees itemised and explained' },
          { value: 'mostly', label: 'Mostly disclosed', score: 2, description: 'Main fees disclosed, minor items not detailed' },
          { value: 'partial', label: 'Partial disclosure', score: 1, description: 'Some fees disclosed but gaps exist' },
          { value: 'poor', label: 'Poor disclosure', score: 0, description: 'Fees not clearly communicated' }
        ],
        required: true,
        helpText: 'Review fee disclosure documents provided to client'
      },
      {
        id: 'cost_comparison',
        question: 'Has the cost been compared with similar products in the market?',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes, documented comparison', score: 3, description: 'Market comparison completed with rationale for selection' },
          { value: 'informal', label: 'Informal comparison', score: 1, description: 'Adviser aware of alternatives but not formally documented' },
          { value: 'no', label: 'No comparison', score: 0, description: 'No consideration of market alternatives' }
        ],
        required: true
      },
      {
        id: 'benefit_match',
        question: 'Do the benefits justify the price for this specific client?',
        type: 'radio',
        options: [
          { value: 'clearly', label: 'Clearly justified', score: 3, description: 'Benefits significantly outweigh costs for this client' },
          { value: 'adequate', label: 'Adequately justified', score: 2, description: 'Benefits reasonably match the price' },
          { value: 'questionable', label: 'Questionable value', score: 1, description: 'Benefits may not fully justify the cost' },
          { value: 'poor', label: 'Poor value', score: 0, description: 'Client paying for features they don\'t need/use' }
        ],
        required: true
      }
    ],
    scoringThresholds: {
      compliant: 10,
      partiallyCompliant: 6,
      nonCompliant: 0
    },
    maxScore: 12
  },

  consumer_understanding: {
    id: 'consumer_understanding',
    title: 'Consumer Understanding',
    shortTitle: 'Understanding',
    fcaReference: 'PRIN 2A.4',
    description: 'Communications enable customers to make informed decisions about products and services.',
    icon: 'BookOpen',
    questions: [
      {
        id: 'communication_clarity',
        question: 'Are communications clear and understandable for the client?',
        type: 'radio',
        options: [
          { value: 'excellent', label: 'Excellent - tailored to client', score: 3, description: 'Communications adapted to client\'s knowledge level and needs' },
          { value: 'good', label: 'Good - clear and accessible', score: 2, description: 'Standard communications that are clear' },
          { value: 'adequate', label: 'Adequate', score: 1, description: 'Communications meet minimum requirements' },
          { value: 'poor', label: 'Poor - jargon heavy or confusing', score: 0, description: 'Communications not suitable for target audience' }
        ],
        required: true,
        helpText: 'Consider the client\'s financial literacy and communication preferences'
      },
      {
        id: 'risk_explanation',
        question: 'Have the key risks been explained in a way the client understands?',
        type: 'radio',
        options: [
          { value: 'comprehensive', label: 'Comprehensive explanation', score: 3, description: 'All key risks explained with examples relevant to client' },
          { value: 'adequate', label: 'Adequate explanation', score: 2, description: 'Main risks covered clearly' },
          { value: 'partial', label: 'Partial explanation', score: 1, description: 'Some risks mentioned but not fully explained' },
          { value: 'insufficient', label: 'Insufficient explanation', score: 0, description: 'Risks not properly communicated' }
        ],
        required: true,
        evidenceRequired: true
      },
      {
        id: 'documentation_quality',
        question: 'Is the documentation suitable for the client\'s needs?',
        type: 'radio',
        options: [
          { value: 'excellent', label: 'Excellent - personalised', score: 3, description: 'Documents tailored to client\'s specific situation' },
          { value: 'good', label: 'Good - clear standard documents', score: 2, description: 'Standard documents that are clear and comprehensive' },
          { value: 'adequate', label: 'Adequate', score: 1, description: 'Documents provided but may be confusing' },
          { value: 'poor', label: 'Poor quality documents', score: 0, description: 'Documentation not fit for purpose' }
        ],
        required: true
      },
      {
        id: 'client_confirmation',
        question: 'Has the client confirmed their understanding of the recommendation?',
        type: 'radio',
        options: [
          { value: 'documented', label: 'Yes, documented confirmation', score: 3, description: 'Client has confirmed understanding in writing' },
          { value: 'verbal', label: 'Verbal confirmation only', score: 2, description: 'Client verbally confirmed but no written record' },
          { value: 'assumed', label: 'Understanding assumed', score: 1, description: 'No specific confirmation sought' },
          { value: 'concerns', label: 'Concerns about understanding', score: 0, description: 'Client may not fully understand recommendation' }
        ],
        required: true,
        evidenceRequired: true
      }
    ],
    scoringThresholds: {
      compliant: 10,
      partiallyCompliant: 6,
      nonCompliant: 0
    },
    maxScore: 12
  },

  consumer_support: {
    id: 'consumer_support',
    title: 'Consumer Support',
    shortTitle: 'Support',
    fcaReference: 'PRIN 2A.5',
    description: 'Customers receive support that meets their needs throughout the lifecycle of the product.',
    icon: 'HeadphonesIcon',
    questions: [
      {
        id: 'ongoing_service',
        question: 'Is the ongoing service proposition clearly defined and appropriate?',
        type: 'radio',
        options: [
          { value: 'comprehensive', label: 'Comprehensive service agreed', score: 3, description: 'Service levels clearly defined with regular review schedule' },
          { value: 'adequate', label: 'Adequate service defined', score: 2, description: 'Basic service agreement in place' },
          { value: 'limited', label: 'Limited service', score: 1, description: 'Minimal ongoing support defined' },
          { value: 'none', label: 'No ongoing service', score: 0, description: 'No ongoing support arrangement' }
        ],
        required: true,
        helpText: 'Review the service agreement and ongoing support terms'
      },
      {
        id: 'accessibility',
        question: 'Can the client easily access support when needed?',
        type: 'radio',
        options: [
          { value: 'excellent', label: 'Excellent - multiple channels', score: 3, description: 'Client can reach adviser via multiple convenient channels' },
          { value: 'good', label: 'Good - accessible', score: 2, description: 'Client has clear route to support' },
          { value: 'adequate', label: 'Adequate', score: 1, description: 'Support available but not always easy to access' },
          { value: 'poor', label: 'Poor accessibility', score: 0, description: 'Client would struggle to get support' }
        ],
        required: true
      },
      {
        id: 'vulnerability_support',
        question: 'Are appropriate support measures in place for any vulnerability characteristics?',
        type: 'radio',
        options: [
          { value: 'comprehensive', label: 'Comprehensive measures in place', score: 3, description: 'Specific support measures documented and implemented' },
          { value: 'some', label: 'Some measures in place', score: 2, description: 'Basic support for identified vulnerabilities' },
          { value: 'limited', label: 'Limited support', score: 1, description: 'Awareness but no specific measures' },
          { value: 'not_applicable', label: 'Not applicable', score: 3, description: 'No vulnerability characteristics identified' },
          { value: 'none', label: 'No support measures', score: 0, description: 'Vulnerabilities identified but not addressed' }
        ],
        required: true,
        evidenceRequired: true,
        fcaGuidance: 'Consider the FCA guidance on vulnerable customers'
      },
      {
        id: 'complaint_handling',
        question: 'Is the complaint handling process clearly communicated?',
        type: 'radio',
        options: [
          { value: 'clearly', label: 'Clearly communicated', score: 3, description: 'Complaint process explained with contact details provided' },
          { value: 'available', label: 'Information available', score: 2, description: 'Process documented but not proactively shared' },
          { value: 'limited', label: 'Limited information', score: 1, description: 'Basic information only' },
          { value: 'unclear', label: 'Unclear process', score: 0, description: 'Client would not know how to complain' }
        ],
        required: true
      }
    ],
    scoringThresholds: {
      compliant: 10,
      partiallyCompliant: 6,
      nonCompliant: 0
    },
    maxScore: 12
  }
}

// Helper to calculate status from score
export function calculateOutcomeStatus(
  score: number,
  maxScore: number,
  thresholds: OutcomeSection['scoringThresholds']
): 'compliant' | 'partially_compliant' | 'non_compliant' {
  if (score >= thresholds.compliant) return 'compliant'
  if (score >= thresholds.partiallyCompliant) return 'partially_compliant'
  return 'non_compliant'
}

// Get all outcomes in order
export const outcomeOrder = [
  'products_services',
  'price_value',
  'consumer_understanding',
  'consumer_support'
] as const

// Get total max score across all outcomes
export const totalMaxScore = Object.values(consumerDutyQuestions).reduce(
  (sum, outcome) => sum + outcome.maxScore,
  0
)
