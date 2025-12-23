import React from 'react'
import { BarChart3 } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'

type Props = {
  completionScore: number
  completedSectionsCount: number
  totalSectionsCount: number
  validationIssueCount: number
}

export function SuitabilityProgressCard(props: Props) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Progress
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Overall</span>
              <span className="font-medium">{props.completionScore}%</span>
            </div>
            <Progress value={props.completionScore} className="h-2" />
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Sections</span>
              <span>
                {props.completedSectionsCount}/{props.totalSectionsCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Errors</span>
              <span className={cn(props.validationIssueCount > 0 && 'text-red-600 font-medium')}>
                {props.validationIssueCount}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

