import React from 'react'

import { SuitabilityActionsCard } from './SuitabilityActionsCard'
import { SuitabilityHelpCard } from './SuitabilityHelpCard'
import { SuitabilityProgressCard } from './SuitabilityProgressCard'

import type { SuitabilityReportVariant } from '@/lib/documents/requestAssessmentReport'
import type { SuitabilityFormData } from '@/types/suitability'

type Props = {
  mode: 'create' | 'edit' | 'view'
  completionScore: number
  completedSectionsCount: number
  totalSectionsCount: number
  validationIssueCount: number
  formData: SuitabilityFormData

  isSubmitting: boolean
  canGenerateReports: boolean
  onSubmit: () => void
  onPreviewHtml: () => void
  onGeneratePdf: (variant: SuitabilityReportVariant) => void
  onShowHistory: () => void
  onShare: () => void

  autoSaveIntervalMs: number
}

export function SuitabilityRightSidebar(props: Props) {
  return (
    <div className="sticky top-24 space-y-4">
      <SuitabilityProgressCard
        completionScore={props.completionScore}
        completedSectionsCount={props.completedSectionsCount}
        totalSectionsCount={props.totalSectionsCount}
        validationIssueCount={props.validationIssueCount}
      />

      <SuitabilityActionsCard
        mode={props.mode}
        completionScore={props.completionScore}
        isSubmitting={props.isSubmitting}
        canGenerateReports={props.canGenerateReports}
        onSubmit={props.onSubmit}
        onPreviewHtml={props.onPreviewHtml}
        onGeneratePdf={props.onGeneratePdf}
        onShowHistory={props.onShowHistory}
        onShare={props.onShare}
        formData={props.formData}
      />

      <SuitabilityHelpCard autoSaveIntervalMs={props.autoSaveIntervalMs} />
    </div>
  )
}
