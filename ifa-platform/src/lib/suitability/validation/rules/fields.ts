import type { ValidationError, ValidationWarning } from '@/types/suitability'

import { ensureNumber, ensureString } from '../helpers'
import type { ValidationRule } from '../types'

export const fieldValidationRules: ValidationRule[] = [
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
        errors: isValid
          ? []
          : [
              {
                sectionId: 'personal_information',
                fieldId: 'age',
                message: 'Age must be between 18 and 120',
                severity: 'error',
                code: 'INVALID_AGE'
              }
            ],
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
        errors: isValid
          ? []
          : [
              {
                sectionId: 'contact_details',
                fieldId: 'email',
                message: 'Please enter a valid email address',
                severity: 'error',
                code: 'INVALID_EMAIL'
              }
            ],
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
        warnings: isValid
          ? []
          : [
              {
                sectionId: 'contact_details',
                fieldId: 'phone',
                message: 'Phone number format may be incorrect',
                type: 'dataQuality'
              }
            ]
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
        errors: isValid
          ? []
          : [
              {
                sectionId: 'financial_situation',
                fieldId: 'annual_income',
                message: 'Income cannot be negative',
                severity: 'error',
                code: 'NEGATIVE_INCOME'
              }
            ],
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
      const riskLevel = parseInt(riskString.match(/\\d/)?.[0] || '0')
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
