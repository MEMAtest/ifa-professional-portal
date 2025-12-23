// =====================================================
// FILE: src/components/suitability/SaveStatusIndicator.tsx
// PURPOSE: Visual indicator for save status in suitability assessments
// Shows clear feedback: saving, saved, error states
// =====================================================

'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Loader2, Clock, RefreshCw, CloudOff, Cloud, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SaveStatus } from '@/hooks/suitability/useSaveMutex'

// =====================================================
// TYPES
// =====================================================

interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
  lastError: string | null
  pendingChanges?: boolean
  onRetry?: () => void
  className?: string
  showTimestamp?: boolean
  variant?: 'default' | 'prominent' | 'sticky'
}

// =====================================================
// HELPERS
// =====================================================

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getTimeSince = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) {
    return 'just now'
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  } else {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h ago`
  }
}

// =====================================================
// COMPONENT
// =====================================================

export function SaveStatusIndicator({
  status,
  lastSaved,
  lastError,
  pendingChanges = false,
  onRetry,
  className,
  showTimestamp = true,
  variant = 'default'
}: SaveStatusIndicatorProps) {
  // Track animation state for saved status
  const [showSavedAnimation, setShowSavedAnimation] = useState(false)

  useEffect(() => {
    if (status === 'saved') {
      setShowSavedAnimation(true)
      const timer = setTimeout(() => setShowSavedAnimation(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [status])

  // Don't show anything if idle and no pending changes (except for prominent/sticky variants)
  if (status === 'idle' && !pendingChanges && !lastSaved && variant === 'default') {
    return null
  }

  const isProminent = variant === 'prominent' || variant === 'sticky'
  const iconSize = isProminent ? 'h-5 w-5' : 'h-3.5 w-3.5'
  const textSize = isProminent ? 'text-sm' : 'text-xs'

  const renderContent = () => {
    switch (status) {
      case 'pending':
        return (
          <div className={cn(
            "flex items-center gap-2",
            isProminent ? "text-amber-700" : "text-amber-600"
          )}>
            <Clock className={iconSize} />
            <span className={cn(textSize, "font-medium")}>Unsaved changes</span>
          </div>
        )

      case 'saving':
        return (
          <div className={cn(
            "flex items-center gap-2",
            isProminent ? "text-blue-700" : "text-blue-600"
          )}>
            <Loader2 className={cn(iconSize, "animate-spin")} />
            <span className={cn(textSize, "font-medium")}>Saving...</span>
            {isProminent && (
              <Cloud className="h-4 w-4 animate-pulse ml-1" />
            )}
          </div>
        )

      case 'saved':
        return (
          <div className={cn(
            "flex items-center gap-2 transition-all",
            isProminent ? "text-green-700" : "text-green-600",
            showSavedAnimation && isProminent && "scale-105"
          )}>
            <CheckCircle className={cn(iconSize, showSavedAnimation && "animate-bounce")} />
            <span className={cn(textSize, "font-medium")}>
              Saved {lastSaved && showTimestamp && formatTime(lastSaved)}
            </span>
          </div>
        )

      case 'error':
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2",
              isProminent ? "text-red-700" : "text-red-600"
            )}>
              <AlertCircle className={iconSize} />
              <span className={cn(textSize, "font-medium")}>Save failed</span>
              {isProminent && <CloudOff className="h-4 w-4 ml-1" />}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  "flex items-center gap-1 font-medium hover:underline",
                  isProminent
                    ? "text-sm px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-red-700"
                    : "text-xs text-red-600 hover:text-red-700 underline"
                )}
              >
                <RefreshCw className={isProminent ? "h-4 w-4" : "h-3 w-3"} />
                Retry
              </button>
            )}
          </div>
        )

      case 'idle':
      default:
        // Show last saved time if available
        if (lastSaved && showTimestamp) {
          return (
            <div className={cn(
              "flex items-center gap-2",
              isProminent ? "text-gray-600" : "text-gray-500"
            )}>
              <CheckCircle className={cn(iconSize, "opacity-60")} />
              <span className={textSize}>
                Last saved {getTimeSince(lastSaved)}
              </span>
            </div>
          )
        }
        // For prominent variant, show ready state
        if (isProminent) {
          return (
            <div className="flex items-center gap-2 text-gray-500">
              <Save className={iconSize} />
              <span className={textSize}>Auto-save enabled</span>
            </div>
          )
        }
        return null
    }
  }

  const content = renderContent()

  if (!content) return null

  // Container styles based on variant
  const containerStyles = cn(
    'inline-flex items-center transition-all duration-300',
    variant === 'sticky' && 'fixed bottom-4 right-4 z-50 shadow-lg rounded-lg px-4 py-3',
    variant === 'prominent' && 'px-4 py-2 rounded-lg',
    variant === 'sticky' && status === 'error' && 'bg-red-50 border border-red-200',
    variant === 'sticky' && status === 'saving' && 'bg-blue-50 border border-blue-200',
    variant === 'sticky' && status === 'saved' && 'bg-green-50 border border-green-200',
    variant === 'sticky' && status === 'pending' && 'bg-amber-50 border border-amber-200',
    variant === 'sticky' && status === 'idle' && 'bg-white border border-gray-200',
    variant === 'prominent' && status === 'error' && 'bg-red-50 border border-red-200',
    variant === 'prominent' && status === 'saving' && 'bg-blue-50 border border-blue-200',
    variant === 'prominent' && status === 'saved' && 'bg-green-50 border border-green-200',
    variant === 'prominent' && status === 'pending' && 'bg-amber-50 border border-amber-200',
    variant === 'prominent' && status === 'idle' && 'bg-gray-50 border border-gray-200',
    className
  )

  return (
    <div
      className={containerStyles}
      role="status"
      aria-live="polite"
    >
      {content}
      {/* Error tooltip */}
      {status === 'error' && lastError && (
        <div className="sr-only">
          Error: {lastError}
        </div>
      )}
    </div>
  )
}

// =====================================================
// COMPACT VERSION (for headers)
// =====================================================

interface CompactSaveStatusProps {
  status: SaveStatus
  lastSaved: Date | null
  className?: string
}

export function CompactSaveStatus({
  status,
  lastSaved,
  className
}: CompactSaveStatusProps) {
  const getStatusDot = () => {
    switch (status) {
      case 'pending':
        return <div className="h-2 w-2 rounded-full bg-amber-500" />
      case 'saving':
        return <Loader2 className="h-2 w-2 animate-spin text-blue-500" />
      case 'saved':
        return <div className="h-2 w-2 rounded-full bg-green-500" />
      case 'error':
        return <div className="h-2 w-2 rounded-full bg-red-500" />
      default:
        return lastSaved ? (
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        ) : null
    }
  }

  const dot = getStatusDot()
  if (!dot) return null

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      title={
        status === 'saving'
          ? 'Saving...'
          : status === 'saved' && lastSaved
          ? `Saved at ${formatTime(lastSaved)}`
          : status === 'error'
          ? 'Save failed'
          : status === 'pending'
          ? 'Unsaved changes'
          : lastSaved
          ? `Last saved at ${formatTime(lastSaved)}`
          : ''
      }
    >
      {dot}
    </div>
  )
}

// =====================================================
// EXPORTS
// =====================================================

export default SaveStatusIndicator
