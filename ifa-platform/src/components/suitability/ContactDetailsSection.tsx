// =====================================================
// FILE: src/components/suitability/sections/ContactDetailsSection.tsx
// ENHANCED VERSION - WITH SMART ADDRESS & VISUAL CONSISTENCY
// =====================================================

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { SuitabilitySection } from './SuitabilitySection'
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

// =====================================================
// PHONE NUMBER FORMATTING UTILITIES
// =====================================================

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  
  if (!digits) return ''
  
  // Handle UK numbers
  if (digits.startsWith('44')) {
    const number = digits.slice(2)
    if (number.length <= 10) {
      return `+44 ${number.slice(0, 4)} ${number.slice(4)}`
    }
  } else if (digits.startsWith('0')) {
    const number = digits.slice(1)
    if (number.length <= 10) {
      return `+44 ${number.slice(0, 4)} ${number.slice(4)}`
    }
  } else if (digits.length <= 10) {
    return `+44 ${digits.slice(0, 4)} ${digits.slice(4)}`
  }
  
  return digits.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
}

const validateUKPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '')
  
  if (digits.startsWith('44')) {
    const number = digits.slice(2)
    return number.length >= 10 && /^[1-9]/.test(number)
  } else if (digits.startsWith('0')) {
    return digits.length >= 11 && /^0[1-9]/.test(digits)
  }
  
  return digits.length >= 10
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateUKPostcode = (postcode: string): boolean => {
  const postcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}|GIR\s?0AA)$/i
  return postcodeRegex.test(postcode)
}

// =====================================================
// ENHANCED INPUT COMPONENT
// =====================================================

interface EnhancedInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel'
  required?: boolean
  error?: string
  disabled?: boolean
  icon?: React.ReactNode
  helperText?: string
  className?: string
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  required,
  error,
  disabled,
  icon,
  helperText,
  className
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [internalValue, setInternalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    setInternalValue(value)
  }, [value])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange(newValue)
  }
  
  const handleFocus = () => setIsFocused(true)
  
  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">{icon}</div>
          </div>
        )}
        
        <input
          ref={inputRef}
          type={type}
          value={internalValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            icon && "pl-10",
            error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300",
            disabled && "bg-gray-50 text-gray-500 cursor-not-allowed",
            isFocused && !error && "border-blue-300"
          )}
        />
      </div>
      
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      
      {error && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  )
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
    updateField('address', value)
    
    if (components) {
      // Parse the address components from smart search
      const addressParts = value.split(',').map(part => part.trim())
      
      // Try to intelligently split the address
      if (addressParts.length > 0) {
        updateField('address_line_1', addressParts[0])
      }
      if (addressParts.length > 1) {
        updateField('city', addressParts[addressParts.length - 2] || '')
      }
      if (components.postcode) {
        updateField('postcode', components.postcode)
      }
      if (components.coordinates) {
        updateField('coordinates', components.coordinates)
      }
      
      // Default country to UK
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
    const formatted = value.toUpperCase()
    updateField('postcode', formatted)
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
  
  // Section configuration for SuitabilitySection wrapper
  const section = {
    id: 'contact_details',
    title: 'Contact Details',
    icon: Phone,
    status,
    fields: [], // We'll render custom fields
    conditionalFields: [],
    aiEnabled: false,
    chartEnabled: false,
    pulledDataFields: []
  }
  
  // Render the content
  const renderContent = () => (
    <div className="space-y-6">
      {/* Phone Number */}
      <EnhancedInput
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
              label="Address Line 2"
              value={sectionData.address_line_2 || ''}
              onChange={(value) => updateField('address_line_2', value)}
              placeholder="Flat, unit, building (optional)"
              disabled={isReadOnly}
              icon={<Building className="h-4 w-4" />}
            />
            
            <EnhancedInput
              label="City/Town"
              value={sectionData.city || ''}
              onChange={(value) => updateField('city', value)}
              placeholder="e.g., London"
              required={true}
              error={getFieldError('city')}
              disabled={isReadOnly}
            />
            
            <EnhancedInput
              label="County"
              value={sectionData.county || ''}
              onChange={(value) => updateField('county', value)}
              placeholder="e.g., Greater London"
              disabled={isReadOnly}
            />
            
            <EnhancedInput
              label="Postcode"
              value={sectionData.postcode || ''}
              onChange={handlePostcodeChange}
              placeholder="e.g., SW1A 1AA"
              required={true}
              error={getFieldError('postcode') || 
                     (!validateUKPostcode(sectionData.postcode || '') && sectionData.postcode ? 
                      'Please enter a valid UK postcode' : undefined)}
              disabled={isReadOnly}
              className="uppercase"
            />
            
            <EnhancedInput
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