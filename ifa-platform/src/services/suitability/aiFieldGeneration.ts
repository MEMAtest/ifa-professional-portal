import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'

export async function generateSuitabilityFieldText(args: {
  clientId: string
  assessmentId: string
  fieldId: string
  formData: SuitabilityFormData
  pulledData?: PulledPlatformData
}): Promise<string> {
  const response = await fetch(`/api/assessments/suitability/${args.assessmentId}/generate-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: args.clientId,
      fieldId: args.fieldId,
      formData: args.formData,
      pulledData: args.pulledData ?? {}
    })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = payload?.error || 'AI generation failed'
    throw new Error(message)
  }

  const payload = await response.json()
  const generatedText = typeof payload?.generatedText === 'string' ? payload.generatedText : ''
  if (!generatedText) {
    throw new Error('AI response was empty')
  }

  return generatedText
}
