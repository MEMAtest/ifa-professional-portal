// =====================================================
// FILE: src/components/suitability/sections/PersonalInformationSection.tsx
// FIXED VERSION - All TypeScript errors resolved
// =====================================================

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { aiAssistantService } from '@/services/aiAssistantService'
import { 
  SuitabilityFormData, 
  PulledPlatformData,
  ValidationError,
  ValidationWarning,
  AISuggestion
} from '@/types/suitability'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  User, 
  Calendar, 
  Briefcase, 
  Heart, 
  Users,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Loader2,
  Info,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface PersonalInformationSectionProps {
  data: any
  onChange: (sectionId: string, fieldId: string, value: any, options?: UpdateOptions) => void
  onBatchUpdate?: (sectionId: string, updates: Record<string, any>) => void
  errors?: ValidationError[]
  warnings?: ValidationWarning[]
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  isReadOnly?: boolean
  isProspect?: boolean
  showAI?: boolean
  autoSaveEnabled?: boolean
  collaborators?: string[]
  onFieldFocus?: (fieldId: string) => void
  onFieldBlur?: (fieldId: string) => void
  saveState?: {
    isSaving: boolean
    lastSaved: Date | null
    lastError: string | null
  }
  onManualSave?: () => Promise<boolean>
}

interface UpdateOptions {
  aiSuggested?: boolean
  skipValidation?: boolean
  broadcast?: boolean
  source?: 'user' | 'ai' | 'system'
}

interface FieldState {
  isLoading: boolean
  isFocused: boolean
  hasChanges: boolean
  lastSaved?: Date
  collaboratorEditing?: string
  error?: string
}

// =====================================================
// CONSTANTS
// =====================================================

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select...', disabled: true },
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Civil Partnership', label: 'Civil Partnership' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' }
]

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select...', disabled: true },
  { value: 'Employed', label: 'Employed Full-Time' },
  { value: 'Employed Part-Time', label: 'Employed Part-Time' },
  { value: 'Self-Employed', label: 'Self-Employed' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Not Working', label: 'Not Working' },
  { value: 'Student', label: 'Student' }
]

const FIELD_ICONS = {
  client_name: User,
  date_of_birth: Calendar,
  marital_status: Heart,
  employment_status: Briefcase,
  dependents: Users
}

const REQUIRED_FIELDS = [
  'client_name',
  'date_of_birth',
  'marital_status',
  'employment_status'
]

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

const calculateAge = (dateOfBirth?: string): number => {
  if (!dateOfBirth) return 0
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  
  if (isNaN(birthDate.getTime())) return 0
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age >= 0 && age <= 150 ? age : 0
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const PersonalInformationSection: React.FC<PersonalInformationSectionProps> = ({
  data,
  onChange,
  onBatchUpdate,
  errors = [],
  warnings = [],
  formData,
  pulledData,
  isReadOnly = false,
  isProspect = false,
  showAI = true,
  autoSaveEnabled = true,
  collaborators = [],
  onFieldFocus,
  onFieldBlur,
  saveState,
  onManualSave
}) => {
  const queryClient = useQueryClient()
  
  // =====================================================
  // STATE
  // =====================================================
  
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({})
  const [showSensitiveData, setShowSensitiveData] = useState(!isProspect)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [completionScore, setCompletionScore] = useState(0)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [localSaveState, setLocalSaveState] = useState({
    lastLocalSave: null as Date | null,
    hasUnsavedChanges: false
  })
  
  // Use provided save state or local fallback
  const effectiveSaveState = saveState || {
    isSaving: false,
    lastSaved: localSaveState.lastLocalSave,
    lastError: null
  }
  
  // Conditional fields
  const conditionalFields = useMemo(() => {
    return conditionalLogicEngine.getConditionalFields(
      'personal_information',
      formData,
      pulledData
    )
  }, [formData, pulledData])
  
  // Validation
  const validationResult = useMemo(() => {
    return validationEngine.validateSection(
      'personal_information',
      formData,
      pulledData
    )
  }, [formData, pulledData])
  
  // =====================================================
  // AI SUGGESTIONS
  // =====================================================
  
  const { mutate: fetchAISuggestions } = useMutation({
    mutationFn: async () => {
      return await aiAssistantService.generateSuggestion(
        'personal_information',
        formData,
        pulledData
      )
    },
    onSuccess: (data) => {
      setAiSuggestions(data)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
    },
    onError: (error) => {
      console.error('AI suggestion error:', error)
    }
  })
  
  // =====================================================
  // CALCULATE COMPLETION
  // =====================================================
  
  useEffect(() => {
    const completedFields = REQUIRED_FIELDS.filter(field => {
      const value = data?.[field]
      return value !== null && value !== undefined && value !== ''
    })
    const score = Math.round((completedFields.length / REQUIRED_FIELDS.length) * 100)
    setCompletionScore(score)
  }, [data])
  
  // =====================================================
  // AUTO-CALCULATE AGE
  // =====================================================
  
  useEffect(() => {
    if (data?.date_of_birth) {
      const calculatedAge = calculateAge(data.date_of_birth)
      if (calculatedAge !== data?.age) {
        onChange('personal_information', 'age', calculatedAge, {
          source: 'system',
          skipValidation: false
        })
      }
    }
  }, [data?.date_of_birth, data?.age, onChange])
  
  // =====================================================
  // HANDLERS
  // =====================================================
  
  const handleFieldChange = useCallback((
    fieldId: string,
    value: any,
    options?: UpdateOptions
  ) => {
    // Update field state
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        hasChanges: true,
        isLoading: false
      }
    }))
    
    // Track unsaved changes
    setLocalSaveState(prev => ({
      ...prev,
      hasUnsavedChanges: true
    }))
    
    // Call parent onChange - this triggers auto-save in the hook
    onChange('personal_information', fieldId, value, options)
    
    // Validate field immediately for user feedback
    const fieldValidation = validationEngine.validateField(
      'personal_information',
      fieldId,
      value,
      formData,
      pulledData
    )
    
    if (fieldValidation.errors.length > 0) {
      setFieldStates(prev => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          error: fieldValidation.errors[0].message
        }
      }))
    } else {
      setFieldStates(prev => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          error: undefined
        }
      }))
    }
  }, [onChange, formData, pulledData])
  
  const handleAISuggestion = useCallback((fieldId: string) => {
    if (!aiSuggestions?.fieldSuggestions?.[fieldId]) return
    
    const suggestion = aiSuggestions.fieldSuggestions[fieldId]
    handleFieldChange(fieldId, suggestion, { 
      aiSuggested: true,
      source: 'ai'
    })
    
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 3000)
  }, [aiSuggestions, handleFieldChange])
  
  const handleManualSave = useCallback(async () => {
    if (onManualSave) {
      const success = await onManualSave()
      if (success) {
        setLocalSaveState({
          lastLocalSave: new Date(),
          hasUnsavedChanges: false
        })
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 3000)
        
        // Clear field changes indicators
        setFieldStates(prev => {
          const newStates = { ...prev }
          Object.keys(newStates).forEach(key => {
            newStates[key] = {
              ...newStates[key],
              hasChanges: false
            }
          })
          return newStates
        })
      }
    }
  }, [onManualSave])
  
  // =====================================================
  // RENDER HELPERS
  // =====================================================
  
  const renderField = useCallback((
    fieldId: string,
    label: string,
    type: 'text' | 'date' | 'select' | 'number' | 'email' | 'tel',
    options?: { value: string; label: string; disabled?: boolean }[],
    required?: boolean,
    helpText?: string
  ) => {
    const value = data?.[fieldId] || ''
    const fieldErrors = errors.filter(e => e.fieldId === fieldId)
    const fieldWarnings = warnings.filter(w => w.fieldId === fieldId)
    const fieldState = fieldStates[fieldId] || {}
    const Icon = FIELD_ICONS[fieldId as keyof typeof FIELD_ICONS]
    const aiSuggestion = aiSuggestions?.fieldSuggestions?.[fieldId]
    
    // Check if field should be hidden in prospect mode
    const isSensitive = ['date_of_birth', 'ni_number'].includes(fieldId)
    if (isProspect && isSensitive && !showSensitiveData) {
      return null
    }
    
    return (
      <div key={fieldId} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label 
            htmlFor={fieldId}
            className={cn(
              "flex items-center gap-2",
              required && "after:content-['*'] after:text-red-500 after:ml-1"
            )}
          >
            {Icon && <Icon className="h-4 w-4 text-gray-500" />}
            {label}
          </Label>
          
          <div className="flex items-center gap-2">
            {fieldState.hasChanges && !effectiveSaveState.isSaving && (
              <div title="Unsaved changes">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </div>
            )}
            
            {effectiveSaveState.isSaving && fieldState.hasChanges && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            
            {!fieldState.hasChanges && !fieldState.error && value && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            
            {aiSuggestion && showAI && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAISuggestion(fieldId)}
                disabled={isReadOnly}
                title={`AI suggests: ${aiSuggestion}`}
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
              </Button>
            )}
          </div>
        </div>
        
        {type === 'select' ? (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            disabled={isReadOnly || fieldState.isLoading}
            className={cn(
              "w-full p-2 border rounded-md transition-colors",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              fieldErrors.length > 0 && "border-red-500 bg-red-50",
              fieldWarnings.length > 0 && "border-yellow-500 bg-yellow-50",
              fieldState.error && "border-red-500",
              fieldState.hasChanges && "border-blue-500"
            )}
            onFocus={() => {
              setFieldStates(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], isFocused: true }
              }))
              onFieldFocus?.(fieldId)
            }}
            onBlur={() => {
              setFieldStates(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], isFocused: false }
              }))
              onFieldBlur?.(fieldId)
            }}
          >
            {options?.map(opt => (
              <option 
                key={opt.value} 
                value={opt.value}
                disabled={opt.disabled}
              >
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={fieldId}
            type={type}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            disabled={isReadOnly || fieldState.isLoading}
            placeholder={helpText || ''}
            aria-invalid={fieldErrors.length > 0 || !!fieldState.error}
            aria-describedby={
              fieldErrors.length > 0 || fieldState.error ? `${fieldId}-error` : 
              helpText ? `${fieldId}-help` : undefined
            }
            onFocus={() => {
              setFieldStates(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], isFocused: true }
              }))
              onFieldFocus?.(fieldId)
            }}
            onBlur={() => {
              setFieldStates(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], isFocused: false }
              }))
              onFieldBlur?.(fieldId)
            }}
            className={cn(
              "transition-colors",
              fieldErrors.length > 0 && "border-red-500 bg-red-50",
              fieldWarnings.length > 0 && "border-yellow-500 bg-yellow-50",
              fieldState.error && "border-red-500",
              fieldState.hasChanges && "border-blue-500",
              fieldState.isFocused && "ring-2 ring-blue-500"
            )}
          />
        )}
        
        {helpText && !fieldState.error && (
          <p id={`${fieldId}-help`} className="text-xs text-gray-500">
            {helpText}
          </p>
        )}
        
        {(fieldState.error || fieldErrors.length > 0) && (
          <p 
            id={`${fieldId}-error`}
            className="text-xs text-red-500 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {fieldState.error || fieldErrors[0]?.message}
          </p>
        )}
        
        {fieldWarnings.map((warning, idx) => (
          <p 
            key={idx}
            className="text-xs text-yellow-600 flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {warning.message}
          </p>
        ))}
      </div>
    )
  }, [
    data, 
    errors, 
    warnings, 
    fieldStates, 
    aiSuggestions, 
    showAI, 
    isReadOnly,
    isProspect,
    showSensitiveData,
    handleFieldChange,
    handleAISuggestion,
    onFieldFocus,
    onFieldBlur,
    effectiveSaveState
  ])
  
  // =====================================================
  // MAIN RENDER
  // =====================================================
  
  return (
    <Card className={cn(
      "transition-all duration-200",
      validationResult.errors.length > 0 && "border-red-200",
      validationResult.warnings.length > 0 && "border-yellow-200",
      localSaveState.hasUnsavedChanges && "border-blue-200"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Personal Information</h3>
            {completionScore > 0 && (
              <Badge 
                variant={completionScore === 100 ? 'success' : 'default'}
                className="ml-2"
              >
                {completionScore}% Complete
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {effectiveSaveState.isSaving && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              
              {!effectiveSaveState.isSaving && effectiveSaveState.lastSaved && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved {new Date(effectiveSaveState.lastSaved).toLocaleTimeString()}</span>
                </div>
              )}
              
              {effectiveSaveState.lastError && (
                <div 
                  className="flex items-center gap-1 text-red-600" 
                  title={effectiveSaveState.lastError}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Save failed</span>
                </div>
              )}
              
              {localSaveState.hasUnsavedChanges && !effectiveSaveState.isSaving && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Clock className="h-4 w-4" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>
            
            {/* Manual Save Button */}
            {!autoSaveEnabled && onManualSave && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSave}
                disabled={!localSaveState.hasUnsavedChanges || effectiveSaveState.isSaving}
              >
                <Save className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Save</span>
              </Button>
            )}
            
            {/* Collaborators */}
            {collaborators.length > 0 && (
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((collaborator, idx) => (
                  <div
                    key={idx}
                    className="h-8 w-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                    title={collaborator}
                  >
                    {collaborator[0].toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            )}
            
            {/* Sensitive Data Toggle */}
            {isProspect && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSensitiveData(!showSensitiveData)}
              >
                {showSensitiveData ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="sr-only">Hide sensitive data</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Show sensitive data</span>
                  </>
                )}
              </Button>
            )}
            
            {/* AI Assistant */}
            {showAI && !isReadOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsLoadingAI(true)
                  fetchAISuggestions()
                  setTimeout(() => setIsLoadingAI(false), 2000)
                }}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">AI Assist</span>
              </Button>
            )}
            
            {/* Lock Status */}
            <div>
              {isReadOnly ? (
                <Lock className="h-4 w-4 text-gray-400" />
              ) : (
                <Unlock className="h-4 w-4 text-green-500" />
              )}
              <span className="sr-only">{isReadOnly ? 'Read-only' : 'Editable'}</span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        {completionScore < 100 && (
          <Progress value={completionScore} className="mt-2 h-2" />
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Success Message */}
        {showSuccessMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <span className="text-green-800">Changes saved successfully</span>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Auto-save Notification */}
        {autoSaveEnabled && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>Auto-save is enabled. Your changes are saved automatically.</span>
            </div>
          </div>
        )}
        
        {/* Core Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('client_name', 'Client Name', 'text', undefined, true, 'Enter full name')}
          {renderField('client_reference', 'Client Reference', 'text', undefined, false, 'Auto-generated if empty')}
          {renderField('date_of_birth', 'Date of Birth', 'date', undefined, true)}
          {renderField('age', 'Age', 'number', undefined, false, 'Auto-calculated from date of birth')}
          {renderField('marital_status', 'Marital Status', 'select', MARITAL_STATUS_OPTIONS, true)}
          {renderField('employment_status', 'Employment Status', 'select', EMPLOYMENT_STATUS_OPTIONS, true)}
          {renderField('occupation', 'Occupation', 'text', undefined, false, 'Current occupation or profession')}
          {renderField('dependents', 'Number of Dependents', 'number', undefined, false, 'Number of financial dependents')}
          {renderField('target_retirement_age', 'Target Retirement Age', 'number', undefined, false, 'Desired retirement age')}
          {renderField('ni_number', 'National Insurance Number', 'text', undefined, false, 'Format: AA 12 34 56 B')}
        </div>
        
        {/* Conditional Fields */}
        {conditionalFields.map((group, groupIndex) => (
          <div
            key={`group-${groupIndex}`}
            className={cn(
              "p-4 rounded-lg border-l-4",
              group.aiReason ? "border-purple-500 bg-purple-50" : "border-blue-500 bg-blue-50"
            )}
          >
            {group.aiReason && (
              <div className="flex items-start gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                <p className="text-sm text-purple-700">
                  {group.aiReason}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label 
                    htmlFor={field.id}
                    className={cn(
                      field.required && "after:content-['*'] after:text-red-500 after:ml-1"
                    )}
                  >
                    {field.label}
                  </Label>
                  
                  {field.type === 'text' && (
                    <Input
                      id={field.id}
                      type="text"
                      value={data?.[field.id] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      disabled={isReadOnly}
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      value={data?.[field.id] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
                      disabled={isReadOnly}
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select
                      id={field.id}
                      value={data?.[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      disabled={isReadOnly}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'radio' && (
                    <div className="space-y-2">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={field.id}
                            value={opt}
                            checked={data?.[field.id] === opt}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            disabled={isReadOnly}
                            className="text-blue-600"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                      value={data?.[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      disabled={isReadOnly}
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      id={field.id}
                      value={data?.[field.id] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      disabled={isReadOnly}
                      required={field.required}
                      rows={3}
                      className="w-full p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'checkbox' && (
                    <div className="space-y-2">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={data?.[field.id]?.includes(opt) || false}
                            onChange={(e) => {
                              const current = data?.[field.id] || []
                              const updated = e.target.checked
                                ? [...current, opt]
                                : current.filter((v: string) => v !== opt)
                              handleFieldChange(field.id, updated)
                            }}
                            disabled={isReadOnly}
                            className="text-blue-600"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {field.helpText && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* AI Insights */}
        {aiSuggestions?.insights && aiSuggestions.insights.length > 0 && (
          <Alert className="border-purple-200 bg-purple-50">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-purple-800">AI Insights:</p>
                <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                  {aiSuggestions.insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Validation Summary */}
        {validationResult.errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-red-800">Please correct the following errors:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationResult.errors.map((error, idx) => (
                    <li key={idx}>{error.message}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Save Error Alert */}
        {effectiveSaveState.lastError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-red-800">Save Error:</p>
                <p className="text-sm text-red-700">{effectiveSaveState.lastError}</p>
                {onManualSave && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualSave}
                    className="mt-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry Save
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default PersonalInformationSection