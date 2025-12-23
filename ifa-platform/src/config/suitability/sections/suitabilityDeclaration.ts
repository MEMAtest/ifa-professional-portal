import { Shield } from 'lucide-react'

export const suitabilityDeclarationSection = {
  id: 'suitability_declaration',
  title: 'Suitability Declaration',
  icon: Shield,
  status: 'incomplete',
  fields: [
    {
      id: 'meets_objectives',
      label: 'Does the recommendation meet the client’s objectives?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'objectives_explanation',
      label: 'Objectives Explanation',
      type: 'textarea',
      required: true,
      rows: 4
    },
    {
      id: 'suitable_risk',
      label: 'Is the recommendation suitable for the client’s risk profile?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'risk_explanation',
      label: 'Risk Explanation / ATR-CFL Reconciliation',
      type: 'textarea',
      required: true,
      rows: 4
    },
    {
      id: 'affordable',
      label: 'Is the recommendation affordable and within capacity for loss?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'affordability_explanation',
      label: 'Affordability Explanation',
      type: 'textarea',
      required: true,
      rows: 4
    },
    {
      id: 'consumer_duty_met',
      label: 'Consumer Duty - good outcomes delivered?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'best_interests_declaration',
      label: 'Best Interests Declaration',
      type: 'checkbox',
      required: true,
      options: ['I confirm this recommendation is in the client’s best interests']
    }
  ]
}

