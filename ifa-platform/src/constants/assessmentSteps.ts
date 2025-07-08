// src/constants/assessmentSteps.ts
export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  validationErrors: string[];
}

export const ASSESSMENT_STEPS: AssessmentStep[] = [
  {
    id: 'client_details',
    title: 'Client Details & Objectives',
    description: 'Capture complete client information and investment objectives',
    required: true,
    completed: false,
    validationErrors: []
  },
  {
    id: 'financial_assessment',
    title: 'Financial Assessment', 
    description: 'Document financial position, income, and expenditure',
    required: true,
    completed: false,
    validationErrors: []
  },
  {
    id: 'risk_profile',
    title: 'Risk Profile',
    description: 'Assess attitude to risk and capacity for loss',
    required: true,
    completed: false,
    validationErrors: []
  },
  {
    id: 'vulnerability_assessment',
    title: 'Vulnerability Assessment',
    description: 'Identify and document any client vulnerabilities',
    required: true,
    completed: false,
    validationErrors: []
  },
  {
    id: 'knowledge_experience',
    title: 'Knowledge & Experience',
    description: 'Document investment knowledge and experience',
    required: true,
    completed: false,
    validationErrors: []
  },
  {
    id: 'suitability_assessment',
    title: 'Suitability Assessment',
    description: 'Confirm recommendation meets suitability criteria',
    required: true,
    completed: false,
    validationErrors: []
  },
  {
    id: 'review_submit',
    title: 'Review & Submit',
    description: 'Review complete assessment and submit',
    required: true,
    completed: false,
    validationErrors: []
  }
]