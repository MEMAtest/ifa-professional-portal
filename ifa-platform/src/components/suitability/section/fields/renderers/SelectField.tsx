import React from 'react'

import { cn } from '@/lib/utils'

import { Tooltip } from '../../components/Tooltip'
import { hasValue } from '../../utils'
import type { FieldProps } from '../types'

import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

import { AlertCircle, Database, HelpCircle } from 'lucide-react'

export function SelectField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const showHelp = Boolean(props.showHelp ?? props.field.helpText)
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const showPulledIndicator = hasValue(props.pulledValue) && hasValue(props.value)

  return (
    <div className={cn('space-y-2', props.className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={props.field.id} className={cn('text-sm font-medium', props.error && 'text-red-600')}>
          {props.field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
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

      <Select
        value={props.value || ''}
        onValueChange={props.onChange}
        disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
      >
        <SelectTrigger
          className={cn(
            'w-full',
            props.error && 'border-red-500 focus:ring-red-500',
            props.warning && 'border-yellow-500 focus:ring-yellow-500'
          )}
        >
          <SelectValue placeholder={`Select ${props.field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {props.field.options?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {props.error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {props.error.message}
        </p>
      )}
    </div>
  )
}

