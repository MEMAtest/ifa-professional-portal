import React from 'react'
import { HelpCircle } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'

type Props = {
  autoSaveIntervalMs: number
}

export function SuitabilityHelpCard(props: Props) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Help
        </h3>
      </CardHeader>
      <CardContent className="text-sm text-gray-600 space-y-2">
        <p>Complete all required sections marked with *</p>
        <p>Use AI Assistant for suggestions</p>
        <p>Auto-saves every {props.autoSaveIntervalMs / 1000} seconds</p>
      </CardContent>
    </Card>
  )
}

