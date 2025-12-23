// =====================================================
// FILE: src/components/suitability/SuitabilityFormProgress.tsx
// Extracted from SuitabilityForm.tsx for better code organization
// =====================================================

import React, { memo } from 'react'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertTriangle, Circle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SuitabilityField } from '@/types/suitability'

// =====================================================
// TYPES
// =====================================================

export interface SectionDefinition {
  id: string
  title: string
  description: string
  icon: LucideIcon
  required?: boolean
  order: number
  hasCustomComponent?: boolean
  fields?: SuitabilityField[]
  status?: 'complete' | 'partial' | 'incomplete' | 'error'
  fieldCount?: number
  completionPercentage?: number
  hasErrors?: boolean
}

interface ProgressHeaderProps {
  sections: SectionDefinition[]
  currentSection: string
  completedSections: string[]
  completionPercentage: number
  sectionProgress?: Record<string, number>
  sectionErrors?: Record<string, boolean>
  onSectionClick?: (sectionId: string) => void
}

// =====================================================
// PROGRESS HEADER COMPONENT
// =====================================================

export const SuitabilityFormProgress = memo(function SuitabilityFormProgress({
  sections,
  currentSection,
  completedSections,
  completionPercentage,
  sectionProgress = {},
  sectionErrors = {},
  onSectionClick
}: ProgressHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Overall Progress Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assessment Progress</h3>
        <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
      </div>

      <Progress value={completionPercentage} className="h-3" />

      {/* Compact Section Progress Grid */}
      <div className="grid grid-cols-12 gap-1">
        {sections.map((section) => {
          const isCompleted = completedSections.includes(section.id)
          const isCurrent = currentSection === section.id
          const hasErrors = sectionErrors[section.id] ?? false

          return (
            <div
              key={section.id}
              className={cn(
                "h-2 rounded-full transition-colors cursor-pointer",
                hasErrors && "bg-red-500",
                isCompleted && !hasErrors && "bg-green-500",
                isCurrent && !isCompleted && !hasErrors && "bg-blue-500 animate-pulse",
                !isCompleted && !isCurrent && !hasErrors && "bg-gray-200"
              )}
              title={`${section.title}${section.required ? ' (required)' : ''}`}
              onClick={() => onSectionClick?.(section.id)}
            />
          )
        })}
      </div>

      {/* Summary Footer */}
      <div className="text-xs text-gray-600">
        {sections.filter(s => s.required && completedSections.includes(s.id)).length} of{' '}
        {sections.filter(s => s.required).length} required sections completed
      </div>
    </div>
  )
})

export default SuitabilityFormProgress
