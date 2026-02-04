import React, { useMemo } from 'react'

import { Button } from '@/components/ui/Button'
import { CardContent } from '@/components/ui/Card'

import type { AISuggestion, PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'
import type { ExtendedSuitabilityField } from '../types'
import type { DocumentPopulatedFields } from '../../SuitabilitySectionRenderer'

import { FieldRenderer } from '../fields/FieldRenderer'
import { FinancialDashboard } from '../../FinancialDashboard'

// Reverse map from populate-profile labels to client profile field keys
const LABEL_TO_KEY: Record<string, string> = {
  'Annual income': 'annualIncome', 'Monthly expenses': 'monthlyExpenses',
  'Net worth': 'netWorth', 'Liquid assets': 'liquidAssets',
  'Investment timeframe': 'investmentTimeframe', 'Investment objectives': 'investmentObjectives',
  'Existing investments': 'existingInvestments', 'Pension arrangements': 'pensionArrangements',
  'Insurance policies': 'insurancePolicies',
}

function buildFinancialPopulatedKeys(fields: DocumentPopulatedFields): Set<string> {
  if (!fields) return new Set()
  const keys = new Set<string>()
  for (const label of fields.financial_profile) {
    const key = LABEL_TO_KEY[label]
    if (key) keys.add(key)
  }
  return keys
}

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
  documentPopulatedFields?: DocumentPopulatedFields
}

export function FinancialSectionContent(props: FinancialSectionContentProps) {
  const documentPopulatedKeys = useMemo(
    () => buildFinancialPopulatedKeys(props.documentPopulatedFields ?? null),
    [props.documentPopulatedFields]
  )

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
          const lastSegment = field.pullFrom?.split('.').pop()
          const isFromDocuments = lastSegment ? documentPopulatedKeys.has(lastSegment) : false
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
              isFromDocuments={isFromDocuments}
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

