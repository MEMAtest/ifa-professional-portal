// =====================================================
// FILE: src/hooks/suitability/useSuitabilityForm.ts
// COMPLETE VERSION WITH FIXED COMPLETION CALCULATION
// =====================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'  // ✅ Correct - for client components
import { debounce } from 'lodash'
import { useATRCFLIntegration } from '@/hooks/suitability/useATRCFLIntegration'
import type { SuitabilityFormData, PulledPlatformData, RealtimeSyncEvent } from '@/types/suitability'
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { useClientContext } from '@/hooks/useClientContext'
import { AutoGenerationService } from '@/services/suitability/AutoGenerationService'
import { suitabilitySections } from '@/config/suitability/sections'

// =====================================================
// TYPES
// =====================================================

interface UseSuitabilityFormOptions {
  clientId?: string
  assessmentId?: string
  autoSave?: boolean
  autoSaveInterval?: number
  syncEnabled?: boolean
  enableConditionalLogic?: boolean
  enableValidation?: boolean
  onSave?: (data: SuitabilityFormData) => Promise<void>
  onFieldChange?: (sectionId: string, fieldId: string, value: any) => void
  onSectionChange?: (sectionId: string) => void
  onValidationChange?: (errors: any[]) => void
}

interface UpdateFieldOptions {
  aiSuggested?: boolean
  skipValidation?: boolean
  skipConditionalLogic?: boolean
  broadcast?: boolean
  source?: 'user' | 'system' | 'ai' | 'external'
}

interface UpdateSectionOptions {
  replace?: boolean
  skipValidation?: boolean
}

interface FormMetrics {
  changesCount: number
  lastModified: Date | null
  autoSavesCount: number
  validationRunsCount: number
  conditionalActionsCount: number
  consecutiveErrors: number
  lastError: string | null
  failedSaveAttempts: number
  successfulSaves: number
}

interface SaveState {
  isSaving: boolean
  lastSaved: Date | null
  lastError: string | null
  retryCount: number
  maxRetries: number
  nextRetryAt: Date | null
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const generateClientReference = (): string => {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `C${timestamp}${random}`
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

const mapEmploymentStatus = (status?: string): string => {
  const statusMap: Record<string, string> = {
    'employed': 'Employed',
    'self_employed': 'Self-Employed',
    'retired': 'Retired',
    'unemployed': 'Not Working',
    'student': 'Student',
    'other': 'Other'
  }
  return statusMap[status || ''] || 'Not Working'
}

const formatAddress = (address?: any): string => {
  if (!address) return ''
  return [
    address.line1,
    address.line2,
    address.city,
    address.county,
    address.postcode
  ].filter(Boolean).join('\n')
}

const mapClientFinancialData = (profile?: any): any => {
  if (!profile) {
    return {
      annual_income: 0,
      monthly_expenditure: 0,
      liquid_assets: 0,
      property_value: 0,
      outstanding_mortgage: 0,
      other_liabilities: 0,
      net_worth: 0
    }
  }

  const investmentTotal = Array.isArray(profile.existingInvestments) 
    ? profile.existingInvestments.reduce((sum: number, inv: any) => sum + (inv.currentValue || 0), 0)
    : 0
    
  const pensionTotal = Array.isArray(profile.pensionArrangements)
    ? profile.pensionArrangements.reduce((sum: number, pension: any) => sum + (pension.currentValue || 0), 0)
    : 0

  return {
    annual_income: profile.annualIncome || 0,
    monthly_expenditure: profile.monthlyExpenses || 0,
    liquid_assets: profile.liquidAssets || 0,
    property_value: investmentTotal + pensionTotal,
    outstanding_mortgage: 0,
    other_liabilities: 0,
    net_worth: profile.netWorth || 0
  }
}

const extractObjectives = (client: any): any => {
  return client?.objectives || 
         client?.investmentObjectives || 
         client?.financialProfile?.objectives ||
         client?.assessment?.objectives ||
         null
}

const extractRiskProfile = (client: any): any => {
  const profile = client?.riskProfile || 
                  client?.risk_profile || 
                  client?.financialProfile?.riskProfile ||
                  {}
  
  return {
    attitudeToRisk: profile.attitudeToRisk || profile.attitude_to_risk || '',
    maxAcceptableLoss: profile.maxLoss || profile.maxAcceptableLoss || profile.max_acceptable_loss || 15,
    riskTolerance: profile.riskTolerance || profile.risk_tolerance || 'Moderate',
    riskCapacity: profile.riskCapacity || profile.risk_capacity || 'Medium'
  }
}

// =====================================================
// MAIN HOOK
// =====================================================

export const useSuitabilityForm = (options: UseSuitabilityFormOptions) => {
  const {
    clientId,
    assessmentId,
    autoSave = true,
    autoSaveInterval = 30000,
    syncEnabled = true,
    enableConditionalLogic = true,
    enableValidation = true,
    onSave,
    onFieldChange,
    onSectionChange,
    onValidationChange
  } = options
  
  const { client } = useClientContext()
  const isInitialized = useRef(false)
  const saveQueueRef = useRef<NodeJS.Timeout>()
  const syncSubscriptionRef = useRef<any>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSaveAttempt = useRef<Date | null>(null)
  const autoSaveIntervalRef = useRef<NodeJS.Timeout>()
  const lastProcessedActions = useRef<Set<string>>(new Set())
  
  // ATR/CFL Integration
  const { 
    pulledData: atrCflData, 
    refresh: refreshATRCFL,
    reconcileRiskProfiles,
    isATRComplete,
    isCFLComplete,
    needsUpdate: assessmentsNeedUpdate
  } = useATRCFLIntegration({
    clientId: clientId || '',
    autoFetch: true,
    onDataPulled: (data) => {
      setPulledData(prev => ({
        ...prev,
        ...data
      }))
    }
  })
  
  // Use singleton Supabase client
  const [supabase, setSupabase] = useState<any>(null)
  
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const client = await createClient()
        setSupabase(client)
      } catch (error) {
        console.warn('Supabase client not available:', error)
        setSupabase(null)
      }
    }
    initSupabase()
  }, [])
  
  // =====================================================
  // STATE
  // =====================================================
  
  const [formData, setFormData] = useState<SuitabilityFormData>({
    _metadata: {
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completionPercentage: 0,
      aiEnabled: true,
      pulledData: {},
      syncEnabled,
      isDirty: false
    },
    _aiSuggestions: {},
    _chartData: {},
    _conditionalFields: {},
    _validationErrors: {}
  })
  
  const [pulledData, setPulledData] = useState<PulledPlatformData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    lastError: null,
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null
  })
  const [validationErrors, setValidationErrors] = useState<any[]>([])
  const [conditionalActions, setConditionalActions] = useState<any[]>([])
  const [metrics, setMetrics] = useState<FormMetrics>({
    changesCount: 0,
    lastModified: null,
    autoSavesCount: 0,
    validationRunsCount: 0,
    conditionalActionsCount: 0,
    consecutiveErrors: 0,
    lastError: null,
    failedSaveAttempts: 0,
    successfulSaves: 0
  })
  
  // =====================================================
  // API SAVE FUNCTION - ROBUST WITH FALLBACKS
  // =====================================================
  
  const saveToDraft = useCallback(async (data: SuitabilityFormData): Promise<boolean> => {
    const effectiveClientId = clientId || client?.id || generateClientReference()
    
    if (!effectiveClientId) {
      console.error('Cannot save: No client identifier available')
      setMetrics(prev => ({
        ...prev,
        lastError: 'No client identifier',
        failedSaveAttempts: prev.failedSaveAttempts + 1
      }))
      return false
    }
    
    // Prevent rapid-fire saves
    if (lastSaveAttempt.current) {
      const timeSinceLastSave = Date.now() - lastSaveAttempt.current.getTime()
      if (timeSinceLastSave < 1000) {
        console.log('Save throttled - too soon after last attempt')
        return false
      }
    }
    
    // Don't save if already saving
    if (saveState.isSaving) {
      console.log('Save already in progress, queueing...')
      return false
    }
    
    lastSaveAttempt.current = new Date()
    setSaveState(prev => ({ ...prev, isSaving: true, lastError: null }))
    
    try {
      // Always save to localStorage first as immediate backup
      const localKey = `suitability_draft_${effectiveClientId}`
      const localData = {
        data,
        savedAt: new Date().toISOString(),
        clientId: effectiveClientId,
        assessmentId,
        version: '2.0.0'
      }
      
      try {
        localStorage.setItem(localKey, JSON.stringify(localData))
        console.log('Draft backed up to localStorage')
      } catch (storageError) {
        console.warn('localStorage save failed:', storageError)
      }
      
      // Prepare API payload with flexible client ID
      const apiPayload = {
        clientId: effectiveClientId,
        assessmentType: 'suitability',
        assessmentId: assessmentId || null,
        draftData: {
          ...data,
          _metadata: {
            ...data._metadata,
            clientIdentifier: effectiveClientId,
            originalClientId: clientId
          }
        },
        metadata: {
          version: data._metadata.version,
          completionPercentage: calculateCompletion(data),
          lastModified: new Date().toISOString(),
          validationErrors: validationErrors.length,
          changesCount: metrics.changesCount,
          saveSource: 'auto-save',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        },
        expiresIn: 30
      }
      
      console.log('Saving draft with client ID:', effectiveClientId)
      
      // Make API call with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const getApiUrl = () => {
        if (typeof window !== 'undefined') {
          return ''
        }
        return process.env.NEXT_PUBLIC_API_URL || ''
      }

      const response = await fetch(`${getApiUrl()}/api/assessment-drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Save failed: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorJson.message || errorMessage
          console.error('API error details:', errorJson)
        } catch {
          console.error('API error text:', errorText)
        }
        
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Save failed')
      }
      
      // Update state on successful save
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        lastError: null,
        retryCount: 0,
        nextRetryAt: null
      }))
      
      setFormData(prev => ({
        ...prev,
        _metadata: {
          ...prev._metadata,
          isDirty: false,
          lastSyncedAt: new Date().toISOString()
        }
      }))
      
      setMetrics(prev => ({
        ...prev,
        autoSavesCount: prev.autoSavesCount + 1,
        consecutiveErrors: 0,
        lastError: null,
        successfulSaves: prev.successfulSaves + 1
      }))
      
      console.log('Draft saved successfully:', result.metadata)
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Save draft error:', errorMessage)
      
      // Update error metrics
      setMetrics(prev => ({
        ...prev,
        consecutiveErrors: prev.consecutiveErrors + 1,
        lastError: errorMessage,
        failedSaveAttempts: prev.failedSaveAttempts + 1
      }))
      
      // Check if we should retry
      if (saveState.retryCount < saveState.maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, saveState.retryCount), 10000)
        const nextRetryAt = new Date(Date.now() + retryDelay)
        
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          lastError: errorMessage,
          retryCount: prev.retryCount + 1,
          nextRetryAt
        }))
        
        console.log(`Will retry save in ${retryDelay}ms (attempt ${saveState.retryCount + 1}/${saveState.maxRetries})`)
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          saveToDraft(data)
        }, retryDelay)
      } else {
        // Max retries reached
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          lastError: `Save failed after ${saveState.maxRetries} attempts: ${errorMessage}`,
          nextRetryAt: null
        }))
        
        // Show user notification only after multiple consecutive failures
        if (metrics.consecutiveErrors >= 3 && typeof window !== 'undefined') {
          console.error('Critical: Multiple save failures detected')
        }
      }
      
      return false
    }
  }, [clientId, client, assessmentId, validationErrors, metrics, saveState.isSaving, saveState.retryCount, saveState.maxRetries])
  
  // =====================================================
  // LOAD DRAFT - WITH MULTIPLE FALLBACKS & ATR/CFL
  // =====================================================
  
  const loadDraft = useCallback(async () => {
    const effectiveClientId = clientId || client?.clientRef
    
    if (!effectiveClientId) {
      console.log('No client identifier available for loading draft')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Try localStorage first for immediate load
      const localKey = `suitability_draft_${effectiveClientId}`
      const localData = localStorage.getItem(localKey)
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          const savedDate = new Date(parsed.savedAt)
          const hoursSinceSave = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60)
          
          // Use local data if less than 2 hours old
          if (hoursSinceSave < 2) {
            console.log('Using recent local draft')
            setFormData(parsed.data)
            
            if (enableConditionalLogic) {
              const processed = processConditionalLogic(parsed.data)
              setFormData(processed)
            }
            
            if (enableValidation) {
              runValidation(parsed.data)
            }
            
            // Still try to load from API in background for sync
            loadFromAPI(effectiveClientId)
            
            setIsLoading(false)
            return
          }
        } catch (e) {
          console.error('Failed to parse local draft:', e)
        }
      }
      
      // Load from API
      await loadFromAPI(effectiveClientId)
      
    } catch (error) {
      console.error('Failed to load draft:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, client, enableConditionalLogic, enableValidation])
  
  const loadFromAPI = async (effectiveClientId: string) => {
    try {
      const params = new URLSearchParams({
        client_id: effectiveClientId,
        assessment_type: 'suitability',
        include_atr: 'true',
        include_cfl: 'true'
      })
      
      if (assessmentId) {
        params.append('assessment_id', assessmentId)
      }
      
      const response = await fetch(`/api/assessment-drafts?${params}`)
      
      if (!response.ok) {
        if (response.status !== 404) {
          console.error('Failed to load draft from API:', response.status)
        }
        return
      }
      
      const result = await response.json()
      
      if (result.success && result.data?.draft_data) {
        console.log('Loaded draft from server')
        setFormData(result.data.draft_data)
        
        setSaveState(prev => ({
          ...prev,
          lastSaved: result.data.updated_at ? new Date(result.data.updated_at) : null
        }))
        
        // Process ATR/CFL data if included
        if (result.data.atrData || result.data.cflData) {
          const pulledPlatformData: PulledPlatformData = {
            atrScore: result.data.atrData?.risk_analysis?.score,
            atrCategory: result.data.atrData?.risk_analysis?.category,
            cflScore: result.data.cflData?.risk_analysis?.score,
            cflCategory: result.data.cflData?.risk_analysis?.category
          }
          setPulledData(prev => ({ ...prev, ...pulledPlatformData }))
        }
        
        if (enableConditionalLogic) {
          const processed = processConditionalLogic(result.data.draft_data)
          setFormData(processed)
        }
        
        if (enableValidation) {
          runValidation(result.data.draft_data)
        }
      }
    } catch (error) {
      console.error('API load error:', error)
    }
  }
  
  // =====================================================
  // CONDITIONAL LOGIC PROCESSING - FIXED DUPLICATION
  // =====================================================
  
  const processConditionalLogic = useCallback((
    newFormData: SuitabilityFormData,
    triggerFieldId?: string
  ): SuitabilityFormData => {
    if (!enableConditionalLogic) return newFormData
    
    try {
      const actions = conditionalLogicEngine.evaluateRules(newFormData, pulledData)
      
      setMetrics(prev => ({
        ...prev,
        conditionalActionsCount: prev.conditionalActionsCount + actions.length
      }))
      
      let updatedData = { ...newFormData }
      const processedFields = new Set<string>()
      
      // Clear validation errors for the current run
      updatedData._validationErrors = {}
      
      actions.forEach(action => {
        const fieldKey = `${action.sectionId}.${action.fieldId}`
        const actionKey = `${action.type}-${fieldKey}-${action.message || action.value}`
        
        // Skip if we've already processed this exact action
        if (processedFields.has(actionKey)) return
        processedFields.add(actionKey)
        
        switch (action.type) {
          case 'set_value':
            if (action.fieldId && action.value !== undefined) {
              updatedData = {
                ...updatedData,
                [action.sectionId]: {
                  ...updatedData[action.sectionId as keyof SuitabilityFormData],
                  [action.fieldId]: action.value
                }
              }
            }
            break
            
          case 'require_field':
            if (!updatedData._conditionalFields) {
              updatedData._conditionalFields = {}
            }
            if (!updatedData._conditionalFields.requiredFields) {
              updatedData._conditionalFields.requiredFields = {}
            }
            updatedData._conditionalFields.requiredFields[fieldKey] = true
            break
            
          case 'show_field':
          case 'show_section':
            if (!updatedData._conditionalFields) {
              updatedData._conditionalFields = {}
            }
            updatedData._conditionalFields[action.sectionId] = action.fields || []
            break
            
          case 'validate':
            if (!updatedData._validationErrors) {
              updatedData._validationErrors = {}
            }
            if (!updatedData._validationErrors[action.sectionId]) {
              updatedData._validationErrors[action.sectionId] = []
            }
            
            // Check if this exact message already exists
            const exists = updatedData._validationErrors[action.sectionId].some(
              (err: any) => err.message === action.message && err.fieldId === action.fieldId
            )
            
            if (!exists && action.message) {
              updatedData._validationErrors[action.sectionId].push({
                fieldId: action.fieldId,
                message: action.message,
                type: 'conditional'
              })
            }
            break
            
          case 'calculate':
            if (action.fieldId && typeof action.value === 'function') {
              const calculatedValue = action.value(updatedData, pulledData)
              updatedData = {
                ...updatedData,
                [action.sectionId]: {
                  ...updatedData[action.sectionId as keyof SuitabilityFormData],
                  [action.fieldId]: calculatedValue
                }
              }
            }
            break
        }
      })
      
      setConditionalActions(actions)
      return updatedData
    } catch (error) {
      console.error('Conditional logic processing error:', error)
      return newFormData
    }
  }, [enableConditionalLogic, pulledData])
  
  // =====================================================
  // VALIDATION PROCESSING
  // =====================================================
  
  const runValidation = useCallback((
    data: SuitabilityFormData,
    sectionId?: string,
    fieldId?: string
  ) => {
    if (!enableValidation) return { errors: [], warnings: [] }
    
    try {
      setMetrics(prev => ({
        ...prev,
        validationRunsCount: prev.validationRunsCount + 1
      }))
      
      let result
      
      if (fieldId && sectionId) {
        const value = data[sectionId as keyof SuitabilityFormData]?.[fieldId]
        result = validationEngine.validateField(sectionId, fieldId, value, data, pulledData)
      } else if (sectionId) {
        result = validationEngine.validateSection(sectionId, data, pulledData)
      } else {
        result = validationEngine.validateComplete(data, pulledData)
      }
      
      setValidationErrors(result.errors)
      
      if (onValidationChange) {
        onValidationChange(result.errors)
      }
      
      return result
    } catch (error) {
      console.error('Validation error:', error)
      return { errors: [], warnings: [] }
    }
  }, [enableValidation, pulledData, onValidationChange])
  
  // =====================================================
  // UPDATE HANDLERS
  // =====================================================
  
  const updateField = useCallback((
    sectionId: string,
    fieldId: string,
    value: any,
    fieldOptions?: UpdateFieldOptions
  ) => {
    setFormData(prev => {
      let newData: SuitabilityFormData = {
        ...prev,
        [sectionId]: {
          ...prev[sectionId as keyof SuitabilityFormData],
          [fieldId]: value
        },
        _metadata: {
          ...prev._metadata,
          updatedAt: new Date().toISOString(),
          isDirty: true
        }
      }
      
      // Special handling for calculated fields
      if (sectionId === 'personal_information' && fieldId === 'date_of_birth') {
        const age = calculateAge(value)
        newData.personal_information = {
          ...newData.personal_information,
          age
        }
      }
      
      // Re-calculate dependent fields when data changes
      const calculatedUpdates = AutoGenerationService.recalculateFields(
        suitabilitySections as any, 
        newData, 
        sectionId, 
        fieldId
      )
      
      // Apply calculated updates
      Object.keys(calculatedUpdates).forEach(calcSectionId => {
        if (calculatedUpdates[calcSectionId as keyof SuitabilityFormData]) {
          newData = {
            ...newData,
            [calcSectionId]: {
              ...newData[calcSectionId as keyof SuitabilityFormData],
              ...calculatedUpdates[calcSectionId as keyof SuitabilityFormData]
            }
          }
        }
      })
      
      // Track AI suggestions
      if (fieldOptions?.aiSuggested) {
        newData._aiSuggestions = {
          ...prev._aiSuggestions,
          [sectionId]: {
            ...prev._aiSuggestions[sectionId],
            fieldSuggestions: {
              ...prev._aiSuggestions[sectionId]?.fieldSuggestions,
              [fieldId]: value
            },
            timestamp: new Date().toISOString()
          }
        }
      }
      
      // Run conditional logic
      if (!fieldOptions?.skipConditionalLogic) {
        newData = processConditionalLogic(newData, fieldId)
      }
      
      // Run validation
      if (!fieldOptions?.skipValidation) {
        runValidation(newData, sectionId, fieldId)
      }
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        changesCount: prev.changesCount + 1,
        lastModified: new Date()
      }))
      
      // Broadcast change if needed
      if (fieldOptions?.broadcast && syncEnabled && supabase) {
        broadcastUpdate(sectionId, fieldId, value, fieldOptions.source)
      }
      
      // Trigger callbacks
      if (onFieldChange) {
        onFieldChange(sectionId, fieldId, value)
      }
      
      return newData
    })
    
    // Trigger auto-save
    if (autoSave) {
      debouncedAutoSave()
    }
  }, [
    processConditionalLogic,
    runValidation,
    syncEnabled,
    supabase,
    autoSave,
    onFieldChange
  ])
  
  const updateSection = useCallback((
    sectionId: string,
    sectionData: any,
    sectionOptions?: UpdateSectionOptions
  ) => {
    setFormData(prev => {
      let newData: SuitabilityFormData = {
        ...prev,
        [sectionId]: sectionOptions?.replace 
          ? sectionData 
          : { ...prev[sectionId as keyof SuitabilityFormData], ...sectionData },
        _metadata: {
          ...prev._metadata,
          updatedAt: new Date().toISOString(),
          isDirty: true
        }
      }
      
      // Run conditional logic for entire section
      newData = processConditionalLogic(newData)
      
      // Run validation for section
      if (!sectionOptions?.skipValidation) {
        runValidation(newData, sectionId)
      }
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        changesCount: prev.changesCount + Object.keys(sectionData).length,
        lastModified: new Date()
      }))
      
      // Trigger callback
      if (onSectionChange) {
        onSectionChange(sectionId)
      }
      
      return newData
    })
    
    if (autoSave) {
      debouncedAutoSave()
    }
  }, [
    processConditionalLogic,
    runValidation,
    autoSave,
    onSectionChange
  ])
  
  // =====================================================
  // AUTO-SAVE DEBOUNCED
  // =====================================================
  
  const debouncedAutoSave = useMemo(
    () => debounce(async () => {
      if (!formData._metadata.isDirty) {
        console.log('No changes to save')
        return
      }
      
      console.log('Auto-saving changes...')
      const success = await saveToDraft(formData)
      
      if (success) {
        console.log('Auto-save successful')
      } else {
        console.log('Auto-save failed, will retry')
      }
    }, 2000),
    [formData, saveToDraft]
  )
  
  // =====================================================
  // REALTIME SYNC
  // =====================================================
  
  const broadcastUpdate = useCallback((
    sectionId: string,
    fieldId: string,
    value: any,
    source?: string
  ) => {
    const effectiveClientId = clientId || client?.clientRef
    if (!effectiveClientId || !syncEnabled || !supabase) return
    
    try {
      const event: RealtimeSyncEvent = {
        type: 'field_update',
        source: (source as 'user' | 'system' | 'ai' | 'external') || 'user',
        sectionId,
        fieldId,
        value,
        timestamp: new Date().toISOString(),
        userId: 'current_user_id'
      }
      
      supabase
        .channel(`suitability_${effectiveClientId}`)
        .send({
          type: 'broadcast',
          event: 'field_update',
          payload: event
        })
    } catch (error) {
      console.error('Broadcast error:', error)
    }
  }, [clientId, client, syncEnabled, supabase])
  
  // =====================================================
  // INITIALIZATION WITH AUTO-GENERATION SERVICE
  // =====================================================
  
  useEffect(() => {
    if (!client || isInitialized.current) return
    
    isInitialized.current = true
    
    try {
      console.log('Initializing form with client data and auto-generation...')
      console.log('Client data:', client)
      
      // PHASE 1: Use AutoGenerationService for field auto-population
      const autoGeneratedData = AutoGenerationService.processAutoGeneration(
        suitabilitySections as any,
        {
          client,
          pulledData,
          formData,
          skipExistingValues: false
        }
      )
      
      console.log('Auto-generated data:', autoGeneratedData)
      
      // PHASE 2: Manual fallback mapping (preserve original functionality)
      const financialData = mapClientFinancialData(client.financialProfile)
      const objectives = extractObjectives(client)
      const riskProfile = extractRiskProfile(client)
      
      const targetRetirementAge = 
        (client?.personalDetails as any)?.targetRetirementAge ||
        (client?.personalDetails as any)?.target_retirement_age ||
        (client as any)?.preferences?.retirementAge ||
        65
      
      const manualMappedData: Partial<SuitabilityFormData> = {
        personal_information: {
          client_name: `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim(),
          client_reference: client.clientRef || generateClientReference(),
          date_of_birth: client.personalDetails?.dateOfBirth || '',
          age: calculateAge(client.personalDetails?.dateOfBirth),
          marital_status: client.personalDetails?.maritalStatus || '',
          dependents: client.personalDetails?.dependents || 0,
          employment_status: mapEmploymentStatus(client.personalDetails?.employmentStatus),
          occupation: client.personalDetails?.occupation || '',
          target_retirement_age: targetRetirementAge
        },
        contact_details: {
          address: formatAddress(client.contactInfo?.address),
          phone: client.contactInfo?.phone || '',
          email: client.contactInfo?.email || '',
          preferred_contact: client.contactInfo?.preferredContact || 'Email',
          postcode: client.contactInfo?.address?.postcode || ''
        },
        financial_situation: financialData,
        objectives: objectives ? {
          primary_objective: objectives.primaryObjective || objectives.primary_objective || '',
          time_horizon: objectives.timeHorizon || objectives.time_horizon || 10,
          investment_amount: objectives.investmentAmount || objectives.investment_amount || 0
        } : {
          primary_objective: '',
          time_horizon: 10,
          investment_amount: 0
        },
        risk_assessment: {
          attitude_to_risk: String(riskProfile.attitudeToRisk || ''),
          max_acceptable_loss: riskProfile.maxAcceptableLoss || 15
        }
      }
      
      // PHASE 3: Merge auto-generated with manual mapping (auto-generated takes precedence)
      const mergedData = { ...formData, ...manualMappedData, ...autoGeneratedData }
      
      // Process with conditional logic
      const processed = processConditionalLogic(mergedData)
      setFormData(processed)
      
      // Run initial validation
      runValidation(processed)
      
      console.log('Form initialized with auto-generation complete')
      
    } catch (error) {
      console.error('Initialization error:', error)
    }
  }, [client, processConditionalLogic, runValidation, pulledData, formData])
  
  // Load draft and ATR/CFL data on mount
  useEffect(() => {
    loadDraft()
    if (clientId) {
      refreshATRCFL()
    }
  }, [clientId])
  
  // Auto-save interval
  useEffect(() => {
    if (!autoSave || !autoSaveInterval) return
    
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current)
    }
    
    autoSaveIntervalRef.current = setInterval(() => {
      if (formData._metadata?.isDirty && !saveState.isSaving) {
        console.log('Auto-save interval triggered')
        saveToDraft(formData)
      }
    }, autoSaveInterval)
    
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [autoSave, autoSaveInterval, formData, saveState.isSaving, saveToDraft])
  
  // Real-time sync subscription
  useEffect(() => {
    const effectiveClientId = clientId || client?.clientRef
    if (!syncEnabled || !effectiveClientId || !supabase) return
    
    const channel = supabase
      .channel(`suitability_${effectiveClientId}`)
      .on('broadcast', { event: 'field_update' }, (payload) => {
        const event = payload.payload as RealtimeSyncEvent
        
        // Ignore own updates
        if (event.userId === 'current_user_id') return
        
        if (event.sectionId && event.fieldId) {
          updateField(event.sectionId, event.fieldId, event.value, {
            source: 'system',
            skipConditionalLogic: false,
            broadcast: false
          })
          
          console.log(`Field updated by ${event.userId}`)
        }
      })
      .subscribe()
    
    syncSubscriptionRef.current = channel
    
    return () => {
      channel.unsubscribe()
    }
  }, [syncEnabled, clientId, client, updateField, supabase])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (saveQueueRef.current) {
        clearTimeout(saveQueueRef.current)
      }
      if (syncSubscriptionRef.current) {
        syncSubscriptionRef.current.unsubscribe()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
      debouncedAutoSave.cancel()
    }
  }, [debouncedAutoSave])
  
  // =====================================================
  // FIXED COMPLETION CALCULATION
  // =====================================================
  
  const calculateCompletion = useCallback((data: SuitabilityFormData): number => {
    // Define required fields for each section
    const requiredSections = {
      'personal_information': ['client_name', 'date_of_birth', 'employment_status'],
      'contact_details': ['email', 'phone', 'address', 'preferred_contact'],
      'financial_situation': ['annual_income'],
      'objectives': ['primary_objective', 'time_horizon'],
      'risk_assessment': ['attitude_to_risk'],
      'knowledge_experience': ['investment_experience'],
      'existing_arrangements': [],
      'vulnerability_assessment': [],
      'regulatory_compliance': [],
      'costs_charges': [],
      'recommendation': [],
      'suitability_declaration': []
    }
    
    let totalRequired = 0
    let completedRequired = 0
    
    // Count required fields
    Object.entries(requiredSections).forEach(([section, fields]) => {
      const sectionData = data[section as keyof SuitabilityFormData]
      
      if (!sectionData || typeof sectionData !== 'object') {
        // If section doesn't exist, count all fields as incomplete
        totalRequired += fields.length || 1
        return
      }
      
      if (fields.length === 0) {
        // For sections without specific required fields, just check if section has any data
        totalRequired += 1
        if (Object.keys(sectionData).some(key => {
          if (key.startsWith('_')) return false
          const value = sectionData[key as keyof typeof sectionData]
          return value !== null && value !== undefined && value !== ''
        })) {
          completedRequired += 1
        }
      } else {
        // Check specific required fields
        fields.forEach(field => {
          totalRequired++
          const value = sectionData[field as keyof typeof sectionData]
          
          // Check for meaningful values
          // Allow 0 for numbers (e.g., 0 dependents is valid)
          // But empty strings, null, undefined are incomplete
          if (value !== null && value !== undefined && value !== '') {
            // Special check for numeric fields - 0 is valid
            if (typeof value === 'number' || (typeof value === 'string' && value !== '0')) {
              completedRequired++
            } else if (value === 0 || value === '0') {
              // 0 is a valid value for numeric fields
              completedRequired++
            }
          }
        })
      }
    })
    
    const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0
    
    console.log('Completion calculation:', { 
      totalRequired, 
      completedRequired, 
      percentage,
      sections: Object.keys(requiredSections).map(section => ({
        section,
        data: data[section as keyof SuitabilityFormData]
      }))
    })
    
    return percentage
  }, [])
  
  const getConditionalFields = useCallback((sectionId: string) => {
    return conditionalLogicEngine.getConditionalFields(
      sectionId,
      formData,
      pulledData
    )
  }, [formData, pulledData])
  
  const getValidationMessages = useCallback(() => {
    return conditionalLogicEngine.getValidationMessages(formData, pulledData)
  }, [formData, pulledData])
  
  const reset = useCallback(() => {
    const effectiveClientId = clientId || client?.clientRef
    
    setFormData({
      _metadata: {
        version: '2.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completionPercentage: 0,
        aiEnabled: true,
        pulledData: {},
        syncEnabled,
        isDirty: false
      },
      _aiSuggestions: {},
      _chartData: {},
      _conditionalFields: {},
      _validationErrors: {}
    })
    
    setValidationErrors([])
    setConditionalActions([])
    setSaveState({
      isSaving: false,
      lastSaved: null,
      lastError: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null
    })
    setMetrics({
      changesCount: 0,
      lastModified: null,
      autoSavesCount: 0,
      validationRunsCount: 0,
      conditionalActionsCount: 0,
      consecutiveErrors: 0,
      lastError: null,
      failedSaveAttempts: 0,
      successfulSaves: 0
    })
    
    // Clear localStorage
    if (effectiveClientId) {
      localStorage.removeItem(`suitability_draft_${effectiveClientId}`)
    }
  }, [clientId, client, syncEnabled])
  
  // Manual save function
  const saveManually = useCallback(async () => {
    return await saveToDraft(formData)
  }, [formData, saveToDraft])
  
  // =====================================================
  // RETURN VALUES
  // =====================================================
  
  return {
    // Form data
    formData,
    pulledData,
    
    // Update functions
    updateField,
    updateSection,
    setPulledData,
    
    // State
    isLoading,
    isSaving: saveState.isSaving,
    lastSaved: saveState.lastSaved,
    saveError: saveState.lastError,
    
    // Validation
    validationErrors,
    runValidation,
    
    // Conditional logic
    conditionalActions,
    getConditionalFields,
    getValidationMessages,
    
    // Draft management
    loadDraft,
    saveToDraft,
    saveManually,
    
    // Utilities
    reset,
    calculateCompletion: () => calculateCompletion(formData),
    
    // Metrics
    metrics,
    
    // Save state for UI
    saveState,
    
    // ATR/CFL Integration
    atrCflData,
    refreshATRCFL,
    reconcileRiskProfiles,
    isATRComplete,
    isCFLComplete,
    assessmentsNeedUpdate
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default useSuitabilityForm