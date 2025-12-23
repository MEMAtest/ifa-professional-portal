// =====================================================
// FILE: src/components/suitability/SuitabilityVersionBar.tsx
// Extracted from page.tsx - Version info bar component
// =====================================================

'use client'

import React from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { CreateNewVersionButton } from '@/components/suitability/CreateNewVersionButton'
import {
  GitCommit,
  Lock,
  Eye,
  History,
  GitBranch
} from 'lucide-react'

interface AssessmentVersionInfo {
  id: string
  client_id: string
  version_number: number | null
  created_at: string | null
  updated_at: string | null
  is_draft: boolean | null
  is_final: boolean | null
  is_current: boolean | null
  status: string | null
  completion_percentage: number | null
  parent_assessment_id: string | null
}

interface SuitabilityVersionBarProps {
  currentVersion: AssessmentVersionInfo | null
  versionHistory: AssessmentVersionInfo[]
  clientId: string
  canEdit: boolean
  showVersionHistory: boolean
  showVersionComparison: boolean
  onToggleVersionHistory: () => void
  onToggleVersionComparison: () => void
  onVersionCreated: (newVersion: AssessmentVersionInfo) => void
}

export function SuitabilityVersionBar({
  currentVersion,
  versionHistory,
  clientId,
  canEdit,
  showVersionHistory,
  showVersionComparison,
  onToggleVersionHistory,
  onToggleVersionComparison,
  onVersionCreated
}: SuitabilityVersionBarProps) {
  if (!currentVersion) return null

  return (
    <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            Version {currentVersion.version_number || 1}
          </span>
          {currentVersion.is_draft && (
            <Badge variant="outline" className="ml-2">Draft</Badge>
          )}
          {currentVersion.is_final && (
            <Badge variant="default" className="ml-2">
              <Lock className="h-3 w-3 mr-1" />
              Finalized
            </Badge>
          )}
          {!canEdit && (
            <Badge variant="destructive" className="ml-2">
              <Eye className="h-3 w-3 mr-1" />
              Read Only
            </Badge>
          )}
        </div>

        <div className="text-sm text-gray-500">
          Created: {currentVersion.created_at
            ? format(new Date(currentVersion.created_at), 'MMM d, yyyy h:mm a')
            : 'Unknown'}
        </div>

        {currentVersion.completion_percentage !== undefined &&
         currentVersion.completion_percentage !== null && (
          <div className="flex items-center gap-2">
            <Progress value={currentVersion.completion_percentage} className="w-24 h-2" />
            <span className="text-sm text-gray-600">
              {currentVersion.completion_percentage}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Version History Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVersionHistory}
        >
          <History className="h-4 w-4 mr-2" />
          History ({versionHistory.length})
        </Button>

        {/* Version Comparison Button */}
        {versionHistory.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVersionComparison}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Compare
          </Button>
        )}

        {/* Create New Version Button */}
        <CreateNewVersionButton
          clientId={clientId}
          currentAssessmentId={currentVersion.id}
          currentVersion={{
            ...currentVersion,
            parent_assessment_id: currentVersion.parent_assessment_id || null
          }}
          onVersionCreated={onVersionCreated}
          disabled={!currentVersion.is_final && (currentVersion.completion_percentage || 0) < 100}
          variant="outline"
          size="sm"
        />
      </div>
    </div>
  )
}
