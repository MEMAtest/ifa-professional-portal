import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'

import type { ConditionalRule } from '../types'

export const riskRules: ConditionalRule[] = [
  // ===== RISK ASSESSMENT INTELLIGENCE (Rules 24-32) =====
  {
    id: 'atr_cfl_reconciliation',
    name: 'Reconcile ATR and CFL scores',
    sections: ['risk_assessment'],
    priority: 24,
    condition: (formData, pulledData) => {
      return Boolean(pulledData.atrScore && pulledData.cflScore)
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'risk_assessment',
        fields: [
          {
            id: 'risk_reconciliation',
            label: 'Risk Profile Reconciliation',
            type: 'textarea',
            helpText: 'System reconciling ATR and CFL assessments...'
          }
        ]
      },
      {
        type: 'calculate',
        sectionId: 'risk_assessment',
        fieldId: 'risk_reconciliation',
        value: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => {
          const atr = typeof pulledData.atrScore === 'number' ? pulledData.atrScore : undefined
          const cfl = typeof pulledData.cflScore === 'number' ? pulledData.cflScore : undefined

          if (!atr || !cfl) return 'Complete both ATR and CFL to generate a reconciled risk profile.'

          const diff = Math.abs(atr - cfl)
          if (diff >= 5) {
            return `Significant discrepancy detected (ATR ${atr}/10 vs CFL ${cfl}/10) – advisor review required.`
          }
          if (diff >= 3) {
            return `Notable difference (ATR ${atr}/10 vs CFL ${cfl}/10). Document rationale for any adjustments.`
          }
          return `Risk profile aligned: ATR ${atr}/10, CFL ${cfl}/10.`
        }
      }
    ]
  },

  {
    id: 'age_risk_mismatch',
    name: 'Flag age/risk mismatch',
    sections: ['risk_assessment', 'personal_information'],
    priority: 25,
    condition: (formData) => {
      const age = formData.personal_information?.age || 0
      const riskLevel = parseInt(formData.risk_assessment?.attitude_to_risk?.match(/\d+/)?.[0] || '0')
      return age > 65 && riskLevel > 5
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'risk_assessment',
        message: 'High risk appetite may not be suitable given age - additional justification required'
      },
      {
        type: 'require_field',
        sectionId: 'risk_assessment',
        fieldId: 'high_risk_justification'
      }
    ]
  },

  {
    id: 'loss_experience_details',
    name: 'Show loss experience details',
    sections: ['risk_assessment'],
    priority: 26,
    condition: (formData) => formData.risk_assessment?.previous_losses === 'Yes',
    actions: [
      {
        type: 'show_field',
        sectionId: 'risk_assessment',
        fields: [
          {
            id: 'loss_amount',
            label: 'Approximate Loss Amount (£)',
            type: 'number'
          },
          {
            id: 'loss_impact',
            label: 'How did the loss affect you?',
            type: 'select',
            options: ['No significant impact', 'Some concern', 'Very stressful', 'Changed investment approach']
          },
          {
            id: 'loss_learning',
            label: 'What did you learn?',
            type: 'textarea'
          }
        ]
      }
    ]
  },

  {
    id: 'capacity_override',
    name: 'Override risk if low capacity',
    sections: ['risk_assessment'],
    priority: 27,
    condition: (formData, pulledData) => {
      const cfl = pulledData.cflScore || 100
      const stated = parseInt(formData.risk_assessment?.attitude_to_risk?.match(/\d+/)?.[0] || '0')
      return cfl < 30 && stated > 4
    },
    actions: [
      {
        type: 'set_value',
        sectionId: 'risk_assessment',
        fieldId: 'adjusted_risk_level',
        value: 'Risk level adjusted down due to limited capacity for loss'
      }
    ]
  }
]
