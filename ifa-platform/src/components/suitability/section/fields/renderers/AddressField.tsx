import React from 'react'

import { cn } from '@/lib/utils'

import type { FieldProps } from '../types'

import { Label } from '@/components/ui/Label'
import { SmartAddressField } from '../../../SmartAddressField'

export function AddressField(props: FieldProps) {
  const isRequired = Boolean(props.isRequired ?? props.field.required)

  return (
    <div className={cn('space-y-2', props.className)}>
      <Label htmlFor={props.field.id} className={cn('text-sm font-medium', props.error && 'text-red-600')}>
        {props.field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <SmartAddressField
        value={props.value}
        onChange={props.onChange}
        placeholder={props.field.placeholder}
        error={props.error?.message}
        required={isRequired}
        className="w-full"
      />
    </div>
  )
}

