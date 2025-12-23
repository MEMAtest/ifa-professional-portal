'use client'

import React from 'react'
import { format } from 'date-fns'
import { Calendar, CheckCircle, Clock, History } from 'lucide-react'

import type { AssessmentHistory } from '@/types/assessment'
import { assessmentTypes } from '@/components/assessments/client-hub/assessmentTypes'
import { Badge, Card } from '@/components/assessments/client-hub/ui'

export function AssessmentHubHistoryTab(props: { history: AssessmentHistory[] }) {
  const { history } = props

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No assessment history yet</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const normalizedType = entry.assessment_type.replace('_', '-')
        const assessment = (assessmentTypes as any)[entry.assessment_type] || (assessmentTypes as any)[normalizedType]

        return (
          <Card key={entry.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {entry.action === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : entry.action === 'saved' ? (
                    <History className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {assessment?.name || entry.assessment_type} - {entry.action}
                  </p>
                  <p className="text-sm text-gray-600">{format(new Date(entry.performed_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="text-sm text-gray-500">
                  {entry.metadata.version && <Badge variant="secondary">v{entry.metadata.version}</Badge>}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

