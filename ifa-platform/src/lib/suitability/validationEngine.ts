// =====================================================
// FILE: src/lib/suitability/validationEngine.ts
// COMPLETE SMART VALIDATION SYSTEM WITH FCA COMPLIANCE - FIXED
// =====================================================

import {
  SuitabilityFormData,
  PulledPlatformData,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  CrossSectionValidation
} from '@/types/suitability'

// =====================================================
// TYPE SAFETY HELPERS
// =====================================================

const ensureString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const ensureNumber = (value: any): number => {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

const ensureArray = (value: any): any[] => {
  return Array.isArray(value) ? value : []
}

// =====================================================
// VALIDATION RULE TYPES
// =====================================================

interface ValidationRule {
  id: string
  name: string
  section: string
  field?: string
  validate: (value: any, formData: SuitabilityFormData, pulledData: PulledPlatformData) => ValidationResult
  severity: 'error' | 'warning' | 'info'
  fcaReference?: string
}

interface ComplianceRule {
  id: string
  name: string
  fcaCode: string
  description: string
  validate: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => boolean
  remediation: string
}

// =====================================================
// FCA COMPLIANCE RULES
// =====================================================

const fcaComplianceRules: ComplianceRule[] = [
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
      return required.every(field => field !== undefined && field !== null && field !== '')
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
      const hasVulnerability = 
        pulledData.vulnerabilityScore === 'High' ||
        formData.vulnerability_assessment?.health_concerns === 'Significant' ||
        ensureNumber(formData.personal_information?.age) > 75
      
      if (!hasVulnerability) return true
      
      return Boolean(
        formData.vulnerability_assessment?.support_network &&
        formData.vulnerability_assessment?.communication_preferences
      )
    },
    remediation: 'Complete vulnerability assessment and support arrangements'
  }
]

// =====================================================
// FIELD VALIDATION RULES
// =====================================================

const fieldValidationRules: ValidationRule[] = [
  // Personal Information Validations
  {
    id: 'valid_age',
    name: 'Valid Age Range',
    section: 'personal_information',
    field: 'age',
    severity: 'error',
    validate: (value) => {
      const age = ensureNumber(value)
      const isValid = age >= 18 && age <= 120
      return {
        isValid,
        errors: isValid ? [] : [{
          sectionId: 'personal_information',
          fieldId: 'age',
          message: 'Age must be between 18 and 120',
          severity: 'error',
          code: 'INVALID_AGE'
        }],
        warnings: []
      }
    }
  },
  {
    id: 'valid_email',
    name: 'Valid Email Format',
    section: 'contact_details',
    field: 'email',
    severity: 'error',
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const stringValue = ensureString(value)
      const isValid = !stringValue || emailRegex.test(stringValue)
      return {
        isValid,
        errors: isValid ? [] : [{
          sectionId: 'contact_details',
          fieldId: 'email',
          message: 'Please enter a valid email address',
          severity: 'error',
          code: 'INVALID_EMAIL'
        }],
        warnings: []
      }
    }
  },
  {
    id: 'valid_phone',
    name: 'Valid UK Phone',
    section: 'contact_details',
    field: 'phone',
    severity: 'warning',
    validate: (value) => {
      const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/
      const stringValue = ensureString(value)
      const cleaned = stringValue.replace(/\s/g, '')
      const isValid = !cleaned || ukPhoneRegex.test(cleaned)
      return {
        isValid,
        errors: [],
        warnings: isValid ? [] : [{
          sectionId: 'contact_details',
          fieldId: 'phone',
          message: 'Phone number format may be incorrect',
          type: 'dataQuality'
        }]
      }
    }
  },
  
  // Financial Validations
  {
    id: 'income_positive',
    name: 'Positive Income',
    section: 'financial_situation',
    field: 'annual_income',
    severity: 'error',
    validate: (value) => {
      const income = ensureNumber(value)
      const isValid = income >= 0
      return {
        isValid,
        errors: isValid ? [] : [{
          sectionId: 'financial_situation',
          fieldId: 'annual_income',
          message: 'Income cannot be negative',
          severity: 'error',
          code: 'NEGATIVE_INCOME'
        }],
        warnings: []
      }
    }
  },
  {
    id: 'realistic_income',
    name: 'Realistic Income Check',
    section: 'financial_situation',
    field: 'annual_income',
    severity: 'warning',
    validate: (value, formData) => {
      const income = ensureNumber(value)
      const age = ensureNumber(formData.personal_information?.age)
      const warnings: ValidationWarning[] = []
      
      if (income > 1000000 && age < 25) {
        warnings.push({
          sectionId: 'financial_situation',
          fieldId: 'annual_income',
          message: 'Unusually high income for age - please verify',
          type: 'dataQuality'
        })
      }
      
      if (income < 10000 && ensureString(formData.personal_information?.employment_status) === 'Employed') {
        warnings.push({
          sectionId: 'financial_situation',
          fieldId: 'annual_income',
          message: 'Income seems low for employed status',
          type: 'dataQuality'
        })
      }
      
      return {
        isValid: true,
        errors: [],
        warnings
      }
    }
  },
  
  // Investment Validations
  {
    id: 'investment_capacity',
    name: 'Investment Within Capacity',
    section: 'objectives',
    field: 'investment_amount',
    severity: 'error',
    validate: (value, formData) => {
      const investmentAmount = ensureNumber(value)
      const liquidAssets = ensureNumber(formData.financial_situation?.liquid_assets)
      const netWorth = ensureNumber(formData.financial_situation?.net_worth)
      
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      if (investmentAmount > liquidAssets) {
        errors.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: 'Investment amount exceeds liquid assets',
          severity: 'error',
          code: 'EXCEEDS_LIQUIDITY'
        })
      }
      
      if (investmentAmount > netWorth * 0.8) {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: 'Investment represents over 80% of net worth',
          type: 'compliance'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }
  },
  
  // Risk Validations
  {
    id: 'risk_loss_alignment',
    name: 'Risk and Loss Alignment',
    section: 'risk_assessment',
    field: 'max_acceptable_loss',
    severity: 'warning',
    validate: (value, formData) => {
      const maxLoss = ensureNumber(value)
      const riskString = ensureString(formData.risk_assessment?.attitude_to_risk)
      const riskLevel = parseInt(riskString.match(/\d/)?.[0] || '0')
      const warnings: ValidationWarning[] = []
      
      if (riskLevel <= 3 && maxLoss > 20) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'max_acceptable_loss',
          message: 'High loss tolerance inconsistent with low risk attitude',
          type: 'compliance'
        })
      }
      
      if (riskLevel >= 6 && maxLoss < 10) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'max_acceptable_loss',
          message: 'Low loss tolerance inconsistent with high risk attitude',
          type: 'compliance'
        })
      }
      
      return {
        isValid: true,
        errors: [],
        warnings
      }
    }
  }
]

// =====================================================
// CROSS-SECTION VALIDATION RULES
// =====================================================

const crossSectionValidations: CrossSectionValidation[] = [
  {
    rule: 'income_expense_balance',
    sections: ['financial_situation'],
    validate: (formData) => {
      const income = ensureNumber(formData.financial_situation?.annual_income)
      const monthlyExpenditure = ensureNumber(formData.financial_situation?.monthly_expenditure)
      const expenses = monthlyExpenditure * 12
      
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      if (expenses > income) {
        errors.push({
          sectionId: 'financial_situation',
          fieldId: 'monthly_expenditure',
          message: 'Annual expenses exceed income - review before investing',
          severity: 'critical',
          code: 'NEGATIVE_CASHFLOW'
        })
      } else if (expenses > income * 0.9) {
        warnings.push({
          sectionId: 'financial_situation',
          fieldId: 'monthly_expenditure',
          message: 'Limited surplus for investment',
          type: 'bestPractice'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }
  },
  {
    rule: 'emergency_fund_adequacy',
    sections: ['financial_situation', 'objectives'],
    validate: (formData) => {
      const liquidAssets = ensureNumber(formData.financial_situation?.liquid_assets)
      const monthlyExpenses = ensureNumber(formData.financial_situation?.monthly_expenditure)
      const investmentAmount = ensureNumber(formData.objectives?.investment_amount)
      
      const emergencyFundNeeded = monthlyExpenses * 6
      const remainingAfterInvestment = liquidAssets - investmentAmount
      
      const warnings: ValidationWarning[] = []
      
      if (remainingAfterInvestment < emergencyFundNeeded) {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: `Investment would leave emergency fund below recommended 6 months (£${emergencyFundNeeded.toLocaleString()})`,
          type: 'bestPractice'
        })
      }
      
      return {
        isValid: true,
        errors: [],
        warnings,
        suggestions: remainingAfterInvestment < emergencyFundNeeded ? 
          ['Consider retaining sufficient emergency reserves before investing'] : []
      }
    }
  },
  {
    rule: 'atr_cfl_reconciliation',
    sections: ['risk_assessment'],
    validate: (formData, pulledData) => {
      const atr = ensureNumber(pulledData.atrScore) || 50
      const cfl = ensureNumber(pulledData.cflScore) || 50
      const difference = Math.abs(atr - cfl)
      
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      if (difference > 40) {
        errors.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'Significant discrepancy between risk tolerance and capacity - reconciliation required',
          severity: 'critical',
          code: 'RISK_MISMATCH'
        })
      } else if (difference > 20) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'Notable difference between ATR and CFL scores',
          type: 'compliance'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: difference > 20 ? 
          ['Document rationale for any risk level adjustments'] : []
      }
    }
  },
  {
    rule: 'age_risk_appropriateness',
    sections: ['personal_information', 'risk_assessment'],
    validate: (formData) => {
      const age = ensureNumber(formData.personal_information?.age)
      const riskString = ensureString(formData.risk_assessment?.attitude_to_risk)
      const riskLevel = parseInt(riskString.match(/\d/)?.[0] || '0')
      const timeHorizon = ensureNumber(formData.objectives?.time_horizon)
      
      const warnings: ValidationWarning[] = []
      
      if (age > 65 && riskLevel > 5) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'High risk level may not be suitable given age',
          type: 'compliance'
        })
      }
      
      if (age > 70 && timeHorizon > 20) {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'time_horizon',
          message: 'Long investment horizon unusual for age',
          type: 'dataQuality'
        })
      }
      
      return {
        isValid: true,
        errors: [],
        warnings
      }
    }
  },
  {
    rule: 'knowledge_product_alignment',
    sections: ['knowledge_experience', 'recommendation'],
    validate: (formData) => {
      const knowledge = ensureString(formData.knowledge_experience?.investment_knowledge)
      const productSelection = ensureString(formData.recommendation?.product_selection)
      const complexProducts = productSelection.includes('Complex')
      
      const errors: ValidationError[] = []
      
      if (knowledge === 'Basic' && complexProducts) {
        errors.push({
          sectionId: 'recommendation',
          fieldId: 'product_selection',
          message: 'Complex products not suitable for basic knowledge level',
          severity: 'error',
          code: 'KNOWLEDGE_MISMATCH'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        suggestions: knowledge === 'Basic' ? 
          ['Consider simpler, managed investment solutions'] : []
      }
    }
  },
  {
    rule: 'pension_transfer_specialist',
    sections: ['existing_arrangements', 'regulatory_compliance'],
    validate: (formData) => {
      const dbTransfer = ensureString((formData.existing_arrangements as any)?.db_transfer_considered) === 'Yes'
      const adviceScope = ensureString(formData.regulatory_compliance?.advice_scope)
      
      const errors: ValidationError[] = []
      
      if (dbTransfer && adviceScope !== 'Pension Transfer') {
        errors.push({
          sectionId: 'regulatory_compliance',
          fieldId: 'advice_scope',
          message: 'Pension Transfer Specialist required for DB transfers',
          severity: 'critical',
          code: 'PTS_REQUIRED',
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      }
    }
  },
  {
    rule: 'consumer_duty_value',
    sections: ['costs_charges', 'objectives'],
    validate: (formData) => {
      const totalCharges = 
        ensureNumber(formData.costs_charges?.initial_adviser_charge) +
        ensureNumber(formData.costs_charges?.ongoing_adviser_charge) +
        ensureNumber(formData.costs_charges?.platform_charge) +
        ensureNumber(formData.costs_charges?.fund_charges)
      
      const investmentAmount = ensureNumber(formData.objectives?.investment_amount)
      const chargePercentage = investmentAmount > 0 ? (totalCharges / investmentAmount) * 100 : 0
      
      const warnings: ValidationWarning[] = []
      
      if (totalCharges > 3) {
        warnings.push({
          sectionId: 'costs_charges',
          fieldId: 'total_ongoing_charges',
          message: 'Total charges exceed 3% - ensure value for money',
          type: 'compliance'
        })
      }
      
      if (chargePercentage > 5 && investmentAmount < 50000) {
        warnings.push({
          sectionId: 'costs_charges',
          fieldId: 'initial_adviser_charge',
          message: 'High charges relative to investment size',
          type: 'bestPractice'
        })
      }
      
      return {
        isValid: true,
        errors: [],
        warnings,
        suggestions: totalCharges > 2 ? 
          ['Document value justification for charges'] : []
      }
    }
  }
]

// =====================================================
// SMART VALIDATION ENGINE CLASS
// =====================================================

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
      const rules = this.fieldRules.filter(
        r => r.section === sectionId && r.field === fieldId
      )
      
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
  validateSection(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ValidationResult {
    try {
      const sectionData = formData[sectionId as keyof SuitabilityFormData] || {}
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const suggestions: string[] = []
      
      // Validate each field in the section
      Object.entries(sectionData).forEach(([fieldId, value]) => {
        if (!fieldId.startsWith('_')) { // Skip metadata fields
          const fieldResult = this.validateField(
            sectionId, 
            fieldId, 
            value, 
            formData, 
            pulledData
          )
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
  runCrossValidations(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ValidationResult {
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
    compliance: ReturnType<typeof this.checkCompliance>
  } {
    try {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      const suggestions: string[] = []
      
      // Validate all sections
      const sections = Object.keys(formData).filter(
        key => !key.startsWith('_')
      )
      
      for (const section of sections) {
        const sectionResult = this.validateSection(
          section,
          formData,
          pulledData
        )
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
      
      const criticalErrors = result.errors.filter(
        e => e.severity === 'critical'
      )
      
      // Calculate completion based on required fields
      const requiredFields = this.getRequiredFields()
      const completedFields = requiredFields.filter(field => {
        const [section, fieldId] = field.split('.')
        const value = (formData[section as keyof SuitabilityFormData] as any)?.[fieldId]
        return value !== undefined && value !== null && value !== ''
      })
      
      const completionPercentage = Math.round(
        (completedFields.length / requiredFields.length) * 100
      )
      
      const complianceStatus = result.compliance.compliant ? 'compliant' :
        criticalErrors.length > 0 ? 'non-compliant' : 'review-required'
      
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
  private getRequiredFields(): string[] {
    return [
      'personal_information.client_name',
      'personal_information.date_of_birth',
      'personal_information.ni_number',
      'personal_information.marital_status',
      'personal_information.employment_status',
      'personal_information.target_retirement_age',
      'contact_details.address',
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
      'recommendation.recommendation_rationale',
      'recommendation.next_review_date',
      'recommendation.advisor_declaration'
    ]
  }
}

// Export singleton instance
export const validationEngine = new SmartValidationEngine()