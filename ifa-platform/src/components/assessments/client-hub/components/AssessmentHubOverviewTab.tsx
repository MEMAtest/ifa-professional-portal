'use client'

import React from 'react'
import { format } from 'date-fns'
import { ChevronRight, Clock, Eye } from 'lucide-react'

import { assessmentTypes } from '@/components/assessments/client-hub/assessmentTypes'
import { getAssessmentColorClasses } from '@/components/assessments/client-hub/utils'
import { Card } from '@/components/assessments/client-hub/ui'

export function AssessmentHubOverviewTab(props: {
  getAssessmentStatus: (assessmentId: string) => any
  getStatusBadge: (status: string, version?: number | null) => React.ReactNode
  onStartAssessment: (assessmentId: string) => void
  onViewResults: (assessmentId: string) => void
}) {
  const { getAssessmentStatus, getStatusBadge, onStartAssessment, onViewResults } = props

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Assessments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(assessmentTypes)
            .sort((a, b) => a.order - b.order)
            .map((assessment) => {
              const status = getAssessmentStatus(assessment.id)
              const colors = getAssessmentColorClasses(assessment.color)
              const Icon = assessment.icon

              return (
                <Card
                  key={assessment.id}
                  onClick={() => {
                    if (status.status === 'completed') {
                      onViewResults(assessment.id)
                    } else {
                      onStartAssessment(assessment.id)
                    }
                  }}
                  className="p-6 hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg ${colors.bg}`}>
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                        <p className="text-sm text-gray-600">{assessment.description}</p>
                      </div>
                    </div>
                    {getStatusBadge(status.status, status.version)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{status.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${colors.bg}`} style={{ width: `${status.percentage}%` }} />
                    </div>

                    {status.versionInfo && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Current Version:</span>
                          <span className="font-semibold">Version {status.versionInfo.version}</span>
                        </div>
                        {status.date && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Last Updated:</span>
                            <span>{format(new Date(status.date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {status.versionInfo.category && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Result:</span>
                            <span className="font-medium">{status.versionInfo.category}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-center mt-2">
                          <span className="text-xs text-blue-600 flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {status.status === 'completed' ? 'Click to view full history' : 'Click to continue assessment'}
                          </span>
                        </div>
                      </div>
                    )}

                    {status.status === 'not_started' && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-gray-600">
                          <Clock className="h-4 w-4 inline mr-1" />
                          {assessment.estimatedTime}
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    )}

                    {status.status === 'in_progress' && (
                      <div className="flex items-center justify-center mt-4">
                        <span className="text-sm text-blue-600 font-medium">Continue Assessment →</span>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
}

