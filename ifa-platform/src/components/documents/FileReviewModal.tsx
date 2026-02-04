"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { X, Loader2, Clipboard, Save, FileText, Download, CheckCircle2 } from 'lucide-react'
import { renderMarkdown } from '@/lib/documents/markdownRenderer'
import { generateFileReviewPDF, generateFileReviewDOCX } from '@/lib/documents/fileReviewExport'
import { useCreateTask } from '@/modules/tasks/hooks/useTasks'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import type { SuggestedTask } from '@/lib/documents/fileReviewGenerator'

interface FileReviewMetadata {
  documentsAnalyzed: number
  totalDocuments?: number
  provider: string
  averageConfidence?: number
  generatedAt: string
}

const PROGRESS_STAGES = [
  { label: 'Connecting to intelligence engine', threshold: 0 },
  { label: 'Loading client profile', threshold: 5 },
  { label: 'Fetching documents', threshold: 10 },
  { label: 'Extracting document data', threshold: 18 },
  { label: 'Analysing document content', threshold: 30 },
  { label: 'Building file review', threshold: 50 },
  { label: 'Generating compliance summary', threshold: 70 },
  { label: 'Formatting output', threshold: 90 },
]

interface WorkflowStep {
  id: string
  label: string
  done: boolean
  completedAt?: string | null
}

interface FileReviewResponse {
  success: boolean
  review?: string
  metadata?: FileReviewMetadata
  suggestedTasks?: SuggestedTask[]
  error?: string
}

type ReviewState = 'idle' | 'generating' | 'reviewing' | 'saving' | 'saved' | 'error'

interface FileReviewModalProps {
  clientId: string
  clientName: string
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export function FileReviewModal({ clientId, clientName, isOpen, onClose, onSaved }: FileReviewModalProps) {
  const [state, setState] = useState<ReviewState>('idle')
  const [review, setReview] = useState('')
  const [metadata, setMetadata] = useState<FileReviewMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [existingReviewInfo, setExistingReviewInfo] = useState<{
    id: string
    generatedAt?: string
  } | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<string>>(new Set())
  const [taskError, setTaskError] = useState<string | null>(null)
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null)
  const [creatingTasks, setCreatingTasks] = useState(false)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const autoSaveTriggeredRef = useRef(false)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const reviewRef = useRef(review)
  reviewRef.current = review
  const metadataRef = useRef(metadata)
  metadataRef.current = metadata
  const savedDocumentIdRef = useRef(savedDocumentId)
  savedDocumentIdRef.current = savedDocumentId
  const performSaveRef = useRef<typeof performSave>(null as any)
  const buildWorkflowStepsRef = useRef<typeof buildWorkflowSteps>(null as any)
  const [workflowUpdatingId, setWorkflowUpdatingId] = useState<string | null>(null)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [showScheduleOptions, setShowScheduleOptions] = useState(false)
  const [scheduleNextReview, setScheduleNextReview] = useState(true)
  const [nextReviewDate, setNextReviewDate] = useState('')
  const [reviewType, setReviewType] = useState('annual')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [contactMissing, setContactMissing] = useState(false)
  const [contactChecked, setContactChecked] = useState(false)
  const createTask = useCreateTask()
  const { toast } = useToast()

  const getDefaultReviewDate = useCallback(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toISOString().split('T')[0]
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setState('idle')
      setReview('')
      setMetadata(null)
      setError(null)
      setLoadingExisting(false)
      setExistingReviewInfo(null)
      setSuggestedTasks([])
      setSelectedTaskIds(new Set())
      setCreatedTaskIds(new Set())
      setTaskError(null)
      setTaskSuccess(null)
      setWorkflowSteps([])
      setSavedDocumentId(null)
      setWorkflowUpdatingId(null)
      setWorkflowError(null)
      setShowScheduleOptions(false)
      setScheduleNextReview(true)
      setNextReviewDate('')
      setReviewType('annual')
      setScheduleError(null)
      setContactMissing(false)
      setContactChecked(false)
      autoSaveTriggeredRef.current = false
      return
    }

    const startGeneration = (signal: AbortSignal) => {
      let cancelled = false
      setState('generating')
      setError(null)
      setElapsedSeconds(0)

      fetch(`/api/clients/${clientId}/file-review`, { method: 'POST', signal })
        .then((res) => {
          if (cancelled) return null
          return res.json()
        })
        .then((data: FileReviewResponse | null) => {
          if (cancelled || !data) return
          if (!data.success || !data.review) {
            setError(data.error || 'Failed to generate file review')
            setState('error')
            return
          }
          setReview(data.review)
          setMetadata(data.metadata || null)
          const tasks = data.suggestedTasks || []
          setSuggestedTasks(tasks)
          setSelectedTaskIds(
            new Set(tasks.filter((task) => task.source === 'deterministic').map((task) => task.id))
          )
          setState('reviewing')
        })
        .catch((err) => {
          if (cancelled) return
          if (err?.name === 'AbortError') return
          setError('Failed to generate file review')
          setState('error')
        })

      return () => {
        cancelled = true
      }
    }

    setShowScheduleOptions(false)
    setScheduleNextReview(true)
    setNextReviewDate((prev) => prev || getDefaultReviewDate())
    setReviewType('annual')
    setScheduleError(null)

    const controller = new AbortController()
    let cancelled = false

    const loadExistingReview = async () => {
      setLoadingExisting(true)
      try {
        const res = await fetch(`/api/documents/client/${clientId}`, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) {
          return null
        }
        const docs = (data.documents || []) as Array<any>
        const reviews = docs.filter((d: any) =>
          d?.metadata?.type === 'file_review' ||
          d?.type === 'file_review' ||
          (typeof d?.name === 'string' && d.name.startsWith('File Review -'))
        )
        if (reviews.length === 0) return null
        reviews.sort((a: any, b: any) => {
          const aDate = new Date(a.metadata?.generatedAt || a.created_at || 0).getTime()
          const bDate = new Date(b.metadata?.generatedAt || b.created_at || 0).getTime()
          return bDate - aDate
        })
        const latest = reviews[0]
        const reviewMarkdown = latest?.metadata?.reviewMarkdown
        if (!reviewMarkdown) {
          return null
        }
        return latest
      } catch {
        return null
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }

    loadExistingReview().then((latest) => {
      if (cancelled) return
      if (latest) {
        setReview(latest.metadata?.reviewMarkdown || '')
        setMetadata({
          documentsAnalyzed: latest.metadata?.documentsAnalyzed || 0,
          totalDocuments: latest.metadata?.totalDocuments || 0,
          provider: latest.metadata?.aiProvider || 'deepseek',
          averageConfidence: latest.metadata?.averageConfidence,
          generatedAt: latest.metadata?.generatedAt || latest.created_at,
        })
        setWorkflowSteps(latest.metadata?.workflow?.steps || [])
        setSavedDocumentId(latest.id)
        setExistingReviewInfo({
          id: latest.id,
          generatedAt: latest.metadata?.generatedAt || latest.created_at,
        })
        setState('saved')
        return
      }

      startGeneration(controller.signal)
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [clientId, isOpen, getDefaultReviewDate])

  useEffect(() => {
    if (!isOpen || !clientId) return
    let cancelled = false
    setContactChecked(false)

    fetch(`/api/clients/${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (!data?.success || !data?.client) {
          setContactMissing(false)
          setContactChecked(true)
          return
        }
        const contact = data.client.contact_info || {}
        const address = contact.address || {}
        const hasEmail = Boolean(contact.email)
        const hasPhone = Boolean(contact.phone || contact.mobile)
        const hasAddress = Boolean(address.line1 || address.postcode || address.city)
        setContactMissing(!hasEmail || !hasPhone || !hasAddress)
        setContactChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setContactMissing(false)
        setContactChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [clientId, isOpen])

  useEffect(() => {
    if (state !== 'generating') return
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [state])

  useEffect(() => {
    if (suggestedTasks.length === 0) return
    setSelectedTaskIds((prev) => {
      if (prev.size > 0) return prev
      const deterministic = suggestedTasks
        .filter((task) => task.source === 'deterministic')
        .map((task) => task.id)
      return new Set(deterministic)
    })
  }, [suggestedTasks])

  const renderedReview = useMemo(() => renderMarkdown(review), [review])
  const selectableTasks = useMemo(
    () => suggestedTasks.filter((task) => !createdTaskIds.has(task.id)),
    [suggestedTasks, createdTaskIds]
  )
  const selectedCount = useMemo(() => {
    let count = 0
    selectedTaskIds.forEach((id) => {
      if (!createdTaskIds.has(id)) count += 1
    })
    return count
  }, [selectedTaskIds, createdTaskIds])
  const allSelected = selectableTasks.length > 0 && selectedCount === selectableTasks.length
  const workflowLinks = useMemo(() => ({
    suitability: `/assessments/suitability?clientId=${clientId}`,
    atr: `/assessments/atr?clientId=${clientId}`,
    cfl: `/assessments/cfl?clientId=${clientId}`,
  }), [clientId])

  const getCurrentStage = useCallback(() => {
    for (let s = PROGRESS_STAGES.length - 1; s >= 0; s--) {
      if (elapsedSeconds >= PROGRESS_STAGES[s].threshold) return s
    }
    return 0
  }, [elapsedSeconds])

  const currentStageIdx = getCurrentStage()
  const progressPercent = Math.min(95, Math.round((elapsedSeconds / 120) * 100))

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!review) return
    try {
      await navigator.clipboard.writeText(review)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text if clipboard API fails
    }
  }

  const buildWorkflowSteps = useCallback((markReviewComplete: boolean): WorkflowStep[] => {
    const steps: WorkflowStep[] = []
    const now = new Date().toISOString()
    steps.push({
      id: 'review_complete',
      label: 'File review completed',
      done: markReviewComplete,
      completedAt: markReviewComplete ? now : undefined,
    })

    const hasDeterministicId = (taskId: string) =>
      suggestedTasks.some((task) => task.id === taskId)

    if (hasDeterministicId('det_suitability')) {
      steps.push({ id: 'suitability', label: 'Complete suitability report', done: false })
    }
    if (hasDeterministicId('det_atr')) {
      steps.push({ id: 'atr', label: 'Complete ATR assessment', done: false })
    }
    if (hasDeterministicId('det_cfl')) {
      steps.push({ id: 'cfl', label: 'Complete CFL assessment', done: false })
    }

    steps.push({ id: 'send_to_client', label: 'Send to client', done: false })
    return steps
  }, [suggestedTasks])

  const performSave = useCallback(async (
    reviewContent: string,
    reviewMetadata: FileReviewMetadata | null,
    existingDocId?: string | null
  ): Promise<string | null> => {
    if (!reviewContent) return null

    const dateLabel = new Date().toLocaleDateString('en-GB')
    const title = `File Review - ${clientName} - ${dateLabel}`
    const workflow = { steps: buildWorkflowSteps(true) }

    const metadataPayload = {
      type: 'file_review',
      documentsAnalyzed: reviewMetadata?.documentsAnalyzed || 0,
      totalDocuments: reviewMetadata?.totalDocuments || 0,
      generatedAt: reviewMetadata?.generatedAt || new Date().toISOString(),
      aiProvider: reviewMetadata?.provider || 'deepseek',
      contentFormat: 'markdown',
      reviewMarkdown: reviewContent,
      workflow,
    }

    if (existingDocId) {
      const res = await fetch(`/api/documents/${existingDocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, metadata: metadataPayload }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update review')
      return existingDocId
    }

    const res = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: reviewContent,
        title,
        clientId,
        format: 'html',
        metadata: metadataPayload,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success || !data.document?.id) throw new Error(data.error || 'Failed to save review')
    return data.document.id
  }, [clientName, clientId, buildWorkflowSteps])

  performSaveRef.current = performSave
  buildWorkflowStepsRef.current = buildWorkflowSteps

  useEffect(() => {
    if (state !== 'reviewing') return
    if (autoSaveTriggeredRef.current) return
    autoSaveTriggeredRef.current = true

    ;(async () => {
      try {
        const docId = await performSaveRef.current(
          reviewRef.current,
          metadataRef.current,
          savedDocumentIdRef.current
        )
        if (!docId) return
        setSavedDocumentId(docId)
        setExistingReviewInfo({
          id: docId,
          generatedAt: metadataRef.current?.generatedAt || new Date().toISOString(),
        })
        setWorkflowSteps(buildWorkflowStepsRef.current(true))
        setState('saved')
        onSavedRef.current?.()
      } catch (err) {
        clientLogger.error('[FileReview] Auto-save failed:', err)
      }
    })()
  }, [state])

  const handleSave = async () => {
    if (!review || state === 'saving') return
    if (!showScheduleOptions) {
      setShowScheduleOptions(true)
    }
    setState('saving')
    setScheduleError(null)
    setError(null)

    try {
      // If not yet saved (auto-save failed), save now
      if (!savedDocumentId) {
        const docId = await performSave(review, metadata, null)
        if (!docId) throw new Error('Save returned no document ID')
        setSavedDocumentId(docId)
        setExistingReviewInfo({ id: docId, generatedAt: metadata?.generatedAt || new Date().toISOString() })
        setWorkflowSteps(buildWorkflowSteps(true))
      }

      // Handle review scheduling
      if (scheduleNextReview) {
        const today = new Date().toISOString().split('T')[0]
        if (!nextReviewDate) {
          setScheduleError('Please choose a next review date.')
        } else if (nextReviewDate <= today) {
          setScheduleError('Next review date must be in the future.')
        } else {
          const reviewResponse = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId, reviewType, dueDate: nextReviewDate, nextReviewDate,
              reviewSummary: 'File review completed — next review scheduled',
            }),
          })
          if (!reviewResponse.ok) {
            const reviewData = await reviewResponse.json().catch(() => ({}))
            setScheduleError(reviewData?.error || 'Failed to schedule next review')
            toast({
              title: 'Review scheduling failed',
              description: reviewData?.error || 'Failed',
              variant: 'destructive',
            })
          } else {
            setScheduleError(null)
            toast({
              title: 'Next review scheduled',
              description: `Scheduled for ${nextReviewDate}`,
            })
          }
        }
      }

      setState('saved')
      toast({
        title: 'File review saved',
        description: 'Saved to File Reviews and Client Documents.',
      })
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review')
      setState('error')
    }
  }

  const handleToggleTask = (taskId: string) => {
    if (createdTaskIds.has(taskId)) return
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleToggleAllTasks = () => {
    if (allSelected) {
      setSelectedTaskIds(new Set())
      return
    }
    setSelectedTaskIds(new Set(selectableTasks.map((task) => task.id)))
  }

  const handleCreateTasks = async () => {
    if (!selectedTaskIds.size || creatingTasks) return
    setCreatingTasks(true)
    setTaskError(null)
    setTaskSuccess(null)
    try {
      const createdIds: string[] = []
      for (const task of suggestedTasks) {
        if (!selectedTaskIds.has(task.id)) continue
        await createTask.mutateAsync({
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          clientId,
          ...(savedDocumentId
            ? { sourceType: 'file_review' as const, sourceId: savedDocumentId }
            : {}),
          metadata: {
            source: 'file_review',
            taskSource: task.source,
          },
        })
        createdIds.push(task.id)
      }
      if (createdIds.length > 0) {
        setCreatedTaskIds((prev) => new Set([...prev, ...createdIds]))
        setSelectedTaskIds(new Set())
        const message = `Created ${createdIds.length} task${createdIds.length === 1 ? '' : 's'} in Tasks Hub.`
        setTaskSuccess(message)
        toast({
          title: 'Tasks created',
          description: `${message} Open Tasks to review and update them.`,
        })
      }
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to create tasks')
    } finally {
      setCreatingTasks(false)
    }
  }

  const handleWorkflowToggle = async (stepId: string) => {
    if (!savedDocumentId) return
    const current = workflowSteps.find((step) => step.id === stepId)
    if (!current) return
    const nextDone = !current.done
    const previousSteps = workflowSteps
    const nextSteps = workflowSteps.map((step) =>
      step.id === stepId
        ? { ...step, done: nextDone, completedAt: nextDone ? new Date().toISOString() : null }
        : step
    )

    setWorkflowSteps(nextSteps)
    setWorkflowUpdatingId(stepId)
    setWorkflowError(null)

    try {
      const response = await fetch(`/api/documents/${savedDocumentId}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, done: nextDone }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update workflow')
      }
      const updatedSteps = data.document?.metadata?.workflow?.steps
      if (Array.isArray(updatedSteps)) {
        setWorkflowSteps(updatedSteps)
      }
    } catch (err) {
      setWorkflowSteps(previousSteps)
      setWorkflowError(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setWorkflowUpdatingId(null)
    }
  }

  const handleRegenerate = () => {
    setExistingReviewInfo(null)
    setWorkflowSteps([])
    setSuggestedTasks([])
    setSelectedTaskIds(new Set())
    setCreatedTaskIds(new Set())
    autoSaveTriggeredRef.current = false
    setState('generating')
    setError(null)
    setElapsedSeconds(0)
    const controller = new AbortController()
    fetch(`/api/clients/${clientId}/file-review`, { method: 'POST', signal: controller.signal })
      .then((res) => res.json())
      .then((data: FileReviewResponse) => {
        if (!data.success || !data.review) {
          setError(data.error || 'Failed to generate file review')
          setState('error')
          return
        }
        setReview(data.review)
        setMetadata(data.metadata || null)
        const tasks = data.suggestedTasks || []
        setSuggestedTasks(tasks)
        setSelectedTaskIds(
          new Set(tasks.filter((task) => task.source === 'deterministic').map((task) => task.id))
        )
        setState('reviewing')
      })
      .catch(() => {
        setError('Failed to generate file review')
        setState('error')
      })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="file-review-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h2 id="file-review-title" className="text-lg font-semibold text-gray-900">Client File Review</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close file review"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingExisting && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-gray-600">Loading your most recent file review…</p>
          </div>
        )}

        {state === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-md mx-auto">
            {/* Progress bar */}
            <div className="w-full mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {PROGRESS_STAGES[currentStageIdx].label}
                </span>
                <span className="text-xs text-gray-500">
                  {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stage checklist */}
            <div className="w-full space-y-2">
              {PROGRESS_STAGES.map((stage, idx) => {
                const isDone = idx < currentStageIdx
                const isCurrent = idx === currentStageIdx
                return (
                  <div key={idx} className={`flex items-center gap-2.5 text-sm ${
                    isDone ? 'text-gray-400' : isCurrent ? 'text-indigo-600 font-medium' : 'text-gray-300'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 text-indigo-500 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                    )}
                    {stage.label}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <p className="text-sm text-red-600 mb-4">{error || 'Something went wrong.'}</p>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Close
            </button>
          </div>
        )}

        {(state === 'reviewing' || state === 'saving' || state === 'saved') && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto px-6 py-6 space-y-4 bg-white">
              {renderedReview}
            </div>
            <aside className="w-72 border-l border-gray-200 bg-gray-50 px-5 py-6 space-y-5 overflow-y-auto">
              {existingReviewInfo && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
                  <p className="text-xs text-amber-800">
                    Loaded the most recent saved file review
                    {existingReviewInfo.generatedAt
                      ? ` from ${new Date(existingReviewInfo.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                      : '.'}
                  </p>
                  <button
                    onClick={handleRegenerate}
                    className="w-full inline-flex items-center justify-center gap-2 px-2.5 py-1.5 text-xs font-medium text-amber-900 bg-white border border-amber-200 rounded-md hover:bg-amber-100"
                  >
                    Regenerate review
                  </button>
                </div>
              )}
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Documents analysed</p>
                <p className="text-sm font-medium text-gray-900">{metadata?.documentsAnalyzed ?? 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Generated</p>
                <p className="text-sm font-medium text-gray-900">
                  {metadata?.generatedAt
                    ? new Date(metadata.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Analysis coverage</p>
                <p className="text-sm font-medium text-gray-900">
                  {metadata?.totalDocuments
                    ? `${Math.round((metadata.documentsAnalyzed / metadata.totalDocuments) * 100)}%`
                    : '—'}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase text-gray-400">Recommended Actions</p>
                  {suggestedTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllTasks}
                      className="text-[11px] text-blue-600 hover:text-blue-700"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                {suggestedTasks.length === 0 ? (
                  <p className="text-xs text-gray-500">No recommended actions.</p>
                ) : (
                  <div className="max-h-48 overflow-auto space-y-2 pr-1">
                    {suggestedTasks.map((task) => {
                      const priorityColor =
                        task.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : task.priority === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : task.priority === 'medium'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                      const typeLabel = task.type.replace(/_/g, ' ')
                      const isCreated = createdTaskIds.has(task.id)
                      return (
                        <label
                          key={task.id}
                          className={`flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700 ${isCreated ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedTaskIds.has(task.id)}
                            disabled={isCreated}
                            onChange={() => handleToggleTask(task.id)}
                          />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-900">{task.title}</p>
                            {task.description && (
                              <p className="text-[11px] text-gray-500">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1 text-[10px] uppercase">
                              <span className={`px-1.5 py-0.5 rounded ${priorityColor}`}>{task.priority}</span>
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{typeLabel}</span>
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                {task.source === 'deterministic' ? 'deterministic' : 'ai'}
                              </span>
                              {isCreated && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                  created
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                {taskError && <p className="text-xs text-red-600 mt-2">{taskError}</p>}
                {taskSuccess && <p className="text-xs text-emerald-700 mt-2">{taskSuccess}</p>}
                {suggestedTasks.length > 0 && (
                  <button
                    onClick={handleCreateTasks}
                    disabled={selectedCount === 0 || creatingTasks}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
                  >
                    {creatingTasks ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create {selectedCount} Task{selectedCount === 1 ? '' : 's'}
                  </button>
                )}
                {suggestedTasks.length > 0 && (
                  <button
                    onClick={() => window.open(`/tasks?clientId=${clientId}&clientName=${encodeURIComponent(clientName || '')}`, '_blank')}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                  >
                    Open Tasks Hub
                  </button>
                )}
                {suggestedTasks.length > 0 && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    Created tasks appear in the Tasks Hub (opens in a new tab) and are pre-filtered to this client.
                  </p>
                )}
              </div>
              {workflowSteps.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-gray-400 mb-2">Workflow Checklist</p>
                  <div className="space-y-2">
                    {workflowSteps.map((step) => {
                      const link = workflowLinks[step.id as keyof typeof workflowLinks]
                      return (
                        <label
                          key={step.id}
                          className="flex items-start gap-2 text-xs text-gray-700"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={step.done}
                            disabled={!savedDocumentId || step.id === 'review_complete' || workflowUpdatingId === step.id}
                            onChange={() => handleWorkflowToggle(step.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={step.done ? 'line-through text-gray-400' : 'text-gray-700'}>
                                {step.label}
                              </span>
                              {workflowUpdatingId === step.id && (
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              )}
                            </div>
                            {link && (
                              <button
                                type="button"
                                onClick={() => window.open(link, '_blank')}
                                className="mt-1 text-[11px] text-blue-600 hover:text-blue-700"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {workflowError && <p className="text-xs text-red-600 mt-2">{workflowError}</p>}
                </div>
              )}
              <div className="space-y-2">
                {showScheduleOptions && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={scheduleNextReview}
                        onChange={(e) => setScheduleNextReview(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Schedule next review
                    </label>
                    {scheduleNextReview && (
                      <>
                        <div>
                          <label className="block text-[11px] uppercase text-gray-400 mb-1">
                            Next review date
                          </label>
                          <input
                            type="date"
                            value={nextReviewDate}
                            onChange={(e) => setNextReviewDate(e.target.value)}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-gray-400 mb-1">
                            Review type
                          </label>
                          <select
                            value={reviewType}
                            onChange={(e) => setReviewType(e.target.value)}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
                          >
                            <option value="annual">Annual</option>
                            <option value="periodic">Periodic</option>
                            <option value="regulatory">Regulatory</option>
                            <option value="ad_hoc">Ad Hoc</option>
                          </select>
                        </div>
                      </>
                    )}
                    {scheduleError && <p className="text-xs text-red-600">{scheduleError}</p>}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={state === 'saving' || state === 'saved'}
                  aria-label="Save file review to client file"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {state === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving...' : 'Save & Schedule Review'}
                </button>
                {contactChecked && contactMissing && (
                  <button
                    onClick={() => window.open(`/clients/${clientId}/edit?step=contact`, '_blank')}
                    aria-label="Review contact information"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    Review Contact Info
                  </button>
                )}
                <button
                  onClick={() => window.open(`/assessments/suitability?clientId=${clientId}`, '_blank')}
                  aria-label="Start suitability report"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  Start Suitability Report
                </button>
                <button
                  onClick={() => generateFileReviewPDF(review, clientName, metadata)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                  aria-label="Download file review as PDF"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => generateFileReviewDOCX(review, clientName, metadata)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                  aria-label="Download file review as DOCX"
                >
                  <Download className="h-4 w-4" />
                  Download DOCX
                </button>
                <button
                  onClick={handleCopy}
                  aria-label="Copy file review to clipboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                >
                  <Clipboard className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close file review"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
