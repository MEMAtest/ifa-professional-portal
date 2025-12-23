import React from 'react'

import { Button } from '@/components/ui/Button'
import { CardContent } from '@/components/ui/Card'

import type { AISuggestion, PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'
import type { ExtendedSuitabilityField } from '../types'

import { FieldRenderer } from '../fields/FieldRenderer'
import { FinancialDashboard } from '../../FinancialDashboard'

interface FinancialSectionContentProps {
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  visibleFields: ExtendedSuitabilityField[]
  sectionData: Record<string, any>
  validationErrors: ValidationError[]
  aiSuggestion?: AISuggestion
  isReadOnly?: boolean
  isLoadingAI?: boolean
  showSmartComponents?: boolean
  showAllFields: boolean
  hiddenFieldsCount: number
  onToggleShowAllFields: () => void
  onFieldUpdate: (fieldId: string, value: any) => void
}

export function FinancialSectionContent(props: FinancialSectionContentProps) {
  return (
    <CardContent>
      {props.showSmartComponents && (
        <FinancialDashboard
          formData={props.formData}
          pulledData={props.pulledData}
          onUpdateField={(fieldId, value) => props.onFieldUpdate(fieldId, value)}
          className="mb-4"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {props.visibleFields.map((field) => {
          const fieldError = props.validationErrors.find((error) => error.fieldId === field.id)
          return (
            <FieldRenderer
              key={field.id}
              field={field}
              value={props.sectionData[field.id]}
              onChange={(value) => props.onFieldUpdate(field.id, value)}
              error={fieldError}
              aiSuggestion={props.aiSuggestion?.fieldSuggestions?.[field.id]}
              isReadOnly={props.isReadOnly}
              pulledValue={
                props.pulledData && field.pullFrom ? (props.pulledData as Record<string, unknown>)[field.pullFrom] : undefined
              }
              isLoading={props.isLoadingAI}
              className={field.fullWidth ? 'md:col-span-2' : ''}
            />
          )
        })}
      </div>

      {props.hiddenFieldsCount > 0 && (
        <div className="mt-4 text-center">
          <Button size="sm" variant="ghost" onClick={props.onToggleShowAllFields}>
            {props.showAllFields ? 'Show Less' : `Show ${props.hiddenFieldsCount} More Fields`}
          </Button>
        </div>
      )}
    </CardContent>
  )
}

