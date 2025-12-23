import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'

import type { SuitabilityBranding } from './styles'
import type { SuitabilityReportProps } from './reportDocument'
import { SuitabilityReportDocument } from './reportDocument'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'

export async function generateSuitabilityReportPDF(
  data: SuitabilityReportData,
  branding?: SuitabilityBranding,
  charts?: SuitabilityReportProps['charts'],
  variant: SuitabilityReportProps['variant'] = 'fullReport'
): Promise<Buffer> {
  const element = React.createElement(SuitabilityReportDocument, { data, branding, charts, variant }) as any
  const buffer = await renderToBuffer(element)
  return buffer as Buffer
}
