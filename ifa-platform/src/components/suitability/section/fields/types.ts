import type { ValidationError } from '@/types/suitability'
import type { ExtendedSuitabilityField } from '../types'

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
}

