// src/components/assessment/AssessmentCompletionActions.tsx
import { useState } from 'react'
import ReportGenerationModal from '@/components/documents/ReportGenerationModal'
import { Button } from '@/components/ui/Button'
import { FileText, Download, Send } from 'lucide-react'

interface AssessmentCompletionActionsProps {
  assessment: any
  clientId: string
  clientName: string
  clientEmail?: string
}

export function AssessmentCompletionActions({ 
  assessment,
  clientId,
  clientName,
  clientEmail
}: AssessmentCompletionActionsProps) {
  const [showReportModal, setShowReportModal] = useState(false)

  return (
    <>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {showReportModal && (
        <ReportGenerationModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          assessmentData={assessment}
          assessmentType={assessment.type}
          clientId={clientId}
          clientName={clientName}
          clientEmail={clientEmail}
        />
      )}
    </>
  )
}