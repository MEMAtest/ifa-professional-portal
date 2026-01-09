// =====================================================
// FILE: src/components/suitability/SmartAddressField.tsx
// COMPLETE SMART ADDRESS COMPONENT - FIXED
// =====================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { SmartAddressLookupResult } from '@/types/suitability'
import { debounce } from 'lodash'
import { cn } from '@/lib/utils'

const UK_POSTCODE_PATTERN = /([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}|GIR\s?0AA)/i

const normalizeAddressText = (rawValue: string) => {
  const trimmed = rawValue.trim()
  if (!trimmed) return ''
  let value = trimmed.replace(/\s*,\s*/g, ', ').replace(/\s{2,}/g, ' ')

  if (!value.includes(',')) {
    const match = value.match(UK_POSTCODE_PATTERN)
    if (match && match.index !== undefined) {
      const postcode = match[0].toUpperCase()
      const before = value.slice(0, match.index).trim()
      const after = value.slice(match.index + match[0].length).trim()
      const countryMatch = after.match(/\b(United Kingdom|UK)\b/i)
      const country = countryMatch ? countryMatch[0] : ''
      const afterRest = country ? after.replace(country, '').trim() : after
      value = [before, postcode, afterRest, country].filter(Boolean).join(', ')
    }
  }

  return value
}

interface SmartAddressFieldProps {
  value: string
  onChange: (value: string, components?: any) => void
  placeholder?: string
  required?: boolean
  error?: string
  className?: string
  onCoordinatesFound?: (lat: number, lng: number) => void
}

export const SmartAddressField: React.FC<SmartAddressFieldProps> = ({
  value,
  onChange,
  placeholder = 'Enter postcode or start typing address...',
  required,
  error,
  className,
  onCoordinatesFound
}) => {
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const normalizedValue = useMemo(() => {
    if (typeof value !== 'string') return value as any
    if (isFocused) return value
    const base = value.replace(/\s*\n+\s*/g, ', ')
    return normalizeAddressText(base)
  }, [isFocused, value])
  
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    
    setIsSearching(true)
    try {
      // Use the GET endpoint that already exists
      const response = await fetch(`/api/search-address?query=${encodeURIComponent(query)}`)
      
      if (!response.ok) throw new Error('Address search failed')
      
      const data = await response.json()
      setSuggestions(data.results || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Address search error:', error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [])
  
  const debouncedSearch = useMemo(() => {
    return debounce((query: string) => {
      searchAddress(query)
    }, 300)
  }, [searchAddress])

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (typeof value !== 'string') return
    if (!isFocused && normalizedValue && normalizedValue !== value) {
      onChange(normalizedValue)
    }
  }, [isFocused, normalizedValue, onChange, value])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    debouncedSearch(newValue)
  }
  
  const handleSelectSuggestion = (suggestion: any) => {
    const formatSuggestion = (record: any) => {
      const components = record?.components
      if (components) {
        const parts = [
          components.line1,
          components.line2,
          components.city,
          components.county,
          components.postcode,
          components.country
        ]
          .map((part: unknown) => (typeof part === 'string' ? part.trim() : ''))
          .filter(Boolean)
        if (parts.length > 0) return normalizeAddressText(parts.join(', '))
      }
      return normalizeAddressText(record?.fullAddress || record?.displayName || '')
    }
    const formatted = formatSuggestion(suggestion)
    onChange(formatted, {
      postcode: suggestion.postcode,
      coordinates: suggestion.coordinates,
      components: suggestion.components
    })
    
    if (suggestion.coordinates && onCoordinatesFound) {
      onCoordinatesFound(suggestion.coordinates.lat, suggestion.coordinates.lng)
    }
    
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={normalizedValue || ''} // ✅ FIX: Always provide defined value
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true)
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          className={cn(
            "w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            error ? "border-red-500" : "border-gray-300",
            className
          )}
        />
        
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                index === selectedIndex && "bg-gray-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{suggestion.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {suggestion.postcode && `${suggestion.postcode} • `}
                    {suggestion.type}
                  </div>
                </div>
                {suggestion.coordinates && (
                  <MapPin className="h-3 w-3 text-gray-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
