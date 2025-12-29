// =====================================================
// FILE: src/hooks/suitability/useSuitabilityForm/index.ts
// COMPLETE VERSION WITH FIXED COMPLETION CALCULATION
// =====================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'  // ✅ Correct - for client components
import { isSupabaseRealtimeEnabled } from '@/lib/supabase/realtime'
import type { SupabaseClient } from '@supabase/supabase-js'
import { debounce } from 'lodash'
import { useATRCFLIntegration } from '@/hooks/suitability/useATRCFLIntegration'
import type {
  SuitabilityFormData,
  PulledPlatformData,
  RealtimeSyncEvent,
  ClientObjectives,
  ClientRiskProfile
} from '@/types/suitability'
import type { Database } from '@/types/db'
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { calculateSuitabilityCompletion } from '@/lib/suitability/completion'
import { useClientContext } from '@/hooks/useClientContext'
import { AutoGenerationService } from '@/services/suitability/AutoGenerationService'
import { suitabilitySections } from '@/config/suitability/sections'
import { useSaveMutex, type SaveStatus, type SaveState as MutexSaveState } from '@/hooks/suitability/useSaveMutex'
import { useSuitabilityRealtimeSync } from '@/hooks/suitability/useSuitabilityRealtimeSync'
import { hydrateSuitabilityDraftFromApi, loadSuitabilityDraft, saveSuitabilityDraft } from './draftPersistence'
import type { FormMetrics, SaveState, UpdateFieldOptions, UpdateSectionOptions, UseSuitabilityFormOptions } from './types'
import {
  calculateAge,
  extractObjectives,
  extractRiskProfile,
  fillEmptyFieldsFromClient,
  fingerprintFormDataForHydration,
  mapEmploymentStatus,
  mapMaritalStatus,
  mapPreferredContact,
  mergeSectionUpdates,
  seedEmptySections
} from '@/hooks/suitability/useSuitabilityForm.helpers'
import { removeLocalDraft } from '@/hooks/suitability/useSuitabilityForm.io'

const VALID_SECTION_IDS = new Set(suitabilitySections.map((s) => s.id))

// =====================================================
// MAIN HOOK
// =====================================================

export const useSuitabilityForm = (options: UseSuitabilityFormOptions) => {
  const {
    clientId,
    assessmentId,
    isProspect = false,
    autoSave = true,
    autoSaveInterval = 30000,
    syncEnabled = false,
    enableConditionalLogic = true,
    enableValidation = true,
    onSave,
    onFieldChange,
    onSectionChange,
    onValidationChange
  } = options
  
  const { client } = useClientContext()
  const hasLoadedDraftRef = useRef(false)
  const hasInitializedUiRef = useRef(false)
  const autoFillKeyRef = useRef<string | null>(null)
  const saveQueueRef = useRef<NodeJS.Timeout>()
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveAttempt = useRef<Date | null>(null)
  // REMOVED: autoSaveIntervalRef - interval auto-save causes race conditions
  const lastProcessedActions = useRef<Set<string>>(new Set())

  // Save mutex to prevent race conditions between debounced saves
  const {
    saveState: mutexSaveState,
    isLocked: isSaveLocked,
    executeSave,
    markPendingChanges,
    clearPendingChanges,
    resetError: resetSaveError
  } = useSaveMutex({
    savedDisplayDuration: 3000,
    onSaveStart: () => {
      console.log('Save operation started (mutex acquired)')
    },
    onSaveSuccess: () => {
      console.log('Save operation completed successfully')
    },
    onSaveError: (error) => {
      console.error('Save operation failed:', error)
    }
  })
  
  // ATR/CFL Integration
  const { 
    pulledData: atrCflData, 
    refresh: refreshATRCFL,
    reconcileRiskProfiles,
    isATRComplete,
    isCFLComplete,
    isPersonaComplete,
    personaAssessment,
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
  
  // Use singleton Supabase client with proper typing (avoid extra render + effect churn)
  const supabase = useMemo(() => {
    try {
      return createClient() as SupabaseClient<Database>
    } catch (error) {
      console.warn('Supabase client not available:', error)
      return null
    }
  }, [])
  
  // =====================================================
  // STATE
  // =====================================================
  
  const [formData, setFormData] = useState<SuitabilityFormData>(() =>
    seedEmptySections({
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
  )
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | undefined>(assessmentId)

  // Keep internal assessmentId in sync when the page selects a specific version.
  useEffect(() => {
    if (assessmentId && assessmentId !== activeAssessmentId) {
      setActiveAssessmentId(assessmentId)
    }
  }, [assessmentId, activeAssessmentId])
  
  const [pulledData, setPulledData] = useState<PulledPlatformData>({})
  // Start in a loading state so the UI renders the skeleton immediately and
  // avoids a “flash” of empty seeded data before the draft/client data arrives.
  const [isLoading, setIsLoading] = useState(true)
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
  // COMPLETION CALCULATION (CONFIG-DRIVEN)
  // =====================================================

  const calculateCompletion = useCallback(
    (data: SuitabilityFormData): number => {
      const computed = calculateSuitabilityCompletion(data, pulledData).overallPercentage

      // Avoid a brief 0% flash during initial hydration if metadata already has a value.
      const metaPct = data?._metadata?.completionPercentage
      if (typeof metaPct === 'number' && metaPct > 0 && computed === 0 && metaPct <= 100) {
        return Math.round(metaPct)
      }

      return computed
    },
    [pulledData]
  )
  
  // =====================================================
  // API SAVE FUNCTION - ROBUST WITH FALLBACKS
  // =====================================================
  
  const saveToDraft = useCallback(
    async (data: SuitabilityFormData): Promise<boolean> =>
      saveSuitabilityDraft({
        data,
        clientId,
        client,
        assessmentId,
        activeAssessmentId,
        isProspect,
        lastSaveAttemptRef: lastSaveAttempt,
        retryTimeoutRef,
        saveState,
        metrics,
        calculateCompletion,
        setMetrics,
        setSaveState,
        setActiveAssessmentId,
        setFormData,
        retrySave: (nextData) => {
          void saveToDraft(nextData)
        }
      }),
    [
      clientId,
      client,
      assessmentId,
      activeAssessmentId,
      validationErrors,
      metrics,
      saveState.isSaving,
      saveState.retryCount,
      saveState.maxRetries,
      isProspect,
      calculateCompletion
    ]
  )
  
  // =====================================================
  // LOAD DRAFT - WITH MULTIPLE FALLBACKS & ATR/CFL
  // =====================================================
  
	  const loadDraft = useCallback(
	    async () =>
	      loadSuitabilityDraft({
	        clientId,
	        assessmentId,
	        isProspect,
	        client,
	        enableConditionalLogic,
	        enableValidation,
	        hasLoadedDraftRef,
	        hasInitializedUiRef,
	        setIsLoading,
	        setFormData,
	        processConditionalLogic,
	        runValidation,
	        loadFromApi: loadFromAPI
	      }),
	    [clientId, client, enableConditionalLogic, enableValidation, assessmentId, isProspect]
	  )
  
	  const loadFromAPI = async (effectiveClientId: string, reconcileWithLocal: boolean = false) => {
      await hydrateSuitabilityDraftFromApi({
        effectiveClientId,
        assessmentId: assessmentId || undefined,
        reconcileWithLocal,
        client,
        enableConditionalLogic,
        enableValidation,
        hasLoadedDraftRef,
        saveToDraft,
        processConditionalLogic,
        runValidation,
        setActiveAssessmentId,
        setFormData,
        setSaveState,
        setMetrics,
        setPulledData
      })
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
            (updatedData._conditionalFields as Record<string, any>)[action.sectionId] = action.fields || []
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
        const calcUpdate = (calculatedUpdates as Record<string, unknown>)[calcSectionId]
        if (calcUpdate && typeof calcUpdate === 'object') {
          newData = {
            ...newData,
            [calcSectionId]: {
              ...newData[calcSectionId as keyof SuitabilityFormData],
              ...(calcUpdate as Record<string, any>)
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
    if (!VALID_SECTION_IDS.has(sectionId)) return
    if (!sectionData || typeof sectionData !== 'object') {
      return
    }
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
  // AUTO-SAVE DEBOUNCED (WITH MUTEX PROTECTION)
  // FIX: Use useRef to maintain stable debounced function
  // =====================================================

  // Use refs to access current values without recreating debounced function
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  const saveToDraftRef = useRef(saveToDraft)
  saveToDraftRef.current = saveToDraft

  const isSaveLockedRef = useRef(isSaveLocked)
  isSaveLockedRef.current = isSaveLocked

  const executeSaveRef = useRef(executeSave)
  executeSaveRef.current = executeSave

  const markPendingChangesRef = useRef(markPendingChanges)
  markPendingChangesRef.current = markPendingChanges

  const clearPendingChangesRef = useRef(clearPendingChanges)
  clearPendingChangesRef.current = clearPendingChanges

  // Create stable debounced function using useRef
  const debouncedAutoSave = useMemo(
    () => debounce(async () => {
      // Skip if no changes or already saving
      if (!formDataRef.current._metadata.isDirty) {
        console.log('No changes to save')
        return
      }

      // Skip if mutex is locked (another save in progress)
      if (isSaveLockedRef.current) {
        console.log('Save in progress, deferring auto-save')
        markPendingChangesRef.current()
        return
      }

      console.log('Auto-saving changes (mutex protected)...')

      // Execute save through mutex for race condition protection
      const result = await executeSaveRef.current(async () => {
        const success = await saveToDraftRef.current(formDataRef.current)
        if (!success) {
          throw new Error('Save failed')
        }
        return success
      })

      if (result) {
        console.log('Auto-save successful')
        clearPendingChangesRef.current()
      } else {
        console.log('Auto-save failed or was queued')
      }
    }, 3000), // 3 second debounce for stability
    [] // Empty deps - function is stable, uses refs for current values
  )
  
  // =====================================================
  // REALTIME SYNC
  // =====================================================
  
  // Keep channel keys stable; do not fall back to `clientRef` (can change/duplicate subscriptions).
  const effectiveRealtimeClientId = (clientId || client?.id || null) as string | null

  const handleRemoteFieldUpdate = useCallback(
    (event: any) => {
      if (!event?.sectionId || !event?.fieldId) return
      updateField(event.sectionId, event.fieldId, event.value, {
        source: 'system',
        skipConditionalLogic: false,
        broadcast: false
      })
      console.log(`Field updated by ${event.userId}`)
    },
    [updateField]
  )

  const realtimeSync = useSuitabilityRealtimeSync({
    supabase,
    enabled: Boolean(syncEnabled && effectiveRealtimeClientId),
    clientId: effectiveRealtimeClientId,
    onRemoteFieldUpdate: handleRemoteFieldUpdate
  })

  const broadcastUpdate = useCallback(
    (sectionId: string, fieldId: string, value: any, source?: string) => {
      realtimeSync.broadcastUpdate({
        type: 'field_update',
        source: (source as 'user' | 'system' | 'ai' | 'external') || 'user',
        sectionId,
        fieldId,
        value
      })
    },
    [realtimeSync]
  )
  
	  // Load draft on mount / when assessment changes.
	  // IMPORTANT: Guard to avoid re-loading when `client` arrives (which changes `loadDraft` identity).
	  const loadDraftRef = useRef(loadDraft)
	  useEffect(() => {
	    loadDraftRef.current = loadDraft
  }, [loadDraft])

  const lastLoadedDraftKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!clientId && !assessmentId) {
      setIsLoading(false)
      return
    }

    // If a parent component is simply echoing back the current active draft id
    // (e.g. after first save), do not treat that as a request to reload.
    if (assessmentId && hasLoadedDraftRef.current && assessmentId === activeAssessmentId) {
      return
    }

    const key = `${clientId || ''}:${assessmentId || ''}:${isProspect ? 'prospect' : 'client'}`
    if (lastLoadedDraftKeyRef.current === key) return
    lastLoadedDraftKeyRef.current = key
    void loadDraftRef.current()
	  }, [clientId, assessmentId, activeAssessmentId, isProspect])

	  // Auto-fill from client + auto-generation once the draft load has completed.
	  // This prevents “settling”/double-initialization and avoids overriding saved draft values.
	  useEffect(() => {
	    if (!client) return
	    if (isLoading) return
	    if (!isProspect && !hasLoadedDraftRef.current) return

	    const key = `${clientId || ''}:${assessmentId || ''}:${isProspect ? 'prospect' : 'client'}`
	    if (autoFillKeyRef.current === key) return
	    autoFillKeyRef.current = key

	    let computed: SuitabilityFormData | null = null
	    setFormData((prev) => {
	      const prevSeeded = seedEmptySections(prev)
	      const prevFingerprint = fingerprintFormDataForHydration(prevSeeded)

	      let nextData = prevSeeded
	      nextData = fillEmptyFieldsFromClient(nextData, client)

	      const generated = AutoGenerationService.processAutoGeneration(suitabilitySections as any, {
	        client,
	        pulledData,
	        formData: nextData,
	        skipExistingValues: true
	      })
	      nextData = mergeSectionUpdates(nextData, generated)

	      if (enableConditionalLogic) {
	        nextData = processConditionalLogic(nextData)
	      }

	      const nextFingerprint = fingerprintFormDataForHydration(seedEmptySections(nextData))
	      if (nextFingerprint === prevFingerprint) {
	        return prev
	      }

	      computed = nextData
	      return nextData
	    })

	    if (computed && enableValidation) {
	      runValidation(computed)
	    }
	  }, [
	    assessmentId,
	    client,
	    clientId,
	    enableConditionalLogic,
	    enableValidation,
	    isLoading,
	    isProspect,
	    pulledData,
	    processConditionalLogic,
	    runValidation
	  ])

  // Auto-set next review date when review frequency is chosen (cadence depends on user selection).
  useEffect(() => {
    const frequency = (formData as any)?.ongoing_service?.review_frequency as string | undefined
    const currentNextReview = (formData as any)?.recommendation?.next_review_date as string | undefined
    if (!frequency) return
    if (currentNextReview) return

    const months =
      frequency === 'Quarterly' ? 3 : frequency === 'Semi-Annual' ? 6 : frequency === 'Annual' ? 12 : null
    if (!months) return
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    const nextReviewISO = d.toISOString().slice(0, 10)

    updateField('recommendation', 'next_review_date', nextReviewISO, {
      source: 'system',
      skipValidation: true,
      skipConditionalLogic: true,
      broadcast: false
    })
  }, [(formData as any)?.ongoing_service?.review_frequency, (formData as any)?.recommendation?.next_review_date, updateField])

  // REMOVED: Auto-save interval - replaced by debounced auto-save with mutex
  // The interval-based auto-save (every 30 seconds) was causing race conditions
  // when it fired simultaneously with the debounced auto-save (2 seconds).
  // Now we only use the debounced auto-save with mutex protection.
  // This ensures reliable saves without duplicate requests.
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (saveQueueRef.current) {
        clearTimeout(saveQueueRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      // REMOVED: autoSaveIntervalRef cleanup - no longer used
      debouncedAutoSave.cancel()
    }
  }, [debouncedAutoSave])
  
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
    const effectiveClientId = clientId || client?.id || client?.clientRef
    
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
    setActiveAssessmentId(undefined)
    
    // Clear localStorage
    if (effectiveClientId) {
      removeLocalDraft(effectiveClientId)
    }
  }, [clientId, client, syncEnabled])
  
  // Manual save function - now uses mutex for protection
  const saveManually = useCallback(async () => {
    // Cancel any pending debounced saves
    debouncedAutoSave.cancel()

    // Execute through mutex
    const result = await executeSave(async () => {
      const success = await saveToDraft(formData)
      if (!success) {
        throw new Error('Manual save failed')
      }
      return success
    })

    return result !== null
  }, [formData, saveToDraft, executeSave, debouncedAutoSave])

  // =====================================================
  // RETURN VALUES
  // =====================================================

  return {
    // Form data
    formData,
    pulledData,
    assessmentId: activeAssessmentId,

    // Update functions
    updateField,
    updateSection,
    setPulledData,

    // State
    isLoading,
    isSaving: saveState.isSaving || mutexSaveState.status === 'saving',
    lastSaved: mutexSaveState.lastSaved || saveState.lastSaved,
    saveError: mutexSaveState.lastError || saveState.lastError,

    // Enhanced save state (for SaveStatusIndicator component)
    enhancedSaveState: {
      status: mutexSaveState.status,
      lastSaved: mutexSaveState.lastSaved,
      lastError: mutexSaveState.lastError,
      pendingChanges: mutexSaveState.pendingChanges,
      saveCount: mutexSaveState.saveCount,
      retryCount: mutexSaveState.retryCount
    },

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
    resetSaveError,

    // Utilities
    reset,
    calculateCompletion: () => calculateCompletion(formData),

    // Metrics
    metrics,

    // Save state for UI (legacy - use enhancedSaveState for new components)
    saveState,

    // ATR/CFL Integration
    atrCflData,
    refreshATRCFL,
    reconcileRiskProfiles,
    isATRComplete,
    isCFLComplete,
    isPersonaComplete,
    personaAssessment,
    assessmentsNeedUpdate
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default useSuitabilityForm
