import React from 'react'
import { AlertCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Card, CardContent } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'

import type { ComparisonSummary } from '../types'

export function ComparisonSummaryTab(props: { summary: ComparisonSummary }) {
  const summary = props.summary

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.totalChanges}</div>
            <div className="text-sm text-gray-600">Total Changes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">+{summary.addedFields}</div>
            <div className="text-sm text-gray-600">Added</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.modifiedFields}</div>
            <div className="text-sm text-gray-600">Modified</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">-{summary.removedFields}</div>
            <div className="text-sm text-gray-600">Removed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Progress</span>
            <span className="text-sm text-gray-600">
              {summary.completionChange > 0 ? '+' : ''}
              {summary.completionChange}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {summary.completionChange > 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
            {summary.completionChange < 0 && <TrendingDown className="h-4 w-4 text-red-600" />}
            {summary.completionChange === 0 && <Minus className="h-4 w-4 text-gray-400" />}
            <Progress value={Math.abs(summary.completionChange)} className="flex-1" />
          </div>
        </CardContent>
      </Card>

      {summary.criticalChanges.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{summary.criticalChanges.length} critical changes</strong> detected in:
            <ul className="mt-2 space-y-1">
              {summary.criticalChanges.map((change) => (
                <li key={change} className="text-sm">
                  • {change.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

