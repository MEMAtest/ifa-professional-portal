import React from 'react'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { SectionDefinition } from './SuitabilityFormProgress'

type Props = {
  sections: SectionDefinition[]
  currentSectionId: string
  sectionProgress: Record<string, number>
  hasErrors: (sectionId: string) => boolean
  onSelectSection: (sectionId: string) => void
}

export function SuitabilitySectionsNav(props: Props) {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <h3 className="font-semibold">Sections</h3>
      </CardHeader>
      <CardContent className="p-0">
        <nav className="space-y-1">
          {props.sections.map(section => {
            const sectionPct = props.sectionProgress[section.id] ?? 0
            const isComplete = sectionPct === 100
            const isInProgress = sectionPct > 0 && sectionPct < 100
            const hasErrors = props.hasErrors(section.id)
            const isCurrent = props.currentSectionId === section.id
            const Icon = section.icon

            return (
              <button
                key={section.id}
                onClick={() => props.onSelectSection(section.id)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  'hover:bg-gray-50 flex items-center justify-between',
                  isCurrent && 'bg-blue-50 text-blue-600 border-l-2 border-blue-600',
                  hasErrors && 'text-red-600'
                )}
              >
                <span className="flex items-center gap-2">
                  {isComplete && !hasErrors && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {isInProgress && !hasErrors && <Clock className="h-4 w-4 text-yellow-600" />}
                  {!isComplete && !isInProgress && !hasErrors && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{section.title}</span>
                </span>
                {section.required && <span className="text-xs text-red-500">*</span>}
              </button>
            )
          })}
        </nav>
      </CardContent>
    </Card>
  )
}

