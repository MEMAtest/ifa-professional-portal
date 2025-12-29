'use client'

import React from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ExportClientPdfButton } from '@/components/shared/ExportClientPdfButton'
import type { ExtendedClientProfile } from '@/services/integratedClientService'

interface CompletedAssessments {
  atr?: boolean
  cfl?: boolean
  investorPersona?: boolean
}

export function ClientDetailHeader(props: {
  client: ExtendedClientProfile
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  completedAssessments?: CompletedAssessments
}) {
  const { client, onBack, onEdit, onDelete, completedAssessments } = props

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {client.personalDetails?.firstName} {client.personalDetails?.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-gray-600 mr-2">Client Ref: {client.clientRef || 'N/A'}</span>
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>{client.status || 'prospect'}</Badge>
            {client.vulnerabilityAssessment?.is_vulnerable && <Badge variant="destructive">Vulnerable</Badge>}
            {/* Assessment completion badges */}
            {completedAssessments?.atr && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                ATR
              </Badge>
            )}
            {completedAssessments?.cfl && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                CFL
              </Badge>
            )}
            {completedAssessments?.investorPersona && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Persona
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <ExportClientPdfButton
          clientId={client.id}
          clientToken={client.clientRef || client.id}
          variant="outline"
          label="Export"
        />
        <Button variant="outline" onClick={onEdit}>
          Edit Client
        </Button>
        <Button variant="outline" onClick={onDelete} className="text-red-600">
          Delete
        </Button>
      </div>
    </div>
  )
}
