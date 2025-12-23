import { clearLocalSuitabilityDraft, finalizeSuitabilityAssessment } from '@/lib/suitability/client'
import type { SuitabilityFormData } from '@/types/suitability'

export async function finalizeSuitabilityAndBuildRedirect(args: {
  clientId: string
  assessmentId?: string
  fallbackAssessmentId?: string
  formData: SuitabilityFormData
  completionPercentage: number
  onSaved?: (assessmentId: string) => void
  onComplete?: (data: SuitabilityFormData) => void
}): Promise<{ finalAssessmentId?: string; destination: string }> {
  const { assessmentId: savedId } = await finalizeSuitabilityAssessment({
    clientId: args.clientId,
    assessmentId: args.assessmentId,
    formData: args.formData,
    completionPercentage: args.completionPercentage
  })

  const finalAssessmentId: string | undefined = savedId || args.fallbackAssessmentId

  if (args.onSaved && finalAssessmentId) {
    args.onSaved(finalAssessmentId)
  }

  clearLocalSuitabilityDraft(args.clientId)

  if (args.onComplete) {
    args.onComplete(args.formData)
  }

  const destination = finalAssessmentId
    ? `/assessments/suitability/results/${args.clientId}?assessmentId=${finalAssessmentId}`
    : `/assessments/suitability/results/${args.clientId}`

  return { finalAssessmentId, destination }
}
