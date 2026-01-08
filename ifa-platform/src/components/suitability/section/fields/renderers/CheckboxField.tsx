import React, { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import type { FieldProps } from '../types'

import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { AlertCircle } from 'lucide-react'

export function CheckboxField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const allowCustom = Boolean((props.field as any).allowCustom)
  const customOptionLabel = (props.field as any).customOptionLabel || 'Add custom...'
  const [customValue, setCustomValue] = useState('')
  const selectedValues = useMemo(() => {
    if (Array.isArray(props.value)) return props.value
    if (typeof props.value === 'string') {
      return props.value
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    }
    return []
  }, [props.value])

  const options = useMemo(() => {
    const base = props.field.options || []
    if (!allowCustom) return base
    const extras = selectedValues.filter((value: string) => !base.includes(value))
    return [...base, ...extras]
  }, [allowCustom, props.field.options, selectedValues])

  if (options && options.length > 1) {
    return (
      <div className={cn('space-y-2', props.className)}>
        <Label className={cn('text-sm font-medium', props.error && 'text-red-600')}>
          {props.field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>

        <div className="space-y-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedValues.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    props.onChange([...selectedValues, option])
                    return
                  }
                  props.onChange(selectedValues.filter((v: string) => v !== option))
                }}
                disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>

        {allowCustom && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              placeholder={customOptionLabel}
              disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const trimmed = customValue.trim()
                if (!trimmed) return
                if (!selectedValues.includes(trimmed)) {
                  props.onChange([...selectedValues, trimmed])
                }
                setCustomValue('')
              }}
              disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
            >
              Add
            </Button>
          </div>
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
