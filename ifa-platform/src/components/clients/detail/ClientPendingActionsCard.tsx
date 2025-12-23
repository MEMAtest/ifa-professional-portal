'use client'

import React from 'react'
import { AlertCircle, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ClientPendingAction } from './types'

export function ClientPendingActionsCard(props: {
  actions: ClientPendingAction[]
  onAction: (action: ClientPendingAction) => void
}) {
  const { actions, onAction } = props

  if (!actions.length) return null

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Pending Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action, index) => (
            <div
              key={`${action.title}-${index}`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    action.priority === 'high'
                      ? 'bg-red-500'
                      : action.priority === 'medium'
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                  }`}
                />
                <div>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onAction(action)}>
                Action
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

