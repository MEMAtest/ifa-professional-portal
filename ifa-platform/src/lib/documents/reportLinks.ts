import type { RequestResult, SuitabilityReportVariant } from './requestAssessmentReport'

export type ReportLink = {
  url: string
  fileName: string
  isObjectUrl: boolean
}

export function buildReportLink(args: {
  result: RequestResult
  reportType: SuitabilityReportVariant
}): ReportLink | null {
  const fileName = args.result.fileName || `suitability-${args.reportType}.pdf`

  if (args.result.inlinePdf) {
    const bytes = Uint8Array.from(atob(args.result.inlinePdf), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    return {
      url: URL.createObjectURL(blob),
      fileName,
      isObjectUrl: true
    }
  }

  if (args.result.signedUrl) {
    return {
      url: args.result.signedUrl,
      fileName,
      isObjectUrl: false
    }
  }

  if (args.result.documentId) {
    return {
      url: `/api/documents/download/${args.result.documentId}`,
      fileName,
      isObjectUrl: false
    }
  }

  return null
}
