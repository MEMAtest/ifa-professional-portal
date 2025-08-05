// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// File: src/app/api/dashboard/stats/route.ts
// API Route: Dashboard Statistics for Document Vault
// FIXED: All TypeScript errors resolved
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ===================================================================
// TYPES (Based on your existing schema)
// ===================================================================

interface DashboardStats {
  // Overview metrics
  totalDocuments: number
  pendingSignatures: number
  signedThisWeek: number
  averageTimeToSign: number // in hours
  
  // Document breakdown
  documentsByType: Array<{
    type: string
    count: number
    percentage: number
  }>
  
  // Category breakdown
  documentsByCategory: Array<{
    category: string
    count: number
    compliance_rate: number
  }>
  
  // Recent activity
  recentActivity: Array<{
    id: string
    action: string // 'created', 'sent', 'viewed', 'signed'
    documentName: string
    clientName: string
    timestamp: string
    status: string
  }>
  
  // Performance metrics
  metrics: {
    documentsThisMonth: number
    documentsLastMonth: number
    monthlyGrowth: number
    complianceScore: number
    storageUsed: number
    averageProcessingTime: number
  }
  
  // Quick stats for cards
  quickStats: {
    totalActive: number
    pendingReview: number
    expiringSoon: number
    recentUploads: number
  }
}

// ===================================================================
// MAIN API HANDLER
// ===================================================================

export async function GET(request: NextRequest) {
  try {
    // Get current user - using your existing supabase client
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get firm_id from user metadata or use default for testing
    const firmId = user.user_metadata?.firm_id || '00000000-0000-0000-0000-000000000001'
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30d'
    
    // Calculate date filters
    const now = new Date()
    const monthAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const weekAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ===================================================================
    // 1. OVERVIEW METRICS - Using your dbTransform patterns
    // ===================================================================
    
    // Total documents (active only)
    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    // Pending signatures
    const { count: pendingSignatures } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)
      .in('signature_status', ['pending', 'sent'])

    // Documents signed this week
    const { count: signedThisWeek } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('signature_status', 'completed')
      .gte('signed_at', weekAgoDate.toISOString())

    // Documents this month vs last month for growth
    const { count: documentsThisMonth } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)
      .gte('created_at', monthAgoDate.toISOString())

    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const { count: documentsLastMonth } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', monthAgoDate.toISOString())

    // ===================================================================
    // 2. DOCUMENT BREAKDOWN BY TYPE
    // ===================================================================
    
    const { data: typeBreakdown } = await supabase
      .from('documents')
      .select('type')
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    const documentsByType = Object.entries(
      (typeBreakdown || []).reduce((acc: Record<string, number>, doc) => {
        const type = doc.type || 'Unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
    ).map(([type, count]) => ({
      type,
      count: count as number,
      percentage: Math.round(((count as number) / (totalDocuments || 1)) * 100)
    })).sort((a, b) => b.count - a.count)

    // ===================================================================
    // 3. CATEGORY BREAKDOWN WITH COMPLIANCE
    // ===================================================================
    
    const { data: categoryData } = await supabase
      .from('documents')
      .select(`
        category,
        compliance_status,
        document_categories (
          name
        )
      `)
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    const documentsByCategory = Object.entries(
      (categoryData || []).reduce((acc: Record<string, any>, doc) => {
        // FIX: Access the property from the doc object, not the array
        const categoryRecord = doc.document_categories as any
        const category = categoryRecord?.name || doc.category || 'Uncategorized'
        
        if (!acc[category]) {
          acc[category] = { total: 0, compliant: 0 }
        }
        acc[category].total++
        if (doc.compliance_status === 'compliant') {
          acc[category].compliant++
        }
        return acc
      }, {})
    ).map(([category, data]) => ({
      category,
      count: (data as any).total,
      compliance_rate: Math.round(((data as any).compliant / (data as any).total) * 100)
    })).sort((a, b) => b.count - a.count)

    // ===================================================================
    // 4. RECENT ACTIVITY (Last 20 activities)
    // ===================================================================
    
    const { data: recentDocs } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        client_name,
        signature_status,
        compliance_status,
        created_at,
        updated_at,
        signed_at
      `)
      .eq('firm_id', firmId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(20)

    const recentActivity = (recentDocs || []).map(doc => {
      // Determine the most recent action
      let action = 'created'
      let timestamp = doc.created_at
      
      if (doc.signed_at && new Date(doc.signed_at) > new Date(timestamp)) {
        action = 'signed'
        timestamp = doc.signed_at
      } else if (doc.signature_status === 'sent') {
        action = 'sent'
        timestamp = doc.updated_at
      } else if (doc.signature_status === 'viewed') {
        action = 'viewed'
        timestamp = doc.updated_at
      }

      return {
        id: doc.id,
        action,
        documentName: doc.name,
        clientName: doc.client_name || 'Unknown Client',
        timestamp,
        status: doc.signature_status || 'active'
      }
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // ===================================================================
    // 5. PERFORMANCE METRICS
    // ===================================================================
    
    // Compliance score (percentage of compliant documents)
    const { count: compliantDocs } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('compliance_status', 'compliant')
      .eq('is_archived', false)

    // FIX: Handle null values with proper defaults
    const totalDocsCount = totalDocuments ?? 0
    const complianceScore = totalDocsCount > 0 
      ? Math.round(((compliantDocs || 0) / totalDocsCount) * 100)
      : 100

    // Storage usage (sum of file sizes)
    const { data: storageData } = await supabase
      .from('documents')
      .select('file_size')
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    const storageUsed = (storageData || []).reduce((total, doc) => {
      return total + (doc.file_size || 0)
    }, 0)

    // Quick stats for dashboard cards
    const { count: pendingReview } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('compliance_status', 'pending')
      .eq('is_archived', false)

    const { count: recentUploads } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)
      .gte('created_at', weekAgoDate.toISOString())

    // Build response
    // FIX: Handle null values for month counts
    const thisMonthCount = documentsThisMonth ?? 0
    const lastMonthCount = documentsLastMonth ?? 0
    const monthlyGrowth = lastMonthCount > 0 
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : 0

    const dashboardStats: DashboardStats = {
      totalDocuments: totalDocsCount,
      pendingSignatures: pendingSignatures || 0,
      signedThisWeek: signedThisWeek || 0,
      averageTimeToSign: 24, // placeholder
      
      documentsByType: documentsByType.slice(0, 10),
      documentsByCategory: documentsByCategory.slice(0, 10),
      recentActivity: recentActivity.slice(0, 10),
      
      metrics: {
        documentsThisMonth: thisMonthCount,
        documentsLastMonth: lastMonthCount,
        monthlyGrowth,
        complianceScore,
        storageUsed,
        averageProcessingTime: 2.5
      },
      
      quickStats: {
        totalActive: totalDocsCount,
        pendingReview: pendingReview || 0,
        expiringSoon: 0,
        recentUploads: recentUploads || 0
      }
    }

    return NextResponse.json(dashboardStats)

  } catch (error) {
    console.error('Dashboard stats API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ===================================================================
// HELPER FUNCTIONS - REMOVED EXPORTS (FIXED)
// ===================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}