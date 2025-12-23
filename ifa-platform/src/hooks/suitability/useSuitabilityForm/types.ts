import type { SuitabilityFormData } from '@/types/suitability'

export interface UseSuitabilityFormOptions {
  clientId?: string
  assessmentId?: string
  isProspect?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
  syncEnabled?: boolean
  enableConditionalLogic?: boolean
  enableValidation?: boolean
  onSave?: (data: SuitabilityFormData) => Promise<void>
  onFieldChange?: (sectionId: string, fieldId: string, value: any) => void
  onSectionChange?: (sectionId: string) => void
  onValidationChange?: (errors: any[]) => void
}

export interface UpdateFieldOptions {
  aiSuggested?: boolean
  skipValidation?: boolean
  skipConditionalLogic?: boolean
  broadcast?: boolean
  source?: 'user' | 'system' | 'ai' | 'external'
}

export interface UpdateSectionOptions {
  replace?: boolean
  skipValidation?: boolean
}

export interface FormMetrics {
  changesCount: number
  lastModified: Date | null
  autoSavesCount: number
  validationRunsCount: number
  conditionalActionsCount: number
  consecutiveErrors: number
  lastError: string | null
  failedSaveAttempts: number
  successfulSaves: number
}

export interface SaveState {
  isSaving: boolean
  lastSaved: Date | null
  lastError: string | null
  retryCount: number
  maxRetries: number
  nextRetryAt: Date | null
}
