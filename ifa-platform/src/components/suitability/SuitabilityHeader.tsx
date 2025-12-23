// =====================================================
// FILE: src/components/suitability/SuitabilityHeader.tsx
// SIMPLIFIED: Removed duplicate Sync/Save buttons - use form toolbar instead
// =====================================================

import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Users, CheckCircle, Clock } from 'lucide-react'
import { Client } from '@/types/client'

interface SuitabilityHeaderProps {
  client: Client | null
  isProspect: boolean
  onBack: () => void
  lastSaved: Date | null
  hasDraft: boolean
}

export const SuitabilityHeader: React.FC<SuitabilityHeaderProps> = ({
  client,
  isProspect,
  onBack,
  lastSaved,
  hasDraft
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {client && (
            <div>
              <h1 className="text-2xl font-bold">Suitability Assessment</h1>
              <p className="text-gray-600">
                {client.personalDetails?.firstName} {client.personalDetails?.lastName}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isProspect && (
            <Badge variant="outline" className="bg-orange-50">
              <Users className="h-3 w-3 mr-1" />
              Prospect
            </Badge>
          )}

          {/* Save status indicator */}
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}

          {hasDraft && !lastSaved && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              <Clock className="h-3 w-3 mr-1" />
              Draft
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}