import { suitabilitySections } from '@/config/suitability/sections'
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'
import { REQUIRED_SUITABILITY_SECTION_IDS } from '@/lib/suitability/requirements'
import type { PulledPlatformData, SuitabilityField, SuitabilityFormData } from '@/types/suitability'

const COMPLETION_FIELD_EXCEPTIONS = new Set<string>([
  'personal_information.ni_number',
  'contact_details.address'
])

const hasMeaningfulValue = (field: SuitabilityField, value: any): boolean => {
  if (value === null || value === undefined) return false

  switch (field.type) {
    case 'checkbox': {
      if (Array.isArray(value)) return value.length > 0
      return value === true || value === 'Yes'
    }
    case 'number': {
      if (value === '') return false
      const num = typeof value === 'number' ? value : Number(value)
      return !Number.isNaN(num)
    }
    case 'address': {
      if (typeof value === 'string') return value.trim().length > 0
      if (typeof value === 'object') return Object.keys(value).length > 0
      return false
    }
    default: {
      if (Array.isArray(value)) return value.length > 0
      return String(value).trim().length > 0
    }
  }
}

const uniqueFieldsById = (fields: SuitabilityField[]): SuitabilityField[] => {
  const map = new Map<string, SuitabilityField>()
  for (const field of fields) {
    if (!field?.id) continue
    if (!map.has(field.id)) map.set(field.id, field)
  }
  return Array.from(map.values())
}

export type SuitabilityCompletion = {
  overallPercentage: number
  requiredFieldsTotal: number
  requiredFieldsCompleted: number
  sectionProgress: Record<string, number>
  completedSections: string[]
}

export function calculateSuitabilityCompletion(
  formData: SuitabilityFormData,
  pulledData: PulledPlatformData = {}
): SuitabilityCompletion {
  const sectionProgress: Record<string, number> = {}

  let requiredFieldsTotal = 0
  let requiredFieldsCompleted = 0

  const requiredSectionIds = new Set<string>(REQUIRED_SUITABILITY_SECTION_IDS as unknown as string[])

  for (const section of suitabilitySections as any[]) {
    const sectionId = section.id as string
    const sectionData = ((formData as any)?.[sectionId] || {}) as Record<string, any>
    const isRequiredSection = requiredSectionIds.has(sectionId)

    const baseFields = (section.fields || []) as SuitabilityField[]
    const conditionalGroups = conditionalLogicEngine.getConditionalFields(sectionId, formData, pulledData)
    const conditionalFields = conditionalGroups.flatMap((g) => (g.fields || []) as SuitabilityField[])
    const allFields = uniqueFieldsById([...baseFields, ...conditionalFields])

    const requiredFields = allFields.filter((f) => {
      if (!f?.required) return false
      return !COMPLETION_FIELD_EXCEPTIONS.has(`${sectionId}.${f.id}`)
    })

    if (requiredFields.length === 0) {
      const hasAnyData = Object.entries(sectionData).some(([key, value]) => {
        if (key.startsWith('_')) return false
        if (value === null || value === undefined || value === '') return false
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === 'object') return Object.keys(value).length > 0
        return true
      })
      sectionProgress[sectionId] = hasAnyData ? 100 : 0
      continue
    }

    let completedForSection = 0
    for (const field of requiredFields) {
      if (isRequiredSection) {
        requiredFieldsTotal += 1
      }
      const value = sectionData?.[field.id]
      if (hasMeaningfulValue(field, value)) {
        if (isRequiredSection) {
          requiredFieldsCompleted += 1
        }
        completedForSection += 1
      }
    }

    sectionProgress[sectionId] = Math.round((completedForSection / requiredFields.length) * 100)
  }

  const overallPercentage =
    requiredFieldsTotal > 0 ? Math.round((requiredFieldsCompleted / requiredFieldsTotal) * 100) : 0

  const completedSections = Object.entries(sectionProgress)
    .filter(([, pct]) => pct === 100)
    .map(([id]) => id)

  return {
    overallPercentage,
    requiredFieldsTotal,
    requiredFieldsCompleted,
    sectionProgress,
    completedSections
  }
}
