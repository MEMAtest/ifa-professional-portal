import React, { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { Tooltip } from '../../components/Tooltip'
import { hasValue } from '../../utils'
import type { FieldProps } from '../types'

import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

import { AlertCircle, Database, FileText, HelpCircle } from 'lucide-react'

export function SelectField(props: FieldProps) {
  const isCalculated = Boolean(props.field.calculate)
  const showHelp = Boolean(props.showHelp ?? props.field.helpText)
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const showPulledIndicator = hasValue(props.pulledValue) && hasValue(props.value) && !props.isFromDocuments
  const showDocumentsIndicator = props.isFromDocuments && hasValue(props.value)
  const allowCustom = Boolean((props.field as any).allowCustom)
  const customOptionLabel = (props.field as any).customOptionLabel || 'Add custom...'
  const valueString = typeof props.value === 'string' ? props.value : ''
  const [customSelected, setCustomSelected] = useState(false)
  const [customValue, setCustomValue] = useState('')

  // Memoize options to prevent new array reference on every render
  const options = useMemo(() => {
    return props.field.options || []
  }, [props.field.options])

  const isCustomValue = allowCustom && valueString && !options.includes(valueString)

  useEffect(() => {
    if (!allowCustom) {
      setCustomSelected(false)
      setCustomValue('')
      return
    }
    if (isCustomValue) {
      setCustomSelected(true)
      setCustomValue(valueString)
    }
  }, [allowCustom, isCustomValue, valueString])

  const selectValue = allowCustom && (customSelected || isCustomValue) ? '__custom__' : valueString

  const handleValueChange = (nextValue: string) => {
    if (allowCustom && nextValue === '__custom__') {
      setCustomSelected(true)
      if (!isCustomValue) {
        setCustomValue('')
        props.onChange('')
      }
      return
    }
    setCustomSelected(false)
    setCustomValue('')
    props.onChange(nextValue)
  }

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

      <Select
        value={selectValue || ''}
        onValueChange={handleValueChange}
        disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
      >
        <SelectTrigger
          className={cn(
            'w-full',
            props.error && 'border-red-500 focus:ring-red-500',
            props.warning && 'border-yellow-500 focus:ring-yellow-500'
          )}
        >
          <SelectValue placeholder={props.field.placeholder || `Select ${props.field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          {allowCustom && (
            <SelectItem value="__custom__">
              {customValue ? `Custom: ${customValue}` : customOptionLabel}
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {allowCustom && (customSelected || isCustomValue) && (
        <Input
          id={`${props.field.id}-custom`}
          value={customValue}
          onChange={(event) => {
            const next = event.target.value
            setCustomValue(next)
            props.onChange(next)
          }}
          placeholder="Enter custom value"
          disabled={!!props.isReadOnly || isCalculated || !!props.isLoading}
          className={cn(
            'w-full',
            props.error && 'border-red-500 focus:ring-red-500',
            props.warning && 'border-yellow-500 focus:ring-yellow-500'
          )}
        />
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
