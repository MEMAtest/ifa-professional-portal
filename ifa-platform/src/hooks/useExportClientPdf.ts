// =====================================================
// FILE: src/hooks/useExportClientPdf.ts
// Centralized hook for client PDF export functionality
// Single implementation for all export logic across the app
// =====================================================

import { useState, useCallback } from 'react'
import {
  fetchClientPdfBlob,
  openOrDownloadPdf,
  type ClientPdfKind,
  type ClientPdfPreset
} from '@/lib/clients/exports/clientPdfExport'

export type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseExportClientPdfOptions {
  /** Called when export starts */
  onStart?: () => void
  /** Called on successful export */
  onSuccess?: (kind: ClientPdfKind) => void
  /** Called on export error */
  onError?: (error: Error, kind: ClientPdfKind) => void
  /** Called when all exports in a batch complete */
  onComplete?: () => void
}

export interface UseExportClientPdfReturn {
  /** Current export status */
  status: ExportStatus
  /** Whether export is in progress */
  isLoading: boolean
  /** Error message if status is 'error' */
  error: string | null
  /** Currently exporting kind (if loading) */
  currentKind: ClientPdfKind | null
  /** Export a single PDF type */
  exportPdf: (args: {
    clientId: string
    clientToken: string
    kind: ClientPdfKind
    openInNewTab?: boolean
  }) => Promise<void>
  /** Export multiple PDFs based on preset */
  exportPreset: (args: {
    clientId: string
    clientToken: string
    preset: ClientPdfPreset
    openInNewTab?: boolean
  }) => Promise<void>
  /** Reset state to idle */
  reset: () => void
}

/**
 * Centralized hook for exporting client PDFs
 * Provides consistent state management and error handling for all export operations
 *
 * @example
 * ```tsx
 * const { exportPdf, exportPreset, isLoading, error } = useExportClientPdf({
 *   onSuccess: (kind) => toast.success(`${kind} exported!`),
 *   onError: (err) => toast.error(err.message)
 * })
 *
 * // Export single PDF
 * await exportPdf({ clientId, clientToken: client.ref, kind: 'profile', openInNewTab: true })
 *
 * // Export preset (both profile and print pack)
 * await exportPreset({ clientId, clientToken: client.ref, preset: 'both', openInNewTab: false })
 * ```
 */
export function useExportClientPdf(
  options: UseExportClientPdfOptions = {}
): UseExportClientPdfReturn {
  const { onStart, onSuccess, onError, onComplete } = options

  const [status, setStatus] = useState<ExportStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentKind, setCurrentKind] = useState<ClientPdfKind | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setCurrentKind(null)
  }, [])

  const exportPdf = useCallback(
    async (args: {
      clientId: string
      clientToken: string
      kind: ClientPdfKind
      openInNewTab?: boolean
    }) => {
      const { clientId, clientToken, kind, openInNewTab = false } = args

      try {
        setStatus('loading')
        setCurrentKind(kind)
        setError(null)
        onStart?.()

        const blob = await fetchClientPdfBlob({ clientId, kind })

        const filename =
          kind === 'profile'
            ? `client-profile-${clientToken}.pdf`
            : `client-print-pack-${clientToken}.pdf`

        openOrDownloadPdf({ blob, filename, openInNewTab })

        setStatus('success')
        onSuccess?.(kind)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Export failed'
        setStatus('error')
        setError(errorMessage)
        onError?.(err instanceof Error ? err : new Error(errorMessage), kind)
      } finally {
        setCurrentKind(null)
        onComplete?.()
      }
    },
    [onStart, onSuccess, onError, onComplete]
  )

  const exportPreset = useCallback(
    async (args: {
      clientId: string
      clientToken: string
      preset: ClientPdfPreset
      openInNewTab?: boolean
    }) => {
      const { clientId, clientToken, preset, openInNewTab = false } = args

      try {
        setStatus('loading')
        setError(null)
        onStart?.()

        const kinds: ClientPdfKind[] =
          preset === 'both' ? ['profile', 'print_pack'] : [preset === 'profile' ? 'profile' : 'print_pack']

        for (const kind of kinds) {
          setCurrentKind(kind)

          const blob = await fetchClientPdfBlob({ clientId, kind })

          const filename =
            kind === 'profile'
              ? `client-profile-${clientToken}.pdf`
              : `client-print-pack-${clientToken}.pdf`

          openOrDownloadPdf({ blob, filename, openInNewTab })

          onSuccess?.(kind)
        }

        setStatus('success')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Export failed'
        setStatus('error')
        setError(errorMessage)
        onError?.(err instanceof Error ? err : new Error(errorMessage), currentKind ?? 'profile')
      } finally {
        setCurrentKind(null)
        onComplete?.()
      }
    },
    [onStart, onSuccess, onError, onComplete, currentKind]
  )

  return {
    status,
    isLoading: status === 'loading',
    error,
    currentKind,
    exportPdf,
    exportPreset,
    reset
  }
}

// Re-export types for convenience
export type { ClientPdfKind, ClientPdfPreset }
