/**
 * Required Fields Validation Module
 *
 * FIX Issue 41 - ARCHITECTURE NOTE:
 * This module handles required field validation based on field definitions from sections.ts.
 * There is intentional overlap with validationEngine.ts, but they serve different purposes:
 *
 * - requiredFields.ts: Checks if fields marked as `required: true` in sections.ts have values.
 *   Used for form completion tracking and basic "is this field filled?" checks.
 *
 * - validationEngine.ts: Performs business logic validation (e.g., "is income > 0?",
 *   "do product amounts match investment?", FCA compliance rules).
 *
 * The CRITICAL_REQUIRED_FIELDS set below defines the minimum fields needed to submit.
 * The full required fields list in validationEngine.ts (getRequiredFields method) is more
 * comprehensive and used for final validation before report generation.
 *
 * Future consideration: These could be consolidated into a single validation system with
 * different severity levels (blocking vs warning).
 */
import type { PulledPlatformData, SuitabilityField, SuitabilityFormData, ValidationError } from '@/types/suitability'
import { suitabilitySections } from '@/config/suitability/sections'
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'

// Some fields are marked required in the UI config but are not mandatory for a draft to be considered usable.
export const REQUIRED_FIELD_EXCEPTIONS = new Set<string>([
  'personal_information.ni_number',
  'contact_details.address'
])

// A small set of missing fields should block submission.
export const CRITICAL_REQUIRED_FIELDS = new Set<string>([
  'personal_information.client_name',
  'personal_information.date_of_birth',
  'contact_details.email',
  'objectives.primary_objective',
  'risk_assessment.attitude_to_risk',
  'recommendation.recommendation_rationale',
  'suitability_declaration.best_interests_declaration'
])

export function isMissingRequiredValue(field: Pick<SuitabilityField, 'type' | 'options'>, value: any): boolean {
  if (value === null || value === undefined) return true

  switch (field.type) {
    case 'checkbox': {
      // FIX Issue 4: Handle all checkbox scenarios consistently
      // - Multi-option checkboxes (options.length > 1): expect array with selections
      // - Single-option checkboxes (options.length === 1): can be array with one item OR boolean/string
      // - Boolean checkboxes (no options): expect true or 'Yes'
      if (Array.isArray(field.options) && field.options.length > 0) {
        // Has options defined - could be stored as array
        if (Array.isArray(value)) {
          return value.length === 0
        }
        // Single option might be stored as boolean or string
        if (field.options.length === 1) {
          return !(value === true || value === 'Yes' || value === field.options[0])
        }
        return true // Multi-option but not an array - invalid
      }
      // No options - simple boolean checkbox
      return !(value === true || value === 'Yes')
    }
    case 'number': {
      if (value === '') return true
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isNaN(n)
    }
    case 'address': {
      if (typeof value === 'string') return value.trim().length === 0
      if (typeof value === 'object') return Object.keys(value).length === 0
      return true
    }
    default: {
      if (Array.isArray(value)) return value.length === 0
      return String(value).trim().length === 0
    }
  }
}

export function getRequiredFieldsForSection(
  sectionId: string,
  formData: SuitabilityFormData,
  pulledData: PulledPlatformData
): SuitabilityField[] {
  const section = (suitabilitySections as any[]).find((s) => s.id === sectionId)
  const baseFields = ((section?.fields || []) as SuitabilityField[]).filter(Boolean)
  const conditionalGroups = conditionalLogicEngine.getConditionalFields(sectionId, formData, pulledData)
  const conditionalFields = conditionalGroups.flatMap((g: any) => (g.fields || []) as SuitabilityField[])

  const uniqueById = new Map<string, SuitabilityField>()
  for (const field of [...baseFields, ...conditionalFields]) {
    if (!field?.id) continue
    if (!uniqueById.has(field.id)) uniqueById.set(field.id, field)
  }

  return Array.from(uniqueById.values()).filter((f) => Boolean(f.required))
}

export function getMissingRequiredFieldErrorsForSection(
  sectionId: string,
  formData: SuitabilityFormData,
  pulledData: PulledPlatformData,
  opts: { onlyIfStarted?: boolean } = {}
): ValidationError[] {
  const sectionData = (formData as any)?.[sectionId] || {}

  if (opts.onlyIfStarted) {
    const userKeys = Object.keys(sectionData).filter((k) => !k.startsWith('_'))
    if (userKeys.length === 0) return []
  }

  const errors: ValidationError[] = []
  const requiredFields = getRequiredFieldsForSection(sectionId, formData, pulledData)

  for (const field of requiredFields) {
    const path = `${sectionId}.${field.id}`
    if (REQUIRED_FIELD_EXCEPTIONS.has(path)) continue
    const value = sectionData?.[field.id]
    if (!isMissingRequiredValue(field, value)) continue
    errors.push({
      sectionId,
      fieldId: field.id,
      message: `${field.label || field.id} is required`,
      severity: CRITICAL_REQUIRED_FIELDS.has(path) ? 'critical' : 'error',
      code: 'REQUIRED_FIELD_MISSING'
    })
  }

  return errors
}

export function getMissingRequiredFieldErrors(
  formData: SuitabilityFormData,
  pulledData: PulledPlatformData
): ValidationError[] {
  const errors: ValidationError[] = []
  for (const section of suitabilitySections as any[]) {
    errors.push(...getMissingRequiredFieldErrorsForSection(section.id, formData, pulledData))
  }
  return errors
}

