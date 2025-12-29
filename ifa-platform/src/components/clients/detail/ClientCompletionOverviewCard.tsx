'use client'

import React from 'react'
import { CheckCircle, Clock } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/Card'
import type { ClientIntegrationStatus } from './types'

export function ClientCompletionOverviewCard(props: {
  completionPercentage: number
  integrationStatus: ClientIntegrationStatus
}) {
  const { completionPercentage, integrationStatus } = props

  const items: Array<{ label: string; ready: boolean }> = [
    { label: 'Assessment', ready: integrationStatus.hasAssessment },
    { label: 'Documents', ready: integrationStatus.hasDocuments },
    { label: 'Analysis', ready: integrationStatus.hasMonteCarlo }
  ]

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Profile Completion</h3>
            <p className="text-sm text-gray-600">{completionPercentage}% complete</p>
          </div>
          <div className="flex items-center gap-6">
            {items.map((item) => (
              <div key={item.label} className="text-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    item.ready ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {item.ready ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
