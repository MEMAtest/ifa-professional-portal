import React from 'react'
import { AlertCircle, FileCheck } from 'lucide-react'

import type { SectionDefinition } from '@/components/suitability/SuitabilityFormProgress'
import type { ValidationError } from '@/types/suitability'
import type { SectionLike } from '@/lib/suitability/ui/submitHelpers'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface WhatsMissingCardProps {
  completionScore: number
  incompleteRequiredSections: SectionLike[]
  submissionErrorsBySection: Array<{
    section: SectionDefinition
    errors: ValidationError[]
  }>
  onViewValidation: () => void
  navigateToSection: (sectionId: string, opts?: { openValidation?: boolean }) => void
}

export function WhatsMissingCard(props: WhatsMissingCardProps) {
  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/30">
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <h3 className="font-semibold text-sm text-gray-900">What’s missing</h3>
              {props.completionScore < 80 ? (
                <Badge variant="warning">Needs 80% to submit</Badge>
              ) : (
                <Badge variant="secondary">Review issues</Badge>
              )}
            </div>
            <p className="text-xs text-gray-700 mt-1">Fix these items to submit a compliant assessment and generate a final PDF.</p>
          </div>
          <Button variant="outline" size="sm" onClick={props.onViewValidation}>
            <FileCheck className="h-4 w-4 mr-2" />
            View validation
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {props.incompleteRequiredSections.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-800 mb-2">Required sections incomplete</div>
            <div className="flex flex-wrap gap-2">
              {props.incompleteRequiredSections.map((section) => (
                <Button
                  key={section.id}
                  variant="outline"
                  size="sm"
                  onClick={() => props.navigateToSection(section.id, { openValidation: true })}
                >
                  {section.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        {props.submissionErrorsBySection.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-800 mb-2">Validation issues</div>
            <div className="space-y-2">
              {props.submissionErrorsBySection.slice(0, 6).map(({ section, errors }) => (
                <div
                  key={section.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-amber-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{section.title}</span>
                      <Badge variant="warning">{errors.length}</Badge>
                    </div>
                    <ul className="mt-1 text-xs text-gray-700 list-disc pl-4 space-y-1">
                      {errors.slice(0, 2).map((e, idx) => (
                        <li key={`${e.sectionId}.${e.fieldId}.${idx}`}>{e.message}</li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => props.navigateToSection(section.id, { openValidation: true })}>
                    Fix
                  </Button>
                </div>
              ))}
            </div>
            {props.submissionErrorsBySection.length > 6 && (
              <div className="mt-2 text-xs text-gray-700">Showing 6 sections. Open validation to see all issues.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

