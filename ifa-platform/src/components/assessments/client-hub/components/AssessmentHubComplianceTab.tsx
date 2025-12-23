'use client'

import React from 'react'
import { CheckCircle, Info, AlertCircle } from 'lucide-react'

import type { ComplianceAlert } from '@/types/assessment'
import { assessmentTypes } from '@/components/assessments/client-hub/assessmentTypes'
import { Alert, Button, Card } from '@/components/assessments/client-hub/ui'

export function AssessmentHubComplianceTab(props: { alerts: ComplianceAlert[]; onUpdate: (assessmentType: string) => void }) {
  const { alerts, onUpdate } = props

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h2>
      {alerts.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Current</h3>
          <p className="text-gray-600">No compliance issues detected</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const assessment = (assessmentTypes as any)[alert.assessmentType]
            return (
              <Alert key={alert.id} variant={alert.severity === 'high' ? 'danger' : 'warning'}>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{assessment?.name || alert.assessmentType}</h4>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                  <Button size="sm" onClick={() => onUpdate(alert.assessmentType)}>
                    Update
                  </Button>
                </div>
              </Alert>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-3">Compliance Guidelines</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Annual review recommended for all assessments</span>
          </div>
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Material changes may trigger reassessment needs</span>
          </div>
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Version history is maintained for all assessments</span>
          </div>
        </div>
      </div>
    </div>
  )
}

