import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CardContent, CardFooter } from '@/components/ui/Card'

import { AlertCircle, Check, ChevronDown, ChevronUp, Copy, HelpCircle, Info, Sparkles } from 'lucide-react'

import type { AISuggestion, PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'
import type { ExtendedSuitabilityField } from '../types'

import { FieldRenderer } from '../fields/FieldRenderer'
import { isAIGeneratableField } from '@/lib/suitability/ai/fieldRegistry'

interface DefaultSectionContentProps {
  baseFields: ExtendedSuitabilityField[]
  allFields: ExtendedSuitabilityField[]
  visibleFields: ExtendedSuitabilityField[]
  sectionData: Record<string, any>
  sectionId: string
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  validationErrors: ValidationError[]
  aiSuggestion?: AISuggestion
  isReadOnly?: boolean
  isLoadingAI?: boolean
  showAllFields: boolean
  onToggleShowAllFields: () => void
  onFieldUpdate: (fieldId: string, value: any) => void
  copiedField: string | null
  onCopyField: (fieldId: string, value: any) => void
  onApplyAISuggestion?: (fieldId: string, value: any) => void
  saveState?: {
    isSaving: boolean
    lastSaved: Date | null
    lastError: string | null
  }
  helpUrl?: string
  clientId?: string
  assessmentId?: string
}

export function DefaultSectionContent(props: DefaultSectionContentProps) {
  const baseFieldIds = useMemo(() => new Set(props.baseFields.map((f) => f.id)), [props.baseFields])
  const conditionalFieldsCount = Math.max(0, props.allFields.length - props.baseFields.length)

  return (
    <>
      <CardContent>
        {props.aiSuggestion && props.aiSuggestion.insights && props.aiSuggestion.insights.length > 0 && (
          <Alert className="mb-4 border-purple-200 bg-purple-50">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-purple-900">AI Insights:</p>
                <ul className="list-disc list-inside space-y-1">
                  {props.aiSuggestion.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-purple-800">
                      {insight}
                    </li>
                  ))}
                </ul>
                {props.onApplyAISuggestion && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      Object.entries(props.aiSuggestion?.fieldSuggestions || {}).forEach(([fieldId, value]) => {
                        props.onApplyAISuggestion?.(fieldId, value)
                      })
                    }}
                  >
                    Apply All Suggestions
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {props.validationErrors.length > 0 && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-1">
                {props.validationErrors.slice(0, 3).map((error, index) => (
                  <p key={index} className="text-sm text-red-800">
                    {error.message}
                  </p>
                ))}
                {props.validationErrors.length > 3 && (
                  <p className="text-sm text-red-600 font-medium">...and {props.validationErrors.length - 3} more errors</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {conditionalFieldsCount > 0 && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              {conditionalFieldsCount} additional field{conditionalFieldsCount !== 1 ? 's' : ''} shown based on your responses
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {props.visibleFields.map((field) => {
            const fieldError = props.validationErrors.find((error) => error.fieldId === field.id)
            const fieldValue = props.sectionData[field.id]
            const aiSuggestedValue = props.aiSuggestion?.fieldSuggestions?.[field.id]
            const isConditional = !baseFieldIds.has(field.id)

            return (
              <div
                key={field.id}
                className={cn('relative', field.fullWidth && 'md:col-span-2', isConditional && 'ring-2 ring-blue-100 rounded-lg p-3')}
              >
                {isConditional && (
                  <Badge variant="outline" className="absolute -top-2 right-2 text-xs bg-white">
                    Conditional
                  </Badge>
                )}

                <FieldRenderer
                  field={field}
                  value={fieldValue}
                  onChange={(value) => props.onFieldUpdate(field.id, value)}
                  error={fieldError}
                  aiSuggestion={aiSuggestedValue}
                  isReadOnly={props.isReadOnly}
                  pulledValue={
                    props.pulledData && field.pullFrom ? (props.pulledData as Record<string, unknown>)[field.pullFrom] : undefined
                  }
                  isLoading={props.isLoadingAI}
                  aiContext={
                    isAIGeneratableField(field.id) && field.type === 'textarea'
                      ? {
                          clientId: props.clientId,
                          assessmentId: props.assessmentId,
                          sectionId: props.sectionId,
                          formData: props.formData as any,
                          pulledData: props.pulledData,
                          onGenerated: (text: string) => props.onFieldUpdate(field.id, text)
                        }
                      : undefined
                  }
                />

                {fieldValue && field.type !== 'checkbox' && field.type !== 'radio' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => props.onCopyField(field.id, fieldValue)}
                    title="Copy value"
                  >
                    {props.copiedField === field.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {props.allFields.length > 5 && (
          <div className="mt-6 text-center">
            <Button size="sm" variant="outline" onClick={props.onToggleShowAllFields} className="gap-2">
              {props.showAllFields ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show {props.allFields.length - 5} More Fields
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>

      {(props.saveState?.lastSaved || props.helpUrl) && (
        <CardFooter className="bg-gray-50 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              {props.saveState?.lastSaved && <span>Last saved: {format(props.saveState.lastSaved, 'HH:mm:ss')}</span>}
              {props.saveState?.lastError && <span className="text-red-600 ml-2">Error: {props.saveState.lastError}</span>}
            </div>

            {props.helpUrl && (
              <Button size="sm" variant="ghost" onClick={() => window.open(props.helpUrl, '_blank')} className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Help Guide
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </>
  )
}
