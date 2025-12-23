import type { NotificationOptions } from '@/components/suitability/SuitabilityFormModals'
import { requestAssessmentReport, type SuitabilityReportVariant } from '@/lib/documents/requestAssessmentReport'
import { buildSuitabilityDraftHtml } from '@/lib/suitability/draftHtmlReport'
import type { SuitabilityFormData } from '@/types/suitability'

type ShowNotification = (options: NotificationOptions) => void

export async function generateSuitabilityDraftHtmlReport(args: {
  formData: SuitabilityFormData
  completionScore: number
  clientRef?: string
  activeAssessmentId?: string
  assessmentId?: string
  showNotification: ShowNotification
}) {
  try {
    args.showNotification({
      title: 'Generating Report',
      description: 'Please wait...',
      type: 'info'
    })

    const clientName = args.formData.personal_information?.client_name || 'Client'
    const clientRef =
      args.clientRef || args.formData.personal_information?.client_reference || args.activeAssessmentId || args.assessmentId || 'N/A'
    const htmlContent = buildSuitabilityDraftHtml({ formData: args.formData, completionScore: args.completionScore, clientRef })

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const newWindow = window.open(url, '_blank')

    if (newWindow) {
      args.showNotification({
        title: 'Report Generated',
        description: 'Draft report opened in new tab',
        type: 'success'
      })
      return
    }

    const a = document.createElement('a')
    a.href = url
    a.download = `suitability-report-${clientName.replace(/\\s+/g, '-')}-draft.html`
    a.click()
    args.showNotification({
      title: 'Report Downloaded',
      description: 'Draft report downloaded (popup may be blocked)',
      type: 'success'
    })
  } catch (error) {
    console.error('Draft report error:', error)
    args.showNotification({
      title: 'Generation Failed',
      description: error instanceof Error ? error.message : 'Could not generate draft report',
      type: 'error'
    })
  }
}

export async function generateSuitabilityPdfReport(args: {
  reportType?: SuitabilityReportVariant
  activeAssessmentId?: string
  assessmentId?: string
  clientId: string
  showNotification: ShowNotification
}) {
  const reportType = args.reportType ?? 'fullReport'
  const effectiveAssessmentId = args.activeAssessmentId || args.assessmentId

  if (!effectiveAssessmentId) {
    args.showNotification({
      title: 'Cannot Generate Report',
      description: 'Please save the assessment first before generating a report',
      type: 'error'
    })
    return
  }

  try {
    args.showNotification({
      title: 'Generating PDF Report',
      description: `Creating ${reportType.replace(/([A-Z])/g, ' $1').trim()}...`,
      type: 'info'
    })

    const result = await requestAssessmentReport({
      assessmentType: 'suitability',
      assessmentId: effectiveAssessmentId,
      clientId: args.clientId,
      reportType,
      allowAutoFallbackToWarnings: true
    })

    if (result.fallbackToWarningsUsed) {
      const missingCount = result.missingFields?.length ?? 0
      args.showNotification({
        title: 'Generated Draft PDF',
        description:
          missingCount > 0
            ? `Final report incomplete (${missingCount} missing). Generated draft PDF with warnings.`
            : 'Final report incomplete. Generated draft PDF with warnings.',
        type: 'warning'
      })
    }

    if (result.inlinePdf) {
      const pdfBlob = Uint8Array.from(atob(result.inlinePdf), (c) => c.charCodeAt(0))
      const blob = new Blob([pdfBlob], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')

      args.showNotification({
        title: 'Report Generated',
        description: 'PDF report opened in new tab',
        type: 'success'
      })
      return
    }

    if (result.signedUrl) {
      window.open(result.signedUrl, '_blank')
      args.showNotification({
        title: 'Report Generated',
        description: 'PDF report opened in new tab',
        type: 'success'
      })
      return
    }

    args.showNotification({
      title: 'Report Saved',
      description: 'Report has been generated and saved to documents',
      type: 'success'
    })
  } catch (error) {
    console.error('PDF report generation error:', error)
    args.showNotification({
      title: 'Report Generation Failed',
      description: error instanceof Error ? error.message : 'Could not generate PDF report',
      type: 'error'
    })
  }
}

