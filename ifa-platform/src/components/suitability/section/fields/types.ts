import type { PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'
import type { ExtendedSuitabilityField } from '../types'

export interface FieldAIContext {
  clientId?: string
  assessmentId?: string
  sectionId: string
  formData: SuitabilityFormData
  pulledData?: PulledPlatformData
  onGenerated: (text: string) => void
}

export interface FieldProps {
  field: ExtendedSuitabilityField
  value: any
  onChange: (value: any) => void
  onBlur?: () => void
  onFocus?: () => void
  error?: ValidationError
  warning?: string
  aiSuggestion?: any
  pulledValue?: any
  isReadOnly?: boolean
  isRequired?: boolean
  isLoading?: boolean
  showHelp?: boolean
  className?: string
  aiContext?: FieldAIContext
}
