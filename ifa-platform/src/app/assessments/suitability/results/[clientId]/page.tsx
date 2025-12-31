// src/app/assessments/suitability/results/[clientId]/page.tsx
// Suitability results + report generation hub

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  BarChart3,
  FileText,
  Loader2,
  Plus,
  Shield,
  User
} from 'lucide-react'

import { CreateNewVersionButton } from '@/components/suitability/CreateNewVersionButton'
import { deriveSuitabilityCompletionState } from '@/lib/assessments/suitabilityStatus'

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
  className = ''
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'outline'
  className?: string
}) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center px-4 py-2 ${
        variants[variant]
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [includeWarnings, setIncludeWarnings] = useState(false)
  const [reportNotice, setReportNotice] = useState<string | null>(null)

  const assessmentId = assessment?.id || assessmentIdFromQuery

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

  const loadClient = useCallback(async () => {
    const response = await fetch(`/api/clients/${clientId}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.client || data
  }, [clientId])

  const loadAssessment = useCallback(async () => {
    const url = new URL('/api/assessments/suitability', window.location.origin)
    url.searchParams.set('clientId', clientId)
    if (assessmentIdFromQuery) url.searchParams.set('assessmentId', assessmentIdFromQuery)

    const response = await fetch(url.toString())
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to load suitability assessment')
    }

    const data = await response.json()
    return (data?.data || null) as SuitabilityAssessmentSummary | null
  }, [clientId, assessmentIdFromQuery])

  useEffect(() => {
    if (!clientId) return

    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [clientData, assessmentData] = await Promise.all([loadClient(), loadAssessment()])
        setClient(clientData)
        setAssessment(assessmentData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load results')
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [clientId, loadClient, loadAssessment])

  const handleGeneratePDFReport = useCallback(
    async (
      reportType: 'clientLetter' | 'advisorReport' | 'executiveSummary' | 'fullReport' | 'complianceReport' = 'fullReport'
    ) => {
      if (!assessmentId) {
        setError('No assessment found to generate a report for.')
        return
      }

      try {
        setIsGenerating(true)
        setReportNotice(null)
        setError(null)

        const requestBody = {
          assessmentType: 'suitability',
          assessmentId,
          clientId,
          reportType,
          includeWarnings
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

        if (result.inlinePdf) {
          const pdfBytes = Uint8Array.from(atob(result.inlinePdf), (c) => c.charCodeAt(0))
          const blob = new Blob([pdfBytes], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
          return
        }

        if (result.signedUrl) {
          window.open(result.signedUrl, '_blank')
          return
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Report generation failed')
      } finally {
        setIsGenerating(false)
      }
    },
    [assessmentId, clientId, includeWarnings]
  )

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
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading suitability results…</span>
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
          {assessment ? (
            assessment.is_final || statusBadge.variant === 'success' ? (
              <CreateNewVersionButton
                clientId={clientId}
                currentAssessmentId={assessment.id}
                currentVersion={{
                  id: assessment.id,
                  client_id: assessment.client_id,
                  version_number: assessment.version_number,
                  parent_assessment_id: assessment.parent_assessment_id || null,
                  created_at: assessment.created_at || null,
                  updated_at: assessment.updated_at || null,
                  completion_percentage: assessment.completion_percentage,
                  status: assessment.status,
                  is_final: assessment.is_final || null,
                  is_draft: assessment.is_draft || null,
                  is_current: assessment.is_current || null
                }}
                variant="outline"
                size="sm"
                buttonLabel="New Assessment"
                disabled={!assessment.is_final && (assessment.completion_percentage || 0) < 80}
              />
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/assessments/suitability?clientId=${clientId}&assessmentId=${assessment.id}`
                  )
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Continue Suitability
              </Button>
            )
          ) : (
            <Button variant="outline" onClick={() => router.push(`/assessments/suitability?clientId=${clientId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Start Suitability
            </Button>
          )}

          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {assessment?.version_number ? <Badge>Version {assessment.version_number}</Badge> : null}
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
        </CardContent>
      </Card>
    </div>
  )
}
