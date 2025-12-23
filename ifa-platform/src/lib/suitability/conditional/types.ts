import type { PulledPlatformData, SuitabilityField, SuitabilityFormData } from '@/types/suitability'

export interface ConditionalRule {
  id: string
  name: string
  sections: string[]
  condition: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => boolean
  actions: ConditionalAction[]
  priority: number
}

export interface ConditionalAction {
  type: 'show_field' | 'set_value' | 'require_field' | 'validate' | 'calculate' | 'show_section'
  sectionId: string
  fieldId?: string
  value?: any
  fields?: SuitabilityField[]
  message?: string
}

