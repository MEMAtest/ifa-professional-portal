// =====================================================
// FILE: src/components/ui/EnhancedAddressField.tsx
// COMPLETE ENHANCED ADDRESS FIELD - FULL UNABRIDGED CODE
// Replace your existing address component with this
// =====================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MapPin, Search, Check, X, AlertCircle, Loader2, Edit, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// Address component interface
interface AddressComponents {
  line1: string
  line2?: string
  city: string
  county?: string
  postcode: string
  country: string
}

// Address search result interface
interface AddressResult {
  formatted: string
  components: AddressComponents
  coordinates?: {
    lat: number
    lng: number
  }
}

// Component props interface
interface EnhancedAddressFieldProps {
  value?: string | AddressComponents
  onChange: (address: AddressComponents) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  className?: string
  label?: string
  showCoordinates?: boolean
  allowManualEntry?: boolean
  validatePostcode?: boolean
  onAddressSelect?: (address: AddressResult) => void
  onError?: (error: string) => void
}

// Main component
export function EnhancedAddressField({
  value,
  onChange,
  placeholder = "Start typing your address...",
  disabled = false,
  required = false,
  error,
  className,
  label = "Address",
  showCoordinates = false,
  allowManualEntry = true,
  validatePostcode = true,
  onAddressSelect,
  onError
}: EnhancedAddressFieldProps) {
  // State management
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AddressComponents | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Refs for DOM management
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const searchAbortController = useRef<AbortController | null>(null)

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      if (typeof value === 'string') {
        setQuery(value)
        setHasSearched(false)
      } else {
        setSelectedAddress(value)
        setQuery(formatAddressComponents(value))
        setHasSearched(true)
      }
    }
  }, [value])

  // Format address components into display string
  const formatAddressComponents = useCallback((components: AddressComponents): string => {
    const parts = [
      components.line1,
      components.line2,
      components.city,
      components.county,
      components.postcode
    ].filter(Boolean)
    
    return parts.join(', ')
  }, [])

  // Validate UK postcode format
  const validateUKPostcode = useCallback((postcode: string): boolean => {
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i
    return ukPostcodeRegex.test(postcode.replace(/\s/g, ''))
  }, [])

  // Search for addresses using API
  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    // Cancel any existing search
    if (searchAbortController.current) {
      searchAbortController.current.abort()
    }

    // Create new abort controller
    searchAbortController.current = new AbortController()

    setIsLoading(true)
    setValidationError(null)
    
    try {
      console.log('Searching for addresses:', searchQuery)

      const response = await fetch(`/api/search-address?query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: searchAbortController.current.signal
      })

      if (!response.ok) {
        throw new Error(`Address search failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Address search response:', data)
      
      if (data.results && Array.isArray(data.results)) {
        // Map API results to our format
        const formattedResults: AddressResult[] = data.results.map((addr: any) => ({
          formatted: addr.displayName || addr.fullAddress || addr.formatted,
          components: {
            line1: addr.components?.line1 || addr.displayName?.split(',')[0] || searchQuery,
            line2: addr.components?.line2 || '',
            city: addr.components?.city || addr.post_town || '',
            county: addr.components?.county || addr.administrative_area || '',
            postcode: addr.components?.postcode || addr.postcode || '',
            country: addr.components?.country || 'United Kingdom'
          },
          coordinates: addr.coordinates ? {
            lat: parseFloat(addr.coordinates.lat),
            lng: parseFloat(addr.coordinates.lng)
          } : undefined
        }))
        
        setSuggestions(formattedResults)
        setIsOpen(formattedResults.length > 0)
        setHasSearched(true)
        
        console.log('Formatted suggestions:', formattedResults.length)
      } else {
        console.log('No results found')
        setSuggestions([])
        setIsOpen(false)
        setHasSearched(true)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Address search aborted')
        return
      }
      
      console.error('Address search error:', error)
      setValidationError('Address search failed. Please try again or enter manually.')
      setSuggestions([])
      setIsOpen(false)
      
      if (onError) {
        onError(error instanceof Error ? error.message : 'Address search failed')
      }
    } finally {
      setIsLoading(false)
    }
  }, [onError])

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      searchAddresses(searchQuery)
    }, 300) // 300ms debounce
  }, [searchAddresses])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    setSelectedAddress(null)
    setValidationError(null)
    setHasSearched(false)
    
    if (newQuery.length >= 3) {
      debouncedSearch(newQuery)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }

  // Handle address selection
  const handleAddressSelect = (address: AddressResult) => {
    console.log('Address selected:', address)
    
    setSelectedAddress(address.components)
    setQuery(address.formatted)
    setIsOpen(false)
    setSuggestions([])
    setValidationError(null)
    setHasSearched(true)
    
    // Validate postcode if enabled
    if (validatePostcode && address.components.postcode) {
      if (!validateUKPostcode(address.components.postcode)) {
        setValidationError('Invalid UK postcode format')
      }
    }
    
    // Call onChange with address components
    onChange(address.components)
    
    // Call onAddressSelect callback if provided
    if (onAddressSelect) {
      onAddressSelect(address)
    }

    // Focus back to input for better UX
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  // Handle manual entry toggle
  const handleManualEntry = () => {
    console.log('Switching to manual entry mode')
    setManualEntry(true)
    setIsOpen(false)
    setSuggestions([])
    setValidationError(null)
  }

  // Handle manual address change
  const handleManualAddressChange = (field: keyof AddressComponents, fieldValue: string) => {
    const updatedAddress = { 
      ...(selectedAddress || {
        line1: '',
        line2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom'
      }), 
      [field]: fieldValue 
    }
    
    setSelectedAddress(updatedAddress)
    setValidationError(null)
    
    // Validate postcode if it's being changed
    if (field === 'postcode' && validatePostcode && fieldValue) {
      if (!validateUKPostcode(fieldValue)) {
        setValidationError('Invalid UK postcode format')
      }
    }
    
    onChange(updatedAddress)
  }

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSuggestions([])
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce and abort controller on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (searchAbortController.current) {
        searchAbortController.current.abort()
      }
    }
  }, [])

  // Manual entry mode rendering
  if (manualEntry) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            <Home className="inline h-4 w-4 mr-1" />
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setManualEntry(false)
              setQuery('')
              setSelectedAddress(null)
              setValidationError(null)
            }}
            disabled={disabled}
          >
            <Search className="h-4 w-4 mr-1" />
            Search instead
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Address Line 1 *</label>
            <Input
              placeholder="e.g. 123 High Street"
              value={selectedAddress?.line1 || ''}
              onChange={(e) => handleManualAddressChange('line1', e.target.value)}
              required={required}
              disabled={disabled}
              className={cn(validationError && "border-red-500")}
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Address Line 2 (optional)</label>
            <Input
              placeholder="e.g. Apartment 4B, Building name"
              value={selectedAddress?.line2 || ''}
              onChange={(e) => handleManualAddressChange('line2', e.target.value)}
              disabled={disabled}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">City *</label>
              <Input
                placeholder="e.g. London"
                value={selectedAddress?.city || ''}
                onChange={(e) => handleManualAddressChange('city', e.target.value)}
                required={required}
                disabled={disabled}
                className={cn(validationError && "border-red-500")}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">County</label>
              <Input
                placeholder="e.g. Greater London"
                value={selectedAddress?.county || ''}
                onChange={(e) => handleManualAddressChange('county', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Postcode *</label>
              <Input
                placeholder="e.g. SW1A 1AA"
                value={selectedAddress?.postcode || ''}
                onChange={(e) => handleManualAddressChange('postcode', e.target.value.toUpperCase())}
                required={required}
                disabled={disabled}
                className={cn(validationError && "border-red-500")}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Country</label>
              <Input
                placeholder="United Kingdom"
                value={selectedAddress?.country || 'United Kingdom'}
                onChange={(e) => handleManualAddressChange('country', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
        
        {(validationError || error) && (
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{validationError || error}</span>
          </div>
        )}
      </div>
    )
  }

  // Search mode rendering
  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <MapPin className="inline h-4 w-4 mr-1" />
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          required={required}
          className={cn(
            "pl-10 pr-10",
            (error || validationError) && "border-red-500 focus:border-red-500 focus:ring-red-500",
            selectedAddress && "border-green-500 focus:border-green-500 focus:ring-green-500"
          )}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
          </div>
        )}
        
        {/* Success indicator */}
        {selectedAddress && !isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      {/* Address suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-auto border shadow-lg bg-white">
          <CardContent className="p-1">
            {suggestions.map((address, index) => (
              <button
                key={index}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-start space-x-2 transition-colors"
                onClick={() => handleAddressSelect(address)}
              >
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {address.components.line1}
                    {address.components.line2 && `, ${address.components.line2}`}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {[address.components.city, address.components.county, address.components.postcode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {showCoordinates && address.coordinates && (
                    <div className="text-xs text-gray-400">
                      {address.coordinates.lat.toFixed(4)}, {address.coordinates.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            {allowManualEntry && (
              <div className="border-t pt-1 mt-1">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center space-x-2 text-sm text-gray-600 transition-colors"
                  onClick={handleManualEntry}
                >
                  <Edit className="h-4 w-4" />
                  <span>Enter address manually</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {hasSearched && query.length >= 3 && suggestions.length === 0 && !isLoading && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-white">
          <CardContent className="p-3">
            <div className="text-sm text-gray-500 text-center">
              <AlertCircle className="h-4 w-4 mx-auto mb-1" />
              No addresses found for "{query}"
              {allowManualEntry && (
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="block w-full mt-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Enter address manually
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected address display */}
      {selectedAddress && !manualEntry && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm flex-1">
                <div className="font-medium text-green-900">
                  {selectedAddress.line1}
                  {selectedAddress.line2 && `, ${selectedAddress.line2}`}
                </div>
                <div className="text-green-700">
                  {[selectedAddress.city, selectedAddress.county, selectedAddress.postcode]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {showCoordinates && selectedAddress && (
                  <div className="text-xs text-green-600 mt-1">
                    <Badge variant="outline" className="text-xs">
                      UK Address
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-1 ml-2">
              {allowManualEntry && (
                <button
                  type="button"
                  onClick={() => setManualEntry(true)}
                  className="text-green-600 hover:text-green-800 p-1"
                  title="Edit manually"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedAddress(null)
                  setQuery('')
                  setValidationError(null)
                  onChange({
                    line1: '',
                    line2: '',
                    city: '',
                    county: '',
                    postcode: '',
                    country: 'United Kingdom'
                  })
                }}
                className="text-green-600 hover:text-green-800 p-1"
                title="Clear address"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {(error || validationError) && (
        <div className="mt-1 flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{validationError || error}</span>
        </div>
      )}

      {/* Help text */}
      {!selectedAddress && !error && !validationError && (
        <div className="mt-1 text-xs text-gray-500">
          Start typing your address to search, or {allowManualEntry ? 'enter manually' : 'select from suggestions'}
        </div>
      )}
    </div>
  )
}