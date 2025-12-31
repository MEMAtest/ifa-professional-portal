// =====================================================
// FILE: src/components/suitability/sections/personal/PersonalInformationSection.tsx
// FIXED VERSION - All TypeScript errors resolved
// =====================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  AlertCircle,
  CheckCircle,
  Sparkles,
  Loader2,
  Info,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OccupationAutocomplete } from './OccupationAutocomplete'
import { EMPLOYMENT_STATUS_OPTIONS, FIELD_ICONS, MARITAL_STATUS_OPTIONS, REQUIRED_FIELDS } from './constants'
import { PersonalInformationHeader } from './components/PersonalInformationHeader'
import { PersonalInformationConditionalFields } from './components/PersonalInformationConditionalFields'
import { calculateAge } from './utils'

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
  // =====================================================
  // STATE
  // =====================================================
  
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({})
  const [showSensitiveData, setShowSensitiveData] = useState(!isProspect)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [completionScore, setCompletionScore] = useState(0)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [localSaveState, setLocalSaveState] = useState({
    lastLocalSave: null as Date | null,
    hasUnsavedChanges: false
  })
  
  // Use provided save state or local fallback
  const effectiveSaveState = useMemo(() => {
    return saveState || {
      isSaving: false,
      lastSaved: localSaveState.lastLocalSave,
      lastError: null
    }
  }, [localSaveState.lastLocalSave, saveState])
  
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

  const handleAiAssistClick = useCallback(() => {
    setIsLoadingAI(true)
    fetchAISuggestions()
    setTimeout(() => setIsLoadingAI(false), 2000)
  }, [fetchAISuggestions])
  
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
          fieldId === 'occupation' && type === 'text' ? (
            <OccupationAutocomplete
              id={fieldId}
              value={value}
              onChange={(next) => handleFieldChange(fieldId, next)}
              disabled={isReadOnly || fieldState.isLoading}
              placeholder={helpText || 'Start typing to see suggestions…'}
              ariaInvalid={fieldErrors.length > 0 || !!fieldState.error}
              ariaDescribedBy={
                fieldErrors.length > 0 || fieldState.error
                  ? `${fieldId}-error`
                  : helpText
                    ? `${fieldId}-help`
                    : undefined
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
                fieldErrors.length > 0 || fieldState.error
                  ? `${fieldId}-error`
                  : helpText
                    ? `${fieldId}-help`
                    : undefined
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
          )
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
      <PersonalInformationHeader
        completionScore={completionScore}
        effectiveSaveState={effectiveSaveState}
        hasUnsavedChanges={localSaveState.hasUnsavedChanges}
        autoSaveEnabled={autoSaveEnabled}
        onManualSave={onManualSave ? handleManualSave : undefined}
        collaborators={collaborators}
        isProspect={isProspect}
        showSensitiveData={showSensitiveData}
        onToggleSensitiveData={() => setShowSensitiveData(!showSensitiveData)}
        showAI={showAI}
        isReadOnly={isReadOnly}
        isLoadingAI={isLoadingAI}
        onAiAssistClick={handleAiAssistClick}
      />
      
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
        
        <PersonalInformationConditionalFields
          groups={conditionalFields}
          data={data}
          isReadOnly={isReadOnly}
          onFieldChange={handleFieldChange}
        />
        
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
