import type { PulledPlatformData, SuitabilityFormData, ValidationResult } from '@/types/suitability'

export interface ValidationRule {
  id: string
  name: string
  section: string
  field?: string
  validate: (value: any, formData: SuitabilityFormData, pulledData: PulledPlatformData) => ValidationResult
  severity: 'error' | 'warning' | 'info'
  fcaReference?: string
}

export interface ComplianceRule {
  id: string
  name: string
  fcaCode: string
  description: string
  validate: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => boolean
  remediation: string
}

