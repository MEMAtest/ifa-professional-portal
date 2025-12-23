'use client'

import React from 'react'
import { CheckCircle, ChevronRight, Clock } from 'lucide-react'

import { Card } from '@/components/assessments/client-hub/ui'

export function AssessmentHubSummaryCards(props: {
  overallProgress: number
  completedCount: number
  totalCount: number
  inProgressCount: number
  nextSuggestedLabel: string
}) {
  const { overallProgress, completedCount, totalCount, inProgressCount, nextSuggestedLabel } = props

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Overall Progress</p>
            <p className="text-3xl font-bold text-gray-900">{overallProgress}%</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <ChevronRight className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {completedCount}/{totalCount}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-3xl font-bold text-orange-600">{inProgressCount}</p>
          </div>
          <div className="p-3 bg-orange-100 rounded-lg">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Next Suggested</p>
            <p className="text-lg font-semibold text-gray-900">{nextSuggestedLabel}</p>
          </div>
          <ChevronRight className="h-8 w-8 text-gray-400" />
        </div>
      </Card>
    </div>
  )
}

