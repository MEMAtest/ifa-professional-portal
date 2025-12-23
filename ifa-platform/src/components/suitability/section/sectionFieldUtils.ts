import type { ConditionalFieldGroup, PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'

import type { ExtendedSuitabilityField } from './types'

export type SectionStatus = 'error' | 'warning' | 'complete' | 'partial' | 'incomplete'

export function mergeSectionFields(args: {
  sectionFields: ExtendedSuitabilityField[]
  sectionConditionalFields?: ConditionalFieldGroup[]
  conditionalFields?: ConditionalFieldGroup[]
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
}): ExtendedSuitabilityField[] {
  let fields = [...(args.sectionFields || [])] as ExtendedSuitabilityField[]

  if (args.conditionalFields && args.conditionalFields.length > 0) {
    for (const group of args.conditionalFields) {
      if (group.condition(args.formData, args.pulledData)) {
        fields = [...fields, ...(group.fields as ExtendedSuitabilityField[])]
      }
    }
  }

  if (args.sectionConditionalFields && args.sectionConditionalFields.length > 0) {
    for (const group of args.sectionConditionalFields) {
      if (group.condition(args.formData, args.pulledData)) {
        fields = [...fields, ...(group.fields as ExtendedSuitabilityField[])]
      }
    }
  }

  const uniqueFields: ExtendedSuitabilityField[] = []
  for (const field of fields) {
    if (!uniqueFields.some((existing) => existing.id === field.id)) {
      uniqueFields.push(field)
    }
  }

  return uniqueFields
}

export function calculateSectionCompletion(allFields: ExtendedSuitabilityField[], sectionData: Record<string, any>): number {
  const requiredFields = allFields.filter((field) => field.required)
  const completedRequired = requiredFields.filter((field) => {
    const value = sectionData[field.id]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && value !== ''
  })

  return requiredFields.length > 0 ? Math.round((completedRequired.length / requiredFields.length) * 100) : 100
}

export function getSectionStatus(validationErrors: ValidationError[], sectionCompletion: number): SectionStatus {
  const criticalErrors = validationErrors.filter((error) => error.severity === 'critical')
  if (criticalErrors.length > 0) return 'error'
  if (validationErrors.length > 0) return 'warning'
  if (sectionCompletion === 100) return 'complete'
  if (sectionCompletion > 0) return 'partial'
  return 'incomplete'
}

