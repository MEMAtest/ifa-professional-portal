import React, { memo, useCallback, useState } from 'react'

import { cn, safeWriteToClipboard } from '@/lib/utils'

import { Tooltip } from '../../components/Tooltip'
import { hasValue } from '../../utils'
import type { FieldProps } from '../types'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { AlertCircle, Check, Copy, Database, HelpCircle, Info, Sparkles } from 'lucide-react'

export const TextField = memo<FieldProps>(
  ({ field, value, onChange, onBlur, onFocus, error, warning, isReadOnly, isRequired, aiSuggestion, pulledValue, showHelp, className }) => {
    const [copied, setCopied] = useState(false)
    const inputType = field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'
    const datalistId = field.type === 'text' && field.options?.length ? `suitability-datalist-${field.id}` : undefined
    const showPulledIndicator = hasValue(pulledValue) && hasValue(value)

    const handleCopy = useCallback(() => {
      void safeWriteToClipboard(value || '').then((ok) => {
        if (!ok) return
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }, [value])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value

        if (field.mask) {
          newValue = newValue.replace(/[^0-9A-Z\\s]/gi, '')
        }

        if (field.transform) {
          newValue = field.transform(newValue)
        }

        onChange(newValue)
      },
      [field.mask, field.transform, onChange]
    )

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

            {aiSuggestion && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {aiSuggestion}
              </Badge>
            )}

            {showHelp && field.helpText && (
              <Tooltip content={field.helpText}>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            )}
          </div>
        </div>

        <div className="relative">
          <Input
            id={field.id}
            type={inputType}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={field.placeholder}
            disabled={!!isReadOnly || !!field.autoGenerate || !!field.calculate}
            list={datalistId}
            className={cn(
              'w-full pr-20',
              error && 'border-red-500 focus:ring-red-500',
              warning && 'border-yellow-500 focus:ring-yellow-500',
              (field.autoGenerate || field.calculate) && 'bg-gray-50'
            )}
            maxLength={field.maxLength}
            autoComplete={field.autoComplete}
            pattern={field.pattern}
          />

          {datalistId && (
            <datalist id={datalistId}>
              {field.options?.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="h-8 w-8 p-0">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
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

TextField.displayName = 'TextField'

