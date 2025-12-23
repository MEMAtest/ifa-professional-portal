import type { SuitabilityFormData } from '@/types/suitability'

export async function finalizeSuitabilityAssessment(args: {
  clientId: string
  assessmentId?: string
  formData: SuitabilityFormData
  completionPercentage: number
}): Promise<{ assessmentId?: string }> {
  const response = await fetch('/api/assessments/suitability/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: args.clientId,
      assessmentId: args.assessmentId,
      formData: args.formData,
      completionPercentage: args.completionPercentage
    })
  })

  const result = (await response.json().catch(() => null)) as any

  if (!response.ok || result?.error) {
    throw new Error(result?.error || `Finalize failed with status ${response.status}`)
  }

  return { assessmentId: result?.assessmentId }
}

export function clearLocalSuitabilityDraft(clientId: string) {
  try {
    localStorage.removeItem(`suitability_draft_${clientId}`)
  } catch {
    // Non-critical (e.g., disabled storage)
  }
}
