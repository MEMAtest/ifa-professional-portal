import React from 'react'
import { TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

type Props = {
  isVisible: boolean
  onToggle: () => void
}

export function SuitabilityFinancialDashboardToggleCard(props: Props) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Financial Dashboard</span>
          </div>
          <Button variant="outline" size="sm" onClick={props.onToggle}>
            {props.isVisible ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

