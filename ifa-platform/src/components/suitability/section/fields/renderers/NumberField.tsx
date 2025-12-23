import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { Tooltip } from '../../components/Tooltip'
import { hasValue } from '../../utils'
import type { FieldProps } from '../types'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { AlertCircle, Database, HelpCircle, Info, Sparkles } from 'lucide-react'

export const NumberField = memo<FieldProps>(
  ({ field, value, onChange, onBlur, onFocus, error, warning, isReadOnly, isRequired, aiSuggestion, pulledValue, showHelp, className, isLoading }) => {
    const [localValue, setLocalValue] = useState(value?.toString() || '')
    const [isFocused, setIsFocused] = useState(false)
    const showPulledIndicator = hasValue(pulledValue) && hasValue(value)

    useEffect(() => {
      if (!isFocused) {
        setLocalValue(value?.toString() || '')
      }
    }, [value, isFocused])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value

        if (inputValue === '' || /^-?\\d*\\.?\\d*$/.test(inputValue)) {
          setLocalValue(inputValue)

          if (inputValue === '') {
            onChange(null)
          } else {
            const numValue = parseFloat(inputValue)
            if (!isNaN(numValue)) {
              onChange(numValue)
            }
          }
        }
      },
      [onChange]
    )

    const handleBlur = useCallback(() => {
      setIsFocused(false)

      if (localValue !== '') {
        const numValue = parseFloat(localValue)
        if (!isNaN(numValue)) {
          onChange(numValue)
          setLocalValue(numValue.toString())
        } else {
          onChange(null)
          setLocalValue('')
        }
      }

      onBlur?.()
    }, [localValue, onChange, onBlur])

    const handleFocus = useCallback(() => {
      setIsFocused(true)
      onFocus?.()
    }, [onFocus])

    const displayValue = useMemo(() => {
      if (isFocused) return localValue

      if (field.format && value !== null && value !== undefined) {
        return field.format(value)
      }

      if (field.id.includes('amount') || field.id.includes('income') || field.id.includes('value')) {
        if (value) {
          return new Intl.NumberFormat('en-GB').format(value)
        }
      }

      return localValue
    }, [isFocused, localValue, value, field])

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <Label htmlFor={field.id} className={cn('text-sm font-medium', error && 'text-red-600', warning && 'text-yellow-600')}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>

          <div className="flex items-center gap-2">
            {showPulledIndicator && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Database className="h-3 w-3" />
                From profile
              </span>
            )}

            {aiSuggestion !== undefined && aiSuggestion !== value && (
              <Tooltip content={`AI suggests: ${aiSuggestion}`}>
                <Button size="sm" variant="ghost" onClick={() => onChange(aiSuggestion)} className="h-6 px-2">
                  <Sparkles className="h-3 w-3 mr-1 text-purple-600" />
                  Use AI
                </Button>
              </Tooltip>
            )}

            {showHelp && field.helpText && (
              <Tooltip content={field.helpText}>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            )}
          </div>
        </div>

        <div className="relative">
          {(field.id.includes('amount') || field.id.includes('income') || field.id.includes('value')) && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">£</span>
          )}

          <Input
            id={field.id}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={field.placeholder}
            disabled={!!isReadOnly || !!field.calculate || !!isLoading}
            className={cn(
              field.id.includes('amount') || field.id.includes('income') || field.id.includes('value') ? 'pl-8' : '',
              error && 'border-red-500 focus:ring-red-500',
              warning && 'border-yellow-500 focus:ring-yellow-500',
              field.calculate && 'bg-gray-50'
            )}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error.message}
          </p>
        )}

        {warning && !error && (
          <p className="text-xs text-yellow-600 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {warning}
          </p>
        )}
      </div>
    )
  }
)

NumberField.displayName = 'NumberField'

