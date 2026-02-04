import React from 'react'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'

import { Tooltip } from '../../components/Tooltip'
import { hasValue } from '../../utils'
import type { FieldProps } from '../types'

import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { AlertCircle, Database, FileText, HelpCircle } from 'lucide-react'

export function DateField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const showHelp = Boolean(props.showHelp ?? props.field.helpText)
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const showPulledIndicator = hasValue(props.pulledValue) && hasValue(props.value) && !props.isFromDocuments
  const showDocumentsIndicator = props.isFromDocuments && hasValue(props.value)

  return (
    <div className={cn('space-y-2', props.className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={props.field.id} className={cn('text-sm font-medium', props.error && 'text-red-600')}>
          {props.field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          {showDocumentsIndicator && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <FileText className="h-3 w-3" />
              From documents
            </span>
          )}
          {showPulledIndicator && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Database className="h-3 w-3" />
              From profile
            </span>
          )}
          {showHelp && props.field.helpText && (
            <Tooltip content={props.field.helpText}>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Tooltip>
          )}
        </div>
      </div>

      <Input
        id={props.field.id}
        type="date"
        value={props.value ? format(new Date(props.value), 'yyyy-MM-dd') : ''}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
        className={cn(
          props.error && 'border-red-500 focus:ring-red-500',
          props.warning && 'border-yellow-500 focus:ring-yellow-500'
        )}
        min={props.field.min}
        max={props.field.max}
      />

      {props.error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {props.error.message}
        </p>
      )}
    </div>
  )
}

