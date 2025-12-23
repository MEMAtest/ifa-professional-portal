import type { SuitabilityFormData } from '@/types/suitability'

export type SectionLike = {
  id: string
  title: string
  required?: boolean
}

export function getIncompleteRequiredSections(
  sections: SectionLike[],
  sectionProgress: Record<string, number>
): SectionLike[] {
  return sections.filter((s) => s.required && (sectionProgress[s.id] ?? 0) < 100)
}

export function getSubmissionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Failed to submit assessment'

  if (error.message.includes('duplicate key')) {
    return 'An assessment already exists for this client. Please update the existing assessment instead.'
  }
  if (error.message.includes('foreign key')) {
    return 'Client not found. Please ensure the client exists before submitting.'
  }
  if (error.message.toLowerCase().includes('permission')) {
    return 'You do not have permission to submit assessments.'
  }

  return error.message || 'Failed to submit assessment'
}

export function getClientRefForDraft(formData: SuitabilityFormData, fallback: string): string {
  return formData.personal_information?.client_reference || fallback
}

