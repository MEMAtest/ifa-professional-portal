// =====================================================
// src/app/assessments/dashboard/incomplete/page.tsx
// Drill-down: all in-progress assessments across clients
// =====================================================

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, Search } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { getAssessmentResumeUrl, normalizeAssessmentType } from '@/lib/assessments/routing'

interface IncompleteAssessment {
  id: string
  client_id: string
  client_name: string
  client_ref?: string | null
  assessment_type: string
  progress_percentage: number
  status: string
  last_updated: string
}

function getAssessmentLabel(type: string): string {
  switch (normalizeAssessmentType(type)) {
    case 'atr':
      return 'Attitude to Risk'
    case 'cfl':
      return 'Capacity for Loss'
    case 'persona':
      return 'Investor Persona'
    case 'suitability':
      return 'Suitability'
    case 'monte_carlo':
      return 'Monte Carlo'
    case 'cashflow':
      return 'Cash Flow'
    default:
      return type
  }
}

export default function IncompleteAssessmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [assessments, setAssessments] = useState<IncompleteAssessment[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/assessments/incomplete?limit=200')
      if (!res.ok) {
        throw new Error(`Failed to load incomplete assessments (${res.status})`)
      }

      const json = await res.json()
      if (!json?.success) {
        throw new Error(json?.error || 'Failed to load incomplete assessments')
      }

      setAssessments(Array.isArray(json.assessments) ? json.assessments : [])
      setTotalCount(typeof json.count === 'number' ? json.count : 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load incomplete assessments')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  // Support drilldown from dashboard charts: /assessments/dashboard/incomplete?type=atr
  useEffect(() => {
    if (typeFilter !== 'all') return
    const type = (searchParams.get('type') || '').trim().toLowerCase()
    if (!type) return

    const normalized = normalizeAssessmentType(type)
    const allowed = new Set(['atr', 'cfl', 'persona', 'suitability', 'monte_carlo', 'cashflow'])
    if (allowed.has(normalized)) {
      setTypeFilter(normalized)
    }
  }, [searchParams, typeFilter])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assessments.filter((row) => {
      if (typeFilter !== 'all' && normalizeAssessmentType(row.assessment_type) !== typeFilter) {
        return false
      }
      if (!query) return true
      const haystack = `${row.client_name} ${row.client_ref || ''} ${getAssessmentLabel(row.assessment_type)}`
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [assessments, search, typeFilter])

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading incomplete assessments…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Incomplete Assessments</h1>
            <Badge variant="secondary">{totalCount}</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            In-progress work items across clients (drill-down from the Assessment Dashboard).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client, reference, or assessment type…"
                className="pl-9"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All assessment types</option>
              <option value="suitability">Suitability</option>
              <option value="atr">ATR</option>
              <option value="cfl">CFL</option>
              <option value="persona">Investor Persona</option>
              <option value="monte_carlo">Monte Carlo</option>
              <option value="cashflow">Cash Flow</option>
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p className="text-sm">No incomplete assessments found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((row) => {
                const normalizedType = normalizeAssessmentType(row.assessment_type)
                return (
                  <div
                    key={row.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {row.client_name}
                        {row.client_ref ? (
                          <span className="text-gray-500 font-normal"> • {row.client_ref}</span>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-600">{getAssessmentLabel(normalizedType)}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-44">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{row.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${row.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(getAssessmentResumeUrl(normalizedType, row.client_id))}
                      >
                        Resume
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
