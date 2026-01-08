import React from 'react'
import { RefreshCw, ClipboardList, AlertTriangle } from 'lucide-react'
import type { RiskReconciliationResult } from '@/lib/assessments/riskReconciliation'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'

type AtrCflData = {
  atrScore?: number | null
  atrCategory?: string | null
  cflScore?: number | null
  cflCategory?: string | null
}

type PersonaAssessmentRow = {
  persona_type?: string | null
  persona_level?: number | string | null
}

interface AssessmentStatusCardProps {
  assessmentsNeedUpdate: boolean
  isLoading: boolean
  onRefresh: () => void
  atrCflData?: AtrCflData | null
  personaAssessment?: PersonaAssessmentRow | null
  isATRComplete: boolean
  isCFLComplete: boolean
  isPersonaComplete: boolean
  reconciledRisk: RiskReconciliationResult
  onReviewRisk?: () => void
}

export function AssessmentStatusCard(props: AssessmentStatusCardProps) {
  const showReviewAction = typeof props.onReviewRisk === 'function'

  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-600" />
              <h3 className="font-semibold text-sm text-gray-900">Assessment Status</h3>
              {props.assessmentsNeedUpdate ? (
                <Badge variant="warning">Review due</Badge>
              ) : (
                <Badge variant="secondary">Up to date</Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">Uses the latest ATR/CFL/Persona assessments to inform suitability.</p>
          </div>
          <Button variant="outline" size="sm" onClick={props.onRefresh} disabled={props.isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">ATR</span>
              {props.isATRComplete ? <Badge variant="success">Complete</Badge> : <Badge variant="secondary">Missing</Badge>}
            </div>
            <div className="mt-1 font-medium">
              {props.atrCflData?.atrScore != null ? `${props.atrCflData.atrScore}/10` : 'Not assessed'}
              {props.atrCflData?.atrCategory ? ` • ${props.atrCflData.atrCategory}` : ''}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">CFL</span>
              {props.isCFLComplete ? <Badge variant="success">Complete</Badge> : <Badge variant="secondary">Missing</Badge>}
            </div>
            <div className="mt-1 font-medium">
              {props.atrCflData?.cflScore != null ? `${props.atrCflData.cflScore}/10` : 'Not assessed'}
              {props.atrCflData?.cflCategory ? ` • ${props.atrCflData.cflCategory}` : ''}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Persona</span>
              {props.isPersonaComplete ? (
                <Badge variant="success">Complete</Badge>
              ) : (
                <Badge variant="secondary">Missing</Badge>
              )}
            </div>
            <div className="mt-1 font-medium">
              {props.personaAssessment?.persona_type
                ? `${props.personaAssessment.persona_type}${
                    props.personaAssessment.persona_level ? ` (${props.personaAssessment.persona_level})` : ''
                  }`
                : 'Not assessed'}
            </div>
          </div>
        </div>

        {props.reconciledRisk.flags.length > 0 ? (
          <Alert
            className="mt-3"
            variant={props.reconciledRisk.flags.some((f) => f.severity === 'critical') ? 'destructive' : 'default'}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">
                Reconciled risk: {props.reconciledRisk.finalRiskScore ?? '—'}/10 • {props.reconciledRisk.finalRiskCategory}
              </div>
              <div className="text-xs mt-1">{props.reconciledRisk.flags.map((f) => f.message).join(' ')}</div>
              <div className="text-xs mt-2 text-gray-700">
                Review ATR/CFL/Persona results or update the Risk Assessment section if this mismatch doesn't reflect the client's profile.
              </div>
              {showReviewAction && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={props.onReviewRisk}>
                    Review risk assessment
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              Reconciled risk: {props.reconciledRisk.finalRiskScore ?? '—'}/10 • {props.reconciledRisk.finalRiskCategory}
            </span>
            {showReviewAction && (
              <Button size="sm" variant="outline" onClick={props.onReviewRisk}>
                Review risk assessment
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
