import type { SuitabilityField } from '@/types/suitability'

export interface ExtendedSuitabilityField extends SuitabilityField {
  maxLength?: number
  autoComplete?: string
  min?: number | string
  max?: number | string
  step?: number | string
  rows?: number
  fullWidth?: boolean
  readOnly?: boolean
  pattern?: string
  mask?: string
  transform?: (value: any) => any
  format?: (value: any) => string
}

