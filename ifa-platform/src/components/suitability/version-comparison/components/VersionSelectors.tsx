import React from 'react'
import { format } from 'date-fns'

import type { AssessmentVersionInfo } from '@/types/suitability-version'

export type VersionSelectorsProps = {
  versions: AssessmentVersionInfo[]
  selected: [string | undefined, string | undefined]
  onSelect: (versionId: string, position: 0 | 1) => void
}

export function VersionSelectors(props: VersionSelectorsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">From Version</label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={props.selected[0] || ''}
          onChange={(e) => props.onSelect(e.target.value, 0)}
        >
          <option value="">Select version...</option>
          {props.versions.map((v) => (
            <option key={v.id} value={v.id}>
              v{v.version_number || 1} - {v.created_at ? format(new Date(v.created_at), 'MMM d, yyyy') : 'Unknown'}
              {v.is_final && ' (Final)'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">To Version</label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={props.selected[1] || ''}
          onChange={(e) => props.onSelect(e.target.value, 1)}
        >
          <option value="">Select version...</option>
          {props.versions.map((v) => (
            <option key={v.id} value={v.id}>
              v{v.version_number || 1} - {v.created_at ? format(new Date(v.created_at), 'MMM d, yyyy') : 'Unknown'}
              {v.is_final && ' (Final)'}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

