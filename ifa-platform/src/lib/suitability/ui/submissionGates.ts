import type { ValidationError } from '@/types/suitability'

import { getIncompleteRequiredSections, type SectionLike } from './submitHelpers'

export type NotificationSpec = {
  title: string
  description: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export type ComplianceLike = {
  compliant: boolean
  remediations?: string[]
}

export type SubmissionGate =
  | { kind: 'proceed' }
  | {
      kind: 'block'
      notification: NotificationSpec
      navigateToSectionId?: string
      openValidation?: boolean
    }
  | { kind: 'confirm'; message: string; onCancelShowValidation?: boolean }

export function getCompletionGate(args: {
  completionScore: number
  sections: SectionLike[]
  sectionProgress: Record<string, number>
}): SubmissionGate {
  if (args.completionScore >= 80) return { kind: 'proceed' }

  const incompleteSections = getIncompleteRequiredSections(args.sections, args.sectionProgress)
  const missingTitles = incompleteSections.map(s => s.title)

  if (incompleteSections.length > 0) {
    return {
      kind: 'block',
      notification: {
        title: 'Incomplete Assessment',
        description: `Please complete: ${missingTitles.join(', ')} (${args.completionScore}% complete)`,
        type: 'warning'
      },
      navigateToSectionId: incompleteSections[0].id,
      openValidation: true
    }
  }

  if (args.completionScore < 100) {
    return {
      kind: 'confirm',
      message: `Assessment is ${args.completionScore}% complete. Some non-critical fields are not filled. Do you want to continue with submission?`
    }
  }

  return { kind: 'proceed' }
}

export function getValidationGate(args: {
  completionScore: number
  submissionValidationErrors: ValidationError[]
  sections?: SectionLike[]
}): SubmissionGate {
  const criticalErrors = args.submissionValidationErrors.filter(e => e.severity === 'critical')
  if (criticalErrors.length > 0) {
    const first = criticalErrors[0]
    const sectionTitle = args.sections?.find((s) => s.id === first.sectionId)?.title || first.sectionId
    const top = criticalErrors
      .slice(0, 3)
      .map((e) => {
        const title = args.sections?.find((s) => s.id === e.sectionId)?.title || e.sectionId
        return `${title}: ${e.message}`
      })
      .join(' • ')
    return {
      kind: 'block',
      notification: {
        title: 'Critical Validation Errors',
        description: `${criticalErrors.length} critical error${criticalErrors.length !== 1 ? 's' : ''} must be corrected. ${top}`,
        type: 'error'
      },
      navigateToSectionId: first.sectionId,
      openValidation: true
    }
  }

  if (args.submissionValidationErrors.length > 0) {
    const noCriticalErrors = args.submissionValidationErrors.every(e => e.severity !== 'critical')
    const first = args.submissionValidationErrors[0]
    const top = args.submissionValidationErrors
      .slice(0, 3)
      .map((e) => {
        const title = args.sections?.find((s) => s.id === e.sectionId)?.title || e.sectionId
        return `${title}: ${e.message}`
      })
      .join(' • ')

    if (noCriticalErrors && args.completionScore >= 80) {
      return {
        kind: 'confirm',
        message: `There are ${args.submissionValidationErrors.length} validation issue${args.submissionValidationErrors.length !== 1 ? 's' : ''}. Do you want to submit anyway?`,
        onCancelShowValidation: true
      }
    }

    return {
      kind: 'block',
      notification: {
        title: 'Validation Errors',
        description: `Please fix ${args.submissionValidationErrors.length} validation error${args.submissionValidationErrors.length !== 1 ? 's' : ''} before submitting. ${top}`,
        type: 'warning'
      },
      navigateToSectionId: first.sectionId,
      openValidation: true
    }
  }

  return { kind: 'proceed' }
}

export function getComplianceGate(args: { compliance: ComplianceLike }): SubmissionGate {
  if (args.compliance.compliant) return { kind: 'proceed' }

  const first = args.compliance.remediations?.[0]
  const isCriticalCompliance = Boolean(
    args.compliance.remediations?.some(r => r.includes('FCA') || r.includes('regulatory'))
  )

  if (!isCriticalCompliance) return { kind: 'proceed' }

  return {
    kind: 'block',
    notification: {
      title: 'Compliance Check Failed',
      description: first || 'FCA requirements not met',
      type: 'error'
    },
    openValidation: true
  }
}
