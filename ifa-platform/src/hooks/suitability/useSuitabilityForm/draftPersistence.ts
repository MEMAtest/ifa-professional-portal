import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Client } from '@/types/client'
import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'
import { isUUID } from '@/lib/utils'
import {
  fetchDraftFromApi,
  hoursSince,
  isClientPersistable,
  isCorruptedNextDevBuild,
  loadLocalDraft,
  postDraftToApi,
  removeLocalDraft,
  saveLocalDraft
} from '@/hooks/suitability/useSuitabilityForm.io'
import {
  fillEmptyFieldsFromClient,
  fingerprintFormDataForHydration,
  generateClientReference,
  seedEmptySections
} from '@/hooks/suitability/useSuitabilityForm.helpers'
import type { FormMetrics, SaveState } from './types'

type SaveDraftArgs = {
  data: SuitabilityFormData
  clientId?: string
  client: Client | null
  assessmentId?: string
  activeAssessmentId?: string
  isProspect: boolean
  lastSaveAttemptRef: MutableRefObject<Date | null>
  retryTimeoutRef: MutableRefObject<NodeJS.Timeout | null>
  saveState: SaveState
  metrics: FormMetrics
  calculateCompletion: (data: SuitabilityFormData) => number
  setMetrics: Dispatch<SetStateAction<FormMetrics>>
  setSaveState: Dispatch<SetStateAction<SaveState>>
  setActiveAssessmentId: Dispatch<SetStateAction<string | undefined>>
  setFormData: Dispatch<SetStateAction<SuitabilityFormData>>
  retrySave: (data: SuitabilityFormData) => void
}

export async function saveSuitabilityDraft(args: SaveDraftArgs): Promise<boolean> {
  const effectiveClientId = args.clientId || args.client?.id || generateClientReference()

  if (!effectiveClientId) {
    console.error('Cannot save: No client identifier available')
    args.setMetrics((prev) => ({
      ...prev,
      lastError: 'No client identifier',
      failedSaveAttempts: prev.failedSaveAttempts + 1
    }))
    return false
  }

  if (args.lastSaveAttemptRef.current) {
    const timeSinceLastSave = Date.now() - args.lastSaveAttemptRef.current.getTime()
    if (timeSinceLastSave < 1000) {
      console.log('Save throttled - too soon after last attempt')
      return false
    }
  }

  if (args.saveState.isSaving) {
    console.log('Save already in progress, queueing...')
    return false
  }

  args.lastSaveAttemptRef.current = new Date()
  args.setSaveState((prev) => ({ ...prev, isSaving: true, lastError: null }))

  try {
    const localData = {
      data: args.data,
      savedAt: new Date().toISOString(),
      clientId: effectiveClientId,
      assessmentId: args.activeAssessmentId || args.assessmentId || null,
      version: '2.0.0'
    }
    saveLocalDraft(effectiveClientId, localData)

    if (!isClientPersistable(effectiveClientId, args.isProspect)) {
      args.setSaveState((prev) => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        lastError: null
      }))
      args.setMetrics((prev) => ({
        ...prev,
        successfulSaves: prev.successfulSaves + 1
      }))
      return true
    }

    const apiPayload = {
      clientId: effectiveClientId,
      assessmentId: args.activeAssessmentId || args.assessmentId || undefined,
      formData: {
        ...args.data,
        _metadata: {
          ...args.data._metadata,
          clientIdentifier: effectiveClientId,
          originalClientId: args.clientId
        }
      },
      completionPercentage: args.calculateCompletion(args.data)
    }

    console.log('Saving draft with client ID:', effectiveClientId)

    const { response, text: errorText, json } = await postDraftToApi({
      clientId: apiPayload.clientId,
      assessmentId: apiPayload.assessmentId,
      formData: apiPayload.formData,
      completionPercentage: apiPayload.completionPercentage,
      timeoutMs: 10000
    })

    if (!response.ok) {
      let errorMessage = `Save failed: ${response.status}`

      if (errorText && isCorruptedNextDevBuild(errorText)) {
        errorMessage =
          "Dev server build looks corrupted. Stop the dev server and run `npm run dev:clean`, then refresh."
      }

      try {
        if (errorText) {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorJson.message || errorMessage
          console.error('API error details:', errorJson)
        }
      } catch {
        console.error('API error text:', errorText)
      }

      throw new Error(errorMessage)
    }

    const result = json as any

    if (!result?.success) {
      throw new Error(result?.error || 'Save failed')
    }

    const returnedAssessmentId = result.assessmentId || result.id
    if (returnedAssessmentId) {
      args.setActiveAssessmentId(returnedAssessmentId)
      args.setFormData((prev) => ({
        ...prev,
        _metadata: {
          ...prev._metadata,
          assessmentId: returnedAssessmentId
        }
      }))
    }

    args.setSaveState((prev) => ({
      ...prev,
      isSaving: false,
      lastSaved: new Date(),
      lastError: null,
      retryCount: 0,
      nextRetryAt: null
    }))

    args.setFormData((prev) => ({
      ...prev,
      _metadata: {
        ...prev._metadata,
        isDirty: false,
        lastSyncedAt: new Date().toISOString()
      }
    }))

    args.setMetrics((prev) => ({
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

    args.setMetrics((prev) => ({
      ...prev,
      consecutiveErrors: prev.consecutiveErrors + 1,
      lastError: errorMessage,
      failedSaveAttempts: prev.failedSaveAttempts + 1
    }))

    if (args.saveState.retryCount < args.saveState.maxRetries) {
      const retryDelay = Math.min(1000 * Math.pow(2, args.saveState.retryCount), 10000)
      const nextRetryAt = new Date(Date.now() + retryDelay)

      args.setSaveState((prev) => ({
        ...prev,
        isSaving: false,
        lastError: errorMessage,
        retryCount: prev.retryCount + 1,
        nextRetryAt
      }))

      console.log(
        `Will retry save in ${retryDelay}ms (attempt ${args.saveState.retryCount + 1}/${args.saveState.maxRetries})`
      )

      if (args.retryTimeoutRef.current) {
        clearTimeout(args.retryTimeoutRef.current)
      }

      args.retryTimeoutRef.current = setTimeout(() => {
        args.retrySave(args.data)
      }, retryDelay)
    } else {
      args.setSaveState((prev) => ({
        ...prev,
        isSaving: false,
        lastError: `Save failed after ${args.saveState.maxRetries} attempts: ${errorMessage}`,
        nextRetryAt: null
      }))

      if (args.metrics.consecutiveErrors >= 3 && typeof window !== 'undefined') {
        console.error('Critical: Multiple save failures detected')
      }
    }

    return false
  }
}

type LoadDraftFromApiArgs = {
  effectiveClientId: string
  assessmentId?: string
  reconcileWithLocal?: boolean
  client: Client | null
  enableConditionalLogic: boolean
  enableValidation: boolean
  hasLoadedDraftRef: MutableRefObject<boolean>
  saveToDraft: (data: SuitabilityFormData) => Promise<boolean>
  processConditionalLogic: (data: SuitabilityFormData) => SuitabilityFormData
  runValidation: (data: SuitabilityFormData) => unknown
  setActiveAssessmentId: Dispatch<SetStateAction<string | undefined>>
  setFormData: Dispatch<SetStateAction<SuitabilityFormData>>
  setSaveState: Dispatch<SetStateAction<SaveState>>
  setMetrics: Dispatch<SetStateAction<FormMetrics>>
  setPulledData: Dispatch<SetStateAction<PulledPlatformData>>
}

export async function hydrateSuitabilityDraftFromApi(args: LoadDraftFromApiArgs) {
  try {
    const { response, text: errorText, json } = await fetchDraftFromApi({
      clientId: args.effectiveClientId,
      assessmentId: args.assessmentId
    })

    if (!response.ok) {
      args.hasLoadedDraftRef.current = true
      if (response.status !== 404) {
        if (errorText && isCorruptedNextDevBuild(errorText)) {
          const message =
            "Draft load failed due to a corrupted Next dev build. Stop dev server, run `npm run dev:clean`, then refresh."
          args.setSaveState((prev) => ({
            ...prev,
            lastError: message
          }))
          args.setMetrics((prev) => ({
            ...prev,
            lastError: message,
            consecutiveErrors: prev.consecutiveErrors + 1
          }))
          console.error(message)
        } else {
          console.error('Failed to load draft from API:', response.status)
        }
      }
      return
    }

    const result = json as any
    args.hasLoadedDraftRef.current = true

    if (result?.success && result.formData) {
      const serverData = result.formData as SuitabilityFormData
      const serverUpdatedAt = result.updatedAt ? new Date(result.updatedAt).getTime() : 0
      if (result.assessmentId) {
        args.setActiveAssessmentId(result.assessmentId)
      }

      if (args.reconcileWithLocal) {
        const localParsed = loadLocalDraft(args.effectiveClientId)
        if (localParsed) {
          try {
            const localUpdatedAt = localParsed.savedAt ? new Date(localParsed.savedAt).getTime() : 0

            if (serverUpdatedAt > localUpdatedAt) {
              console.log('Server data is newer - using server version')
              removeLocalDraft(args.effectiveClientId)
            } else if (localUpdatedAt > serverUpdatedAt) {
              console.log('Local data is newer - syncing to server')
              args
                .saveToDraft(localParsed.data)
                .catch((err) => console.warn('Failed to sync local data to server:', err))
              return
            } else {
              console.log('Data in sync - using server version')
              removeLocalDraft(args.effectiveClientId)
            }
          } catch (e) {
            console.error('Failed to parse local data for reconciliation:', e)
            removeLocalDraft(args.effectiveClientId)
          }
        }
      }

      console.log('Loaded draft from server')
      const seededDraft = seedEmptySections(serverData)

      let nextData = fillEmptyFieldsFromClient(seededDraft, args.client)
      if (args.enableConditionalLogic) {
        nextData = args.processConditionalLogic(nextData)
      }

      const nextFingerprint = fingerprintFormDataForHydration(nextData)
      args.setFormData((prev) => {
        const prevFingerprint = fingerprintFormDataForHydration(seedEmptySections(prev))
        return prevFingerprint === nextFingerprint ? prev : nextData
      })

      args.setSaveState((prev) => ({
        ...prev,
        lastSaved: result.updatedAt ? new Date(result.updatedAt) : null
      }))

      if (result.atrData || result.cflData) {
        const pulledPlatformData: PulledPlatformData = {
          atrScore: result.atrData?.risk_analysis?.score,
          atrCategory: result.atrData?.risk_analysis?.category,
          cflScore: result.cflData?.risk_analysis?.score,
          cflCategory: result.cflData?.risk_analysis?.category
        }
        args.setPulledData((prev) => ({ ...prev, ...pulledPlatformData }))
      }

      if (args.enableValidation) {
        args.runValidation(nextData)
      }
    }
  } catch (error) {
    console.error('API load error:', error)
    args.hasLoadedDraftRef.current = true
  }
}

type LoadDraftArgs = {
  clientId?: string
  assessmentId?: string
  isProspect: boolean
  client: Client | null
  enableConditionalLogic: boolean
  enableValidation: boolean
  hasLoadedDraftRef: MutableRefObject<boolean>
  hasInitializedUiRef: MutableRefObject<boolean>
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setFormData: Dispatch<SetStateAction<SuitabilityFormData>>
  processConditionalLogic: (data: SuitabilityFormData) => SuitabilityFormData
  runValidation: (data: SuitabilityFormData) => unknown
  loadFromApi: (effectiveClientId: string, reconcileWithLocal?: boolean) => Promise<void>
}

export async function loadSuitabilityDraft(args: LoadDraftArgs) {
  const effectiveClientId = args.clientId || args.client?.id || args.client?.clientRef

  if (!effectiveClientId) {
    console.log('No client identifier available for loading draft')
    args.hasLoadedDraftRef.current = true
    args.hasInitializedUiRef.current = true
    args.setIsLoading(false)
    return
  }

  const canUseServer = !args.isProspect && isUUID(effectiveClientId)
  if (!canUseServer) {
    args.hasLoadedDraftRef.current = true
  }

  const shouldBlockUi = !args.hasInitializedUiRef.current
  if (shouldBlockUi) {
    args.setIsLoading(true)
  }

  try {
    if (args.assessmentId) {
      if (canUseServer) {
        await args.loadFromApi(effectiveClientId)
      }
      return
    }

    const localDraft = loadLocalDraft(effectiveClientId)
    if (localDraft) {
      const hoursSinceSave = localDraft.savedAt ? hoursSince(localDraft.savedAt) : null
      if (hoursSinceSave !== null && hoursSinceSave < 2) {
        console.log('Using recent local draft')
        const seededLocal = seedEmptySections(localDraft.data)

        let nextData = fillEmptyFieldsFromClient(seededLocal, args.client)
        if (args.enableConditionalLogic) {
          nextData = args.processConditionalLogic(nextData)
        }

        args.hasLoadedDraftRef.current = true
        args.setFormData(nextData)

        if (args.enableValidation) {
          args.runValidation(nextData)
        }

        if (canUseServer) {
          void args.loadFromApi(effectiveClientId, true)
        }

        args.setIsLoading(false)
        return
      }
    }

    if (canUseServer) {
      await args.loadFromApi(effectiveClientId)
    }
  } catch (error) {
    console.error('Failed to load draft:', error)
  } finally {
    if (shouldBlockUi) {
      args.hasInitializedUiRef.current = true
      args.setIsLoading(false)
    }
  }
}
