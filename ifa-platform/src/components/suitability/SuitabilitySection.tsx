// =====================================================
// FILE: /src/components/suitability/SuitabilitySection.tsx
// ENHANCED VERSION - ALL ISSUES FIXED & ELEVATED
// =====================================================

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import debounce from 'lodash/debounce'

// UI Components
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'

// Smart Components
import { SmartAddressField } from './SmartAddressField'
import { FinancialDashboard } from './FinancialDashboard'

// Icons
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Lock,
  Unlock,
  User,
  Calendar,
  Phone,
  Mail,
  Home,
  PoundSterling,
  Calculator,
  Target,
  Shield,
  Heart,
  GraduationCap,
  Briefcase,
  FileText,
  TrendingUp,
  Activity,
  Info,
  Copy,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Check
} from 'lucide-react'

// Types
import type {
  SuitabilitySection as SuitabilitySectionType,
  SuitabilityFormData,
  PulledPlatformData,
  ValidationError,
  AISuggestion,
  ConditionalFieldGroup,
  SuitabilityField
} from '@/types/suitability'

// =====================================================
// ENHANCED TOOLTIP COMPONENT
// =====================================================

interface TooltipProps {
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top' }) => {
  const [show, setShow] = useState(false)
  
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "absolute z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap",
              positionClasses[position]
            )}
          >
            {content}
            <div className={cn(
              "absolute w-2 h-2 bg-gray-900 rotate-45",
              position === 'top' && "top-full left-1/2 transform -translate-x-1/2 -mt-1",
              position === 'bottom' && "bottom-full left-1/2 transform -translate-x-1/2 -mb-1",
              position === 'left' && "left-full top-1/2 transform -translate-y-1/2 -ml-1",
              position === 'right' && "right-full top-1/2 transform -translate-y-1/2 -mr-1"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =====================================================
// EXTENDED FIELD TYPE DEFINITIONS
// =====================================================

interface ExtendedSuitabilityField extends SuitabilityField {
  maxLength?: number
  autoComplete?: string
  min?: number | string
  max?: number | string
  step?: number | string
  rows?: number
  fullWidth?: boolean
  readOnly?: boolean
  pattern?: string
  mask?: string
  transform?: (value: any) => any
  format?: (value: any) => string
}

interface ExtendedSuitabilitySection extends SuitabilitySectionType {
  description?: string
  helpUrl?: string
  videoGuideUrl?: string
}

// =====================================================
// FIELD PROPS WITH COMPLETE TYPING
// =====================================================

interface FieldProps {
  field: ExtendedSuitabilityField
  value: any
  onChange: (value: any) => void
  onBlur?: () => void
  onFocus?: () => void
  error?: ValidationError
  warning?: string
  aiSuggestion?: any
  pulledValue?: any
  isReadOnly?: boolean
  isRequired?: boolean
  isLoading?: boolean
  showHelp?: boolean
  className?: string
}

// =====================================================
// ENHANCED TEXT FIELD COMPONENT
// =====================================================

const TextField = memo<FieldProps>(({ 
  field, 
  value, 
  onChange, 
  onBlur,
  onFocus,
  error,
  warning,
  isReadOnly,
  isRequired,
  aiSuggestion,
  pulledValue,
  showHelp
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const isPassword = false // Password fields not used in suitability
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value
    
    // Apply mask if defined
    if (field.mask) {
      // Simple mask implementation (can be enhanced)
      newValue = newValue.replace(/[^0-9A-Z\s]/gi, '')
    }
    
    // Apply transform if defined
    if (field.transform) {
      newValue = field.transform(newValue)
    }
    
    onChange(newValue)
  }, [field.mask, field.transform, onChange])
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor={field.id}
          className={cn(
            "text-sm font-medium",
            error && "text-red-600",
            warning && "text-yellow-600"
          )}
        >
          {field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        <div className="flex items-center gap-2">
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
          type={isPassword && !showPassword ? 'password' : 'text'}
          value={value || ''}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={field.placeholder}
          disabled={!!isReadOnly || !!field.autoGenerate || !!field.calculate}
          className={cn(
            "w-full pr-20",
            error && "border-red-500 focus:ring-red-500",
            warning && "border-yellow-500 focus:ring-yellow-500",
            (field.autoGenerate || field.calculate) && "bg-gray-50"
          )}
          maxLength={field.maxLength}
          autoComplete={field.autoComplete}
          pattern={field.pattern}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isPassword && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
              className="h-8 w-8 p-0"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          
          {value && !isPassword && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
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
})
TextField.displayName = 'TextField'

// =====================================================
// FIXED NUMBER FIELD COMPONENT
// =====================================================

const NumberField = memo<FieldProps>(({ 
  field, 
  value, 
  onChange, 
  onBlur,
  onFocus,
  error,
  warning,
  isReadOnly,
  isRequired,
  aiSuggestion,
  pulledValue,
  showHelp
}) => {
  // ✅ FIX: Keep as string during input, convert on blur
  const [localValue, setLocalValue] = useState(value?.toString() || '')
  const [isFocused, setIsFocused] = useState(false)
  
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value?.toString() || '')
    }
  }, [value, isFocused])
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Allow empty string, numbers, and decimal point
    if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
      setLocalValue(inputValue)
      
      // Only update parent if it's a valid number or empty
      if (inputValue === '') {
        onChange(null)
      } else {
        const numValue = parseFloat(inputValue)
        if (!isNaN(numValue)) {
          onChange(numValue)
        }
      }
    }
  }, [onChange])
  
  const handleBlur = useCallback(() => {
    setIsFocused(false)
    
    // Clean up the value on blur
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
  
  // Format display value when not focused
  const displayValue = useMemo(() => {
    if (isFocused) return localValue
    
    if (field.format && value !== null && value !== undefined) {
      return field.format(value)
    }
    
    // Format currency fields
    if (field.id.includes('amount') || field.id.includes('income') || field.id.includes('value')) {
      if (value) {
        return new Intl.NumberFormat('en-GB').format(value)
      }
    }
    
    return localValue
  }, [isFocused, localValue, value, field])
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor={field.id}
          className={cn(
            "text-sm font-medium",
            error && "text-red-600",
            warning && "text-yellow-600"
          )}
        >
          {field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        <div className="flex items-center gap-2">
          {aiSuggestion !== undefined && aiSuggestion !== value && (
            <Tooltip content={`AI suggests: ${aiSuggestion}`}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange(aiSuggestion)}
                className="h-6 px-2"
              >
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            £
          </span>
        )}
        
        <Input
          id={field.id}
          type="text" // Use text to control formatting
          inputMode="decimal" // Mobile numeric keyboard
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={field.placeholder}
          disabled={!!isReadOnly || !!field.calculate}
          className={cn(
            field.id.includes('amount') || field.id.includes('income') || field.id.includes('value') ? "pl-8" : "",
            error && "border-red-500 focus:ring-red-500",
            warning && "border-yellow-500 focus:ring-yellow-500",
            field.calculate && "bg-gray-50"
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
})
NumberField.displayName = 'NumberField'

// =====================================================
// MAIN FIELD RENDERER - ENHANCED
// =====================================================

const FieldRenderer = memo<FieldProps>(({ 
  field, 
  value, 
  onChange, 
  error, 
  warning,
  aiSuggestion,
  isReadOnly, 
  pulledValue,
  isLoading,
  className 
}) => {
  const isCalculated = Boolean(field.calculate)
  const isPulled = Boolean(pulledValue !== undefined && pulledValue !== null)
  const isRequired = Boolean(field.required)
  const showHelp = Boolean(field.helpText)
  
  // Determine field component based on type
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    // Password case removed - not used in suitability assessment
    
    case 'number':
      return (
        <NumberField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          warning={warning}
          aiSuggestion={aiSuggestion}
          pulledValue={pulledValue}
          isReadOnly={isReadOnly}
          isRequired={isRequired}
          isLoading={isLoading}
          showHelp={showHelp}
        />
      )
    
    case 'select':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.id} className={cn(
              "text-sm font-medium",
              error && "text-red-600"
            )}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {showHelp && (
              <Tooltip content={field.helpText!}>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            )}
          </div>
          
          <Select
            value={value || ''}
            onValueChange={onChange}
            disabled={isReadOnly || isCalculated || isLoading}
          >
            <SelectTrigger className={cn(
              "w-full",
              error && "border-red-500 focus:ring-red-500",
              warning && "border-yellow-500 focus:ring-yellow-500"
            )}>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error.message}
            </p>
          )}
        </div>
      )
    
    case 'textarea':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.id} className={cn(
              "text-sm font-medium",
              error && "text-red-600"
            )}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {showHelp && (
              <Tooltip content={field.helpText!}>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            )}
          </div>
          
          <Textarea
            id={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={isReadOnly || isCalculated || isLoading}
            className={cn(
              error && "border-red-500 focus:ring-red-500",
              warning && "border-yellow-500 focus:ring-yellow-500"
            )}
            rows={field.rows || 3}
            maxLength={field.maxLength}
          />
          
          {field.maxLength && (
            <p className="text-xs text-gray-500 text-right">
              {(value || '').length}/{field.maxLength}
            </p>
          )}
          
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error.message}
            </p>
          )}
        </div>
      )
    
    case 'date':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.id} className={cn(
              "text-sm font-medium",
              error && "text-red-600"
            )}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {showHelp && (
              <Tooltip content={field.helpText!}>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            )}
          </div>
          
          <Input
            id={field.id}
            type="date"
            value={value ? format(new Date(value), 'yyyy-MM-dd') : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly || isCalculated || isLoading}
            className={cn(
              error && "border-red-500 focus:ring-red-500",
              warning && "border-yellow-500 focus:ring-yellow-500"
            )}
            min={field.min}
            max={field.max}
          />
          
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error.message}
            </p>
          )}
        </div>
      )
    
    case 'checkbox':
      if (field.options && field.options.length > 1) {
        // Multiple checkboxes
        return (
          <div className="space-y-2">
            <Label className={cn(
              "text-sm font-medium",
              error && "text-red-600"
            )}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            <div className="space-y-2">
              {field.options.map(option => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={Array.isArray(value) ? value.includes(option) : false}
                    onCheckedChange={(checked) => {
                      const currentValue = Array.isArray(value) ? value : []
                      if (checked) {
                        onChange([...currentValue, option])
                      } else {
                        onChange(currentValue.filter((v: string) => v !== option))
                      }
                    }}
                    disabled={isReadOnly || isCalculated || isLoading}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error.message}
              </p>
            )}
          </div>
        )
      } else {
        // Single checkbox
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true || value === 'Yes'}
              onCheckedChange={(checked) => onChange(checked)}
              disabled={isReadOnly || isCalculated || isLoading}
            />
            <Label 
              htmlFor={field.id}
              className="text-sm font-medium cursor-pointer"
            >
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {error && (
              <span className="text-xs text-red-600 ml-2">
                {error.message}
              </span>
            )}
          </div>
        )
      }
    
    case 'radio':
      return (
        <div className="space-y-2">
          <Label className={cn(
            "text-sm font-medium",
            error && "text-red-600"
          )}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          
          <div className="space-y-2">
            {field.options?.map(option => (
              <label 
                key={option} 
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={isReadOnly || isCalculated || isLoading}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
          
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error.message}
            </p>
          )}
        </div>
      )
    
    case 'address':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className={cn(
            "text-sm font-medium",
            error && "text-red-600"
          )}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          
          <SmartAddressField
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            error={error?.message}
            required={isRequired}
            className="w-full"
          />
        </div>
      )
    
    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.id}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={isReadOnly || isCalculated || isLoading}
            className={cn(
              error && "border-red-500 focus:ring-red-500"
            )}
          />
          {error && (
            <p className="text-xs text-red-600">{error.message}</p>
          )}
        </div>
      )
  }
})

FieldRenderer.displayName = 'FieldRenderer'

// =====================================================
// SECTION PROPS INTERFACE
// =====================================================

interface SuitabilitySectionProps {
  section: ExtendedSuitabilitySection
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  sectionData: Record<string, any>
  isExpanded: boolean
  onToggle: () => void
  updateField: (fieldId: string, value: any, options?: any) => void
  validationErrors: ValidationError[]
  aiSuggestion?: AISuggestion
  isLoadingAI?: boolean
  onGetAISuggestion?: () => void
  isReadOnly?: boolean
  isProspect?: boolean
  collaborators?: string[]
  saveState?: {
    isSaving: boolean
    lastSaved: Date | null
    lastError: string | null
  }
  onApplyAISuggestion?: (fieldId: string, value: any) => void
  showSmartComponents?: boolean
  className?: string
  conditionalFields?: ConditionalFieldGroup[] // ✅ NEW: Accept conditional fields
}

// =====================================================
// MAIN SECTION COMPONENT - ENHANCED WITH CONDITIONAL FIELDS
// =====================================================

export const SuitabilitySection = memo<SuitabilitySectionProps>(({
  section,
  formData,
  pulledData,
  sectionData,
  isExpanded,
  onToggle,
  updateField,
  validationErrors,
  aiSuggestion,
  isLoadingAI,
  onGetAISuggestion,
  isReadOnly,
  isProspect,
  collaborators,
  saveState,
  onApplyAISuggestion,
  showSmartComponents = true,
  className,
  conditionalFields = [] // ✅ NEW: Accept conditional fields
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded)
  const [showAllFields, setShowAllFields] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Keep localExpanded in sync with isExpanded prop
  useEffect(() => {
    setLocalExpanded(isExpanded)
  }, [isExpanded])
  
  // ✅ ENHANCED: Merge base fields with conditional fields
  const allFields = useMemo(() => {
    let fields = [...(section.fields || [])] as ExtendedSuitabilityField[]
    
    // Add conditional fields from props
    if (conditionalFields && conditionalFields.length > 0) {
      conditionalFields.forEach(group => {
        if (group.condition(formData, pulledData)) {
          fields = [...fields, ...(group.fields as ExtendedSuitabilityField[])]
        }
      })
    }
    
    // Add conditional fields from section definition
    if (section.conditionalFields) {
      section.conditionalFields.forEach(group => {
        if (group.condition(formData, pulledData)) {
          fields = [...fields, ...(group.fields as ExtendedSuitabilityField[])]
        }
      })
    }
    
    // Remove duplicates based on field ID
    const uniqueFields = fields.reduce((acc, field) => {
      if (!acc.find(f => f.id === field.id)) {
        acc.push(field)
      }
      return acc
    }, [] as ExtendedSuitabilityField[])
    
    return uniqueFields
  }, [section, formData, pulledData, conditionalFields])
  
  // Calculate section completion with all fields
  const sectionCompletion = useMemo(() => {
    const requiredFields = allFields.filter(f => f.required)
    const completedRequired = requiredFields.filter(f => 
      sectionData[f.id] !== undefined && 
      sectionData[f.id] !== null && 
      sectionData[f.id] !== ''
    )
    return requiredFields.length > 0 
      ? Math.round((completedRequired.length / requiredFields.length) * 100)
      : 100
  }, [allFields, sectionData])
  
  // Get section icon
  const SectionIcon = section.icon
  
  // Determine section status
  const getSectionStatus = useCallback(() => {
    const criticalErrors = validationErrors.filter(e => e.severity === 'critical')
    if (criticalErrors.length > 0) return 'error'
    if (validationErrors.length > 0) return 'warning'
    if (sectionCompletion === 100) return 'complete'
    if (sectionCompletion > 0) return 'partial'
    return 'incomplete'
  }, [validationErrors, sectionCompletion])
  
  const sectionStatus = getSectionStatus()
  
  // Handle field update with validation
  const handleFieldUpdate = useCallback((fieldId: string, value: any) => {
    updateField(fieldId, value, {
      source: 'user',
      skipValidation: false
    })
  }, [updateField])
  
  // Handle copy field value
  const handleCopyField = useCallback((fieldId: string, value: any) => {
    navigator.clipboard.writeText(String(value))
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])
  
  // Determine which fields to show based on pagination
  const visibleFields = useMemo(() => {
    if (!showAllFields && allFields.length > 5) {
      return allFields.slice(0, 5)
    }
    return allFields
  }, [allFields, showAllFields])
  
  // Special rendering for financial_situation with dashboard
  if (section.id === 'financial_situation' && showSmartComponents) {
    return (
      <Card className={cn("mb-6 transition-all duration-200", className)}>
        <CardHeader 
          className="cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SectionIcon className={cn(
                "h-5 w-5 transition-colors",
                sectionStatus === 'complete' && "text-green-600",
                sectionStatus === 'error' && "text-red-600",
                sectionStatus === 'warning' && "text-yellow-600",
                sectionStatus === 'partial' && "text-blue-600",
                sectionStatus === 'incomplete' && "text-gray-400"
              )} />
              <div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Section badges */}
              <div className="flex items-center gap-2">
                {allFields.length > section.fields.length && (
                  <Badge variant="outline" className="text-xs">
                    +{allFields.length - section.fields.length} conditional
                  </Badge>
                )}
                
                {sectionStatus === 'complete' && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Complete
                  </Badge>
                )}
                
                {sectionStatus === 'error' && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.length} Error{validationErrors.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                
                {sectionStatus === 'partial' && (
                  <Badge variant="outline" className="gap-1">
                    <Activity className="h-3 w-3" />
                    {sectionCompletion}%
                  </Badge>
                )}
              </div>
              
              {/* AI button */}
              {section.aiEnabled && !isProspect && onGetAISuggestion && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onGetAISuggestion()
                  }}
                  disabled={isLoadingAI}
                >
                  {isLoadingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  )}
                </Button>
              )}
              
              {/* Expand/collapse */}
              {localExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          {sectionCompletion < 100 && (
            <Progress value={sectionCompletion} className="mt-3 h-2" />
          )}
        </CardHeader>
        
        <AnimatePresence>
          {localExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent>
                <FinancialDashboard
                  formData={formData}
                  pulledData={pulledData}
                  onUpdateField={(fieldId, value) => handleFieldUpdate(fieldId, value)}
                  className="mb-4"
                />
                
                {/* Additional fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {visibleFields.map(field => {
                    const fieldError = validationErrors.find(e => e.fieldId === field.id)
                    
                    return (
                      <FieldRenderer
                        key={field.id}
                        field={field}
                        value={sectionData[field.id]}
                        onChange={(value) => handleFieldUpdate(field.id, value)}
                        error={fieldError}
                        aiSuggestion={aiSuggestion?.fieldSuggestions?.[field.id]}
                        isReadOnly={isReadOnly}
                        pulledValue={pulledData && field.pullFrom ? pulledData[field.pullFrom] : undefined}
                        isLoading={isLoadingAI}
                        className={field.fullWidth ? "md:col-span-2" : ""}
                      />
                    )
                  })}
                </div>
                
                {/* Show more/less toggle */}
                {allFields.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAllFields(!showAllFields)}
                    >
                      {showAllFields ? 'Show Less' : `Show ${allFields.length - 5} More Fields`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    )
  }
  
  // Default section rendering
  return (
    <Card className={cn(
      "mb-6 transition-all duration-200 hover:shadow-lg",
      className
    )}>
      <CardHeader 
        className="cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SectionIcon className={cn(
              "h-5 w-5 transition-colors",
              sectionStatus === 'complete' && "text-green-600",
              sectionStatus === 'error' && "text-red-600",
              sectionStatus === 'warning' && "text-yellow-600",
              sectionStatus === 'partial' && "text-blue-600",
              sectionStatus === 'incomplete' && "text-gray-400"
            )} />
            <div>
              <h3 className="text-lg font-semibold">{section.title}</h3>
              {section.description && (
                <p className="text-sm text-gray-500 mt-1">{section.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Collaborator indicators */}
            {collaborators && collaborators.length > 0 && (
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((user, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white"
                    title={user}
                  >
                    {user[0].toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            )}
            
            {/* Status badges */}
            <div className="flex items-center gap-2">
              {allFields.length > section.fields.length && (
                <Badge variant="outline" className="text-xs">
                  +{allFields.length - section.fields.length} fields
                </Badge>
              )}
              
              {sectionStatus === 'complete' && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Complete
                </Badge>
              )}
              
              {sectionStatus === 'error' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.length}
                </Badge>
              )}
              
              {sectionStatus === 'partial' && (
                <Badge variant="outline" className="gap-1">
                  <Activity className="h-3 w-3" />
                  {sectionCompletion}%
                </Badge>
              )}
              
              {saveState?.isSaving && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving
                </Badge>
              )}
            </div>
            
            {/* AI button */}
            {section.aiEnabled && !isProspect && onGetAISuggestion && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onGetAISuggestion()
                }}
                disabled={isLoadingAI}
                title="Get AI suggestions"
              >
                {isLoadingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-purple-600" />
                )}
              </Button>
            )}
            
            {/* Lock indicator */}
            {isReadOnly ? (
              <Lock className="h-4 w-4 text-gray-400" />
            ) : (
              <Unlock className="h-4 w-4 text-gray-300" />
            )}
            
            {/* Expand/collapse */}
            <motion.div
              animate={{ rotate: localExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </motion.div>
          </div>
        </div>
        
        {/* Progress bar */}
        {sectionCompletion < 100 && (
          <Progress value={sectionCompletion} className="mt-3 h-2" />
        )}
      </CardHeader>
      
      <AnimatePresence>
        {localExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent>
              {/* AI suggestions alert */}
              {aiSuggestion && aiSuggestion.insights && aiSuggestion.insights.length > 0 && (
                <Alert className="mb-4 border-purple-200 bg-purple-50">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium text-purple-900">AI Insights:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {aiSuggestion.insights.map((insight, i) => (
                          <li key={i} className="text-sm text-purple-800">{insight}</li>
                        ))}
                      </ul>
                      {onApplyAISuggestion && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            Object.entries(aiSuggestion.fieldSuggestions || {}).forEach(
                              ([fieldId, value]) => {
                                onApplyAISuggestion(fieldId, value)
                              }
                            )
                          }}
                        >
                          Apply All Suggestions
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Validation errors summary */}
              {validationErrors.length > 0 && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validationErrors.slice(0, 3).map((error, i) => (
                        <p key={i} className="text-sm text-red-800">
                          {error.message}
                        </p>
                      ))}
                      {validationErrors.length > 3 && (
                        <p className="text-sm text-red-600 font-medium">
                          ...and {validationErrors.length - 3} more errors
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Conditional fields notification */}
              {allFields.length > section.fields.length && (
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    {allFields.length - section.fields.length} additional field{allFields.length - section.fields.length !== 1 ? 's' : ''} shown based on your responses
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Fields grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleFields.map(field => {
                  const fieldError = validationErrors.find(e => e.fieldId === field.id)
                  const fieldValue = sectionData[field.id]
                  const aiSuggestedValue = aiSuggestion?.fieldSuggestions?.[field.id]
                  const isConditional = !section.fields.find(f => f.id === field.id)
                  
                  return (
                    <div 
                      key={field.id}
                      className={cn(
                        "relative",
                        field.fullWidth && "md:col-span-2",
                        isConditional && "ring-2 ring-blue-100 rounded-lg p-3"
                      )}
                    >
                      {isConditional && (
                        <Badge 
                          variant="outline" 
                          className="absolute -top-2 right-2 text-xs bg-white"
                        >
                          Conditional
                        </Badge>
                      )}
                      
                      <FieldRenderer
                        field={field}
                        value={fieldValue}
                        onChange={(value) => handleFieldUpdate(field.id, value)}
                        error={fieldError}
                        aiSuggestion={aiSuggestedValue}
                        isReadOnly={isReadOnly}
                        pulledValue={pulledData && field.pullFrom ? pulledData[field.pullFrom] : undefined}
                        isLoading={isLoadingAI}
                      />
                      
                      {/* Copy button for values */}
                      {fieldValue && field.type !== 'checkbox' && field.type !== 'radio' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => handleCopyField(field.id, fieldValue)}
                          title="Copy value"
                        >
                          {copiedField === field.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Show more/less toggle */}
              {allFields.length > 5 && (
                <div className="mt-6 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAllFields(!showAllFields)}
                    className="gap-2"
                  >
                    {showAllFields ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show {allFields.length - 5} More Fields
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
            
            {/* Section footer with metadata */}
            {(saveState?.lastSaved || section.helpUrl) && (
              <CardFooter className="bg-gray-50 border-t">
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm text-gray-500">
                    {saveState?.lastSaved && (
                      <span>
                        Last saved: {format(saveState.lastSaved, 'HH:mm:ss')}
                      </span>
                    )}
                    {saveState?.lastError && (
                      <span className="text-red-600 ml-2">
                        Error: {saveState.lastError}
                      </span>
                    )}
                  </div>
                  
                  {section.helpUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(section.helpUrl, '_blank')}
                      className="gap-2"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Help Guide
                    </Button>
                  )}
                </div>
              </CardFooter>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
})

SuitabilitySection.displayName = 'SuitabilitySection'

export default SuitabilitySection