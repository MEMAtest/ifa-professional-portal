'use client'

// Assessment hub: overview, versioning, export, and history.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInDays } from 'date-fns'
import {
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react'

import { clientService } from '@/services/ClientService'
import { createClient } from '@/lib/supabase/client'
import clientLogger from '@/lib/logging/clientLogger'
import type { Client } from '@/types/client'
import type { AssessmentProgress, AssessmentHistory, ComplianceAlert } from '@/types/assessment'
import { deriveSuitabilityCompletionState } from '@/lib/assessments/suitabilityStatus'

import { assessmentTypes } from '@/components/assessments/client-hub/assessmentTypes'
import { calculateOverallProgress, getNextAssessment } from '@/components/assessments/client-hub/utils'
import { Alert, Badge, Button, Card } from '@/components/assessments/client-hub/ui'
import { AssessmentHubHeader } from '@/components/assessments/client-hub/components/AssessmentHubHeader'
import { AssessmentHubSummaryCards } from '@/components/assessments/client-hub/components/AssessmentHubSummaryCards'
import { AssessmentHubOverviewTab } from '@/components/assessments/client-hub/components/AssessmentHubOverviewTab'
import { AssessmentHubHistoryTab } from '@/components/assessments/client-hub/components/AssessmentHubHistoryTab'
import { AssessmentHubDocumentsTab } from '@/components/assessments/client-hub/components/AssessmentHubDocumentsTab'

export function AssessmentClientHubPage(props: { clientId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const { clientId } = props

  const loadingRef = useRef(false)
  const mountedRef = useRef(true)

  const [client, setClient] = useState<Client | null>(null)
  const [assessmentProgress, setAssessmentProgress] = useState<AssessmentProgress[]>([])
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistory[]>([])
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([])
  const [assessmentVersions, setAssessmentVersions] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'documents'>('overview')

  const parseCompletionPercentage = (raw: unknown): number | null => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed) return null
      const parsed = Number(trimmed)
      if (Number.isFinite(parsed)) return parsed
      const floatParsed = parseFloat(trimmed.replace(/,/g, ''))
      return Number.isFinite(floatParsed) ? floatParsed : null
    }
    return null
  }

  const checkComplianceAlerts = useCallback(
    (progress: AssessmentProgress[], versions: Record<string, any>) => {
      const alerts: ComplianceAlert[] = []
      const now = new Date()

      const requiredTypes: Array<'atr' | 'cfl' | 'persona' | 'suitability'> = ['atr', 'cfl', 'persona', 'suitability']
      const progressByType = new Map<string, AssessmentProgress>()

      const normalizeProgressType = (value: string) => {
        const normalized = value.replace('-', '_')
        return normalized === 'investor_persona' ? 'persona' : normalized
      }

      progress.forEach((p) => {
        const normalizedType = normalizeProgressType(String(p.assessment_type || ''))
        progressByType.set(normalizedType, p)
      })

      for (const type of requiredTypes) {
        const progressRow = progressByType.get(type)
        const assessment = (assessmentTypes as any)[type]

        if (!progressRow || progressRow.status !== 'completed') {
          alerts.push({
            id: `missing-${type}`,
            clientId,
            type: 'incomplete',
            assessmentType: type,
            message: `${assessment?.name || type} assessment is not completed`,
            severity: 'medium',
            createdAt: new Date().toISOString()
          })
          continue
        }

        if (progressRow.completed_at) {
          const completedDate = new Date(progressRow.completed_at)
          const monthsSince = differenceInDays(now, completedDate) / 30
          if (monthsSince > 12) {
            alerts.push({
              id: `overdue-${type}`,
              clientId,
              type: 'overdue',
              assessmentType: type,
              message: `${assessment?.name || type} assessment is overdue for annual review`,
              severity: 'high',
              createdAt: new Date().toISOString()
            })
          }
        }
      }

      const atrScore = typeof versions?.atr?.score === 'number' ? versions.atr.score : null
      const cflScore = typeof versions?.cfl?.score === 'number' ? versions.cfl.score : null

      if (atrScore !== null && cflScore !== null && Math.abs(atrScore - cflScore) >= 3) {
        alerts.push({
          id: 'risk-mismatch',
          clientId,
          type: 'mismatch',
          assessmentType: 'risk',
          message: `ATR and CFL scores are misaligned (${atrScore} vs ${cflScore}).`,
          severity: 'high',
          createdAt: new Date().toISOString()
        })
      }

      const suitabilityCompletion = versions?.suitability?.completionPercentage
      if (typeof suitabilityCompletion === 'number' && suitabilityCompletion < 100) {
        alerts.push({
          id: 'suitability-incomplete',
          clientId,
          type: 'incomplete',
          assessmentType: 'suitability',
          message: `Suitability assessment is ${Math.round(suitabilityCompletion)}% complete.`,
          severity: 'medium',
          createdAt: new Date().toISOString()
        })
      }

      setComplianceAlerts(alerts)
    },
    [clientId]
  )

  const loadAssessmentVersions = useCallback(async () => {
    const versions: Record<string, any> = {}

    // Load Suitability version using the same API as the results page (single source of truth).
    try {
      const url = new URL('/api/assessments/suitability', window.location.origin)
      url.searchParams.set('clientId', clientId)
      const response = await fetch(url.toString())
      if (response.ok) {
        const json = await response.json().catch(() => null)
        const row = (json?.data || null) as any
        if (row?.id) {
          const completion = parseCompletionPercentage(row.completion_percentage)
          versions.suitability = {
            version: row.version_number || 1,
            date: row.completed_at || row.updated_at || row.assessment_date || null,
            category: Number.isFinite(completion as number) ? `${Math.round(completion as number)}% Complete` : row.status,
            completionPercentage: Number.isFinite(completion as number) ? Math.round(completion as number) : null,
            status: row.status,
            isFinal: row.is_final,
            isDraft: row.is_draft,
            isCurrent: row.is_current
          }
        }
      }
    } catch (error) {
      clientLogger.error('Error loading Suitability versions:', error)
    }

    // Load ATR versions
    try {
      const { data: atrData } = await supabase
        .from('atr_assessments')
        .select('id, version, assessment_date, risk_category, total_score, is_current')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1)

      if (atrData && atrData[0]) {
        versions.atr = {
          version: atrData[0].version || 1,
          date: atrData[0].assessment_date,
          category: atrData[0].risk_category,
          score: atrData[0].total_score,
          isCurrent: atrData[0].is_current
        }
      }
    } catch (error) {
      clientLogger.error('Error loading ATR versions:', error)
    }

    // Load CFL versions
    try {
      const { data: cflData } = await supabase
        .from('cfl_assessments')
        .select('id, version, assessment_date, capacity_category, total_score, is_current')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1)

      if (cflData && cflData[0]) {
        versions.cfl = {
          version: cflData[0].version || 1,
          date: cflData[0].assessment_date,
          category: cflData[0].capacity_category,
          score: cflData[0].total_score,
          isCurrent: cflData[0].is_current
        }
      }
    } catch (error) {
      clientLogger.error('Error loading CFL versions:', error)
    }

    // Load Persona versions
    try {
      const { data: personaData } = await supabase
        .from('persona_assessments')
        .select('id, version, assessment_date, persona_type, confidence, is_current')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1)

      if (personaData && personaData[0]) {
        versions.persona = {
          version: personaData[0].version || 1,
          date: personaData[0].assessment_date,
          type: personaData[0].persona_type,
          confidence: personaData[0].confidence,
          isCurrent: personaData[0].is_current
        }
      }
    } catch (error) {
      clientLogger.error('Error loading Persona versions:', error)
    }

    setAssessmentVersions(versions)
  }, [clientId, supabase])

  const loadAllData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true

    try {
      setIsLoading(true)
      setError(null)

      const clientData = await clientService.getClientById(clientId)
      if (!mountedRef.current) return
      setClient(clientData)

      const { data: progressData, error: progressError } = await supabase
        .from('assessment_progress')
        .select('*')
        .eq('client_id', clientId)

      if (progressError) throw progressError
      if (!mountedRef.current) return

      const byType = new Map<string, any>()
      for (const row of progressData || []) {
        const normalizedType = String(row.assessment_type || '').replace('-', '_')
        const existing = byType.get(normalizedType)
        if (!existing) {
          byType.set(normalizedType, row)
          continue
        }

        const existingUpdated = new Date(existing.updated_at || existing.last_updated || 0).getTime()
        const rowUpdated = new Date(row.updated_at || row.last_updated || 0).getTime()
        if (rowUpdated > existingUpdated) {
          byType.set(normalizedType, row)
        }
      }

      const normalizedProgress: AssessmentProgress[] = Array.from(byType.values()).map((p: any) => {
        const status: AssessmentProgress['status'] =
          p.status === 'completed' || p.status === 'in_progress' || p.status === 'not_started' ? p.status : 'not_started'

        const rawPct = typeof p.progress_percentage === 'number' ? p.progress_percentage : 0
        const progressPct = status === 'completed' ? (rawPct > 0 ? rawPct : 100) : rawPct

        return {
          id: p.id,
          client_id: p.client_id ?? clientId,
          assessment_type: String(p.assessment_type || '').replace('-', '_'),
          status,
          progress_percentage: progressPct,
          last_updated: p.last_updated || p.updated_at || new Date().toISOString(),
          started_at: p.started_at || undefined,
          completed_at: p.completed_at || undefined,
          metadata: (p.metadata as any) || undefined
        }
      })

      setAssessmentProgress(normalizedProgress)

      const { data: historyData, error: historyError } = await supabase
        .from('assessment_history')
        .select('*')
        .eq('client_id', clientId)
        .order('performed_at', { ascending: false })
        .limit(50)

      if (historyError) throw historyError
      if (!mountedRef.current) return

      const normalizedHistory: AssessmentHistory[] = (historyData || []).map((h: any) => ({
        id: h.id,
        client_id: h.client_id ?? clientId,
        assessment_id: h.assessment_id ?? undefined,
        assessment_type: String(h.assessment_type || ''),
        action: String(h.action || ''),
        performed_at: h.performed_at || h.created_at || new Date().toISOString(),
        performed_by: h.performed_by ?? undefined,
        changes: (h.changes as any) || undefined,
        metadata: (h.metadata as any) || undefined
      }))

      setAssessmentHistory(normalizedHistory)

      await loadAssessmentVersions()
    } catch (err) {
      clientLogger.error('Error loading data:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load assessment data')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        loadingRef.current = false
      }
    }
  }, [clientId, loadAssessmentVersions, supabase])

  useEffect(() => {
    if (!assessmentProgress.length) {
      setComplianceAlerts([])
      return
    }
    checkComplianceAlerts(assessmentProgress, assessmentVersions)
  }, [assessmentProgress, assessmentVersions, checkComplianceAlerts])

  useEffect(() => {
    mountedRef.current = true
    if (clientId) loadAllData()
    return () => {
      mountedRef.current = false
    }
  }, [clientId, loadAllData])

  const handleStartAssessment = (assessmentId: string) => {
    const assessment = (assessmentTypes as any)[assessmentId]
    if (!assessment) return

    let route = ''
    switch (assessmentId) {
      case 'suitability':
        route = `/assessments/suitability?clientId=${clientId}`
        break
      case 'monte_carlo':
        route = `/monte-carlo?clientId=${clientId}`
        break
      case 'cashflow':
        route = `/cashflow?clientId=${clientId}`
        break
      default:
        route = `${assessment.route}?clientId=${clientId}`
    }

    router.push(route)
  }

  const handleViewResults = (assessmentId: string) => {
    const assessment = (assessmentTypes as any)[assessmentId]
    if (!assessment) return
    router.push(`${assessment.resultsRoute}/${clientId}`)
  }

  const handleNewAssessment = () => {
    router.push(`/assessments/suitability?clientId=${clientId}`)
  }

  const handleExportExcel = async () => {
    try {
      const endpoint = `/api/assessments/report/${clientId}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'excel' })
      })

      if (!response.ok) throw new Error('Failed to generate report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const token = client?.clientRef || clientId
      const filename = `assessment-report-${token}.xlsx`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 15000)
    } catch (error) {
      clientLogger.error('Error exporting report:', error)
      alert('Failed to export report')
    }
  }

  const getAssessmentStatus = (assessmentId: string) => {
    const normalizedId = assessmentId.replace('-', '_')
    const progress = assessmentProgress.find((p) => String(p.assessment_type || '').replace('-', '_') === normalizedId)
    const versionInfo = assessmentVersions[assessmentId]

    if (assessmentId === 'suitability' && versionInfo) {
      const derived = deriveSuitabilityCompletionState({
        status: versionInfo.status,
        isFinal: versionInfo.isFinal,
        isDraft: versionInfo.isDraft,
        completionPercentage: versionInfo.completionPercentage
      })

      return {
        status: derived.lifecycleStatus,
        percentage: derived.completionPercentage,
        date: versionInfo.date || null,
        version: versionInfo.version || null,
        versionInfo
      }
    }

    if (assessmentId === 'suitability' && !versionInfo) {
      return { status: 'not_started', percentage: 0, date: null, version: null, versionInfo: null }
    }

    if (!progress) return { status: 'not_started', percentage: 0, date: null, version: null }

    let status = progress.status
    if (progress.progress_percentage === 100 && status !== 'completed') {
      status = 'completed'
    } else if (progress.progress_percentage > 0 && progress.progress_percentage < 100 && status === 'not_started') {
      status = 'in_progress'
    }

    return {
      status,
      percentage: progress.progress_percentage || 0,
      date: progress.completed_at || progress.last_updated,
      version: versionInfo?.version || null,
      versionInfo
    }
  }

  const getStatusBadge = (status: string, version?: number | null) => {
    if (status === 'completed' && version) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="success">Complete</Badge>
          <Badge variant="secondary">v{version}</Badge>
        </div>
      )
    }

    switch (status) {
      case 'completed':
        return <Badge variant="success">Complete</Badge>
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>
      default:
        return <Badge variant="secondary">Not Started</Badge>
    }
  }

  const completedAssessments = assessmentProgress
    .filter((p) => p.assessment_type !== 'suitability' && (p.status === 'completed' || p.progress_percentage === 100))
    .map((p) => p.assessment_type.replace('-', '_'))

  const suitabilityVersion = assessmentVersions.suitability
  if (suitabilityVersion) {
    const derived = deriveSuitabilityCompletionState({
      status: suitabilityVersion.status,
      isFinal: suitabilityVersion.isFinal,
      isDraft: suitabilityVersion.isDraft,
      completionPercentage: suitabilityVersion.completionPercentage
    })

    const isComplete = derived.lifecycleStatus === 'completed'
    const normalized = 'suitability'
    const already = completedAssessments.includes(normalized)
    if (isComplete && !already) completedAssessments.push(normalized)
    if (!isComplete && already) {
      const idx = completedAssessments.indexOf(normalized)
      if (idx >= 0) completedAssessments.splice(idx, 1)
    }
  }

  const inProgressCount = (() => {
    const base = assessmentProgress.filter(
      (p) =>
        p.assessment_type !== 'suitability' &&
        (p.status === 'in_progress' || (p.progress_percentage > 0 && p.progress_percentage < 100))
    ).length

    if (!suitabilityVersion) return base
    const derived = deriveSuitabilityCompletionState({
      status: suitabilityVersion.status,
      isFinal: suitabilityVersion.isFinal,
      isDraft: suitabilityVersion.isDraft,
      completionPercentage: suitabilityVersion.completionPercentage
    })
    return derived.lifecycleStatus === 'in_progress' ? base + 1 : base
  })()

  const overallProgress = calculateOverallProgress(completedAssessments)
  const nextAssessment = getNextAssessment(completedAssessments)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assessment data...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assessment Data</h2>
            <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
            <Button onClick={() => router.push('/assessments')} variant="outline">
              Back to Assessments
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AssessmentHubHeader
          clientId={clientId}
          clientToken={client.clientRef || clientId}
          clientName={`${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || client.clientRef || 'Client'}
          clientRef={client.clientRef || null}
          clientEmail={client.contactInfo?.email || null}
          onBack={() => router.push('/assessments')}
          onNewAssessment={handleNewAssessment}
          onRefresh={loadAllData}
          onExportExcel={handleExportExcel}
        />

        <Alert variant="success" className="mb-4">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Flexible Assessment System</h3>
              <p className="text-sm">
                All assessments are independent - complete them in any order that suits your workflow. Completed assessments show
                version numbers and can be clicked to view full history.
              </p>
            </div>
          </div>
        </Alert>

        <AssessmentHubSummaryCards
          overallProgress={overallProgress}
          completedCount={completedAssessments.length}
          totalCount={Object.keys(assessmentTypes).length}
          inProgressCount={inProgressCount}
          nextSuggestedLabel={nextAssessment?.shortName || 'All Complete'}
        />

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documents
              {complianceAlerts.length > 0 && <span className="absolute -top-1 -right-2 h-2 w-2 bg-red-500 rounded-full"></span>}
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <AssessmentHubOverviewTab
            getAssessmentStatus={getAssessmentStatus}
            getStatusBadge={getStatusBadge}
            onStartAssessment={handleStartAssessment}
            onViewResults={handleViewResults}
          />
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment History</h2>
            <AssessmentHubHistoryTab history={assessmentHistory} />
          </div>
        )}

        {activeTab === 'documents' && (
          <AssessmentHubDocumentsTab
            clientId={clientId}
            complianceAlerts={complianceAlerts}
          />
        )}
      </div>
    </div>
  )
}

export default AssessmentClientHubPage
