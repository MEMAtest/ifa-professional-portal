/**
 * Caseload Dashboard Component
 * Shows client distribution and workload metrics across advisors
 * For supervisors and admins only
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, Briefcase, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useFirmUsers } from '../../hooks/useFirmUsers'
import { createClient } from '@/lib/supabase/client'

interface AdvisorCaseload {
  advisorId: string
  advisorName: string
  role: string
  clientCount: number
  activeAssessments: number
  pendingReviews: number
  lastActivityDate?: string
}

interface CaseloadStats {
  totalClients: number
  totalActiveAssessments: number
  totalPendingReviews: number
  averageClientsPerAdvisor: number
  unassignedClients: number
}

export function CaseloadDashboard() {
  const { users, isLoading: usersLoading } = useFirmUsers()
  const [caseloads, setCaseloads] = useState<AdvisorCaseload[]>([])
  const [stats, setStats] = useState<CaseloadStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Filter to only active advisors/supervisors/admins
  const activeAdvisors = useMemo(() => {
    return users?.filter(
      u => u.status === 'active' && ['advisor', 'supervisor', 'admin'].includes(u.role)
    ) ?? []
  }, [users])

  // Fetch caseload data
  const fetchCaseloadData = useCallback(async () => {
    if (!activeAdvisors.length) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const advisorIds = activeAdvisors.map(a => a.id)

      // Fetch client counts per advisor
      const { data: clientCounts, error: clientError } = await supabase
        .from('clients')
        .select('advisor_id')
        .in('advisor_id', advisorIds)

      if (clientError) throw clientError

      // Fetch unassigned clients count
      const { count: unassignedCount, error: unassignedError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .is('advisor_id', null)

      if (unassignedError) throw unassignedError

      // Fetch active assessments per advisor (status in_progress or draft)
      const { data: assessments, error: assessmentError } = await supabase
        .from('suitability_assessments')
        .select('advisor_id, status')
        .in('advisor_id', advisorIds)
        .in('status', ['in_progress', 'draft'])

      if (assessmentError) throw assessmentError

      // Fetch pending file reviews per advisor
      const { data: reviews } = await supabase
        .from('file_reviews')
        .select('assigned_to, status')
        .in('assigned_to', advisorIds)
        .eq('status', 'pending')

      // Count per advisor
      const clientCountMap = new Map<string, number>()
      const assessmentCountMap = new Map<string, number>()
      const reviewCountMap = new Map<string, number>()

      clientCounts?.forEach((c: { advisor_id: string | null }) => {
        if (c.advisor_id) {
          clientCountMap.set(c.advisor_id, (clientCountMap.get(c.advisor_id) || 0) + 1)
        }
      })

      assessments?.forEach((a: { advisor_id: string | null; status: string }) => {
        if (a.advisor_id) {
          assessmentCountMap.set(a.advisor_id, (assessmentCountMap.get(a.advisor_id) || 0) + 1)
        }
      })

      reviews?.forEach((r: { assigned_to: string | null; status: string }) => {
        if (r.assigned_to) {
          reviewCountMap.set(r.assigned_to, (reviewCountMap.get(r.assigned_to) || 0) + 1)
        }
      })

      // Build caseload data
      const caseloadData: AdvisorCaseload[] = activeAdvisors.map(advisor => ({
        advisorId: advisor.id,
        advisorName: advisor.fullName,
        role: advisor.role,
        clientCount: clientCountMap.get(advisor.id) || 0,
        activeAssessments: assessmentCountMap.get(advisor.id) || 0,
        pendingReviews: reviewCountMap.get(advisor.id) || 0,
        lastActivityDate: advisor.lastLoginAt?.toISOString()
      }))

      // Sort by client count descending
      caseloadData.sort((a, b) => b.clientCount - a.clientCount)

      // Calculate stats
      const totalClients = Array.from(clientCountMap.values()).reduce((sum, count) => sum + count, 0)
      const totalActiveAssessments = Array.from(assessmentCountMap.values()).reduce((sum, count) => sum + count, 0)
      const totalPendingReviews = Array.from(reviewCountMap.values()).reduce((sum, count) => sum + count, 0)
      const advisorsWithClients = caseloadData.filter(c => c.clientCount > 0).length

      setStats({
        totalClients: totalClients + (unassignedCount || 0),
        totalActiveAssessments,
        totalPendingReviews,
        averageClientsPerAdvisor: advisorsWithClients > 0
          ? Math.round(totalClients / advisorsWithClients * 10) / 10
          : 0,
        unassignedClients: unassignedCount || 0
      })

      setCaseloads(caseloadData)
    } catch (err) {
      console.error('Error fetching caseload data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load caseload data')
    } finally {
      setIsLoading(false)
    }
  }, [activeAdvisors, supabase])

  useEffect(() => {
    if (!usersLoading && activeAdvisors.length > 0) {
      fetchCaseloadData()
    } else if (!usersLoading) {
      setIsLoading(false)
    }
  }, [usersLoading, activeAdvisors.length, fetchCaseloadData])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  if (usersLoading || isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-500">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Clients</div>
                <div className="text-2xl font-semibold">{stats?.totalClients ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Active Assessments</div>
                <div className="text-2xl font-semibold">{stats?.totalActiveAssessments ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Avg Clients/Advisor</div>
                <div className="text-2xl font-semibold">{stats?.averageClientsPerAdvisor ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${(stats?.unassignedClients ?? 0) > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <AlertTriangle className={`h-6 w-6 ${(stats?.unassignedClients ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <div className="text-sm text-gray-500">Unassigned Clients</div>
                <div className={`text-2xl font-semibold ${(stats?.unassignedClients ?? 0) > 0 ? 'text-red-600' : ''}`}>
                  {stats?.unassignedClients ?? 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advisor Caseload Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Advisor Caseloads
            </CardTitle>
            <CardDescription>
              Client distribution and workload across your team
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchCaseloadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {caseloads.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No advisors found in your firm
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Advisor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Clients</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Active Assessments</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Pending Reviews</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {caseloads.map(advisor => (
                    <tr key={advisor.advisorId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {advisor.advisorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{advisor.advisorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          advisor.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          advisor.role === 'supervisor' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {advisor.role.charAt(0).toUpperCase() + advisor.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${advisor.clientCount === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {advisor.clientCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${advisor.activeAssessments === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
                          {advisor.activeAssessments}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${advisor.pendingReviews === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                          {advisor.pendingReviews}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(advisor.lastActivityDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workload Distribution Chart (simple bar visualization) */}
      {caseloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workload Distribution</CardTitle>
            <CardDescription>Visual comparison of client assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {caseloads.map(advisor => {
                const maxClients = Math.max(...caseloads.map(c => c.clientCount), 1)
                const percentage = (advisor.clientCount / maxClients) * 100

                return (
                  <div key={advisor.advisorId} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700 truncate">
                      {advisor.advisorName}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-semibold text-gray-900">
                      {advisor.clientCount}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
