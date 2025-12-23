'use client'

import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ClientQuickAction } from './types'

export function ClientQuickActionsGrid(props: { actions: ClientQuickAction[] }) {
  const { actions } = props

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant || 'outline'}
              onClick={action.action}
              disabled={action.disabled}
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2 w-full">
                <action.icon className="h-5 w-5" />
                <span className="font-medium">{action.label}</span>
              </div>
              <span className="text-xs text-gray-600 text-left">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

