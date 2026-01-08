// =====================================================
// FILE: src/components/suitability/sections/ContactDetailsSection.tsx
// ENHANCED VERSION - WITH SMART ADDRESS & VISUAL CONSISTENCY
// =====================================================

import React, { useState, useCallback, useEffect } from 'react'
import { SmartAddressField } from './SmartAddressField'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  AlertTriangle, 
  Phone, 
  Mail, 
  MapPin, 
  Check, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Home,
  Building,
  Edit2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValidationError, PulledPlatformData } from '@/types/suitability'
import { EnhancedInput } from './contact-details/EnhancedInput'
import { formatPhoneNumber, formatUKPostcode, validateEmail, validateUKPhone, validateUKPostcode } from './contact-details/formatting'

interface ContactDetailsProps {
  sectionData: {
    phone?: string
    email?: string  
    address?: string
    address_line_1?: string
    address_line_2?: string
    city?: string
    county?: string
    postcode?: string
    country?: string
    addressComponents?: {
      line1?: string
      line2?: string
      city?: string
      county?: string
      postcode?: string
      country?: string
    }
    coordinates?: { lat: number; lng: number }
    preferred_contact?: string
    best_contact_time?: string
  }
  updateField: (fieldId: string, value: any) => void
  validationErrors: ValidationError[]
  isReadOnly?: boolean
  pulledData?: PulledPlatformData
  formData?: any
  isExpanded?: boolean
  onToggle?: () => void
}

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
      const afterRest = country ? after.replace(countryMatch[0], '').trim() : after
      value = [before, postcode, afterRest, country].filter(Boolean).join(', ')
    }
  }

  return value
}

const formatAddressFromComponents = (components?: Record<string, unknown>, fallback?: string) => {
  if (components) {
    const parts = [
      components.line1,
      components.line2,
      components.city,
      components.county,
      components.postcode,
      components.country
    ]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
  }
  return normalizeAddressText(fallback || '')
}

// =====================================================
// MAIN CONTACT DETAILS COMPONENT
// =====================================================

export const ContactDetailsSection: React.FC<ContactDetailsProps> = ({
  sectionData,
  updateField,
  validationErrors,
  isReadOnly = false,
  pulledData,
  formData,
  isExpanded = true,
  onToggle
}) => {
  const [showManualAddress, setShowManualAddress] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [phoneDisplayValue, setPhoneDisplayValue] = useState(sectionData.phone || '')
  const [emailValue, setEmailValue] = useState(sectionData.email || '')
  
  // Sync state with props
  useEffect(() => {
    setPhoneDisplayValue(sectionData.phone || '')
  }, [sectionData.phone])
  
  useEffect(() => {
    setEmailValue(sectionData.email || '')
  }, [sectionData.email])
  
  // Get field-specific errors
  const getFieldError = (fieldId: string): string | undefined => {
    return validationErrors.find(err => err.fieldId === fieldId)?.message
  }
  
  // Handle smart address selection
  const handleAddressSelection = useCallback((value: string, components?: any) => {
    if (!components) {
      updateField('address', value)
      return
    }
    const componentPayload = components?.components ?? components
    const formattedAddress = formatAddressFromComponents(componentPayload, value)
    updateField('address', formattedAddress || value)
    
    if (componentPayload) {
      if (componentPayload.line1) updateField('address_line_1', componentPayload.line1)
      if (componentPayload.line2) updateField('address_line_2', componentPayload.line2)
      if (componentPayload.city) updateField('city', componentPayload.city)
      if (componentPayload.county) updateField('county', componentPayload.county)
      if (componentPayload.postcode) updateField('postcode', formatUKPostcode(componentPayload.postcode))
      if (componentPayload.country) updateField('country', componentPayload.country)
      updateField('addressComponents', componentPayload)
    }

    if (components?.postcode && !componentPayload?.postcode) {
      updateField('postcode', formatUKPostcode(components.postcode))
    }
    if (components?.coordinates) {
      updateField('coordinates', components.coordinates)
    }
    
    if (!componentPayload?.country) {
      updateField('country', 'United Kingdom')
    }
  }, [updateField])
  
  // Handle phone number
  const handlePhoneChange = (value: string) => {
    setPhoneDisplayValue(value)
    updateField('phone', value)
  }
  
  const handlePhoneBlur = () => {
    if (phoneDisplayValue) {
      const formatted = formatPhoneNumber(phoneDisplayValue)
      setPhoneDisplayValue(formatted)
      updateField('phone', formatted)
    }
  }
  
  // Handle email
  const handleEmailChange = (value: string) => {
    setEmailValue(value)
    updateField('email', value)
  }
  
  // Format postcode
  const handlePostcodeChange = (value: string) => {
    updateField('postcode', value.toUpperCase())
  }

  const handlePostcodeBlur = () => {
    if (!sectionData.postcode) return
    const formatted = formatUKPostcode(sectionData.postcode)
    if (formatted && formatted !== sectionData.postcode) {
      updateField('postcode', formatted)
    }
  }
  
  // Validation
  const validateSection = () => {
    setIsValidating(true)
    
    setTimeout(() => {
      const phoneValid = validateUKPhone(sectionData.phone || '')
      const emailValid = validateEmail(sectionData.email || '')
      const postcodeValid = sectionData.postcode ? validateUKPostcode(sectionData.postcode) : true
      
      if (!phoneValid && sectionData.phone) {
        console.warn('Invalid phone number format')
      }
      
      if (!emailValid && sectionData.email) {
        console.warn('Invalid email format')  
      }
      
      if (!postcodeValid && sectionData.postcode) {
        console.warn('Invalid postcode format')
      }
      
      setIsValidating(false)
    }, 500)
  }
  
  // Calculate completion
  const requiredFields = ['phone', 'email', 'address', 'preferred_contact']
  const completedFields = requiredFields.filter(field => 
    sectionData[field as keyof typeof sectionData]
  )
  const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100)
  
  // Determine section status
  const hasErrors = validationErrors.length > 0
  const status: 'error' | 'complete' | 'partial' | 'incomplete' = hasErrors ? 'error' : completionPercentage === 100 ? 'complete' : 
                 completionPercentage > 0 ? 'partial' : 'incomplete'

  // Render the content
  const renderContent = () => (
    <div className="space-y-6">
      {/* Phone Number */}
      <EnhancedInput
        id="phone"
        label="Phone Number"
        value={phoneDisplayValue}
        onChange={handlePhoneChange}
        onBlur={handlePhoneBlur}
        type="tel"
        placeholder="+44 7700 900123 or 07700 900123"
        required={true}
        error={getFieldError('phone') || 
               (!validateUKPhone(phoneDisplayValue) && phoneDisplayValue ? 
                'Please enter a valid UK phone number' : undefined)}
        disabled={isReadOnly}
        icon={<Phone className="h-4 w-4" />}
        helperText="UK numbers will be formatted as +44 automatically"
      />
      
      {/* Email Address */}
      <EnhancedInput
        id="email"
        label="Email Address"
        value={emailValue}
        onChange={handleEmailChange}
        type="email"
        placeholder="john.smith@example.com"
        required={true}
        error={getFieldError('email') || 
               (!validateEmail(emailValue) && emailValue ? 
                'Please enter a valid email address' : undefined)}
        disabled={isReadOnly}
        icon={<Mail className="h-4 w-4" />}
        helperText="This will be used for important communications"
      />
      
      {/* Smart Address Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Address
          <span className="text-red-500 ml-1">*</span>
        </label>
        
        <SmartAddressField
          value={sectionData.address || ''}
          onChange={handleAddressSelection}
          placeholder="Enter postcode or start typing address..."
          required={true}
          error={getFieldError('address')}
          onCoordinatesFound={(lat, lng) => {
            updateField('coordinates', { lat, lng })
          }}
        />
        
        {/* Toggle manual entry */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowManualAddress(!showManualAddress)}
            className="text-xs"
          >
            {showManualAddress ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide manual entry
              </>
            ) : (
              <>
                <Edit2 className="h-3 w-3 mr-1" />
                Enter manually
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Manual Address Fields */}
      {showManualAddress && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedInput
              id="address_line_1"
              label="Address Line 1"
              value={sectionData.address_line_1 || ''}
              onChange={(value) => updateField('address_line_1', value)}
              placeholder="House number and street"
              required={true}
              error={getFieldError('address_line_1')}
              disabled={isReadOnly}
              icon={<Home className="h-4 w-4" />}
            />
            
            <EnhancedInput
              id="address_line_2"
              label="Address Line 2"
              value={sectionData.address_line_2 || ''}
              onChange={(value) => updateField('address_line_2', value)}
              placeholder="Flat, unit, building (optional)"
              disabled={isReadOnly}
              icon={<Building className="h-4 w-4" />}
            />
            
            <EnhancedInput
              id="city"
              label="City/Town"
              value={sectionData.city || ''}
              onChange={(value) => updateField('city', value)}
              placeholder="e.g., London"
              required={true}
              error={getFieldError('city')}
              disabled={isReadOnly}
            />
            
            <EnhancedInput
              id="county"
              label="County"
              value={sectionData.county || ''}
              onChange={(value) => updateField('county', value)}
              placeholder="e.g., Greater London"
              disabled={isReadOnly}
            />
            
            <EnhancedInput
              id="postcode"
              label="Postcode"
              value={sectionData.postcode || ''}
              onChange={handlePostcodeChange}
              onBlur={handlePostcodeBlur}
              placeholder="e.g., SW1A 1AA"
              required={true}
              error={getFieldError('postcode') || 
                     (!validateUKPostcode(sectionData.postcode || '') && sectionData.postcode ? 
                      'Please enter a valid UK postcode' : undefined)}
              disabled={isReadOnly}
              className="uppercase"
            />
            
            <EnhancedInput
              id="country"
              label="Country"
              value={sectionData.country || 'United Kingdom'}
              onChange={(value) => updateField('country', value)}
              placeholder="United Kingdom"
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}
      
      {/* Preferred Contact Method */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Preferred Contact Method
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={sectionData.preferred_contact || ''}
          onChange={(e) => updateField('preferred_contact', e.target.value)}
          disabled={isReadOnly}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            getFieldError('preferred_contact') && "border-red-300"
          )}
        >
          <option value="">Select preferred method...</option>
          <option value="Email">Email</option>
          <option value="Phone">Phone</option>
          <option value="Post">Post</option>
          <option value="SMS">SMS</option>
        </select>
        {getFieldError('preferred_contact') && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-xs">{getFieldError('preferred_contact')}</span>
          </div>
        )}
      </div>
      
      {/* Best Contact Time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Best Time to Contact
        </label>
        <select
          value={sectionData.best_contact_time || ''}
          onChange={(e) => updateField('best_contact_time', e.target.value)}
          disabled={isReadOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Any time</option>
          <option value="Morning (9am-12pm)">Morning (9am-12pm)</option>
          <option value="Afternoon (12pm-5pm)">Afternoon (12pm-5pm)</option>
          <option value="Evening (5pm-8pm)">Evening (5pm-8pm)</option>
          <option value="Weekends only">Weekends only</option>
        </select>
      </div>
      
      {/* Validation & Status */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600">
          {completionPercentage}% Complete
        </div>
        
        <Button
          onClick={validateSection}
          variant="outline"
          size="sm"
          disabled={isValidating || isReadOnly}
        >
          {isValidating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Validate Details
        </Button>
      </div>
      
      {/* Completion Status */}
      {completionPercentage === 100 && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Contact details complete and validated
          </AlertDescription>
        </Alert>
      )}
      
      {/* Show if coordinates were found */}
      {sectionData.coordinates && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Location coordinates captured for mapping
        </div>
      )}
    </div>
  )
  
  // Render the content directly without SuitabilitySection wrapper
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Contact Details</h3>
          <Badge 
            variant={status === 'complete' ? 'success' : status === 'error' ? 'destructive' : 'secondary'}
            className="ml-2"
          >
            {status === 'complete' ? 'Complete' : status === 'error' ? 'Error' : `${completionPercentage}%`}
          </Badge>
        </div>
        {onToggle && (
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>
      
      {isExpanded && (
        <CardContent className="p-0">
          {renderContent()}
        </CardContent>
      )}
    </Card>
  )
}

export default ContactDetailsSection
