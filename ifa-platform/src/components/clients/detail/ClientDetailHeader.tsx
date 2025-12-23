'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ExportClientPdfButton } from '@/components/shared/ExportClientPdfButton'
import type { ExtendedClientProfile } from '@/services/integratedClientService'

export function ClientDetailHeader(props: {
  client: ExtendedClientProfile
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { client, onBack, onEdit, onDelete } = props

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
          <div className="flex items-center gap-4 mt-1">
            <span className="text-gray-600">Client Ref: {client.clientRef || 'N/A'}</span>
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>{client.status || 'prospect'}</Badge>
            {client.vulnerabilityAssessment?.is_vulnerable && <Badge variant="destructive">Vulnerable</Badge>}
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
