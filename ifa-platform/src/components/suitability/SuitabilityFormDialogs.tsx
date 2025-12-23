import React from 'react'
import { History } from 'lucide-react'

import { Modal } from './SuitabilityFormModals'
import { AIAssistantPanel } from './AIAssistantPanel'
import { ValidationSummary } from '@/components/suitability/ValidationSummary'

import type { SuitabilityFormData, AISuggestion, ValidationError, ValidationWarning, PulledPlatformData } from '@/types/suitability'

type Props = {
  isAIOpen: boolean
  isValidationOpen: boolean
  isVersionHistoryOpen: boolean
  setAIOpen: (open: boolean) => void
  setValidationOpen: (open: boolean) => void
  setVersionHistoryOpen: (open: boolean) => void

  formData: SuitabilityFormData
  pulledData: PulledPlatformData | null
  aiSuggestions: Record<string, AISuggestion>
  onApplySuggestion: (sectionId: string, fieldId: string, value: any) => void
  onGenerateSuggestions: (sectionId: string) => Promise<void>

  combinedValidationErrors: ValidationError[]
  validationWarnings: ValidationWarning[]
  compliance: any
  onNavigateToError: (sectionId: string, fieldId: string) => void
}

export function SuitabilityFormDialogs(props: Props) {
  return (
    <>
      {props.isAIOpen && (
        <Modal
          isOpen={props.isAIOpen}
          onClose={() => props.setAIOpen(false)}
          title="AI Assistant"
          maxWidth="max-w-md"
        >
          {props.pulledData ? (
            <AIAssistantPanel
              formData={props.formData}
              pulledData={props.pulledData}
              suggestions={props.aiSuggestions}
              onApplySuggestion={(sectionId, fieldId, value) => props.onApplySuggestion(sectionId, fieldId, value)}
              onGenerateSuggestions={props.onGenerateSuggestions}
            />
          ) : (
            <div className="py-6 text-sm text-gray-600">
              AI suggestions will be available once client data has finished loading.
            </div>
          )}
        </Modal>
      )}

      {props.isValidationOpen && (
        <Modal
          isOpen={props.isValidationOpen}
          onClose={() => props.setValidationOpen(false)}
          title="Validation Summary"
        >
          <ValidationSummary
            errors={props.combinedValidationErrors}
            warnings={props.validationWarnings}
            compliance={props.compliance}
            onNavigateToError={props.onNavigateToError}
          />
        </Modal>
      )}

      {props.isVersionHistoryOpen && (
        <Modal
          isOpen={props.isVersionHistoryOpen}
          onClose={() => props.setVersionHistoryOpen(false)}
          title="Version History"
        >
          <div className="py-8 text-center text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Version history coming soon</p>
          </div>
        </Modal>
      )}
    </>
  )
}
