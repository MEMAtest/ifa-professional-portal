// =====================================================
// FILE: src/components/suitability/SmartAddressField.tsx
// COMPLETE SMART ADDRESS COMPONENT - FIXED
// =====================================================

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { SmartAddressLookupResult } from '@/types/suitability'
import { debounce } from 'lodash'
import { cn } from '@/lib/utils'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
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
  
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchAddress(query)
    }, 300),
    [searchAddress]
  )
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    debouncedSearch(newValue)
  }
  
  const handleSelectSuggestion = (suggestion: any) => {
    const formatted = suggestion.fullAddress || suggestion.displayName
    onChange(formatted, {
      postcode: suggestion.postcode,
      coordinates: suggestion.coordinates
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
          value={value || ''} // ✅ FIX: Always provide defined value
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
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