import React from 'react'
import { BarChart3, FileText, History, Loader2, Send, Shield, Share2, User } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

import type { SuitabilityReportVariant } from '@/lib/documents/requestAssessmentReport'

type Props = {
  mode: 'create' | 'edit' | 'view'
  completionScore: number
  isSubmitting: boolean
  canGenerateReports: boolean
  onSubmit: () => void
  onPreviewHtml: () => void
  onGeneratePdf: (variant: SuitabilityReportVariant) => void
  onShowHistory: () => void
  onShare: () => void
}

export function SuitabilityActionsCard(props: Props) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Actions</h3>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.mode !== 'view' && (
          <Button
            size="sm"
            className="w-full justify-start"
            onClick={props.onSubmit}
            disabled={props.completionScore < 80 || props.isSubmitting}
          >
            {props.isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Assessment
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={props.onPreviewHtml}
        >
          <FileText className="h-4 w-4 mr-2" />
          Preview (HTML)
        </Button>

        <div className="border-t pt-2 mt-2">
          <p className="text-xs text-gray-500 mb-2 font-medium">Generate PDF Report</p>
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => props.onGeneratePdf('fullReport')}
              disabled={!props.canGenerateReports}
            >
              <FileText className="h-3 w-3 mr-1" />
              Full
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => props.onGeneratePdf('clientLetter')}
              disabled={!props.canGenerateReports}
            >
              <User className="h-3 w-3 mr-1" />
              Letter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => props.onGeneratePdf('executiveSummary')}
              disabled={!props.canGenerateReports}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => props.onGeneratePdf('complianceReport')}
              disabled={!props.canGenerateReports}
            >
              <Shield className="h-3 w-3 mr-1" />
              FCA
            </Button>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={props.onShowHistory}>
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>

        <Button variant="outline" size="sm" className="w-full justify-start" onClick={props.onShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </CardContent>
    </Card>
  )
}

