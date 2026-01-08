import React from 'react'

import { cn } from '@/lib/utils'

import { Tooltip } from '../../components/Tooltip'
import type { FieldProps } from '../types'

import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

import { AlertCircle, HelpCircle } from 'lucide-react'
import { AIGenerateButton } from '@/components/suitability/ai/AIGenerateButton'
import { isAIGeneratableField } from '@/lib/suitability/ai/fieldRegistry'

export function TextareaField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const showHelp = Boolean(props.showHelp ?? props.field.helpText)
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const canGenerateAI =
    Boolean(props.aiContext) &&
    isAIGeneratableField(props.field.id) &&
    !props.isReadOnly &&
    !props.isLoading &&
    !isCalculated

  return (
    <div className={cn('space-y-2', props.className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={props.field.id} className={cn('text-sm font-medium', props.error && 'text-red-600')}>
          {props.field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          {showHelp && props.field.helpText && (
            <Tooltip content={props.field.helpText}>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Tooltip>
          )}
          {canGenerateAI && props.aiContext && (
            <AIGenerateButton
              clientId={props.aiContext.clientId}
              assessmentId={props.aiContext.assessmentId}
              fieldId={props.field.id}
              formData={props.aiContext.formData}
              pulledData={props.aiContext.pulledData}
              onGenerated={props.aiContext.onGenerated}
            />
          )}
        </div>
      </div>

      <Textarea
        id={props.field.id}
        value={props.value || ''}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.field.placeholder}
        disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
        className={cn(
          props.error && 'border-red-500 focus:ring-red-500',
          props.warning && 'border-yellow-500 focus:ring-yellow-500'
        )}
        rows={props.field.rows || 3}
        maxLength={props.field.maxLength}
      />

      {props.field.maxLength && (
        <p className="text-xs text-gray-500 text-right">
          {(props.value || '').length}/{props.field.maxLength}
        </p>
      )}

      {props.error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {props.error.message}
        </p>
      )}
    </div>
  )
}
