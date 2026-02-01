// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// File: src/app/api/documents/dashboard/stats/route.ts
// Minimal version with only valid exports
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    // Get current user and firm context
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmId = user.user_metadata?.firm_id
    if (!firmId) {
      return NextResponse.json(
        { success: false, error: 'Firm ID not configured. Please contact support.' },
        { status: 403 }
      )
    }

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total documents count
    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    // Get pending signatures count
    const { count: pendingSignatures } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('signature_status', 'pending')
      .eq('is_archived', false)

    // Get completed this month
    const { count: completedThisMonth } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('signature_status', 'signed')
      .gte('signed_at', startOfMonth.toISOString())

    // Get active clients count
    const { data: activeClientsData } = await supabase
      .from('documents')
      .select('client_id')
      .eq('firm_id', firmId)
      .gte('created_at', last7Days.toISOString())
      .not('client_id', 'is', null)

    const activeClients = activeClientsData
      ? new Set(activeClientsData.map((d: any) => d.client_id)).size
      : 0

    // Get recent activity
    const { data: recentDocs } = await supabase
      .from('documents')
      .select('created_at, signed_at, last_viewed_at')
      .eq('firm_id', firmId)
      .gte('created_at', last7Days.toISOString())

    const recentActivity = {
      documentsCreated: recentDocs?.length || 0,
      documentsSigned: recentDocs?.filter((d: any) =>
        d.signed_at && new Date(d.signed_at) >= last7Days
      ).length || 0,
      documentsViewed: recentDocs?.filter((d: any) =>
        d.last_viewed_at && new Date(d.last_viewed_at) >= last7Days
      ).length || 0
    }

    // Get documents by category
    const { data: categoryData } = await supabase
      .from('documents')
      .select('category, type')
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    let documentsByCategory: { category: string; count: number }[] = []

    if (categoryData) {
      const categoryCounts = categoryData.reduce((acc: Record<string, number>, doc: any) => {
        const category = doc.category || doc.type || 'Other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      documentsByCategory = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count: Number(count) })) // <-- FIXED: Explicitly convert to number
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }

    // Get storage used
    const { data: storageData } = await supabase
      .from('documents')
      .select('file_size')
      .eq('firm_id', firmId)

    const totalBytes = storageData?.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0) || 0

    // Format file size inline
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // Build response
    const stats = {
      totalDocuments: totalDocuments !== null ? Number(totalDocuments) : 0, // <-- FIXED: Convert to number
      pendingSignatures: pendingSignatures !== null ? Number(pendingSignatures) : 0, // <-- FIXED: Convert to number
      completedThisMonth: completedThisMonth !== null ? Number(completedThisMonth) : 0, // <-- FIXED: Convert to number
      activeClients,
      recentActivity,
      documentsByCategory,
      storageUsed: {
        bytes: totalBytes,
        formatted: formatBytes(totalBytes)
      }
    }

    return NextResponse.json(stats)

  } catch (error) {
    log.error('Dashboard stats API error', error)

    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}