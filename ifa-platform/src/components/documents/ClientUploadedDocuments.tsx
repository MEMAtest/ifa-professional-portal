'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  FileSpreadsheet,
  Mail,
  Image,
  File,
  Eye,
  Download,
  Filter,
  FileType,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  XCircle,
  Loader2,
  Sparkles,
  Tag,
  User,
  Upload,
} from 'lucide-react'
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal'
import { TagEditor } from '@/components/documents/TagEditor'
import { FileReviewModal } from './FileReviewModal'
import { DocumentIntelligenceModal } from '@/components/documents/DocumentIntelligenceModal'
import { renderMarkdown } from '@/lib/documents/markdownRenderer'
import { generateFileReviewPDF, generateFileReviewDOCX } from '@/lib/documents/fileReviewExport'
import { useToast } from '@/hooks/use-toast'
import { getAutoTags } from '@/components/setup/bulkSetupUtils'
import { CLASSIFICATION_LABELS, TYPE_CONFIG } from './clientDocumentsConstants'
import { ExpandedAnalysis, StatusBadge } from './clientDocumentsComponents'
import { formatCurrency, formatDate, formatFileSize, getDocType } from './clientDocumentsUtils'
import type { DocTypeFilter, FileReviewDocument, UploadedDocument } from './clientDocumentsTypes'



export function ClientUploadedDocuments({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromBulk = searchParams.get('from') === 'bulk'
  const bulkClientRef = searchParams.get('clientRef')
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [fileReviews, setFileReviews] = useState<FileReviewDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DocTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [analysing, setAnalysing] = useState(false)
  const [retryingAll, setRetryingAll] = useState(false)
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())
  const [previewDocId, setPreviewDocId] = useState<string | null>(null)
  const [showFileReview, setShowFileReview] = useState(false)
  const [reviewPreview, setReviewPreview] = useState<{
    id: string
    title: string
    markdown: string
    workflowSteps: Array<{
      id: string
      label: string
      done: boolean
      completedAt?: string | null
    }>
  } | null>(null)
  const [workflowUpdatingId, setWorkflowUpdatingId] = useState<string | null>(null)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [profileSyncMessage, setProfileSyncMessage] = useState<string | null>(null)
  const [profileSyncDetails, setProfileSyncDetails] = useState<{
    personal_details?: string[]
    contact_info?: string[]
    financial_profile?: string[]
    totalUpdated?: number
  } | null>(null)
  const [showDocIntelModal, setShowDocIntelModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actionErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  const showActionError = useCallback((msg: string) => {
    setActionError(msg)
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current)
    actionErrorTimer.current = setTimeout(() => setActionError(null), 4000)
  }, [])

  const handleDocIntelApplied = useCallback(
    (result: { totalUpdated: number; updatedFields?: { personal_details: string[]; contact_info: string[]; financial_profile: string[] } }) => {
      const updatedFields = result.updatedFields || { personal_details: [], contact_info: [], financial_profile: [] }
      setProfileSyncDetails({ ...updatedFields, totalUpdated: result.totalUpdated })
      if (result.totalUpdated > 0) {
        setProfileSyncMessage(
          `Updated ${result.totalUpdated} profile field${result.totalUpdated === 1 ? '' : 's'} from analysed documents.`
        )
      } else {
        setProfileSyncMessage('No new profile fields were found in the analysed documents.')
      }
    },
    []
  )

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/client/${clientId}`)
      const data = await res.json()
      if (data.success) {
        const allDocs: UploadedDocument[] = data.documents || []
        const reviews = allDocs
          .filter((d) => {
            if (d.metadata?.type === 'file_review') return true
            if (d.type === 'file_review') return true
            if (d.document_type === 'compliance_document' && (d as any).category === 'Compliance') return true
            if (typeof d.name === 'string' && d.name.startsWith('File Review -')) return true
            return false
          }) as FileReviewDocument[]
        reviews.sort((a, b) => {
          const aDate = new Date(a.metadata?.generatedAt || a.created_at || 0).getTime()
          const bDate = new Date(b.metadata?.generatedAt || b.created_at || 0).getTime()
          return bDate - aDate
        })
        const uploaded = allDocs.filter(
          (d: UploadedDocument) =>
            d.file_name &&
            d.metadata?.type !== 'file_review' &&
            !d.document_type?.endsWith('_report')
        )
        setFileReviews(reviews)
        setDocuments(uploaded)
      } else {
        if (!silent) setError(data.error || 'Failed to load documents')
      }
    } catch {
      if (!silent) setError('Failed to fetch documents')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [clientId])

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    let successCount = 0
    let failCount = 0
    const uploadedDocIds: string[] = []

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        formData.append('client_id', clientId)

        // Auto-tag based on filename (same logic as bulk upload)
        const tags = getAutoTags(file.name)
        if (tags.length > 0) {
          formData.append('tags', JSON.stringify(tags))
        }

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (res.ok && data.success) {
          successCount++
          if (data.document?.id) uploadedDocIds.push(data.document.id)
        } else {
          failCount++
          toast({
            title: `Upload failed: ${file.name}`,
            description: data.error || 'Unknown error',
            variant: 'destructive',
          })
        }
      } catch (err) {
        failCount++
        toast({
          title: `Upload failed: ${file.name}`,
          description: err instanceof Error ? err.message : 'Network error',
          variant: 'destructive',
        })
      }
    }

    if (successCount > 0) {
      toast({
        title: `${successCount} document${successCount !== 1 ? 's' : ''} uploaded`,
        description: 'Starting analysis...',
      })
      await fetchDocuments()

      // Auto-trigger analysis for newly uploaded documents
      if (uploadedDocIds.length > 0) {
        try {
          await fetch('/api/documents/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds: uploadedDocIds }),
          })
        } catch {
          // Analysis can still be triggered manually via "Analyse All"
        }
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [clientId, toast, fetchDocuments])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const workflowLinks = useMemo(() => ({
    suitability: `/assessments/suitability?clientId=${clientId}`,
    atr: `/assessments/atr?clientId=${clientId}`,
    cfl: `/assessments/cfl?clientId=${clientId}`,
  }), [clientId])

  const handleWorkflowToggle = useCallback(async (stepId: string) => {
    if (!reviewPreview) return
    const currentStep = reviewPreview.workflowSteps.find((step) => step.id === stepId)
    if (!currentStep) return
    const nextDone = !currentStep.done
    const previousSteps = reviewPreview.workflowSteps
    const nextSteps = reviewPreview.workflowSteps.map((step) =>
      step.id === stepId
        ? { ...step, done: nextDone, completedAt: nextDone ? new Date().toISOString() : null }
        : step
    )

    setReviewPreview({ ...reviewPreview, workflowSteps: nextSteps })
    setWorkflowUpdatingId(stepId)
    setWorkflowError(null)

    try {
      const response = await fetch(`/api/documents/${reviewPreview.id}/workflow`, {
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
        setReviewPreview({ ...reviewPreview, workflowSteps: updatedSteps })
      }
    } catch (err) {
      setReviewPreview({ ...reviewPreview, workflowSteps: previousSteps })
      setWorkflowError(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setWorkflowUpdatingId(null)
    }
  }, [reviewPreview])

  // Auto-refresh while any document is processing or a retry is in progress
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing')
    const shouldPoll = hasProcessing || retryingAll || retryingIds.size > 0

    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(() => {
        fetchDocuments(true)
      }, 10_000)
    } else if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [documents, fetchDocuments, retryingAll, retryingIds])

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleAnalyseAll = useCallback(async () => {
    const unanalysedDocs = documents.filter(
      (d) => d.status !== 'analyzed'
    )
    if (unanalysedDocs.length === 0) return

    setAnalysing(true)
    try {
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: unanalysedDocs.map((d) => d.id) }),
      })
      if (!res.ok) throw new Error('Analysis request failed')
      const results = await res.json().catch(() => ({}))
      await fetchDocuments(true)
      if (results.summary?.analyzed > 0) {
        toast({
          title: 'Analysis complete',
          description: 'Review document suggestions to update the client profile.',
        })
      }
    } catch {
      showActionError('Failed to start document analysis. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }, [documents, fetchDocuments, showActionError, toast])

  const handleRetry = useCallback(async (docId: string) => {
    setRetryingIds((prev) => new Set(prev).add(docId))
    try {
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: [docId] }),
      })
      if (!res.ok) throw new Error('Retry failed')
      await fetchDocuments(true)
    } catch {
      showActionError('Failed to retry document analysis.')
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev)
        next.delete(docId)
        return next
      })
    }
  }, [fetchDocuments, showActionError])

  const handleRetryAllFailed = useCallback(async () => {
    const failedDocs = documents.filter(
      (d) => d.status === 'failed' || d.status === 'extracted'
    )
    if (failedDocs.length === 0) return

    setRetryingAll(true)
    try {
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: failedDocs.map((d) => d.id) }),
      })
      if (!res.ok) throw new Error('Retry failed')
      await fetchDocuments(true)
    } catch {
      showActionError('Failed to retry failed documents. Please try again.')
    } finally {
      setRetryingAll(false)
    }
  }, [documents, fetchDocuments, showActionError])

  const filtered = documents.filter((d) => {
    // Type filter
    if (filter !== 'all' && getDocType(d) !== filter) return false
    // Search filter (case-insensitive on file name)
    if (searchQuery) {
      const name = (d.file_name || d.name || '').toLowerCase()
      if (!name.includes(searchQuery.toLowerCase())) return false
    }
    // Category filter (classification)
    if (categoryFilter !== 'all') {
      const classification = d.metadata?.ai_analysis?.classification
      if (classification !== categoryFilter) return false
    }
    return true
  })

  const typeCounts = documents.reduce<Record<string, number>>((acc, d) => {
    const t = getDocType(d)
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  const pendingCount = documents.filter(
    (d) => d.status === 'pending' || d.status === 'active' || !d.status
  ).length
  const analysedCount = documents.filter((d) => d.status === 'analyzed').length
  const unanalysedCount = documents.filter(
    (d) => d.status !== 'analyzed'
  ).length
  const failedCount = documents.filter(
    (d) => d.status === 'failed' || d.status === 'extracted'
  ).length

  if (loading) {
    return (
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading uploaded documents...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Uploaded Documents</h3>
          <p className="text-sm text-gray-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            {analysedCount > 0 && ` · ${analysedCount} analysed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx,.msg,.eml,.txt,.png,.jpg,.jpeg,.gif"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          {analysedCount > 0 && (
            <button
              onClick={() => setShowFileReview(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                fileReviews.length > 0
                  ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
                  : 'text-white bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {fileReviews.length > 0 ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  View File Review
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  File Review
                </>
              )}
            </button>
          )}
          {failedCount > 0 && (
            <button
              onClick={handleRetryAllFailed}
              disabled={retryingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retryingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry Failed ({failedCount})
            </button>
          )}
          {unanalysedCount > 0 && (
            <button
              onClick={handleAnalyseAll}
              disabled={analysing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analysing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {analysing ? 'Analysing...' : `Analyse All (${unanalysedCount})`}
            </button>
          )}
        </div>
      </div>

      {fromBulk && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Returned from Bulk Setup</p>
            <p className="text-xs text-gray-600">
              {bulkClientRef ? `Client ref: ${bulkClientRef}. ` : ''}Use Back to Bulk Setup to revisit the upload summary.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Back to Bulk Setup
          </button>
        </div>
      )}

      {analysedCount > 0 && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-blue-900">Update client profile from documents</p>
            <p className="text-xs text-blue-700">
              Fill missing profile fields using data extracted from {analysedCount} analysed document{analysedCount !== 1 ? 's' : ''}. Existing data is never overwritten.
            </p>
            {profileSyncMessage && (
              <p className="mt-1 text-xs text-blue-900">{profileSyncMessage}</p>
            )}
            {profileSyncDetails && (profileSyncDetails.totalUpdated || 0) > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[
                  ...(profileSyncDetails.personal_details || []),
                  ...(profileSyncDetails.contact_info || []),
                  ...(profileSyncDetails.financial_profile || []),
                ].map((field) => (
                  <span key={field} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] border border-blue-200 text-blue-900">
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowDocIntelModal(true)}
            disabled={analysedCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex-shrink-0"
          >
            <User className="h-3.5 w-3.5" />
            Review Suggestions
          </button>
        </div>
      )}

      {analysedCount > 0 && fileReviews.length === 0 && (
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-medium text-indigo-900">File review ready</p>
          <p className="mt-1 text-sm text-indigo-800">
            Select File Review to generate the compliance review for this client using the analysed documents.
          </p>
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-red-700">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-600 ml-3"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search + filters row */}
      {documents.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          {/* Search input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as DocTypeFilter)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types ({documents.length})</option>
              {Object.entries(typeCounts).map(([type, count]) => {
                const config = TYPE_CONFIG[type] || TYPE_CONFIG.upload
                return (
                  <option key={type} value={type}>
                    {config.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Category filter (classification) */}
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(CLASSIFICATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <File className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No uploaded documents for this client.</p>
          <p className="text-xs text-gray-400 mt-1">
            Documents uploaded via bulk setup or manual upload will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-28">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-28">
                  Analysis
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Tags
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-20">
                  Size
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-28">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const docType = getDocType(doc)
                const config = TYPE_CONFIG[docType] || TYPE_CONFIG.upload
                const Icon = config.icon
                const tags: string[] = Array.isArray(doc.tags) ? doc.tags : []
                const isExpanded = expandedRows.has(doc.id)
                const canRetry = doc.status === 'extracted' || doc.status === 'failed'

                return (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    docType={docType}
                    config={config}
                    Icon={Icon}
                    tags={tags}
                    isExpanded={isExpanded}
                    canRetry={canRetry}
                    isRetrying={retryingIds.has(doc.id)}
                    onToggle={toggleRow}
                    onRetry={handleRetry}
                    onPreview={setPreviewDocId}
                    onTagsUpdated={() => fetchDocuments(true)}
                  />
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && filter !== 'all' && (
            <div className="p-6 text-center text-sm text-gray-500">
              No {TYPE_CONFIG[filter]?.label || filter} documents found.
            </div>
          )}
        </div>
      )}

      {analysedCount > 0 && (
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">File Reviews</h4>
          {fileReviews.length === 0 ? (
            <p className="text-sm text-gray-500">No file reviews generated yet.</p>
          ) : (
            <div className="space-y-3">
              {fileReviews.map((review) => {
                const title = review.name || review.file_name || 'File Review'
                const markdown = review.metadata?.reviewMarkdown || ''
                const generatedAt = review.metadata?.generatedAt || review.created_at
                return (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500">
                        {generatedAt ? `Generated ${formatDate(generatedAt)}` : 'Generated date unknown'} ·
                        {' '}Documents analysed: {review.metadata?.documentsAnalyzed ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!markdown) return
                          setWorkflowError(null)
                          setWorkflowUpdatingId(null)
                          setReviewPreview({
                            id: review.id,
                            title,
                            markdown,
                            workflowSteps: review.metadata?.workflow?.steps || [],
                          })
                        }}
                        disabled={!markdown}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <button
                        onClick={() => markdown && generateFileReviewPDF(markdown, clientName || 'Client', review.metadata)}
                        disabled={!markdown}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      <button
                        onClick={() => markdown && generateFileReviewDOCX(markdown, clientName || 'Client', review.metadata)}
                        disabled={!markdown}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        DOCX
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <DocumentIntelligenceModal
        clientId={clientId}
        isOpen={showDocIntelModal}
        onClose={() => setShowDocIntelModal(false)}
        onApplied={handleDocIntelApplied}
      />
      <DocumentPreviewModal
        documentId={previewDocId}
        onClose={() => setPreviewDocId(null)}
        onReuploaded={() => fetchDocuments(true)}
      />
      <FileReviewModal
        clientId={clientId}
        clientName={clientName || 'Client'}
        isOpen={showFileReview}
        onClose={() => {
          setShowFileReview(false)
          fetchDocuments(true)
        }}
        onSaved={() => fetchDocuments(true)}
      />
      {reviewPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setReviewPreview(null)
              setWorkflowError(null)
              setWorkflowUpdatingId(null)
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{reviewPreview.title}</h3>
              <button
                onClick={() => {
                  setReviewPreview(null)
                  setWorkflowError(null)
                  setWorkflowUpdatingId(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close file review preview"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-6 space-y-4 bg-white">
              {reviewPreview.workflowSteps.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Workflow Checklist</h4>
                    {workflowError && <span className="text-xs text-red-600">{workflowError}</span>}
                  </div>
                  <div className="space-y-2">
                    {reviewPreview.workflowSteps.map((step) => {
                      const link = workflowLinks[step.id as keyof typeof workflowLinks]
                      return (
                        <label key={step.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={step.done}
                            disabled={workflowUpdatingId === step.id || step.id === 'review_complete'}
                            onChange={() => handleWorkflowToggle(step.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={step.done ? 'line-through text-gray-400' : ''}>{step.label}</span>
                              {workflowUpdatingId === step.id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                              )}
                            </div>
                            {link && (
                              <button
                                type="button"
                                onClick={() => window.open(link, '_blank')}
                                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {renderMarkdown(reviewPreview.markdown)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DocumentRowProps {
  doc: UploadedDocument
  docType: string
  config: { icon: typeof FileText; label: string; color: string }
  Icon: typeof FileText
  tags: string[]
  isExpanded: boolean
  canRetry: boolean
  isRetrying: boolean
  onToggle: (id: string) => void
  onRetry: (id: string) => void
  onPreview: (id: string) => void
  onTagsUpdated: () => void
}

function DocumentRow({
  doc,
  config,
  Icon,
  tags,
  isExpanded,
  canRetry,
  isRetrying,
  onToggle,
  onRetry,
  onPreview,
  onTagsUpdated,
}: DocumentRowProps) {
  const hasAnalysis = doc.status === 'analyzed' || doc.status === 'extracted' || doc.status === 'failed'

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 ${hasAnalysis ? 'cursor-pointer' : ''}`}
        onClick={() => hasAnalysis && onToggle(doc.id)}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {hasAnalysis && (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )
            )}
            <span className="text-gray-900 font-medium truncate block max-w-xs" title={doc.file_name || doc.name}>
              {doc.file_name || doc.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <StatusBadge status={doc.status} />
        </td>
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {doc.metadata?.ai_analysis?.classification && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                <Tag className="h-3 w-3" />
                {CLASSIFICATION_LABELS[doc.metadata.ai_analysis.classification] || doc.metadata.ai_analysis.classification}
              </span>
            )}
            <TagEditor
              documentId={doc.id}
              currentTags={tags}
              onTagsUpdated={onTagsUpdated}
            />
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-500 text-xs">
          {formatFileSize(doc.file_size || 0)}
        </td>
        <td className="px-4 py-2.5 text-gray-500 text-xs">
          {doc.created_at ? formatDate(doc.created_at) : '-'}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onPreview(doc.id)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const a = document.createElement('a')
                a.href = `/api/documents/download/${doc.id}`
                a.download = doc.file_name || doc.name
                a.click()
              }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            {canRetry && (
              <button
                onClick={() => onRetry(doc.id)}
                disabled={isRetrying}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Retry Analysis"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && hasAnalysis && (
        <tr>
          <td colSpan={7} className="p-0">
            <ExpandedAnalysis doc={doc} />
          </td>
        </tr>
      )}
    </>
  )
}

export default ClientUploadedDocuments
