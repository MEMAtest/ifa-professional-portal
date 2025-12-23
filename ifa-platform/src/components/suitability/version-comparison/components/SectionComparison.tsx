import React from 'react'
import { AlertCircle, ArrowRight, ChevronDown, ChevronRight, Minus, Plus, X } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

import type { VersionDifference } from '../types'

function getChangeIcon(changeType: VersionDifference['changeType']) {
  switch (changeType) {
    case 'added':
      return <Plus className="h-4 w-4 text-green-600" />
    case 'removed':
      return <X className="h-4 w-4 text-red-600" />
    case 'modified':
      return <ArrowRight className="h-4 w-4 text-blue-600" />
    default:
      return <Minus className="h-4 w-4 text-gray-400" />
  }
}

export type SectionComparisonProps = {
  sectionName: string
  differences: VersionDifference[]
  isExpanded: boolean
  onToggle: () => void
}

export function SectionComparison(props: SectionComparisonProps) {
  const changeCount = props.differences.filter(d => d.changeType !== 'unchanged').length
  const hasChanges = changeCount > 0

  return (
    <div className="border rounded-lg">
      <button
        onClick={props.onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {props.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium capitalize">{props.sectionName.replace(/_/g, ' ')}</span>
          {hasChanges && (
            <Badge variant="outline" className="ml-2">
              {changeCount} change{changeCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {props.differences.some(d => d.importance === 'critical') && (
            <Badge variant="destructive" className="text-xs">
              Critical
            </Badge>
          )}
          {!hasChanges && (
            <Badge variant="secondary" className="text-xs">
              No changes
            </Badge>
          )}
        </div>
      </button>

      {props.isExpanded && (
        <div className="border-t px-4 py-3 space-y-2">
          {props.differences.map((diff, index) => (
            <div
              key={`${diff.section}-${diff.field}-${index}`}
              className={cn(
                'flex items-start gap-3 p-2 rounded-md',
                diff.changeType === 'unchanged' && 'opacity-50',
                diff.changeType !== 'unchanged' && 'bg-gray-50'
              )}
            >
              <div className="mt-1">{getChangeIcon(diff.changeType)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{diff.field.replace(/_/g, ' ')}</span>
                  {diff.importance === 'critical' && <AlertCircle className="h-3 w-3 text-red-500" />}
                </div>
                {diff.changeType !== 'unchanged' && (
                  <div className="text-sm text-gray-600">
                    {diff.changeType === 'added' && (
                      <span className="text-green-600">Added: {JSON.stringify(diff.newValue)}</span>
                    )}
                    {diff.changeType === 'removed' && (
                      <span className="text-red-600">Removed: {JSON.stringify(diff.oldValue)}</span>
                    )}
                    {diff.changeType === 'modified' && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{JSON.stringify(diff.oldValue)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-blue-600">{JSON.stringify(diff.newValue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {props.differences.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">No data in this section</p>
          )}
        </div>
      )}
    </div>
  )
}

