'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Mail,
  Image,
  File,
  Eye,
  Download,
  Filter,
  Loader2,
  FileType,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Tag,
  Calendar,
  DollarSign,
  User,
  Building,
  Hash,
  MapPin,
  Search,
  XCircle,
} from 'lucide-react'
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal'
import { TagEditor } from '@/components/documents/TagEditor'
import { FileReviewModal } from './FileReviewModal'
import { renderMarkdown } from '@/lib/documents/markdownRenderer'
import { generateFileReviewPDF, generateFileReviewDOCX } from '@/lib/documents/fileReviewExport'

interface DocumentMetadata {
  type?: string
  extracted_text?: string
  extracted_text_length?: number
  extraction_method?: string
  extracted_at?: string
  ai_analysis?: {
    summary: string
    classification: string
    confidence: number
    entities: {
      clientNames?: string[]
      dates?: string[]
      providerNames?: string[]
      policyNumbers?: string[]
      financialAmounts?: { amount: number; currency: string; context: string }[]
      addresses?: string[]
      referenceNumbers?: string[]
    }
  }
  ai_analyzed_at?: string
  ai_provider?: string
  ai_error?: string
  extraction_error?: string
}

interface UploadedDocument {
  id: string
  name: string
  file_name: string
  file_type: string
  file_size: number
  type: string
  document_type: string
  tags: string[]
  created_at: string
  status: string
  metadata?: DocumentMetadata
}

interface FileReviewDocument extends UploadedDocument {
  metadata?: DocumentMetadata & {
    type?: string
    reviewMarkdown?: string
    generatedAt?: string
    documentsAnalyzed?: number
    totalDocuments?: number
    aiProvider?: string
    workflow?: {
      steps?: Array<{
        id: string
        label: string
        done: boolean
        completedAt?: string | null
      }>
    }
  }
}

type DocTypeFilter = 'all' | 'pdf' | 'word' | 'email' | 'spreadsheet' | 'image' | 'text'

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  pdf: { icon: FileText, label: 'PDF', color: 'text-red-600 bg-red-50' },
  word: { icon: FileType, label: 'Word', color: 'text-blue-600 bg-blue-50' },
  email: { icon: Mail, label: 'Email', color: 'text-purple-600 bg-purple-50' },
  spreadsheet: { icon: FileSpreadsheet, label: 'Spreadsheet', color: 'text-green-600 bg-green-50' },
  image: { icon: Image, label: 'Image', color: 'text-amber-600 bg-amber-50' },
  text: { icon: FileText, label: 'Text', color: 'text-gray-600 bg-gray-50' },
  upload: { icon: File, label: 'File', color: 'text-gray-600 bg-gray-50' },
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  pension_statement: 'Pension Statement',
  bank_statement: 'Bank Statement',
  investment_report: 'Investment Report',
  insurance_policy: 'Insurance Policy',
  tax_document: 'Tax Document',
  identity_document: 'Identity Document',
  correspondence: 'Correspondence',
  transfer_form: 'Transfer Form',
  valuation_report: 'Valuation Report',
  fund_factsheet: 'Fund Factsheet',
  application_form: 'Application Form',
  meeting_notes: 'Meeting Notes',
  compliance_document: 'Compliance Document',
  other: 'Other',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
  }).format(amount)
}

function getDocType(doc: UploadedDocument): string {
  return doc.document_type || doc.type || 'upload'
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analysing...
        </span>
      )
    case 'analyzed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Sparkles className="h-3 w-3" />
          Analysed
        </span>
      )
    case 'extracted':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <FileText className="h-3 w-3" />
          Text Only
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Failed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Pending
        </span>
      )
  }
}

function EntityChip({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700" title={label}>
      <Icon className="h-3 w-3 text-gray-500 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{value}</span>
    </span>
  )
}

function ExpandedAnalysis({ doc }: { doc: UploadedDocument }) {
  const analysis = doc.metadata?.ai_analysis
  if (!analysis) {
    if (doc.metadata?.ai_error) {
      return (
        <div className="px-6 py-3 bg-red-50 text-sm text-red-600">
          Analysis failed: {doc.metadata.ai_error}
        </div>
      )
    }
    if (doc.metadata?.extraction_error) {
      return (
        <div className="px-6 py-3 bg-red-50 text-sm text-red-600">
          Extraction failed: {doc.metadata.extraction_error}
        </div>
      )
    }
    return (
      <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
        No analysis available yet.
      </div>
    )
  }

  const { entities } = analysis
  const hasEntities =
    (entities.clientNames?.length ?? 0) > 0 ||
    (entities.dates?.length ?? 0) > 0 ||
    (entities.providerNames?.length ?? 0) > 0 ||
    (entities.policyNumbers?.length ?? 0) > 0 ||
    (entities.financialAmounts?.length ?? 0) > 0 ||
    (entities.addresses?.length ?? 0) > 0 ||
    (entities.referenceNumbers?.length ?? 0) > 0

  return (
    <div className="px-6 py-4 bg-gray-50 space-y-3">
      {/* Summary */}
      <div>
        <p className="text-sm text-gray-700">{analysis.summary}</p>
      </div>

      {/* Classification + Confidence */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Tag className="h-3 w-3" />
          {CLASSIFICATION_LABELS[analysis.classification] || analysis.classification}
        </span>
        <span className="text-xs text-gray-400">
          {Math.round(analysis.confidence * 100)}% confidence
        </span>
      </div>

      {/* Entities */}
      {hasEntities && (
        <div className="flex flex-wrap gap-1.5">
          {entities.clientNames?.map((name, i) => (
            <EntityChip key={`name-${i}`} icon={User} label="Client Name" value={name} />
          ))}
          {entities.providerNames?.map((name, i) => (
            <EntityChip key={`provider-${i}`} icon={Building} label="Provider" value={name} />
          ))}
          {entities.policyNumbers?.map((num, i) => (
            <EntityChip key={`policy-${i}`} icon={Hash} label="Policy Number" value={num} />
          ))}
          {entities.financialAmounts?.map((fa, i) => (
            <EntityChip
              key={`amount-${i}`}
              icon={DollarSign}
              label={fa.context}
              value={`${formatCurrency(fa.amount, fa.currency)} — ${fa.context}`}
            />
          ))}
          {entities.dates?.map((d, i) => (
            <EntityChip key={`date-${i}`} icon={Calendar} label="Date" value={d} />
          ))}
          {entities.addresses?.map((addr, i) => (
            <EntityChip key={`addr-${i}`} icon={MapPin} label="Address" value={addr} />
          ))}
          {entities.referenceNumbers?.map((ref, i) => (
            <EntityChip key={`ref-${i}`} icon={Hash} label="Reference" value={ref} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ClientUploadedDocuments({ clientId, clientName }: { clientId: string; clientName?: string }) {
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actionErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showActionError = useCallback((msg: string) => {
    setActionError(msg)
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current)
    actionErrorTimer.current = setTimeout(() => setActionError(null), 4000)
  }, [])

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/client/${clientId}`)
      const data = await res.json()
      if (data.success) {
        const allDocs: UploadedDocument[] = data.documents || []
        const reviews = allDocs
          .filter((d) => d.metadata?.type === 'file_review') as FileReviewDocument[]
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
    const pendingDocs = documents.filter(
      (d) => d.status === 'pending' || d.status === 'active' || !d.status
    )
    if (pendingDocs.length === 0) return

    setAnalysing(true)
    try {
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: pendingDocs.map((d) => d.id) }),
      })
      if (!res.ok) throw new Error('Analysis request failed')
      await fetchDocuments(true)
    } catch {
      showActionError('Failed to start document analysis. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }, [documents, fetchDocuments, showActionError])

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
          {analysedCount > 0 && (
            <button
              onClick={() => setShowFileReview(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              File Review
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
          {pendingCount > 0 && (
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
              Analyse All ({pendingCount})
            </button>
          )}
        </div>
      </div>

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

      <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      <FileReviewModal
        clientId={clientId}
        clientName={clientName || 'Client'}
        isOpen={showFileReview}
        onClose={() => setShowFileReview(false)}
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
          <TagEditor
            documentId={doc.id}
            currentTags={tags}
            onTagsUpdated={onTagsUpdated}
          />
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
