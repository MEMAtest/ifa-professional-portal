// =====================================================
// FILE: src/lib/suitability/validation/engine.ts
// SMART VALIDATION ENGINE (refactored into modular rulesets)
// =====================================================

import type {
  CrossSectionValidation,
  PulledPlatformData,
  SuitabilityFormData,
  ValidationError,
  ValidationResult,
  ValidationWarning
} from '@/types/suitability'
import { getMissingRequiredFieldErrorsForSection } from '@/lib/suitability/requiredFields'

import { fcaComplianceRules } from './rules/compliance'
import { crossSectionValidations } from './rules/crossSection'
import { fieldValidationRules } from './rules/fields'
import type { ComplianceRule, ValidationRule } from './types'

export class SmartValidationEngine {
  private fieldRules: ValidationRule[]
  private crossSectionRules: CrossSectionValidation[]
  private complianceRules: ComplianceRule[]

  constructor() {
    this.fieldRules = fieldValidationRules
    this.crossSectionRules = crossSectionValidations
    this.complianceRules = fcaComplianceRules
  }

  // Validate a single field
  validateField(
    sectionId: string,
    fieldId: string,
    value: any,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ValidationResult {
    try {
      const rules = this.fieldRules.filter((r) => r.section === sectionId && r.field === fieldId)

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const suggestions: string[] = []

      for (const rule of rules) {
        const result = rule.validate(value, formData, pulledData)
        errors.push(...result.errors)
        warnings.push(...result.warnings)
        if (result.suggestions) {
          suggestions.push(...result.suggestions)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }
    } catch (error) {
      console.error('Validation error for field', sectionId, fieldId, error)
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }
    }
  }

  // Validate entire section
  validateSection(sectionId: string, formData: SuitabilityFormData, pulledData: PulledPlatformData): ValidationResult {
    try {
      const sectionData = formData[sectionId as keyof SuitabilityFormData] || {}
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const suggestions: string[] = []

      // If the user hasn't started this section yet, don't spam required-field errors.
      const userKeys = Object.keys(sectionData).filter((k) => !k.startsWith('_'))
      const hasAnySectionData = userKeys.length > 0

      if (hasAnySectionData) {
        errors.push(...getMissingRequiredFieldErrorsForSection(sectionId, formData, pulledData, { onlyIfStarted: true }))
      }

      // Validate each field in the section
      Object.entries(sectionData).forEach(([fieldId, value]) => {
        if (!fieldId.startsWith('_')) {
          // Skip metadata fields
          const fieldResult = this.validateField(sectionId, fieldId, value, formData, pulledData)
          errors.push(...fieldResult.errors)
          warnings.push(...fieldResult.warnings)
          if (fieldResult.suggestions) {
            suggestions.push(...fieldResult.suggestions)
          }
        }
      })

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }
    } catch (error) {
      console.error('Section validation error', sectionId, error)
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }
    }
  }

  // Run cross-section validations
  runCrossValidations(formData: SuitabilityFormData, pulledData: PulledPlatformData): ValidationResult {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const suggestions: string[] = []

      for (const validation of this.crossSectionRules) {
        try {
          const result = validation.validate(formData, pulledData)
          errors.push(...result.errors)
          warnings.push(...result.warnings)
          if (result.suggestions) {
            suggestions.push(...result.suggestions)
          }
        } catch (error) {
          console.error('Cross validation error', validation.rule, error)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }
    } catch (error) {
      console.error('Cross validations error', error)
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }
    }
  }

  // Check FCA compliance
  checkCompliance(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): {
    compliant: boolean
    violations: ComplianceRule[]
    remediations: string[]
  } {
    try {
      const violations: ComplianceRule[] = []
      const remediations: string[] = []

      for (const rule of this.complianceRules) {
        try {
          if (!rule.validate(formData, pulledData)) {
            violations.push(rule)
            remediations.push(`${rule.fcaCode}: ${rule.remediation}`)
          }
        } catch (error) {
          console.error('Compliance rule error', rule.id, error)
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
        remediations
      }
    } catch (error) {
      console.error('Compliance check error', error)
      return {
        compliant: true,
        violations: [],
        remediations: []
      }
    }
  }

  // Complete validation
  validateComplete(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): {
    isValid: boolean
    errors: ValidationError[]
    warnings: ValidationWarning[]
    suggestions: string[]
    compliance: {
      compliant: boolean
      violations: ComplianceRule[]
      remediations: string[]
    }
  } {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const suggestions: string[] = []

      // Validate all sections
      const sections = Object.keys(formData).filter((key) => !key.startsWith('_'))

      for (const section of sections) {
        const sectionResult = this.validateSection(section, formData, pulledData)
        errors.push(...sectionResult.errors)
        warnings.push(...sectionResult.warnings)
        if (sectionResult.suggestions) {
          suggestions.push(...sectionResult.suggestions)
        }
      }

      // Run cross-section validations
      const crossResult = this.runCrossValidations(formData, pulledData)
      errors.push(...crossResult.errors)
      warnings.push(...crossResult.warnings)
      if (crossResult.suggestions) {
        suggestions.push(...crossResult.suggestions)
      }

      // Check compliance
      const compliance = this.checkCompliance(formData, pulledData)

      return {
        isValid: errors.length === 0 && compliance.compliant,
        errors,
        warnings,
        suggestions,
        compliance
      }
    } catch (error) {
      console.error('Complete validation error', error)
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        compliance: {
          compliant: true,
          violations: [],
          remediations: []
        }
      }
    }
  }

  // Get validation summary
  getValidationSummary(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): {
    totalErrors: number
    totalWarnings: number
    criticalErrors: ValidationError[]
    completionPercentage: number
    readyToSubmit: boolean
    complianceStatus: 'compliant' | 'non-compliant' | 'review-required'
  } {
    try {
      const result = this.validateComplete(formData, pulledData)

      const criticalErrors = result.errors.filter((e) => e.severity === 'critical')

      // Calculate completion based on required fields
      const requiredFields = this.getRequiredFields()
      const completedFields = requiredFields.filter((field) => {
        const [section, fieldId] = field.split('.')
        const value = (formData[section as keyof SuitabilityFormData] as any)?.[fieldId]
        return value !== undefined && value !== null && value !== ''
      })

      const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100)

      const complianceStatus = result.compliance.compliant
        ? 'compliant'
        : criticalErrors.length > 0
          ? 'non-compliant'
          : 'review-required'

      return {
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
        criticalErrors,
        completionPercentage,
        readyToSubmit: result.isValid && completionPercentage === 100,
        complianceStatus
      }
    } catch (error) {
      console.error('Validation summary error', error)
      return {
        totalErrors: 0,
        totalWarnings: 0,
        criticalErrors: [],
        completionPercentage: 0,
        readyToSubmit: false,
        complianceStatus: 'review-required'
      }
    }
  }

  // Helper: Get list of required fields
  // Note: NI number and full address are optional as per FCA guidance
  private getRequiredFields(): string[] {
    return [
      'personal_information.client_name',
      'personal_information.date_of_birth',
      // 'personal_information.ni_number', // Optional - not required for suitability
      'personal_information.marital_status',
      'personal_information.employment_status',
      'personal_information.target_retirement_age',
      // 'contact_details.address', // Optional - email/phone sufficient for contact
      'contact_details.phone',
      'contact_details.email',
      'contact_details.preferred_contact',
      'objectives.primary_objective',
      'objectives.investment_timeline',
      'financial_situation.annual_income',
      'financial_situation.monthly_expenses',
      'financial_situation.emergency_fund',
      'financial_situation.investment_amount',
      'risk_assessment.attitude_to_risk',
      'risk_assessment.max_acceptable_loss',
      'risk_assessment.reaction_to_loss',
      'risk_assessment.capacity_for_loss',
      'risk_assessment.investment_volatility',
      'knowledge_experience.investment_experience',
      'knowledge_experience.investment_knowledge',
      'existing_arrangements.has_pension',
      'existing_arrangements.has_investments',
      'vulnerability_assessment.health_conditions',
      'vulnerability_assessment.financial_confidence',
      'regulatory_compliance.uk_resident',
      'regulatory_compliance.us_person',
      'regulatory_compliance.pep',
      'regulatory_compliance.source_of_wealth',
      'regulatory_compliance.source_of_funds',
      'costs_charges.fee_structure_preference',
      'costs_charges.understands_charges',
      'costs_charges.platform_charge',
      'costs_charges.fund_charges',
      'recommendation.recommended_portfolio',
      'recommendation.allocation_equities',
      'recommendation.allocation_bonds',
      'recommendation.allocation_cash',
      'recommendation.allocation_alternatives',
      'recommendation.product_1_name',
      'recommendation.product_1_provider',
      'recommendation.product_1_amount',
      'recommendation.product_1_reason',
      'recommendation.recommendation_rationale',
      'recommendation.next_review_date',
      'recommendation.advisor_declaration',
      'options_considered.option_1_name',
      'options_considered.option_1_description',
      'options_considered.option_1_pros',
      'options_considered.option_1_cons',
      'options_considered.option_1_selected',
      'options_considered.option_2_name',
      'options_considered.option_2_description',
      'options_considered.option_2_pros',
      'options_considered.option_2_cons',
      'options_considered.option_2_selected',
      'disadvantages_risks.disadvantages',
      'disadvantages_risks.risks',
      'ongoing_service.review_frequency',
      'suitability_declaration.meets_objectives',
      'suitability_declaration.objectives_explanation',
      'suitability_declaration.suitable_risk',
      'suitability_declaration.risk_explanation',
      'suitability_declaration.affordable',
      'suitability_declaration.affordability_explanation',
      'suitability_declaration.consumer_duty_met',
      'suitability_declaration.best_interests_declaration'
    ]
  }
}

// Export singleton instance
export const validationEngine = new SmartValidationEngine()

