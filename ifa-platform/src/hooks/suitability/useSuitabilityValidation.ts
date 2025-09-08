// =====================================================
// FILE: src/hooks/suitability/useSuitabilityValidation.ts
// =====================================================

import { useState, useCallback } from 'react'
import { 
  SuitabilityFormData, 
  PulledPlatformData, 
  ValidationError, 
  ValidationWarning,
  SuitabilitySection,
  CrossSectionValidation,
  ValidationResult
} from '@/types/suitability'

interface UseSuitabilityValidationOptions {
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  sections: SuitabilitySection[]
}

export const useSuitabilityValidation = ({
  formData,
  pulledData,
  sections
}: UseSuitabilityValidationOptions) => {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [crossValidationErrors, setCrossValidationErrors] = useState<ValidationError[]>([])
  
  const validateField = useCallback((
    sectionId: string,
    fieldId: string,
    value: any
  ): string | null => {
    const section = sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId) || 
                 section?.conditionalFields?.flatMap(g => g.fields).find(f => f.id === fieldId)
    
    if (!field) return null
    
    if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`
    }
    
    if (field.validateWith) {
      return field.validateWith(value, formData, pulledData)
    }
    
    if (field.type === 'email' && value && !isValidEmail(value)) {
      return 'Please enter a valid email address'
    }
    
    if (field.type === 'tel' && value && !isValidUKPhone(value)) {
      return 'Please enter a valid UK phone number'
    }
    
    return null
  }, [sections, formData, pulledData])
  
  const validateSection = useCallback((sectionId: string): ValidationError[] => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return []
    
    const errors: ValidationError[] = []
    const sectionData = formData[sectionId as keyof SuitabilityFormData] || {}
    
    section.fields.forEach(field => {
      const error = validateField(sectionId, field.id, (sectionData as any)[field.id])
      if (error) {
        errors.push({
          sectionId,
          fieldId: field.id,
          message: error,
          severity: 'error'
        })
      }
    })
    
    return errors
  }, [sections, formData, validateField])
  
  const runCrossValidations = useCallback((): boolean => {
    const crossValidations: CrossSectionValidation[] = [
      {
        rule: 'Investment Amount vs Capacity',
        sections: ['objectives', 'financial_situation'],
        validate: (formData, pulledData) => {
          const investmentAmount = Number(formData.objectives?.investment_amount) || 0
          const liquidAssets = Number(formData.financial_situation?.liquid_assets) || 0
          
          const errors: ValidationError[] = []
          const warnings: ValidationWarning[] = []
          
          if (investmentAmount > liquidAssets) {
            errors.push({
              sectionId: 'objectives',
              fieldId: 'investment_amount',
              message: 'Investment amount exceeds available liquid assets',
              severity: 'error',
              code: 'CAPACITY_EXCEEDED'
            })
          }
          
          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions: []
          }
        }
      }
    ]
    
    const allErrors: ValidationError[] = []
    
    crossValidations.forEach(validation => {
      const result = validation.validate(formData, pulledData)
      allErrors.push(...result.errors)
    })
    
    setCrossValidationErrors(allErrors)
    return allErrors.length === 0
  }, [formData, pulledData])
  
  return {
    validationErrors,
    crossValidationErrors,
    validateField,
    validateSection,
    runCrossValidations
  }
}

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidUKPhone = (phone: string): boolean => {
  const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/
  return ukPhoneRegex.test(phone.replace(/\s/g, ''))
}