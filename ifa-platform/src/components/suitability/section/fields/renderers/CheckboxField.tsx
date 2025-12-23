import React from 'react'

import { cn } from '@/lib/utils'

import type { FieldProps } from '../types'

import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'

import { AlertCircle } from 'lucide-react'

export function CheckboxField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const isRequired = Boolean(props.isRequired ?? props.field.required)

  if (props.field.options && props.field.options.length > 1) {
    return (
      <div className={cn('space-y-2', props.className)}>
        <Label className={cn('text-sm font-medium', props.error && 'text-red-600')}>
          {props.field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>

        <div className="space-y-2">
          {props.field.options.map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={Array.isArray(props.value) ? props.value.includes(option) : false}
                onCheckedChange={(checked) => {
                  const currentValue = Array.isArray(props.value) ? props.value : []
                  if (checked) {
                    props.onChange([...currentValue, option])
                  } else {
                    props.onChange(currentValue.filter((v: string) => v !== option))
                  }
                }}
                disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
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

  return (
    <div className={cn('flex items-center space-x-2', props.className)}>
      <Checkbox
        id={props.field.id}
        checked={props.value === true || props.value === 'Yes'}
        onCheckedChange={(checked) => props.onChange(checked)}
        disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
      />
      <Label htmlFor={props.field.id} className="text-sm font-medium cursor-pointer">
        {props.field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {props.error && <span className="text-xs text-red-600 ml-2">{props.error.message}</span>}
    </div>
  )
}

