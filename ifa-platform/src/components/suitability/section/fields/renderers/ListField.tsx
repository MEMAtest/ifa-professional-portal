import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Tooltip } from '../../components/Tooltip'
import type { FieldProps } from '../types'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { AlertCircle, HelpCircle, Plus, Trash2 } from 'lucide-react'

const normalizeListValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function ListField(props: FieldProps) {
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const showHelp = Boolean(props.showHelp ?? props.field.helpText)
  const isDisabled = Boolean(props.isReadOnly || props.isLoading || props.field.calculate)

  const [items, setItems] = useState(() => {
    const normalized = normalizeListValue(props.value)
    return normalized.length > 0 ? normalized : ['']
  })

  useEffect(() => {
    const normalized = normalizeListValue(props.value)
    setItems(normalized.length > 0 ? normalized : [''])
  }, [props.value])

  const updateValues = useCallback((nextValues: string[]) => {
    const cleaned = nextValues.map((item) => item.trim()).filter(Boolean)
    props.onChange(cleaned)
  }, [props.onChange])

  const handleChange = useCallback((index: number, nextValue: string) => {
    const nextValues = [...items]
    nextValues[index] = nextValue
    setItems(nextValues)
    updateValues(nextValues)
  }, [items, updateValues])

  const handleAdd = useCallback(() => {
    const nextValues = [...items, '']
    setItems(nextValues)
  }, [items])

  const handleRemove = useCallback((index: number) => {
    const nextValues = items.filter((_, idx) => idx !== index)
    const normalized = nextValues.length > 0 ? nextValues : ['']
    setItems(normalized)
    updateValues(normalized)
  }, [items, updateValues])

  return (
    <div className={cn('space-y-2', props.className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={props.field.id} className={cn('text-sm font-medium', props.error && 'text-red-600')}>
          {props.field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {showHelp && props.field.helpText && (
          <Tooltip content={props.field.helpText}>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </Tooltip>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${props.field.id}-${index}`} className="flex items-center gap-2">
            <Input
              id={index === 0 ? props.field.id : undefined}
              value={item}
              onChange={(event) => handleChange(index, event.target.value)}
              placeholder={props.field.placeholder}
              disabled={isDisabled}
              className={cn(
                props.error && 'border-red-500 focus:ring-red-500'
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(index)}
              disabled={isDisabled || items.length <= 1}
              className="h-9 w-9 p-0"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={isDisabled} className="gap-2">
        <Plus className="h-4 w-4" />
        Add another
      </Button>

      {props.error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {props.error.message}
        </p>
      )}
    </div>
  )
}
