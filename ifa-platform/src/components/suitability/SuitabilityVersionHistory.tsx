// =====================================================
// FILE: src/components/suitability/SuitabilityVersionHistory.tsx
// Extracted from page.tsx - Version history panel component
// =====================================================

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import {
  History,
  CheckCircle2,
  GitCommit,
  Lock,
  Clock,
  ChevronRight,
  ExternalLink
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

interface SuitabilityVersionHistoryProps {
  versionHistory: AssessmentVersionInfo[]
  currentVersion: AssessmentVersionInfo | null
  clientId: string
  show: boolean
}

export function SuitabilityVersionHistory({
  versionHistory,
  currentVersion,
  clientId,
  show
}: SuitabilityVersionHistoryProps) {
  const router = useRouter()

  if (!show) return null

  return (
    <div className="bg-white border-b px-6 py-4 shadow-sm">
      <div className="space-y-2">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          Version History
        </h3>
        <div className="grid gap-2 max-h-64 overflow-auto">
          {versionHistory.map((version) => {
            const isCurrentVersion = currentVersion?.id === version.id

            return (
              <button
                key={version.id}
                onClick={() => {
                  if (!isCurrentVersion) {
                    router.push(`/assessments/suitability?clientId=${clientId}&versionId=${version.id}`)
                  }
                }}
                className={cn(
                  "group relative flex items-center justify-between p-3 border rounded-lg transition-all duration-200 text-left w-full",
                  isCurrentVersion
                    ? "border-blue-500 bg-blue-50 cursor-default"
                    : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md cursor-pointer transform hover:-translate-y-0.5",
                  !isCurrentVersion && "hover:scale-[1.02]"
                )}
                disabled={isCurrentVersion}
              >
                {/* Hover Indicator */}
                {!isCurrentVersion && (
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 rounded-lg pointer-events-none transition-all duration-200" />
                )}

                <div className="flex items-center gap-3 relative">
                  {/* Version Icon with Animation */}
                  <div className={cn(
                    "transition-all duration-200",
                    !isCurrentVersion && "group-hover:text-blue-500 group-hover:scale-110"
                  )}>
                    {isCurrentVersion ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    ) : version.is_final ? (
                      <Lock className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                    ) : (
                      <GitCommit className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium transition-colors duration-200",
                        isCurrentVersion ? "text-blue-700" : "text-gray-900 group-hover:text-blue-600"
                      )}>
                        Version {version.version_number || 1}
                      </span>
                      {isCurrentVersion && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                      {version.is_final && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Final
                        </Badge>
                      )}
                      {version.is_draft && !version.is_final && (
                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {version.created_at
                        ? format(new Date(version.created_at), 'MMM d, yyyy h:mm a')
                        : 'Unknown date'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 relative">
                  {/* Progress */}
                  {version.completion_percentage !== null && (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={version.completion_percentage || 0}
                        className="w-16 h-1.5"
                      />
                      <span className="text-xs text-gray-500 min-w-[32px]">
                        {version.completion_percentage || 0}%
                      </span>
                    </div>
                  )}

                  {/* Click Indicator */}
                  {!isCurrentVersion && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs transition-all duration-200 opacity-0 group-hover:opacity-100",
                      "text-blue-500 font-medium"
                    )}>
                      <span>View</span>
                      <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Click any version to view it
        </p>
      </div>
    </div>
  )
}
