'use client'

import React from 'react'
import { ArrowLeft, BarChart3, Plus, RefreshCw } from 'lucide-react'

import { ExportClientPdfButton } from '@/components/shared/ExportClientPdfButton'
import { Button } from '@/components/assessments/client-hub/ui'

export function AssessmentHubHeader(props: {
  clientId: string
  clientToken: string
  clientName: string
  clientRef?: string | null
  clientEmail?: string | null
  onBack: () => void
  onNewAssessment: () => void
  onRefresh: () => void
  onExportExcel: () => void
}) {
  const { clientId, clientToken, clientName, clientRef, clientEmail, onBack, onNewAssessment, onRefresh, onExportExcel } =
    props

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{clientName}</h1>
            <p className="text-gray-600">
              {clientRef || clientToken} • {clientEmail || ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={onNewAssessment} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Assessment</span>
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ExportClientPdfButton clientId={clientId} clientToken={clientToken} variant="outline" label="Export" />
          <Button variant="outline" onClick={onExportExcel}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>
    </div>
  )
}

