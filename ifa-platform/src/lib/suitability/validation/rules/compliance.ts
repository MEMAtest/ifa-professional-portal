import type { ComplianceRule } from '../types'
import { ensureNumber, ensureString } from '../helpers'

export const fcaComplianceRules: ComplianceRule[] = [
  {
    id: 'cobs_9_2',
    name: 'Suitability Assessment',
    fcaCode: 'COBS 9.2',
    description: 'Firm must obtain necessary information regarding client circumstances',
    validate: (formData) => {
      const required = [
        formData.personal_information?.client_name,
        formData.financial_situation?.annual_income,
        formData.objectives?.primary_objective,
        formData.risk_assessment?.attitude_to_risk
      ]
      return required.every((field) => field !== undefined && field !== null && field !== '')
    },
    remediation: 'Complete all required client information fields'
  },
  {
    id: 'cobs_9_3',
    name: 'Risk Assessment',
    fcaCode: 'COBS 9.3',
    description: 'Must assess client risk tolerance and capacity for loss',
    validate: (formData, pulledData) => {
      return Boolean(
        (formData.risk_assessment?.attitude_to_risk || pulledData.atrScore) &&
          (formData.risk_assessment?.max_acceptable_loss !== undefined || pulledData.cflScore)
      )
    },
    remediation: 'Complete risk assessment including ATR and CFL'
  },
  {
    id: 'consumer_duty_outcomes',
    name: 'Consumer Duty - Good Outcomes',
    fcaCode: 'PRIN 12',
    description: 'Act to deliver good outcomes for retail customers',
    validate: (formData) => {
      return Boolean(
        formData.suitability_declaration?.meets_objectives === 'Yes' &&
          formData.suitability_declaration?.suitable_risk === 'Yes'
      )
    },
    remediation: 'Ensure recommendation meets objectives and is suitable for risk profile'
  },
  {
    id: 'vulnerable_customers',
    name: 'Vulnerable Customer Protection',
    fcaCode: 'FG21/1',
    description: 'Fair treatment of vulnerable customers',
    validate: (formData, pulledData) => {
      // Check for vulnerability indicators using correct field names:
      // - health_conditions (not health_concerns) from the current form schema
      // - support_needed (not support_network) for support arrangements
      const healthConditions = ensureString(formData.vulnerability_assessment?.health_conditions)
      const hasVulnerability =
        pulledData.vulnerabilityScore === 'High' ||
        healthConditions === 'Significant' ||
        healthConditions === 'Severe' ||
        ensureNumber(formData.personal_information?.age) > 75

      if (!hasVulnerability) return true

      // When vulnerable, require support arrangements to be documented
      // Using support_needed (current field) instead of support_network
      const supportNeeded = formData.vulnerability_assessment?.support_needed
      const hasSupportNeeded = Array.isArray(supportNeeded) ? supportNeeded.length > 0 : Boolean(supportNeeded)

      const communicationPrefs = formData.vulnerability_assessment?.communication_preferences
      const hasCommunicationPrefs = Array.isArray(communicationPrefs) ? communicationPrefs.length > 0 : Boolean(communicationPrefs)

      // Legacy drafts used a string field; keep compatibility without expanding the public type.
      const legacyPreferredContactMethod = (formData.vulnerability_assessment as any)?.preferred_contact_method

      return Boolean(hasSupportNeeded && (hasCommunicationPrefs || Boolean(legacyPreferredContactMethod)))
    },
    remediation: 'Complete vulnerability assessment and support arrangements'
  }
]

