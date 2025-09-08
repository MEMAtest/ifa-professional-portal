// =====================================================
// FILE: src/components/suitability/SuitabilityHeader.tsx
// =====================================================

import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Save, RefreshCw, Users, Loader2 } from 'lucide-react'
import { Client } from '@/types/client'

interface SuitabilityHeaderProps {
  client: Client | null
  isProspect: boolean
  onBack: () => void
  onSave: () => void
  onSync: () => void
  isSaving: boolean
  lastSaved: Date | null
  hasDraft: boolean
}

export const SuitabilityHeader: React.FC<SuitabilityHeaderProps> = ({
  client,
  isProspect,
  onBack,
  onSave,
  onSync,
  isSaving,
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
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {hasDraft && (
            <Badge variant="outline">Draft</Badge>
          )}
          <Button variant="outline" onClick={onSync} disabled={isProspect}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}