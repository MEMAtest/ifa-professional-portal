// =====================================================
// FILE: src/components/ui/EnhancedAddressField.tsx
// UK Address Field with Postcode Autocomplete → Street → House Number
// Uses FREE APIs: postcodes.io + Nominatim/Overpass (OpenStreetMap)
// =====================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { MapPin, Check, X, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
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

// Streets API response
interface StreetsResponse {
  postcode: string
  city: string
  county: string
  coordinates: { lat: number; lng: number }
  streets: string[]
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
  onAddressSelect?: (address: AddressComponents) => void
  onError?: (error: string) => void
}

// Main component
export function EnhancedAddressField({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className,
  label = "Address",
  onError
}: EnhancedAddressFieldProps) {
  // State
  const [postcodeInput, setPostcodeInput] = useState('')
  const [postcode, setPostcode] = useState('')
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<string[]>([])
  const [showPostcodeDropdown, setShowPostcodeDropdown] = useState(false)
  const [streets, setStreets] = useState<string[]>([])
  const [selectedStreet, setSelectedStreet] = useState('')
  const [customStreet, setCustomStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [areaInfo, setAreaInfo] = useState({ city: '', county: '' })

  const [isLoadingPostcodes, setIsLoadingPostcodes] = useState(false)
  const [isLoadingStreets, setIsLoadingStreets] = useState(false)
  const [postcodeError, setPostcodeError] = useState('')
  const [showStreetDropdown, setShowStreetDropdown] = useState(false)
  const [showCustomStreetInput, setShowCustomStreetInput] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const postcodeDropdownRef = useRef<HTMLDivElement>(null)
  const streetDropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Use ref to store onChange to avoid infinite loops
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Initialize from existing value (only once)
  useEffect(() => {
    if (isInitialized) return
    setIsInitialized(true)

    if (value && typeof value === 'object') {
      if (value.postcode) {
        setPostcode(value.postcode)
        setPostcodeInput(value.postcode)
      }
      if (value.city) setAreaInfo(prev => ({ ...prev, city: value.city }))
      if (value.county) setAreaInfo(prev => ({ ...prev, county: value.county || '' }))
      if (value.line1) {
        // Try to parse line1 into house number + street
        const match = value.line1.match(/^(\d+[a-zA-Z]?)\s+(.+)$/)
        if (match) {
          setHouseNumber(match[1])
          setSelectedStreet(match[2])
        } else {
          setSelectedStreet(value.line1)
        }
      }
      if (value.line2) setAddressLine2(value.line2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Build and emit address when user changes fields
  const emitAddress = useCallback((
    newHouseNumber: string,
    newSelectedStreet: string,
    newCustomStreet: string,
    newAddressLine2: string,
    newAreaInfo: { city: string; county: string },
    newPostcode: string
  ) => {
    const street = newSelectedStreet || newCustomStreet
    const line1 = newHouseNumber && street
      ? `${newHouseNumber} ${street}`
      : street || newHouseNumber

    const address: AddressComponents = {
      line1,
      line2: newAddressLine2 || undefined,
      city: newAreaInfo.city,
      county: newAreaInfo.county,
      postcode: newPostcode,
      country: 'United Kingdom'
    }

    onChangeRef.current(address)
  }, [])

  // Helper to update field and emit
  const updateAndEmit = useCallback((field: string, newValue: string) => {
    let newHouseNumber = houseNumber
    let newSelectedStreet = selectedStreet
    let newCustomStreet = customStreet
    let newAddressLine2 = addressLine2

    switch (field) {
      case 'houseNumber':
        newHouseNumber = newValue
        setHouseNumber(newValue)
        break
      case 'selectedStreet':
        newSelectedStreet = newValue
        newCustomStreet = ''
        setSelectedStreet(newValue)
        setCustomStreet('')
        break
      case 'customStreet':
        newCustomStreet = newValue
        newSelectedStreet = ''
        setCustomStreet(newValue)
        setSelectedStreet('')
        break
      case 'addressLine2':
        newAddressLine2 = newValue
        setAddressLine2(newValue)
        break
    }

    // Only emit if we have postcode info
    if (postcode && areaInfo.city) {
      emitAddress(newHouseNumber, newSelectedStreet, newCustomStreet, newAddressLine2, areaInfo, postcode)
    }
  }, [houseNumber, selectedStreet, customStreet, addressLine2, postcode, areaInfo, emitAddress])

  // Fetch postcode suggestions as user types
  const fetchPostcodeSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPostcodeSuggestions([])
      setShowPostcodeDropdown(false)
      return
    }

    setIsLoadingPostcodes(true)
    try {
      const normalized = query.replace(/\s+/g, '').toUpperCase()
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${normalized}/autocomplete`,
        { signal: AbortSignal.timeout(3000) }
      )

      if (response.ok) {
        const data = await response.json()
        const suggestions = data.result || []
        setPostcodeSuggestions(suggestions.slice(0, 8))
        setShowPostcodeDropdown(suggestions.length > 0)
      }
    } catch {
      // Silently fail - user can still type full postcode
    } finally {
      setIsLoadingPostcodes(false)
    }
  }, [])

  // Debounced postcode input handler
  const handlePostcodeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setPostcodeInput(value)
    setPostcodeError('')

    // Clear any existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      fetchPostcodeSuggestions(value)
    }, 200)
  }, [fetchPostcodeSuggestions])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (postcodeDropdownRef.current && !postcodeDropdownRef.current.contains(event.target as Node)) {
        setShowPostcodeDropdown(false)
      }
      if (streetDropdownRef.current && !streetDropdownRef.current.contains(event.target as Node)) {
        setShowStreetDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Select a postcode and fetch streets
  const handlePostcodeSelect = async (selectedPostcode: string) => {
    setPostcodeInput(selectedPostcode)
    setPostcode(selectedPostcode)
    setShowPostcodeDropdown(false)
    setPostcodeSuggestions([])
    setIsLoadingStreets(true)
    setPostcodeError('')
    setStreets([])
    setSelectedStreet('')
    setCustomStreet('')

    try {
      const response = await fetch(
        `/api/search-address?mode=streets&postcode=${encodeURIComponent(selectedPostcode)}`
      )

      if (!response.ok) {
        throw new Error('Invalid postcode')
      }

      const data: StreetsResponse = await response.json()

      const newAreaInfo = { city: data.city, county: data.county }
      setAreaInfo(newAreaInfo)
      setPostcode(data.postcode)
      setPostcodeInput(data.postcode)

      if (data.streets && data.streets.length > 0) {
        setStreets(data.streets)
      } else {
        setShowCustomStreetInput(true)
      }

      // Emit initial address with postcode area info
      emitAddress(houseNumber, '', '', addressLine2, newAreaInfo, data.postcode)
    } catch {
      setPostcodeError('Postcode not found. Please check and try again.')
      if (onError) onError('Postcode lookup failed')
    } finally {
      setIsLoadingStreets(false)
    }
  }

  // Handle Enter key on postcode input
  const handlePostcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (postcodeSuggestions.length > 0) {
        handlePostcodeSelect(postcodeSuggestions[0])
      } else if (postcodeInput.length >= 5) {
        handlePostcodeSelect(postcodeInput)
      }
    } else if (e.key === 'Escape') {
      setShowPostcodeDropdown(false)
    }
  }

  // Handle street selection
  const handleStreetSelect = (street: string) => {
    updateAndEmit('selectedStreet', street)
    setShowStreetDropdown(false)
    setShowCustomStreetInput(false)
  }

  // Reset form
  const handleReset = () => {
    setPostcode('')
    setPostcodeInput('')
    setPostcodeSuggestions([])
    setStreets([])
    setSelectedStreet('')
    setCustomStreet('')
    setHouseNumber('')
    setAddressLine2('')
    setAreaInfo({ city: '', county: '' })
    setPostcodeError('')
    setShowCustomStreetInput(false)
    setShowPostcodeDropdown(false)
    onChangeRef.current({
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    })
  }

  const hasAreaInfo = areaInfo.city || streets.length > 0
  const currentStreet = selectedStreet || customStreet

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        <MapPin className="inline h-4 w-4 mr-1" />
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Step 1: Postcode Input with Autocomplete */}
      <div className="relative" ref={postcodeDropdownRef}>
        <div className="relative">
          <Input
            type="text"
            value={postcodeInput}
            onChange={handlePostcodeInputChange}
            onKeyDown={handlePostcodeKeyDown}
            onFocus={() => postcodeSuggestions.length > 0 && setShowPostcodeDropdown(true)}
            placeholder="Start typing postcode (e.g. SE20)"
            disabled={disabled || isLoadingStreets}
            className={cn(
              "pr-10",
              postcodeError && "border-red-500",
              hasAreaInfo && "border-green-500"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoadingPostcodes && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {hasAreaInfo && (
              <button
                type="button"
                onClick={handleReset}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Postcode autocomplete dropdown */}
        {showPostcodeDropdown && postcodeSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
            {postcodeSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePostcodeSelect(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between"
              >
                <span>{suggestion}</span>
                {index === 0 && <span className="text-xs text-gray-400">Press Enter</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {postcodeError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {postcodeError}
        </p>
      )}

      {/* Loading streets indicator */}
      {isLoadingStreets && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding streets...
        </div>
      )}

      {/* Step 2: Street Selection (shown after postcode lookup) */}
      {hasAreaInfo && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              <Check className="inline h-4 w-4 mr-1" />
              {postcode} - {areaInfo.city}
            </span>
          </div>

          {/* Street dropdown or custom input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Street Name *
            </label>

            {!showCustomStreetInput && streets.length > 0 ? (
              <div className="relative" ref={streetDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowStreetDropdown(!showStreetDropdown)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 bg-white border rounded-md text-left",
                    "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    currentStreet ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  <span>{currentStreet || "Select your street..."}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {showStreetDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                    {streets.map((street, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleStreetSelect(street)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-blue-50",
                          selectedStreet === street && "bg-blue-100"
                        )}
                      >
                        {street}
                      </button>
                    ))}
                    <div className="border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomStreetInput(true)
                          setShowStreetDropdown(false)
                          setSelectedStreet('')
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
                      >
                        Street not listed? Enter manually...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={customStreet}
                  onChange={(e) => updateAndEmit('customStreet', e.target.value)}
                  placeholder="Enter street name (e.g. Tremaine Road)"
                  disabled={disabled}
                  className="bg-white"
                />
                {streets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomStreetInput(false)
                      setCustomStreet('')
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    ← Back to street list
                  </button>
                )}
              </div>
            )}
          </div>

          {/* House Number */}
          <div>
            <label className="text-xs font-medium text-gray-700">
              House/Building Number *
            </label>
            <Input
              type="text"
              value={houseNumber}
              onChange={(e) => updateAndEmit('houseNumber', e.target.value)}
              placeholder="e.g. 42, 15A, Flat 3"
              disabled={disabled}
              className="bg-white mt-1"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="text-xs font-medium text-gray-700">
              Address Line 2 <span className="text-gray-400">(optional)</span>
            </label>
            <Input
              type="text"
              value={addressLine2}
              onChange={(e) => updateAndEmit('addressLine2', e.target.value)}
              placeholder="e.g. Flat 4, Building Name"
              disabled={disabled}
              className="bg-white mt-1"
            />
          </div>

          {/* Auto-filled info */}
          <div className="text-xs text-gray-500 pt-2 border-t border-blue-200">
            <span className="font-medium">Location:</span> {areaInfo.city}
            {areaInfo.county && `, ${areaInfo.county}`}, {postcode}
          </div>
        </div>
      )}

      {/* Help text when no postcode entered */}
      {!hasAreaInfo && !postcodeError && (
        <p className="text-xs text-gray-500">
          Enter your UK postcode to find your street
        </p>
      )}

      {/* Error display */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
}
