import React, { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { OCCUPATION_SUGGESTIONS } from '@/lib/constants/occupations'

export type OccupationAutocompleteProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  onFocus?: () => void
  onBlur?: () => void
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

function filterOccupations(query: string): string[] {
  const q = query.trim().toLowerCase()
  const base = q
    ? OCCUPATION_SUGGESTIONS.filter((o) => o.toLowerCase().includes(q))
    : OCCUPATION_SUGGESTIONS
  const trimmed = base.slice(0, 11)
  if (!trimmed.includes('Other')) {
    trimmed.push('Other')
  }
  return trimmed
}

export const OccupationAutocomplete = ({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  onFocus,
  onBlur,
  ariaInvalid,
  ariaDescribedBy
}: OccupationAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isOtherSelected, setIsOtherSelected] = useState(false)
  const [otherValue, setOtherValue] = useState('')
  const suggestions = useMemo(() => filterOccupations(value), [value])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null)

  useEffect(() => {
    const rawValue = value ?? ''
    const trimmed = rawValue.trim()

    if (!trimmed) {
      setIsOtherSelected(false)
      if (otherValue) {
        setOtherValue('')
      }
      return
    }

    if (trimmed.toLowerCase() === 'other') {
      setIsOtherSelected(true)
      if (rawValue.toLowerCase() === 'other') {
        setOtherValue('')
      }
      return
    }

    const isStandard = OCCUPATION_SUGGESTIONS.some(
      (occupation) => occupation.toLowerCase() === trimmed.toLowerCase()
    )

    if (!isStandard) {
      setIsOtherSelected(true)
      if (rawValue !== otherValue) {
        setOtherValue(rawValue)
      }
    } else {
      setIsOtherSelected(false)
      if (otherValue) {
        setOtherValue('')
      }
    }
  }, [value, otherValue])

  useLayoutEffect(() => {
    if (!isOpen) return
    if (!inputRef.current) return

    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuRect({ left: rect.left, top: rect.bottom + 4, width: rect.width })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen])

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          setIsOpen(true)
          onFocus?.()
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 150)
          onBlur?.()
        }}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />

      {isOpen &&
        !disabled &&
        suggestions.length > 0 &&
        menuRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="z-[9999] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
            style={{ position: 'fixed', left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          >
            <div className="max-h-56 overflow-auto">
        {suggestions.map((occupation) => (
          <button
            key={occupation}
            type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault()
                  }}
                  onClick={() => {
                  if (occupation.toLowerCase() === 'other') {
                    setIsOtherSelected(true)
                    setOtherValue('')
                    onChange('Other')
                    setIsOpen(false)
                    return
                  }

                  setIsOtherSelected(false)
                  setOtherValue('')
                  onChange(occupation)
                  setIsOpen(false)
                }}
              >
                {occupation}
              </button>
            ))}
          </div>
        </div>,
        document.body
        )}

      {isOtherSelected && (
        <div className="mt-2">
          <label htmlFor={`${id}-other`} className="block text-xs font-medium text-gray-600 mb-1">
            Other occupation
          </label>
          <input
            id={`${id}-other`}
            type="text"
            value={otherValue}
            onChange={(e) => {
              const next = e.target.value
              setOtherValue(next)
              onChange(next)
            }}
            placeholder="Enter occupation"
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
