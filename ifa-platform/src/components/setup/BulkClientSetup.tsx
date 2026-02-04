'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  AlertTriangle,
  Users,
  Loader2,
  RefreshCw,
  Eye,
  XCircle,
  Sparkles,
  FileType,
} from 'lucide-react'
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal'
import { FolderDropZone } from './FolderDropZone'
import type {
  ParsedClientFolder,
  ReviewedClient,
  BulkSetupPhase,
  ProcessingState,
  ProcessingError,
  CompletedClient,
  CompletedState,
} from '@/types/bulk-setup'
import {
  MAX_FILE_SIZE,
  EXTRACT_BATCH_SIZE,
  ANALYSIS_POLL_INTERVAL_MS,
  MAX_ANALYSIS_WAIT_MS,
  type ProfilePopulationEntry,
  type ReuploadEntry,
  getAutoTags,
  generateId,
  formatDuration,
  validateClient,
} from './bulkSetupUtils'

export function BulkClientSetup() {
  const router = useRouter()
  const [phase, setPhase] = useState<BulkSetupPhase>('upload')
  const [clients, setClients] = useState<ReviewedClient[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState<ProcessingState | null>(null)
  const [completed, setCompleted] = useState<CompletedState | null>(null)
  const [failedClients, setFailedClients] = useState<ReviewedClient[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isProcessingRef = useRef(false)
  const [analysingState, setAnalysingState] = useState<{
    completedClients: CompletedClient[]
    allDocIds: string[]
    errors: ProcessingError[]
  } | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState<{
    total: number
    completed: number
    statuses: Record<string, string>
  } | null>(null)
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({})
  const analysisStartRef = useRef<number | null>(null)
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)
  const [confirmExpandedRows, setConfirmExpandedRows] = useState<Set<string>>(new Set())
  const [profilePopulation, setProfilePopulation] = useState<Record<string, ProfilePopulationEntry>>({})
  const profilePopulationRef = useRef(false)
  const [reuploadStatus, setReuploadStatus] = useState<Record<string, ReuploadEntry>>({})

  // Prevent navigation during processing or analysing
  useEffect(() => {
    if (phase !== 'processing' && phase !== 'analysing') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [phase])

  useEffect(() => {
    if (phase === 'analysing') {
      if (!analysisStartRef.current) analysisStartRef.current = Date.now()
    } else {
      analysisStartRef.current = null
    }
  }, [phase])

  const handleFoldersParsed = useCallback(
    (folders: ParsedClientFolder[]) => {
      const reviewed: ReviewedClient[] = folders.map((folder) => {
        const client: ReviewedClient = {
          id: generateId(),
          lastName: folder.suggestedLastName,
          firstName: '',
          email: '',
          clientRef: folder.suggestedClientRef,
          files: folder.files,
          errors: {},
        }
        return client
      })

      // Run initial validation
      const validated = reviewed.map((c) => ({
        ...c,
        errors: validateClient(c, reviewed),
      }))

      setClients(validated)
      setPhase('review')
    },
    []
  )

  const updateClient = useCallback(
    (id: string, field: keyof ReviewedClient, value: string) => {
      setClients((prev) => {
        const updated = prev.map((c) =>
          c.id === id ? { ...c, [field]: value } : c
        )
        // Re-validate all clients (for duplicate ref checks)
        return updated.map((c) => ({
          ...c,
          errors: validateClient(c, updated),
        }))
      })
    },
    []
  )

  const removeClient = useCallback((id: string) => {
    setClients((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      return filtered.map((c) => ({
        ...c,
        errors: validateClient(c, filtered),
      }))
    })
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allValid = useMemo(
    () => clients.length > 0 && clients.every((c) => Object.keys(c.errors).length === 0),
    [clients]
  )

  const handleConfirm = useCallback(async () => {
    if (!allValid || isProcessingRef.current) return
    isProcessingRef.current = true
    setIsSubmitting(true)
    setPhase('processing')
    profilePopulationRef.current = false
    setProfilePopulation({})

    const errors: ProcessingError[] = []
    const completedClients: CompletedClient[] = []
    let totalFilesUploaded = 0
    let totalFilesFailed = 0
    const totalFiles = clients.reduce(
      (sum, c) => sum + c.files.filter((f) => f.isSupported).length,
      0
    )

    setProcessing({
      phase: 'creating-clients',
      currentClient: '',
      currentFile: '',
      clientsProcessed: 0,
      clientsTotal: clients.length,
      filesProcessed: 0,
      filesTotal: totalFiles,
    })

    // Step 1: Create clients via API route (uses service client to bypass RLS)
    const clientResults: { clientRef: string; clientId: string | null; success: boolean; error?: string }[] = []
    const failedClientsList: ReviewedClient[] = []

    try {
      const response = await fetch('/api/setup/bulk-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: clients.map((c) => ({
            firstName: c.firstName.trim(),
            lastName: c.lastName.trim(),
            email: c.email?.trim() || '',
            clientRef: c.clientRef.trim(),
          })),
        }),
      })

      let data: any
      try {
        data = await response.json()
      } catch {
        throw new Error(`Server error (${response.status})`)
      }

      if (!response.ok || !data.success) {
        // Entire batch failed
        const errMsg = data.error || 'Failed to create clients'
        for (const c of clients) {
          clientResults.push({ clientRef: c.clientRef, clientId: null, success: false, error: errMsg })
          failedClientsList.push(c)
          errors.push({ clientRef: c.clientRef, error: errMsg, type: 'client-creation' })
        }
      } else {
        // Process per-client results
        for (const result of data.results) {
          clientResults.push({
            clientRef: result.clientRef,
            clientId: result.clientId,
            success: result.success,
            error: result.error,
          })
          if (!result.success) {
            const originalClient = clients.find((c) => c.clientRef === result.clientRef)
            if (originalClient) failedClientsList.push(originalClient)
            errors.push({ clientRef: result.clientRef, error: result.error || 'Creation failed', type: 'client-creation' })
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      for (const c of clients) {
        clientResults.push({ clientRef: c.clientRef, clientId: null, success: false, error: msg })
        failedClientsList.push(c)
        errors.push({ clientRef: c.clientRef, error: msg, type: 'client-creation' })
      }
    }

    setProcessing((prev) =>
      prev ? { ...prev, clientsProcessed: clients.length } : null
    )

    setProcessing((prev) =>
      prev
        ? {
            ...prev,
            phase: 'uploading-files',
            clientsProcessed: clientResults.filter((r) => r.success).length,
          }
        : null
    )

    // Step 2: Upload files for each successfully created client
    let filesProcessed = 0

    for (const result of clientResults) {
      if (!result.success || !result.clientId) continue

      const client = clients.find((c) => c.clientRef === result.clientRef)
      if (!client) continue

      let clientFilesUploaded = 0
      let clientFilesFailed = 0
      const uploadedFileNames: string[] = []
      const uploadedDocIds: string[] = []
      const supportedFiles = client.files.filter((f) => f.isSupported)

      for (const file of supportedFiles) {
        setProcessing((prev) =>
          prev
            ? {
                ...prev,
                currentClient: client.lastName,
                currentFile: file.name,
                filesProcessed,
              }
            : null
        )

        // Skip files exceeding size limit
        if (file.size > MAX_FILE_SIZE) {
          clientFilesFailed++
          totalFilesFailed++
          errors.push({
            clientRef: result.clientRef,
            fileName: file.name,
            error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
            type: 'file-upload',
          })
          filesProcessed++
          continue
        }

        try {
          const formData = new FormData()
          formData.append('file', file.file)
          formData.append('name', file.name)
          formData.append('client_id', result.clientId)
          const autoTags = getAutoTags(file.name)
          if (autoTags.length > 0) {
            formData.append('tags', JSON.stringify(autoTags))
          }

          const uploadResponse = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          })

          const uploadData = await uploadResponse.json()

          if (uploadData.success) {
            clientFilesUploaded++
            totalFilesUploaded++
            uploadedFileNames.push(file.name)
            if (uploadData.document?.id) {
              uploadedDocIds.push(uploadData.document.id)
            }
          } else {
            clientFilesFailed++
            totalFilesFailed++
            errors.push({
              clientRef: result.clientRef,
              fileName: file.name,
              error: uploadData.error || 'Upload failed',
              type: 'file-upload',
            })
          }
        } catch (err) {
          clientFilesFailed++
          totalFilesFailed++
          errors.push({
            clientRef: result.clientRef,
            fileName: file.name,
            error: err instanceof Error ? err.message : 'Network error',
            type: 'file-upload',
          })
        }

        filesProcessed++
      }

      completedClients.push({
        clientRef: result.clientRef,
        clientId: result.clientId,
        filesUploaded: clientFilesUploaded,
        filesFailed: clientFilesFailed,
        fileNames: uploadedFileNames,
        uploadedDocumentIds: uploadedDocIds,
      })

      try {
        const statusResponse = await fetch(`/api/clients/${result.clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        })
        if (!statusResponse.ok) {
          const statusData = await statusResponse.json().catch(() => ({}))
          errors.push({
            clientRef: result.clientRef,
            error: statusData?.error || 'Failed to update client status',
            type: 'client-status' as any,
          })
        }
      } catch (err) {
        errors.push({
          clientRef: result.clientRef,
          error: err instanceof Error ? err.message : 'Failed to update client status',
          type: 'client-status' as any,
        })
      }
    }

    const allDocIds = completedClients.flatMap((c) => c.uploadedDocumentIds)
    const createdCount = clientResults.filter((r) => r.success).length
    const failedCount = clientResults.filter((r) => !r.success).length

    setFailedClients(failedClientsList)
    isProcessingRef.current = false
    setIsSubmitting(false)

    // Store state for analysing phase
    setAnalysingState({ completedClients, allDocIds, errors })

    if (allDocIds.length > 0) {
      // Initialize progress tracking
      const initialStatuses: Record<string, string> = {}
      for (const id of allDocIds) initialStatuses[id] = 'pending'
      setAnalysisProgress({ total: allDocIds.length, completed: 0, statuses: initialStatuses })
      setPhase('analysing')
    } else {
      // No docs to analyse — skip straight to confirm
      setCompleted({
        clientsCreated: createdCount,
        clientsFailed: failedCount,
        filesUploaded: totalFilesUploaded,
        filesFailed: totalFilesFailed,
        completedClients,
        errors,
      })
      setPhase('confirm')
    }
  }, [clients, allValid])

  const handleRetry = useCallback(() => {
    if (failedClients.length === 0) return
    setClients(
      failedClients.map((c) => ({
        ...c,
        errors: validateClient(c, failedClients),
      }))
    )
    setPhase('review')
    setCompleted(null)
    setProcessing(null)
  }, [failedClients])

  const handleReset = useCallback(() => {
    setPhase('upload')
    setClients([])
    setExpandedRows(new Set())
    setProcessing(null)
    setCompleted(null)
    setFailedClients([])
    setAnalysingState(null)
    setAnalysisProgress(null)
    setPreviewDoc(null)
    setConfirmExpandedRows(new Set())
    profilePopulationRef.current = false
    setProfilePopulation({})
    setReuploadStatus({})
    isProcessingRef.current = false
    setIsSubmitting(false)
  }, [])

  // Analysing phase: trigger extraction + poll for document statuses
  useEffect(() => {
    if (phase !== 'analysing' || !analysingState || analysingState.allDocIds.length === 0) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let latestStatuses: Record<string, string> = {}
    let latestErrors: Record<string, string> = {}
    const startedAt = Date.now()

    const isFinalStatus = (status: string) =>
      status === 'analyzed' || status === 'extracted' || status === 'failed'

    const transitionToConfirm = (statuses: Record<string, string>) => {
      if (cancelled) return
      const createdCount = analysingState.completedClients.length
      const failedClientCount = failedClients.length
      const filesUploaded = analysingState.completedClients.reduce((s, c) => s + c.filesUploaded, 0)
      const filesFailed = analysingState.completedClients.reduce((s, c) => s + c.filesFailed, 0)

      // Final progress update
      setAnalysisProgress({
        total: analysingState.allDocIds.length,
        completed: analysingState.allDocIds.length,
        statuses,
      })
      setCompleted({
        clientsCreated: createdCount,
        clientsFailed: failedClientCount,
        filesUploaded,
        filesFailed,
        completedClients: analysingState.completedClients,
        errors: analysingState.errors,
      })
      setPhase('confirm')
    }

    const runExtractionBatches = async () => {
      const ids = analysingState.allDocIds
      for (let i = 0; i < ids.length; i += EXTRACT_BATCH_SIZE) {
        if (cancelled) return
        const batch = ids.slice(i, i + EXTRACT_BATCH_SIZE)
        try {
          await fetch('/api/documents/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds: batch }),
          }).then((r) => r.json().catch(() => null))
        } catch {
          // Ignore batch errors; polling will surface final statuses
        }
      }
    }

    // 2. Poll for live progress while extraction runs
    const poll = async () => {
      if (cancelled) return
      try {
        const responses = await Promise.all(
          analysingState.allDocIds.map((id) =>
            fetch(`/api/documents/${id}`)
              .then((r) => r.json())
              .then((d) => ({
                id,
                status: d.status || 'pending',
                error: d.metadata?.extraction_error || d.metadata?.ai_error || '',
              }))
              .catch(() => ({ id, status: 'pending', error: '' }))
          )
        )

        if (cancelled) return

        const statuses: Record<string, string> = {}
        let completedCount = 0
        const errors: Record<string, string> = {}
        for (const { id, status, error } of responses) {
          statuses[id] = status
          if (isFinalStatus(status)) {
            completedCount++
          }
          if (status === 'failed' && error) {
            errors[id] = error
          }
        }

        latestStatuses = { ...latestStatuses, ...statuses }
        if (Object.keys(errors).length > 0) {
          latestErrors = { ...latestErrors, ...errors }
        }
        for (const { id, status } of responses) {
          if (status !== 'failed') {
            delete latestErrors[id]
          }
        }

        setAnalysisProgress({
          total: analysingState.allDocIds.length,
          completed: completedCount,
          statuses: latestStatuses,
        })
        setAnalysisErrors({ ...latestErrors })

        // If polling detects all docs finished
        if (completedCount >= analysingState.allDocIds.length) {
          transitionToConfirm(latestStatuses)
          return
        }
      } catch {
        // Keep polling; extraction batches continue independently
      }

      // Stop waiting after a reasonable time
      if (Date.now() - startedAt >= MAX_ANALYSIS_WAIT_MS) {
        const statuses: Record<string, string> = {}
        for (const id of analysingState.allDocIds) {
          statuses[id] = latestStatuses[id] || 'failed'
          if (!isFinalStatus(statuses[id])) statuses[id] = 'failed'
        }
        transitionToConfirm({ ...latestStatuses, ...statuses })
        return
      }

      pollTimer = setTimeout(poll, ANALYSIS_POLL_INTERVAL_MS)
    }

    runExtractionBatches()
    pollTimer = setTimeout(poll, ANALYSIS_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [phase, analysingState, failedClients])

  useEffect(() => {
    if (phase !== 'confirm' || !analysingState || profilePopulationRef.current) return

    const candidates = analysingState.completedClients.filter(
      (client) => client.uploadedDocumentIds.length > 0
    )

    if (candidates.length === 0) return

    profilePopulationRef.current = true
    let cancelled = false

    setProfilePopulation((prev) => {
      const next = { ...prev }
      for (const client of candidates) {
        next[client.clientId] = { status: 'running' }
      }
      return next
    })

    const run = async () => {
      for (const client of candidates) {
        if (cancelled) return
        try {
          const response = await fetch(`/api/clients/${client.clientId}/populate-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds: client.uploadedDocumentIds }),
          })

          if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data?.error || 'Failed to populate profile')
          }

          if (cancelled) return
          setProfilePopulation((prev) => ({
            ...prev,
            [client.clientId]: { status: 'success' },
          }))
        } catch (err) {
          if (cancelled) return
          setProfilePopulation((prev) => ({
            ...prev,
            [client.clientId]: {
              status: 'failed',
              error: err instanceof Error ? err.message : 'Failed to populate profile',
            },
          }))
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [phase, analysingState])

  const handleCompleteFromConfirm = useCallback(() => {
    setPhase('complete')
  }, [])

  const handleReturnToConfirm = useCallback(() => {
    if (analysingState) {
      setPhase('confirm')
    }
  }, [analysingState])

  const handleRetryFailed = useCallback(() => {
    if (!analysisProgress || !analysingState) return
    const failedDocIds = Object.entries(analysisProgress.statuses)
      .filter(([, status]) => status === 'failed')
      .map(([id]) => id)

    if (failedDocIds.length === 0) return

    profilePopulationRef.current = false
    setProfilePopulation({})

    setAnalysisProgress((prev) => {
      if (!prev) return prev
      const nextStatuses = { ...prev.statuses }
      for (const id of failedDocIds) {
        nextStatuses[id] = 'pending'
      }
      return {
        total: failedDocIds.length,
        completed: 0,
        statuses: nextStatuses,
      }
    })

    setAnalysisErrors((prev) => {
      const next = { ...prev }
      for (const id of failedDocIds) {
        delete next[id]
      }
      return next
    })

    setAnalysingState((prev) =>
      prev ? { ...prev, allDocIds: failedDocIds } : prev
    )
    setPhase('analysing')
  }, [analysisProgress, analysingState])

  const handleReupload = useCallback(async (params: {
    clientId: string
    clientRef: string
    failedFileName: string
    file: File
  }) => {
    const { clientId, clientRef, failedFileName, file } = params
    const key = `${clientId}:${failedFileName}`
    setReuploadStatus((prev) => ({ ...prev, [key]: { status: 'uploading' } }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name || failedFileName)
    formData.append('client_id', clientId)

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Upload failed')
      }

      setReuploadStatus((prev) => ({ ...prev, [key]: { status: 'success' } }))

      setCompleted((prev) => {
        if (!prev) return prev
        const nextErrors = prev.errors.filter(
          (err) =>
            !(
              err.type === 'file-upload' &&
              err.clientRef === clientRef &&
              err.fileName === failedFileName
            )
        )
        const nextCompletedClients = prev.completedClients.map((client) => {
          if (client.clientId !== clientId) return client
          return {
            ...client,
            filesUploaded: client.filesUploaded + 1,
            filesFailed: Math.max(0, client.filesFailed - 1),
            fileNames: [...client.fileNames, file.name || failedFileName],
            uploadedDocumentIds: data.document?.id
              ? [...client.uploadedDocumentIds, data.document.id]
              : client.uploadedDocumentIds,
          }
        })
        return {
          ...prev,
          errors: nextErrors,
          completedClients: nextCompletedClients,
          filesUploaded: prev.filesUploaded + 1,
          filesFailed: Math.max(0, prev.filesFailed - 1),
        }
      })
    } catch (err) {
      setReuploadStatus((prev) => ({
        ...prev,
        [key]: {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed',
        },
      }))
    }
  }, [])

  const profilePopulationEntries = useMemo(() => {
    if (!analysingState) return [] as Array<
      ProfilePopulationEntry & { clientRef: string; clientId: string }
    >
    return analysingState.completedClients
      .map((client) => {
        const entry = profilePopulation[client.clientId]
        if (!entry) return null
        return { ...entry, clientRef: client.clientRef, clientId: client.clientId }
      })
      .filter(
        (entry): entry is ProfilePopulationEntry & { clientRef: string; clientId: string } =>
          Boolean(entry)
      )
  }, [analysingState, profilePopulation])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Client Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select a folder to create clients and upload their documents in bulk.
        </p>
      </div>

      {/* Phase indicator */}
      <div className="mb-6 flex items-center gap-2 text-sm flex-wrap">
        {(['upload', 'review', 'processing', 'analysing', 'confirm', 'complete'] as BulkSetupPhase[]).map(
          (p, i) => {
            const phaseOrder: BulkSetupPhase[] = ['upload', 'review', 'processing', 'analysing', 'confirm', 'complete']
            const currentIdx = phaseOrder.indexOf(phase)
            const stepIdx = i
            const isPast = stepIdx < currentIdx
            const isCurrent = phase === p

            return (
              <div key={p} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`w-8 h-px ${isPast || isCurrent ? 'bg-blue-400' : 'bg-gray-300'}`}
                  />
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-700'
                      : isPast
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isPast ? <Check className="h-3 w-3" /> : null}
                  {p === 'upload'
                    ? 'Select Folder'
                    : p === 'review'
                      ? 'Review'
                      : p === 'processing'
                        ? 'Processing'
                        : p === 'analysing'
                          ? 'Analysing'
                          : p === 'confirm'
                            ? 'Confirm'
                            : 'Complete'}
                </span>
              </div>
            )
          }
        )}
      </div>

      {/* Upload Phase */}
      {phase === 'upload' && (
        <FolderDropZone onParsed={handleFoldersParsed} />
      )}

      {/* Review Phase */}
      {phase === 'review' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <span className="text-sm text-gray-500">
                {clients.length} client{clients.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={!allValid || isSubmitting}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                allValid && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Processing...' : 'Confirm & Process'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    First Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Client Ref
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">
                    Files
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, idx) => {
                  const isExpanded = expandedRows.has(client.id)
                  const unsupportedCount = client.files.filter(
                    (f) => !f.isSupported
                  ).length

                  return (
                    <ClientRow
                      key={client.id}
                      client={client}
                      index={idx}
                      isExpanded={isExpanded}
                      unsupportedCount={unsupportedCount}
                      onUpdate={updateClient}
                      onRemove={removeClient}
                      onToggle={toggleRow}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          {!allValid && (
            <p className="mt-2 text-xs text-red-500">
              Fix all validation errors before proceeding.
            </p>
          )}
        </div>
      )}

      {/* Processing Phase */}
      {phase === 'processing' && processing && (
        <div className="bg-white border border-gray-200 rounded-lg p-8" aria-live="polite" aria-busy="true">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {processing.phase === 'creating-clients'
                ? 'Creating Clients...'
                : 'Uploading Files...'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {processing.phase === 'creating-clients'
                ? `${processing.clientsProcessed} / ${processing.clientsTotal} clients`
                : `${processing.currentClient} — ${processing.currentFile}`}
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-md">
              {processing.phase === 'creating-clients' ? (
                <div
                  className="w-full bg-gray-200 rounded-full h-2"
                  role="progressbar"
                  aria-valuenow={processing.clientsProcessed}
                  aria-valuemin={0}
                  aria-valuemax={processing.clientsTotal}
                  aria-label="Client creation progress"
                >
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        processing.clientsTotal > 0
                          ? (processing.clientsProcessed /
                              processing.clientsTotal) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-full bg-gray-200 rounded-full h-2"
                  role="progressbar"
                  aria-valuenow={processing.filesProcessed}
                  aria-valuemin={0}
                  aria-valuemax={processing.filesTotal}
                  aria-label="File upload progress"
                >
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        processing.filesTotal > 0
                          ? (processing.filesProcessed /
                              processing.filesTotal) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 text-center">
                {processing.phase === 'uploading-files'
                  ? `${processing.filesProcessed} / ${processing.filesTotal} files`
                  : 'Please wait...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysing Phase */}
      {phase === 'analysing' && analysingState && analysisProgress && (
        <div className="bg-white border border-gray-200 rounded-lg p-8" aria-live="polite" aria-busy="true">
          <div className="flex flex-col items-center mb-6">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Analysing Documents...</h2>
            <p className="text-sm text-gray-500">
              {analysisProgress.completed} / {analysisProgress.total} documents processed
            </p>
            {analysisProgress.total < analysingState.completedClients.reduce((s, c) => s + c.uploadedDocumentIds.length, 0) && (
              <p className="text-xs text-gray-400 mt-1">
                Retrying failed documents
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto mb-8">
            <div
              className="w-full bg-gray-200 rounded-full h-2"
              role="progressbar"
              aria-valuenow={analysisProgress.completed}
              aria-valuemin={0}
              aria-valuemax={analysisProgress.total}
              aria-label="Document analysis progress"
            >
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    analysisProgress.total > 0
                      ? (analysisProgress.completed / analysisProgress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              {analysisProgress.completed === 0
                ? 'Estimating time remaining...'
                : analysisProgress.completed >= analysisProgress.total
                  ? 'Time remaining: 0s'
                  : `Estimated time remaining: ${formatDuration(
                      ((analysisProgress.total - analysisProgress.completed) /
                        Math.max(analysisProgress.completed, 1)) *
                        Math.max(Date.now() - (analysisStartRef.current || Date.now()), 1)
                    )}`}
            </p>
          </div>

          {/* Per-client file status list */}
          <div className="space-y-4">
            {analysingState.completedClients.map((client) => (
              <div key={client.clientId} className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">{client.clientRef}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {client.filesUploaded} file{client.filesUploaded !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="px-4 py-2 space-y-1.5">
                  {client.uploadedDocumentIds.map((docId, idx) => {
                    const status = analysisProgress.statuses[docId] || 'pending'
                    const error = analysisErrors[docId]
                    return (
                      <div key={docId} className="flex items-start gap-2 text-sm">
                        {status === 'pending' || status === 'processing' ? (
                          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin flex-shrink-0" />
                        ) : status === 'analyzed' ? (
                          <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        ) : status === 'extracted' ? (
                          <FileType className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-600 truncate">
                            {client.fileNames[idx] || `Document ${idx + 1}`}
                          </div>
                          {status === 'failed' && error ? (
                            <div className="text-xs text-red-600 truncate" title={error}>
                              {error}
                            </div>
                          ) : null}
                        </div>
                        <span className={`ml-auto text-xs ${
                          status === 'analyzed' ? 'text-green-600' :
                          status === 'extracted' ? 'text-yellow-600' :
                          status === 'failed' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {status === 'pending' ? 'Pending' :
                           status === 'processing' ? 'Processing...' :
                           status === 'analyzed' ? 'Analysed' :
                           status === 'extracted' ? 'Text Extracted' :
                           'Failed'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Phase */}
      {phase === 'confirm' && analysingState && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review Analysed Documents</h2>
                <p className="text-sm text-gray-500">
                  Click &ldquo;Preview&rdquo; on any document to review the original alongside extracted content.
                </p>
              </div>
            </div>
            {profilePopulationEntries.length > 0 && (
              <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-sm font-semibold text-indigo-900">Profile auto-fill</p>
                <p className="mt-1 text-xs text-indigo-800">
                  Missing client profile fields are being populated from analysed documents. This runs once for clients
                  created in this bulk upload.
                </p>
                <div className="mt-2 space-y-1">
                  {profilePopulationEntries.map((entry) => {
                    const statusLabel =
                      entry.status === 'running' ? 'In progress' : entry.status === 'success' ? 'Complete' : 'Failed'
                    const statusClass =
                      entry.status === 'running'
                        ? 'bg-blue-100 text-blue-700'
                        : entry.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    return (
                      <div key={entry.clientId} className="text-xs text-indigo-900">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{entry.clientRef}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {entry.status === 'failed' && entry.error ? (
                          <div className="mt-1 text-[11px] text-red-600">{entry.error}</div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {analysisProgress && Object.values(analysisProgress.statuses).some((s) => s === 'failed') && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Some documents failed analysis.
                </div>
                <button
                  onClick={handleRetryFailed}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry failed
                </button>
              </div>
            )}

            {/* Per-client expandable sections */}
            <div className="space-y-3">
              {analysingState.completedClients.map((client) => {
                const isExpanded = confirmExpandedRows.has(client.clientId)
                return (
                  <div key={client.clientId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setConfirmExpandedRows((prev) => {
                          const next = new Set(prev)
                          if (next.has(client.clientId)) next.delete(client.clientId)
                          else next.add(client.clientId)
                          return next
                        })
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{client.clientRef}</span>
                        <span className="text-xs text-gray-400">
                          {client.filesUploaded} file{client.filesUploaded !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {client.uploadedDocumentIds.map((docId, idx) => {
                          const status = analysisProgress?.statuses[docId] || 'pending'
                          const error = analysisErrors[docId]
                          return (
                            <div key={docId} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
                              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-700 truncate">
                                  {client.fileNames[idx] || `Document ${idx + 1}`}
                                </div>
                                {status === 'failed' && error ? (
                                  <div className="text-xs text-red-600 truncate" title={error}>
                                    {error}
                                  </div>
                                ) : null}
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                status === 'analyzed' ? 'bg-green-100 text-green-700' :
                                status === 'extracted' ? 'bg-yellow-100 text-yellow-700' :
                                status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {status === 'analyzed' ? 'Analysed' :
                                 status === 'extracted' ? 'Text Only' :
                                 status === 'failed' ? 'Failed' : 'Pending'}
                              </span>
                              <button
                                onClick={() => setPreviewDoc(docId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                                Preview
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Complete button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCompleteFromConfirm}
                className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700"
              >
                <Check className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal documentId={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Complete Phase */}
      {phase === 'complete' && completed && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              {completed.clientsFailed === 0 && completed.filesFailed === 0 ? (
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-green-700">
                  {completed.clientsFailed === 0
                    ? 'Setup Complete'
                    : 'Setup Complete with Errors'}
                </h2>
                <p className="text-sm text-gray-500">
                  {completed.clientsCreated} client
                  {completed.clientsCreated !== 1 ? 's' : ''} created,{' '}
                  {completed.filesUploaded} file
                  {completed.filesUploaded !== 1 ? 's' : ''} uploaded
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {completed.clientsCreated}
                </p>
                <p className="text-xs text-green-600">Clients Created</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {completed.filesUploaded}
                </p>
                <p className="text-xs text-blue-600">Files Uploaded</p>
              </div>
              {completed.clientsFailed > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">
                    {completed.clientsFailed}
                  </p>
                  <p className="text-xs text-red-600">Clients Failed</p>
                </div>
              )}
              {completed.filesFailed > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-700">
                    {completed.filesFailed}
                  </p>
                  <p className="text-xs text-yellow-600">Files Failed</p>
                </div>
              )}
            </div>

            <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-blue-900">Next steps</p>
              <p className="mt-1 text-sm text-blue-800">
                Open the client documents page to review the uploads and continue with the file review. The File Review
                button is available in the Uploaded tab once analysis is complete. If you need to revisit the analysed
                document list, select Review Analysed Documents below.
              </p>
            </div>
            {profilePopulationEntries.length > 0 && (
              <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-sm font-semibold text-indigo-900">Profile auto-fill status</p>
                <p className="mt-1 text-xs text-indigo-800">
                  Client profiles are being populated from analysed documents. Fields are only filled when missing.
                </p>
                <div className="mt-2 space-y-1">
                  {profilePopulationEntries.map((entry) => {
                    const statusLabel =
                      entry.status === 'running' ? 'In progress' : entry.status === 'success' ? 'Complete' : 'Failed'
                    const statusClass =
                      entry.status === 'running'
                        ? 'bg-blue-100 text-blue-700'
                        : entry.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    return (
                      <div key={entry.clientId} className="text-xs text-indigo-900">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{entry.clientRef}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {entry.status === 'failed' && entry.error ? (
                          <div className="mt-1 text-[11px] text-red-600">{entry.error}</div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error list */}
            {completed.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Errors ({completed.errors.length})
                </h3>
                <div className="max-h-48 overflow-y-auto border border-red-100 rounded-lg">
                  {completed.errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2 text-xs border-b border-red-50 last:border-0"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-red-700">
                          {err.clientRef}
                        </span>
                        {err.fileName && (
                          <span className="text-red-500"> / {err.fileName}</span>
                        )}
                        <span className="text-red-500"> — {err.error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {analysingState && (
                <button
                  onClick={handleReturnToConfirm}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Review Analysed Documents
                </button>
              )}
              {/* View Documents links per client */}
              {completed.completedClients.length === 1 ? (
                <button
                  onClick={() =>
                    router.push(`/clients/${completed.completedClients[0].clientId}?tab=documents&from=bulk&clientRef=${encodeURIComponent(completed.completedClients[0].clientRef)}`)
                  }
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Go to Client Documents
                </button>
              ) : completed.completedClients.length > 1 ? (
                <div className="flex items-center gap-2">
                  {completed.completedClients.slice(0, 3).map((c) => (
                    <button
                      key={c.clientId}
                      onClick={() =>
                        router.push(`/clients/${c.clientId}?tab=documents&from=bulk&clientRef=${encodeURIComponent(c.clientRef)}`)
                      }
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {c.clientRef}
                    </button>
                  ))}
                  {completed.completedClients.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{completed.completedClients.length - 3} more
                    </span>
                  )}
                </div>
              ) : null}
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Start New Bulk Upload
              </button>
              {failedClients.length > 0 && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Failed ({failedClients.length})
                </button>
              )}
              <button
                onClick={() => router.push('/clients')}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                View All Clients
              </button>
            </div>
          </div>

          {/* Per-client results with expandable file list */}
          {completed.completedClients.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">
                  Created Clients
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Client Ref
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Files Uploaded
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completed.completedClients.map((c) => {
                    const failedFiles = completed.errors.filter(
                      (err) => err.type === 'file-upload' && err.clientRef === c.clientRef && err.fileName
                    )
                    return (
                      <CompletedClientRow
                        key={c.clientId}
                        client={c}
                        failedFiles={failedFiles}
                        onReupload={handleReupload}
                        reuploadStatus={reuploadStatus}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Completed Client Row (with expandable file list) ─────────────

function CompletedClientRow({
  client: c,
  failedFiles,
  onReupload,
  reuploadStatus,
}: {
  client: CompletedClient
  failedFiles: Array<{ fileName?: string; error: string }>
  onReupload: (params: {
    clientId: string
    clientRef: string
    failedFileName: string
    file: File
  }) => void
  reuploadStatus: Record<string, ReuploadEntry>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr className="border-b border-gray-100">
        <td className="px-4 py-2 font-medium text-gray-900">
          {c.clientRef}
        </td>
        <td className="px-4 py-2">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <span>{c.filesUploaded}</span>
            {c.filesFailed > 0 && (
              <span className="text-red-500 ml-1">
                ({c.filesFailed} failed)
              </span>
            )}
          </button>
        </td>
        <td className="px-4 py-2">
          {c.filesFailed === 0 ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <Check className="h-3.5 w-3.5" /> OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Partial
            </span>
          )}
        </td>
      </tr>
      {open && (c.fileNames.length > 0 || failedFiles.length > 0) && (
        <tr>
          <td colSpan={3} className="px-4 py-2 bg-gray-50">
            <div className="pl-4 space-y-2 max-h-64 overflow-y-auto">
              {c.fileNames.length > 0 && (
                <div className="space-y-1">
                  {c.fileNames.map((name, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              )}
              {failedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] uppercase text-red-500 font-semibold">Failed uploads</p>
                  {failedFiles.map((failed) => {
                    const failedName = failed.fileName || 'Unknown file'
                    const key = `${c.clientId}:${failedName}`
                    const status = reuploadStatus[key]
                    const statusLabel =
                      status?.status === 'uploading'
                        ? 'Uploading...'
                        : status?.status === 'success'
                          ? 'Uploaded'
                          : status?.status === 'failed'
                            ? 'Retry'
                            : 'Re-upload'
                    return (
                      <div key={failedName} className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="text-red-600 font-medium truncate">{failedName}</div>
                          <div className="text-red-500 truncate">{failed.error}</div>
                          {status?.status === 'failed' && status.error && (
                            <div className="text-red-500">{status.error}</div>
                          )}
                        </div>
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-white text-red-600 cursor-pointer hover:bg-red-50">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xlsx,.msg,.eml,.txt,.png,.jpg,.jpeg,.gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              e.currentTarget.value = ''
                              if (!file) return
                              onReupload({
                                clientId: c.clientId,
                                clientRef: c.clientRef,
                                failedFileName: failedName,
                                file,
                              })
                            }}
                          />
                          {statusLabel}
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Client Row sub-component ─────────────────────────────────────

interface ClientRowProps {
  client: ReviewedClient
  index: number
  isExpanded: boolean
  unsupportedCount: number
  onUpdate: (id: string, field: keyof ReviewedClient, value: string) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
}

function ClientRow({
  client,
  index,
  isExpanded,
  unsupportedCount,
  onUpdate,
  onRemove,
  onToggle,
}: ClientRowProps) {
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-3 py-2 text-gray-500">{index + 1}</td>
        <td className="px-3 py-1">
          <input
            type="text"
            value={client.lastName}
            onChange={(e) => onUpdate(client.id, 'lastName', e.target.value)}
            aria-label="Last name"
            aria-invalid={!!client.errors.lastName}
            aria-describedby={client.errors.lastName ? `err-ln-${client.id}` : undefined}
            className={`w-full px-2 py-1 text-sm border rounded ${
              client.errors.lastName
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200'
            }`}
            placeholder="Last name"
          />
          {client.errors.lastName && (
            <p id={`err-ln-${client.id}`} className="text-xs text-red-500 mt-0.5" role="alert">
              {client.errors.lastName}
            </p>
          )}
        </td>
        <td className="px-3 py-1">
          <input
            type="text"
            value={client.firstName}
            onChange={(e) => onUpdate(client.id, 'firstName', e.target.value)}
            aria-label="First name"
            aria-invalid={!!client.errors.firstName}
            aria-describedby={client.errors.firstName ? `err-fn-${client.id}` : undefined}
            className={`w-full px-2 py-1 text-sm border rounded ${
              client.errors.firstName
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200'
            }`}
            placeholder="First name"
          />
          {client.errors.firstName && (
            <p id={`err-fn-${client.id}`} className="text-xs text-red-500 mt-0.5" role="alert">
              {client.errors.firstName}
            </p>
          )}
        </td>
        <td className="px-3 py-1">
          <input
            type="email"
            value={client.email}
            onChange={(e) => onUpdate(client.id, 'email', e.target.value)}
            aria-label="Email"
            aria-invalid={!!client.errors.email}
            aria-describedby={client.errors.email ? `err-em-${client.id}` : undefined}
            className={`w-full px-2 py-1 text-sm border rounded ${
              client.errors.email
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200'
            }`}
            placeholder="Email (optional)"
          />
          {client.errors.email && (
            <p id={`err-em-${client.id}`} className="text-xs text-red-500 mt-0.5" role="alert">
              {client.errors.email}
            </p>
          )}
        </td>
        <td className="px-3 py-1">
          <input
            type="text"
            value={client.clientRef}
            onChange={(e) => onUpdate(client.id, 'clientRef', e.target.value)}
            aria-label="Client reference"
            aria-invalid={!!client.errors.clientRef}
            aria-describedby={client.errors.clientRef ? `err-cr-${client.id}` : undefined}
            className={`w-full px-2 py-1 text-sm border rounded font-mono ${
              client.errors.clientRef
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200'
            }`}
            placeholder="Client ref"
          />
          {client.errors.clientRef && (
            <p id={`err-cr-${client.id}`} className="text-xs text-red-500 mt-0.5" role="alert">
              {client.errors.clientRef}
            </p>
          )}
        </td>
        <td className="px-3 py-2">
          <button
            onClick={() => onToggle(client.id)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <span className="text-sm">{client.files.length}</span>
            {unsupportedCount > 0 && (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            )}
          </button>
        </td>
        <td className="px-3 py-2">
          <button
            onClick={() => onRemove(client.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Remove client"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {/* Expanded file list */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-3 py-2 bg-gray-50">
            <div className="pl-6 space-y-1 max-h-48 overflow-y-auto">
              {client.files.map((file, fi) => (
                <div
                  key={fi}
                  className="flex items-center gap-2 text-xs text-gray-600"
                >
                  <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-gray-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  {!file.isSupported && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      Unsupported
                    </span>
                  )}
                </div>
              ))}
              {unsupportedCount > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {unsupportedCount} unsupported file
                  {unsupportedCount !== 1 ? 's' : ''} will be skipped during
                  upload.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
