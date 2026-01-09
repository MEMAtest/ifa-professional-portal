// src/app/assessments/suitability/results/[clientId]/page.tsx
// Suitability results + report generation hub

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Plus,
  Shield,
  User
} from 'lucide-react'

import { CreateNewVersionButton } from '@/components/suitability/CreateNewVersionButton'
import { deriveSuitabilityCompletionState } from '@/lib/assessments/suitabilityStatus'
import type { RequestResult, SuitabilityReportVariant } from '@/lib/documents/requestAssessmentReport'
import { buildReportLink, type ReportLink } from '@/lib/documents/reportLinks'

type SuitabilityAssessmentSummary = {
  id: string
  client_id: string
  version_number: number | null
  parent_assessment_id?: string | null
  is_current?: boolean | null
  completion_percentage: number | null
  status: string | null
  is_final?: boolean | null
  is_draft?: boolean | null
  created_at?: string | null
  completed_at: string | null
  assessment_date: string | null
  updated_at: string | null
}

type SuitabilityHistoryResponse = {
  success: boolean
  current: SuitabilityAssessmentSummary | null
  versions: SuitabilityAssessmentSummary[]
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>{children}</div>
)

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-b border-gray-200 ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
  href,
  target,
  rel,
  download
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'outline'
  className?: string
  href?: string
  target?: string
  rel?: string
  download?: string
}) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  }

  const resolvedClassName = `rounded-lg font-medium transition-colors inline-flex items-center justify-center px-4 py-2 ${
    variants[variant]
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        download={download}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
          }
          onClick?.()
        }}
        className={resolvedClassName}
        aria-disabled={disabled}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={resolvedClassName}
    >
      {children}
    </button>
  )
}

const Badge = ({
  children,
  variant = 'default'
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning'
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800'
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

export default function SuitabilityResultsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const clientId = params?.clientId as string
  const assessmentIdFromQuery = searchParams.get('assessmentId') || undefined

  const [client, setClient] = useState<any>(null)
  const [assessment, setAssessment] = useState<SuitabilityAssessmentSummary | null>(null)
  const [currentAssessment, setCurrentAssessment] = useState<SuitabilityAssessmentSummary | null>(null)
  const [versionHistory, setVersionHistory] = useState<SuitabilityAssessmentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [includeWarnings, setIncludeWarnings] = useState(false)
  const [reportNotice, setReportNotice] = useState<string | null>(null)
  const [reportReady, setReportReady] = useState<{
    reportType: SuitabilityReportVariant
    result: RequestResult
  } | null>(null)
  const [reportLink, setReportLink] = useState<ReportLink | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState('Preparing report')
  const progressTimerRef = useRef<number | null>(null)

  const assessmentId = assessment?.id || assessmentIdFromQuery
  const actionAssessment = currentAssessment || assessment

  const statusBadge = useMemo(() => {
    if (!assessment) return { label: 'Not Started', variant: 'warning' as const }
    const derived = deriveSuitabilityCompletionState({
      status: assessment.status,
      isFinal: assessment.is_final,
      isDraft: assessment.is_draft,
      completionPercentage: assessment.completion_percentage
    })
    return {
      label: derived.statusLabel,
      variant: derived.lifecycleStatus === 'completed' ? ('success' as const) : ('warning' as const)
    }
  }, [assessment])

  const completionDisplay = useMemo(() => {
    if (!assessment) return 0
    const derived = deriveSuitabilityCompletionState({
      status: assessment.status,
      isFinal: assessment.is_final,
      isDraft: assessment.is_draft,
      completionPercentage: assessment.completion_percentage
    })
    return derived.completionPercentage
  }, [assessment])

  const actionState = useMemo(() => {
    if (!actionAssessment) return null
    return deriveSuitabilityCompletionState({
      status: actionAssessment.status,
      isFinal: actionAssessment.is_final,
      isDraft: actionAssessment.is_draft,
      completionPercentage: actionAssessment.completion_percentage
    })
  }, [actionAssessment])

  const isViewingCurrent = useMemo(() => {
    if (!currentAssessment || !assessment) return true
    return currentAssessment.id === assessment.id
  }, [currentAssessment, assessment])

  const loadClient = useCallback(async () => {
    const response = await fetch(`/api/clients/${clientId}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.client || data
  }, [clientId])

  const loadAssessment = useCallback(async (assessmentIdOverride?: string) => {
    const url = new URL('/api/assessments/suitability', window.location.origin)
    const requestedId = assessmentIdOverride || assessmentIdFromQuery
    if (requestedId) {
      url.searchParams.set('assessmentId', requestedId)
    } else {
      url.searchParams.set('clientId', clientId)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to load suitability assessment')
    }

    const data = await response.json()
    return (data?.data || null) as SuitabilityAssessmentSummary | null
  }, [clientId, assessmentIdFromQuery])

  const loadHistory = useCallback(async () => {
    const response = await fetch(`/api/assessments/suitability/history?clientId=${clientId}`)
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to load suitability history')
    }
    const data = (await response.json()) as SuitabilityHistoryResponse
    return {
      versions: data?.versions || [],
      current: data?.current || null
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId) return

    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [clientData, historyData] = await Promise.all([loadClient(), loadHistory()])
        setClient(clientData)

        const versions = historyData?.versions || []
        const current = historyData?.current || null

        setVersionHistory(versions)
        setCurrentAssessment(current)

        let selected = current
        if (assessmentIdFromQuery) {
          selected = versions.find((version) => version.id === assessmentIdFromQuery) || null
          if (!selected) {
            selected = await loadAssessment(assessmentIdFromQuery)
          }
        }

        setAssessment(selected || current)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load results')
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [clientId, assessmentIdFromQuery, loadClient, loadHistory, loadAssessment])

  useEffect(() => {
    if (!isGenerating) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setGenerationProgress(0)
      setGenerationStage('Preparing report')
      return
    }

    setGenerationProgress(8)
    setGenerationStage('Preparing data')

    progressTimerRef.current = window.setInterval(() => {
      setGenerationProgress((current) => {
        const next = current >= 90 ? 90 : current + (current < 50 ? 7 : 4)
        if (next < 25) setGenerationStage('Preparing data')
        else if (next < 60) setGenerationStage('Building report')
        else if (next < 80) setGenerationStage('Rendering PDF')
        else setGenerationStage('Finalizing')
        return next
      })
    }, 600)

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }, [isGenerating])

  useEffect(() => {
    return () => {
      if (reportLink?.isObjectUrl) {
        const url = reportLink.url
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    }
  }, [reportLink])

  const handleGeneratePDFReport = useCallback(
    async (reportType: SuitabilityReportVariant = 'fullReport') => {
      if (!assessmentId) {
        setError('No assessment found to generate a report for.')
        return
      }

      try {
        setIsGenerating(true)
        setReportNotice(null)
        setError(null)
        setReportReady(null)
        setReportLink(null)

        const requestBody = {
          assessmentType: 'suitability',
          assessmentId,
          clientId,
          reportType,
          includeWarnings,
          includeAI: true
        }

        let response = await fetch('/api/documents/generate-assessment-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const json = await response.json().catch(() => null)
          const missing = Array.isArray(json?.missingForFinal)
            ? json.missingForFinal
            : Array.isArray(json?.missing)
              ? json.missing
              : null

          // Convenience: if user requested a final report but the assessment is missing required
          // items, auto-fallback to draft mode (includeWarnings=true) instead of hard failing.
          if (!includeWarnings && response.status === 400 && missing?.length) {
            response = await fetch('/api/documents/generate-assessment-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...requestBody, includeWarnings: true })
            })
          }

          if (!response.ok) {
            const message =
              json?.error ||
              (missing?.length
                ? `Report incomplete (${missing.length} item${missing.length === 1 ? '' : 's'} missing). Enable “Include warnings” to generate a draft PDF.`
                : null) ||
              'Failed to generate report'
            throw new Error(message)
          }
        }

        const result = await response.json()
        if (result?.downgradedToDraft) {
          const missingCount = Array.isArray(result?.missingForFinal) ? result.missingForFinal.length : 0
          setReportNotice(
            missingCount > 0
              ? `Final report incomplete (${missingCount} missing). Generated draft PDF with warnings.`
              : 'Final report incomplete. Generated draft PDF with warnings.'
          )
        }

        setGenerationProgress(100)
        setGenerationStage('Report ready')

        const generated: RequestResult = {
          inlinePdf: result?.inlinePdf,
          signedUrl: result?.signedUrl,
          fileName: result?.fileName,
          documentId: result?.documentId
        }

        const link = buildReportLink({ result: generated, reportType })
        if (!link) {
          setError('Report generated but no download link was returned.')
          return
        }

        setReportReady({ reportType, result: generated })
        setReportLink(link)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Report generation failed')
      } finally {
        setIsGenerating(false)
      }
    },
    [assessmentId, clientId, includeWarnings]
  )

  const handleVersionSelect = useCallback(
    (version: SuitabilityAssessmentSummary) => {
      if (assessment?.id === version.id) return
      setAssessment(version)
      const params = new URLSearchParams(searchParams?.toString())
      params.set('assessmentId', version.id)
      const query = params.toString()
      router.replace(`/assessments/suitability/results/${clientId}${query ? `?${query}` : ''}`)
    },
    [assessment, clientId, router, searchParams]
  )

  const formatAssessmentDate = useCallback((version: SuitabilityAssessmentSummary) => {
    const timestamp =
      version.completed_at || version.assessment_date || version.updated_at || version.created_at || null
    return timestamp ? format(new Date(timestamp), 'dd MMM yyyy, HH:mm') : '—'
  }, [])

  // `/api/clients/[id]` returns a raw DB row (snake_case), while some client-side
  // callers use camelCase. Support both so the results page never renders “Client”.
  const personal = client?.personalDetails || client?.personal_details
  const title = personal?.title || ''
  const firstName = personal?.firstName || personal?.first_name || ''
  const lastName = personal?.lastName || personal?.last_name || ''

  const displayName =
    `${title} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim() ||
    client?.name ||
    client?.fullName ||
    'Client'

  const clientRef = client?.clientRef || client?.client_ref || ''

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between text-xs text-blue-700">
            <span>Loading suitability results</span>
            <span>Working...</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
            <div className="h-2 w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push(`/assessments/client/${clientId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {actionAssessment ? (
            actionAssessment.is_final || actionState?.lifecycleStatus === 'completed' ? (
              <CreateNewVersionButton
                clientId={clientId}
                currentAssessmentId={actionAssessment.id}
                currentVersion={{
                  id: actionAssessment.id,
                  client_id: actionAssessment.client_id,
                  version_number: actionAssessment.version_number,
                  parent_assessment_id: actionAssessment.parent_assessment_id || null,
                  created_at: actionAssessment.created_at || null,
                  updated_at: actionAssessment.updated_at || null,
                  completion_percentage: actionAssessment.completion_percentage,
                  status: actionAssessment.status,
                  is_final: actionAssessment.is_final || null,
                  is_draft: actionAssessment.is_draft || null,
                  is_current: actionAssessment.is_current || null
                }}
                variant="outline"
                size="sm"
                buttonLabel="New Assessment"
                disabled={!actionAssessment.is_final && (actionAssessment.completion_percentage || 0) < 80}
              />
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/assessments/suitability?clientId=${clientId}&assessmentId=${actionAssessment.id}&returnTo=results`
                  )
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Continue Suitability
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push(`/assessments/suitability?clientId=${clientId}&returnTo=results`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Suitability
            </Button>
          )}

          {assessment?.id && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/assessments/suitability?clientId=${clientId}&assessmentId=${assessment.id}&returnTo=results`
                )
              }
            >
              <FileText className="h-4 w-4 mr-2" />
              View Assessment
            </Button>
          )}

          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {assessment?.version_number ? <Badge>Version {assessment.version_number}</Badge> : null}
          {!isViewingCurrent && currentAssessment?.version_number ? (
            <Badge>Current {currentAssessment.version_number}</Badge>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Suitability Results</h1>
              <p className="text-sm text-gray-600 mt-1">
                {displayName}
                {clientRef ? ` • ${clientRef}` : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{completionDisplay}%</div>
              <div className="text-xs text-gray-600 flex items-center justify-end gap-1">
                <BarChart3 className="h-3 w-3" />
                Completion
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          {reportNotice && (
            <div className="mb-4 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
              {reportNotice}
            </div>
          )}

          {!assessment && (
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
              No suitability assessment found for this client yet.
            </div>
          )}

          {assessment && statusBadge.variant !== 'success' && !assessment.is_final && (
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
              This suitability assessment is still in progress. Complete and submit it to generate FCA-ready reports, or enable “Include warnings” to generate a draft PDF.
            </div>
          )}

          {assessment && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-lg border border-gray-200">
                <div className="text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client
                </div>
                <div className="mt-2 font-medium">{displayName}</div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200">
                <div className="text-gray-500 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Assessment ID
                </div>
                <div className="mt-2 font-mono text-xs break-all">{assessment.id}</div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200">
                <div className="text-gray-500 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Completed
                </div>
                <div className="mt-2 font-medium">
                  {assessment.completed_at
                    ? format(new Date(assessment.completed_at), 'dd MMM yyyy, HH:mm')
                    : assessment.assessment_date
                      ? format(new Date(assessment.assessment_date), 'dd MMM yyyy, HH:mm')
                      : assessment.updated_at
                        ? format(new Date(assessment.updated_at), 'dd MMM yyyy, HH:mm')
                        : '—'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {versionHistory.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Assessment History
              </h2>
              <div className="text-xs text-gray-500">{versionHistory.length} versions</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versionHistory.map((version) => {
                const derived = deriveSuitabilityCompletionState({
                  status: version.status,
                  isFinal: version.is_final,
                  isDraft: version.is_draft,
                  completionPercentage: version.completion_percentage
                })
                const isSelected = assessment?.id === version.id
                const isCurrent = currentAssessment?.id === version.id

                return (
                  <button
                    key={version.id}
                    type="button"
                    className={`flex w-full items-center justify-between p-4 border rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400'
                        : isCurrent
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'hover:bg-gray-50 border-gray-200 cursor-pointer'
                    }`}
                    onClick={() => handleVersionSelect(version)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={isCurrent ? 'success' : 'default'}>v{version.version_number || 1}</Badge>
                      {isSelected && <Badge variant="warning">Viewing</Badge>}
                      <div>
                        <div className="text-sm font-medium">{derived.statusLabel}</div>
                        <div className="text-xs text-gray-500">{formatAssessmentDate(version)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Completion</div>
                        <div className="font-semibold">{derived.completionPercentage}%</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                )
              })}
            </div>

            {!isViewingCurrent && currentAssessment && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Viewing a historical version.{' '}
                <button
                  className="font-medium underline"
                  onClick={() => setAssessment(currentAssessment)}
                  type="button"
                >
                  Return to current version
                </button>
                .
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Generate Reports</h2>
          <p className="text-sm text-gray-600 mt-1">Create FCA-ready PDFs from the completed assessment.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeWarnings}
              onChange={(e) => setIncludeWarnings(e.target.checked)}
            />
            Include data quality warnings (draft PDF)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              disabled={!assessmentId || isGenerating}
              onClick={() => handleGeneratePDFReport('fullReport')}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Full
            </Button>
            <Button
              variant="outline"
              disabled={!assessmentId || isGenerating}
              onClick={() => handleGeneratePDFReport('clientLetter')}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <User className="h-4 w-4 mr-2" />}
              Letter
            </Button>
            <Button
              variant="outline"
              disabled={!assessmentId || isGenerating}
              onClick={() => handleGeneratePDFReport('executiveSummary')}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Summary
            </Button>
            <Button
              variant="outline"
              disabled={!assessmentId || isGenerating}
              onClick={() => handleGeneratePDFReport('complianceReport')}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              FCA
            </Button>
          </div>
          {isGenerating && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between text-xs text-blue-700">
                <span>{generationStage}</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
          {reportReady && !isGenerating && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <div className="font-medium">Report ready</div>
              <div className="text-xs text-green-700 mt-1">
                {reportReady.reportType === 'fullReport' ? 'Full report' : reportReady.reportType} generated and ready to open.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {reportLink ? (
                  <Button
                    href={reportLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setReportReady(null)
                    }}
                  >
                    Open report
                  </Button>
                ) : (
                  <Button
                    onClick={() => setError('Report link unavailable. Please regenerate the report.')}
                  >
                    Open report
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setReportReady(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
