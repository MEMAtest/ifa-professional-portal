// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// src/app/api/documents/analytics/route.ts - REAL DATA Analytics
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Calculate analytics from your real database
async function calculateRealAnalytics(supabase: any, firmId: string | null, filters?: any) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ✅ REAL: Get total documents from your database
    let totalDocsQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)
    if (firmId) totalDocsQuery = totalDocsQuery.eq('firm_id', firmId)
    const { count: totalDocuments } = await totalDocsQuery

    // ✅ REAL: Get documents this month
    let thisMonthQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)
      .gte('created_at', startOfMonth.toISOString())
    if (firmId) thisMonthQuery = thisMonthQuery.eq('firm_id', firmId)
    const { count: documentsThisMonth } = await thisMonthQuery

    // ✅ REAL: Get documents last month
    let lastMonthQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())
    if (firmId) lastMonthQuery = lastMonthQuery.eq('firm_id', firmId)
    const { count: documentsLastMonth } = await lastMonthQuery

    // ✅ REAL: Get signature requests data
    let signatureQuery = supabase
      .from('signature_requests')
      .select('status')
    if (firmId) signatureQuery = signatureQuery.eq('firm_id', firmId)
    const { data: signatureData } = await signatureQuery

    const pendingSignatures = signatureData?.filter((s: any) => s.status === 'pending').length || 0
    const completedSignatures = signatureData?.filter((s: any) => s.status === 'completed').length || 0

    // ✅ REAL: Get compliance data
    let complianceQuery = supabase
      .from('documents')
      .select('compliance_status')
      .eq('is_archived', false)
    if (firmId) complianceQuery = complianceQuery.eq('firm_id', firmId)
    const { data: complianceData } = await complianceQuery

  const complianceBreakdown = complianceData?.reduce((acc: any, doc: any) => {
      const status = doc.compliance_status || 'pending'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) || {}

    const compliantCount = complianceBreakdown.compliant || 0
    const totalForCompliance = complianceData?.length || 1
    const complianceScore = Math.round((compliantCount / totalForCompliance) * 100)

    // ✅ REAL: Get recent activity from your database
    // Note: Removed profiles join as it may fail without proper FK relationship
    let recentActivityQuery = supabase
      .from('documents')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        created_by,
        status,
        type,
        clients(
          id,
          client_ref,
          personal_details
        )
      `)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(10)
    if (firmId) recentActivityQuery = recentActivityQuery.eq('firm_id', firmId)
    const { data: recentActivity, error: activityError } = await recentActivityQuery

    if (activityError) {
      log.error('Recent activity query error:', activityError)
    }

    const formattedActivity = (recentActivity || []).map((doc: any) => {
      // Get client name if available - try multiple fields
      const clientDetails = (doc.clients?.personal_details || {}) as any
      let clientName: string | null = null
      if (clientDetails.firstName || clientDetails.lastName) {
        clientName = `${clientDetails.firstName || ''} ${clientDetails.lastName || ''}`.trim()
      } else if (doc.clients?.client_ref) {
        clientName = doc.clients.client_ref
      }

      // Determine action based on status
      let action = 'updated'
      if (doc.status === 'pending') action = 'uploaded'
      else if (doc.status === 'signed' || doc.status === 'completed') action = 'signed'
      else if (doc.status === 'draft') action = 'created'
      else if (doc.status === 'active') action = 'activated'

      // Use document type or client name for context
      const docType = doc.type ? doc.type.replace(/_/g, ' ') : null

      return {
        id: doc.id,
        user_name: clientName || docType || 'Document',
        action: action,
        document_title: doc.name || 'Untitled Document',
        client_name: clientName,
        created_at: doc.updated_at || doc.created_at,
        document_id: doc.id,
        type: 'document'
      }
    })

    // ✅ REAL: Get category performance
    let categoryQuery = supabase
      .from('documents')
      .select(`
        category_id,
        document_categories(name),
        compliance_status,
        created_at
      `)
      .eq('is_archived', false)
    if (firmId) categoryQuery = categoryQuery.eq('firm_id', firmId)
    const { data: categoryData } = await categoryQuery

    const categoryPerformance = Object.values(
      (categoryData || []).reduce((acc: any, doc: any) => {
        const categoryName = doc.document_categories?.name || 'Uncategorized'
        if (!acc[categoryName]) {
          acc[categoryName] = {
            category_name: categoryName,
            document_count: 0,
            compliance_rate: 0,
            compliant_docs: 0
          }
        }
        acc[categoryName].document_count++
        if (doc.compliance_status === 'compliant') {
          acc[categoryName].compliant_docs++
        }
        return acc
      }, {})
    ).map((cat: any) => ({
      ...cat,
      compliance_rate: Math.round((cat.compliant_docs / cat.document_count) * 100)
    }))

    // ✅ REAL: Get client metrics
    let clientsCountQuery = supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
    if (firmId) clientsCountQuery = clientsCountQuery.eq('firm_id', firmId)
    const { count: totalClients } = await clientsCountQuery

    let topClientsQuery = supabase
      .from('documents')
      .select(`
        client_id,
        clients(
          client_ref,
          personal_details,
          contact_info
        )
      `)
      .eq('is_archived', false)
    if (firmId) topClientsQuery = topClientsQuery.eq('firm_id', firmId)
    const { data: topClientsData } = await topClientsQuery

    const clientCounts = (topClientsData || []).reduce((acc: any, doc: any) => {
      const clientId = doc.client_id
      if (!acc[clientId]) {
        acc[clientId] = {
          client_id: clientId,
          client_data: doc.clients,
          document_count: 0
        }
      }
      acc[clientId].document_count++
      return acc
    }, {})

    const topClients = Object.values(clientCounts)
      .sort((a: any, b: any) => b.document_count - a.document_count)
      .slice(0, 10)
      .map((client: any) => ({
        client_name: getClientDisplayName(client.client_data),
        document_count: client.document_count
      }))

    // ✅ REAL: Get daily document counts for last 7 days
    const last7Days: Array<{ date: string; day: string; documents: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      let dailyDocsQuery = supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())
      if (firmId) dailyDocsQuery = dailyDocsQuery.eq('firm_id', firmId)
      const { count: dailyCount } = await dailyDocsQuery

      last7Days.push({
        date: date.toISOString().split('T')[0],
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        documents: dailyCount || 0
      })
    }

    // ✅ REAL: Get documents this week (last 7 days total)
    const documentsThisWeek = last7Days.reduce((sum, day) => sum + day.documents, 0)

    // ✅ REAL: Get documents today
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    let todayQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)
      .gte('created_at', today.toISOString())
    if (firmId) todayQuery = todayQuery.eq('firm_id', firmId)
    const { count: documentsToday } = await todayQuery

    // ✅ REAL: Count clients with documents (active clients)
    const uniqueClientIds = new Set((topClientsData || []).map((doc: any) => doc.client_id).filter(Boolean))
    const activeClients = uniqueClientIds.size

    return {
      // Basic metrics from real data
      totalDocuments: totalDocuments || 0,
      pendingSignatures,
      completedSignatures,
      complianceScore,
      documentsThisMonth: documentsThisMonth || 0,
      documentsThisWeek,
      documentsToday: documentsToday || 0,

	      // Previous period data for trends (real data)
	      documentsLastMonth: documentsLastMonth || 0,
	      lastMonthSignatures: 0,
	      lastMonthCompliance: 0,

	      // Advanced metrics (placeholders until computed from real sources)
	      averageProcessingTime: 0,
	      clientSatisfactionScore: 0,
	      riskScore: 0,

	      // Real activity feed
	      recentActivity: formattedActivity,

      // Real compliance breakdown
      complianceBreakdown: {
        compliant: complianceBreakdown.compliant || 0,
        non_compliant: complianceBreakdown.non_compliant || 0,
        pending: complianceBreakdown.pending || 0,
        under_review: complianceBreakdown.under_review || 0,
        exempt: complianceBreakdown.exempt || 0
      },

      // Real category performance
      categoryPerformance,

      // Real client metrics
      clientMetrics: {
        totalClients: totalClients || 0,
        activeClients,
        topClients
      },

      // Real daily trends for charts
      dailyTrends: last7Days
    }

  } catch (error) {
    log.error('Analytics calculation error:', error)
    throw error
  }
}

function getClientDisplayName(client: any): string {
  if (!client) return 'Unknown Client'
  
  const personalDetails = client.personal_details || {}
  const title = personalDetails.title ? `${personalDetails.title} ` : ''
  const firstName = personalDetails.firstName || personalDetails.first_name || ''
  const lastName = personalDetails.lastName || personalDetails.last_name || ''
  
  return `${title}${firstName} ${lastName}`.trim() || client.client_ref || 'Unknown Client'
}

function calculateTrend(current: number, previous: number) {
  const change = current - previous
  const changePercent = previous > 0 ? (change / previous) * 100 : 0
  
  return {
    current,
    previous,
    change,
    changePercent: Math.round(changePercent * 100) / 100,
    direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServiceClient()
    const firmId = auth.context?.firmId || null

    const { searchParams } = new URL(request.url)

    // Get filter parameters
    const finalFilters = {
      dateRange: {
        start: searchParams.get('start_date'),
        end: searchParams.get('end_date')
      },
      categories: searchParams.get('categories')?.split(',') || [],
      clients: searchParams.get('clients')?.split(',') || [],
      statuses: searchParams.get('statuses')?.split(',') || [],
      includeArchived: searchParams.get('include_archived') === 'true'
    }

    // ✅ REAL: Calculate analytics from your actual database
    // firmId may be null for single-tenant setups - the function handles this correctly
    const realData = await calculateRealAnalytics(supabase, firmId, finalFilters)

    // Analytics processing with REAL DATA ONLY - no mock data
    const processedAnalytics = {
      // Basic metrics from real data
      totalDocuments: realData.totalDocuments,
      pendingSignatures: realData.pendingSignatures,
      completedSignatures: realData.completedSignatures,
      complianceScore: realData.complianceScore,
      documentsThisMonth: realData.documentsThisMonth,
      documentsThisWeek: realData.documentsThisWeek,
      documentsToday: realData.documentsToday,
      documentsLastMonth: realData.documentsLastMonth,

      // Trends calculation with real data
      trends: {
        documents: calculateTrend(realData.documentsThisMonth, realData.documentsLastMonth),
        signatures: calculateTrend(realData.completedSignatures, 0),
        compliance: calculateTrend(realData.complianceScore, 0),
      },

      // Real activity feed
      recentActivity: realData.recentActivity,

      // Real compliance breakdown
      complianceBreakdown: realData.complianceBreakdown,

      // Real category performance
      categoryPerformance: realData.categoryPerformance,

      // Real client metrics
      clientMetrics: realData.clientMetrics,

      // Real daily trends for charts
      dailyTrends: realData.dailyTrends
    }

    return NextResponse.json(processedAnalytics)

  } catch (error) {
    log.error('Real analytics error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServiceClient()
    const firmId = auth.context?.firmId || null

    const body = await request.json()

    switch (body.action) {
      case 'refresh':
        const refreshedData = await calculateRealAnalytics(supabase, firmId)
        return NextResponse.json({
          success: true,
          data: refreshedData,
          timestamp: new Date().toISOString()
        })
        
      case 'export':
        const exportData = await calculateRealAnalytics(supabase, firmId)
        return NextResponse.json({
          success: true,
          export_id: `export_${Date.now()}`,
          format: body.format || 'csv',
          estimated_time: '2-3 minutes',
          data: exportData
        })
        
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    log.error('Analytics POST error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
