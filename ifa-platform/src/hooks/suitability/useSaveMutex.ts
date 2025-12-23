// =====================================================
// FILE: src/hooks/suitability/useSaveMutex.ts
// PURPOSE: Ensures only one save operation runs at a time
// Prevents race conditions between debounced and manual saves
// =====================================================

import { useState, useCallback, useRef } from 'react'

// =====================================================
// TYPES
// =====================================================

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface SaveState {
  status: SaveStatus
  lastSaved: Date | null
  lastError: string | null
  pendingChanges: boolean
  saveCount: number
  retryCount: number
}

interface UseSaveMutexOptions {
  onSaveStart?: () => void
  onSaveSuccess?: () => void
  onSaveError?: (error: string) => void
  savedDisplayDuration?: number // ms to show "Saved" before returning to idle
}

interface UseSaveMutexReturn {
  // State
  saveState: SaveState
  isLocked: boolean

  // Actions
  executeSave: <T>(saveOperation: () => Promise<T>) => Promise<T | null>
  markPendingChanges: () => void
  clearPendingChanges: () => void
  resetError: () => void
}

// =====================================================
// HOOK IMPLEMENTATION
// =====================================================

export function useSaveMutex(options: UseSaveMutexOptions = {}): UseSaveMutexReturn {
  const {
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    savedDisplayDuration = 3000
  } = options

  // State
  const [saveState, setSaveState] = useState<SaveState>({
    status: 'idle',
    lastSaved: null,
    lastError: null,
    pendingChanges: false,
    saveCount: 0,
    retryCount: 0
  })

  // Refs
  const lockRef = useRef(false)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const queuedSaveRef = useRef<(() => Promise<any>) | null>(null)

  // Check if locked
  const isLocked = lockRef.current

  // Clear saved timeout
  const clearSavedTimeout = useCallback(() => {
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = null
    }
  }, [])

  // Mark pending changes
  const markPendingChanges = useCallback(() => {
    setSaveState(prev => {
      // Don't change to pending if currently saving
      if (prev.status === 'saving') {
        return { ...prev, pendingChanges: true }
      }
      return { ...prev, status: 'pending', pendingChanges: true }
    })
  }, [])

  // Clear pending changes
  const clearPendingChanges = useCallback(() => {
    setSaveState(prev => ({ ...prev, pendingChanges: false }))
  }, [])

  // Reset error state
  const resetError = useCallback(() => {
    setSaveState(prev => ({
      ...prev,
      status: prev.pendingChanges ? 'pending' : 'idle',
      lastError: null,
      retryCount: 0
    }))
  }, [])

  // Execute save with mutex lock
  const executeSave = useCallback(async <T>(
    saveOperation: () => Promise<T>
  ): Promise<T | null> => {
    // If already saving, queue this save
    if (lockRef.current) {
      queuedSaveRef.current = saveOperation
      return null
    }

    // Acquire lock
    lockRef.current = true
    clearSavedTimeout()

    // Update state to saving
    setSaveState(prev => ({
      ...prev,
      status: 'saving',
      lastError: null
    }))

    onSaveStart?.()

    try {
      const result = await saveOperation()

      // Success - update state
      const now = new Date()
      setSaveState(prev => ({
        ...prev,
        status: 'saved',
        lastSaved: now,
        lastError: null,
        pendingChanges: false,
        saveCount: prev.saveCount + 1,
        retryCount: 0
      }))

      onSaveSuccess?.()

      // Set timeout to return to idle
      savedTimeoutRef.current = setTimeout(() => {
        setSaveState(prev => {
          // Only go to idle if still showing saved and no pending changes
          if (prev.status === 'saved' && !prev.pendingChanges) {
            return { ...prev, status: 'idle' }
          }
          // If pending changes accumulated, show pending
          if (prev.pendingChanges) {
            return { ...prev, status: 'pending' }
          }
          return prev
        })
      }, savedDisplayDuration)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed'

      setSaveState(prev => ({
        ...prev,
        status: 'error',
        lastError: errorMessage,
        retryCount: prev.retryCount + 1
      }))

      onSaveError?.(errorMessage)
      return null

    } finally {
      // Release lock
      lockRef.current = false

      // Check if there's a queued save
      if (queuedSaveRef.current) {
        const queuedOperation = queuedSaveRef.current
        queuedSaveRef.current = null
        // Execute queued save after a small delay
        setTimeout(() => {
          executeSave(queuedOperation)
        }, 100)
      }
    }
  }, [clearSavedTimeout, onSaveStart, onSaveSuccess, onSaveError, savedDisplayDuration])

  return {
    saveState,
    isLocked,
    executeSave,
    markPendingChanges,
    clearPendingChanges,
    resetError
  }
}

export default useSaveMutex
