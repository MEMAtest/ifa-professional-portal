import React from 'react'

import { cn } from '@/lib/utils'

import type { FieldProps } from '../types'

import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export function FallbackField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const isRequired = Boolean(props.isRequired ?? props.field.required)

  return (
    <div className={cn('space-y-2', props.className)}>
      <Label htmlFor={props.field.id}>
        {props.field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={props.field.id}
        type="text"
        value={props.value || ''}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.field.placeholder}
        disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
        className={cn(props.error && 'border-red-500 focus:ring-red-500')}
      />
      {props.error && <p className="text-xs text-red-600">{props.error.message}</p>}
    </div>
  )
}

