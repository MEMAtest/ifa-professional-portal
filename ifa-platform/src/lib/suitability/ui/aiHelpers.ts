import type { AISuggestion, PulledPlatformData, SuitabilityFormData } from '@/types/suitability'

export function formatSectionLabel(sectionId: string): string {
  return sectionId.replace(/_/g, ' ')
}

export function canGenerateAISuggestions(args: {
  allowAI: boolean
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
}): { ok: true } | { ok: false; reason: string } {
  if (!args.allowAI) {
    return { ok: false, reason: 'AI assistant is disabled' }
  }

  if (!args.pulledData || typeof args.pulledData !== 'object') {
    return { ok: false, reason: 'Client data is not yet available' }
  }

  return { ok: true }
}

export function isValidAISuggestion(value: unknown): value is AISuggestion {
  return Boolean(value && typeof value === 'object' && 'insights' in (value as any))
}
