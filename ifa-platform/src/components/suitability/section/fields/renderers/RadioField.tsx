import React from 'react'

import { cn } from '@/lib/utils'

import type { FieldProps } from '../types'

import { Label } from '@/components/ui/Label'

import { AlertCircle } from 'lucide-react'

export function RadioField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const isRequired = Boolean(props.isRequired ?? props.field.required)

  return (
    <div className={cn('space-y-2', props.className)}>
      <Label className={cn('text-sm font-medium', props.error && 'text-red-600')}>
        {props.field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="space-y-2">
        {props.field.options?.map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={props.field.id}
              value={option}
              checked={props.value === option}
              onChange={(e) => props.onChange(e.target.value)}
              disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{option}</span>
          </label>
        ))}
      </div>

      {props.error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {props.error.message}
        </p>
      )}
    </div>
  )
}

