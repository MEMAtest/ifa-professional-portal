// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// File: src/app/api/documents/activity/feed/route.ts
// FIXED: Removed invalid exports that were causing build errors
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'

import { cookies } from 'next/headers'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// ===================================================================
// TYPES
// ===================================================================

interface ActivityFeedItem {
  id: string
  documentId: string
  documentName: string
  clientId: string | null
  clientName: string
  action: 'created' | 'updated' | 'sent' | 'viewed' | 'signed' | 'downloaded' | 'archived' | 'deleted' | 'restored'
  performedBy: string
  performedByName?: string
  performedAt: string
  metadata?: any
  status?: string
  priority?: 'low' | 'medium' | 'high'
  category?: string
}

interface ActivityFeedResponse {
  activities: ActivityFeedItem[]
  hasMore: boolean
  totalCount: number
  nextOffset?: number
  lastUpdated: string
}

interface ActivityFilters {
  actionTypes?: string[]
  clientIds?: string[]
  dateFrom?: string
  dateTo?: string
  documentTypes?: string[]
  limit?: number
  offset?: number
}

// ===================================================================
// MAIN API HANDLER - FIXED
// ===================================================================

export async function GET(request: NextRequest) {
  // Cast to any: document_audit_log schema mismatch with generated types
  const supabase: any = getSupabaseServiceClient()
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const filters: ActivityFilters = {
      actionTypes: searchParams.get('actionTypes')?.split(','),
      clientIds: searchParams.get('clientIds')?.split(','),
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      documentTypes: searchParams.get('documentTypes')?.split(','),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 50),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    // ===================================================================
    // 1. GET ACTIVITIES FROM AUDIT LOG (if exists) - FIXED
    // ===================================================================
    
    let auditActivities: ActivityFeedItem[] = []
    
    if (await tableExists(supabase, 'document_audit_log')) {
      const { data: auditData, error: auditError } = await supabase
        .from('document_audit_log')
        .select(`
          id,
          document_id,
          action,
          details,
          user_id,
          user_name,
          created_at,
          documents!inner (
            name,
            client_id,
            client_name,
            type,
            category,
            signature_status
          )
        `)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)

      // FIXED: Proper null checking and array access
      if (!auditError && auditData && Array.isArray(auditData)) {
        auditActivities = auditData.map(item => {
          // FIXED: Handle the documents property properly
          const documentData = Array.isArray(item.documents) ? item.documents[0] : item.documents

          return {
            id: item.id,
            documentId: item.document_id,
            documentName: documentData?.name || 'Unknown Document',
            clientId: documentData?.client_id || null,
            clientName: documentData?.client_name || 'Unknown Client',
            action: item.action as any,
            performedBy: item.user_id || 'system',
            performedByName: item.user_name || 'System',
            performedAt: item.created_at,
            metadata: item.details,
            status: documentData?.signature_status,
            category: documentData?.category || documentData?.type
          }
        })
      }
    }

    // ===================================================================
    // 2. GET RECENT DOCUMENT CHANGES (fallback/supplement) - FIXED
    // ===================================================================
    
    // Build document query with filters
    let documentQuery = supabase
      .from('documents')
      .select(`
        id,
        name,
        client_id,
        client_name,
        type,
        category,
        signature_status,
        compliance_status,
        created_at,
        updated_at,
        signed_at,
        created_by,
        last_modified_by,
        is_archived
      `)
      .eq('firm_id', firmId)

    // Apply filters
    if (filters.clientIds && filters.clientIds.length > 0) {
      documentQuery = documentQuery.in('client_id', filters.clientIds)
    }

    if (filters.documentTypes && filters.documentTypes.length > 0) {
      documentQuery = documentQuery.in('type', filters.documentTypes)
    }

    if (filters.dateFrom) {
      documentQuery = documentQuery.gte('updated_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      documentQuery = documentQuery.lte('updated_at', filters.dateTo)
    }

    const { data: documents, error: docsError } = await documentQuery
      .order('updated_at', { ascending: false })
      .limit((filters.limit || 20) * 2) // Get more to process into activities

    if (docsError) {
      log.error('Documents query error', docsError)
    }

    // ===================================================================
    // 3. PROCESS DOCUMENTS INTO ACTIVITIES - FIXED
    // ===================================================================
    
    let documentActivities: ActivityFeedItem[] = []
    
    if (documents && Array.isArray(documents) && documents.length > 0) {
      documentActivities = documents.flatMap(doc => {
        const activities: ActivityFeedItem[] = []
        
        // Determine the most recent significant activity
        const events = [
          { action: 'created', timestamp: doc.created_at, user: doc.created_by },
          { action: 'signed', timestamp: doc.signed_at, user: doc.last_modified_by, condition: doc.signed_at },
          { action: 'updated', timestamp: doc.updated_at, user: doc.last_modified_by, condition: doc.updated_at !== doc.created_at }
        ].filter(event => event.condition !== false && event.timestamp)

        // Get the most recent event
        const latestEvent = events.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]

        if (latestEvent) {
          activities.push({
            id: `doc_${doc.id}_${latestEvent.action}`,
            documentId: doc.id,
            documentName: doc.name || 'Unknown Document',
            clientId: doc.client_id,
            clientName: doc.client_name || 'Unknown Client',
            action: latestEvent.action as any,
            performedBy: latestEvent.user || 'system',
            performedAt: latestEvent.timestamp,
            status: doc.signature_status,
            category: doc.category || doc.type,
            priority: getPriorityFromAction(latestEvent.action, doc.signature_status)
          })
        }

        return activities
      })
    }

    // ===================================================================
    // 4. MERGE AND DEDUPLICATE ACTIVITIES
    // ===================================================================
    
    // Combine audit log and document activities
    const allActivities = [...auditActivities, ...documentActivities]
    
    // Remove duplicates (prefer audit log entries)
    const uniqueActivities = allActivities.reduce((acc, activity) => {
      const key = `${activity.documentId}_${activity.action}`
      if (!acc.has(key) || activity.id.startsWith('audit_')) {
        acc.set(key, activity)
      }
      return acc
    }, new Map<string, ActivityFeedItem>())

    let activities = Array.from(uniqueActivities.values())

    // ===================================================================
    // 5. APPLY ACTION TYPE FILTERS
    // ===================================================================
    
    if (filters.actionTypes && filters.actionTypes.length > 0) {
      activities = activities.filter(activity => 
        filters.actionTypes!.includes(activity.action)
      )
    }

    // ===================================================================
    // 6. SORT AND PAGINATE
    // ===================================================================
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => 
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    )

    // Apply pagination
    const totalCount = activities.length
    const startIndex = filters.offset || 0
    const endIndex = startIndex + (filters.limit || 20)
    const paginatedActivities = activities.slice(startIndex, endIndex)
    
    // ===================================================================
    // 7. ENHANCE WITH USER NAMES (if possible)
    // ===================================================================
    
    // Try to get user names for activities
    const userIds = [...new Set(paginatedActivities.map(a => a.performedBy).filter(Boolean))]
    let userNames: Record<string, string> = {}

    if (userIds.length > 0) {
      try {
        // Try to get user profiles (if table exists)
        if (await tableExists(supabase, 'profiles')) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds)

          if (profiles && Array.isArray(profiles)) {
            userNames = profiles.reduce((acc, profile) => {
              acc[profile.id] = `${profile.first_name} ${profile.last_name}`.trim()
              return acc
            }, {} as Record<string, string>)
          }
        }
      } catch (error) {
        log.warn('Could not fetch user names', { error: error instanceof Error ? error.message : 'Unknown' })
      }
    }

    // Apply user names to activities
    const enhancedActivities = paginatedActivities.map(activity => ({
      ...activity,
      performedByName: userNames[activity.performedBy] || activity.performedByName || formatUserId(activity.performedBy)
    }))

    // ===================================================================
    // 8. BUILD RESPONSE
    // ===================================================================
    
    const response: ActivityFeedResponse = {
      activities: enhancedActivities,
      hasMore: endIndex < totalCount,
      totalCount,
      nextOffset: endIndex < totalCount ? endIndex : undefined,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    log.error('Activity feed API error', error)

    return NextResponse.json(
      { 
        error: 'Failed to fetch activity feed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ===================================================================
// UTILITY FUNCTIONS (NOT EXPORTED - Internal use only)
// ===================================================================

async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    return !error
  } catch {
    return false
  }
}

function getPriorityFromAction(action: string, status?: string): 'low' | 'medium' | 'high' {
  switch (action) {
    case 'signed':
      return 'high'
    case 'sent':
      return 'medium'
    case 'created':
      return 'medium'
    case 'viewed':
      return 'medium'
    case 'archived':
    case 'deleted':
      return 'low'
    default:
      return 'low'
  }
}

function formatUserId(userId: string): string {
  if (userId === 'system') return 'System'
  if (userId.length > 8) {
    return `User ${userId.substring(0, 8)}...`
  }
  return `User ${userId}`
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'created': return '📄'
    case 'sent': return '📤'
    case 'viewed': return '👁️'
    case 'signed': return '✅'
    case 'downloaded': return '⬇️'
    case 'archived': return '📦'
    case 'deleted': return '🗑️'
    case 'updated': return '✏️'
    default: return '📋'
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'signed': return 'green'
    case 'sent': return 'blue'
    case 'viewed': return 'yellow'
    case 'created': return 'blue'
    case 'archived': return 'gray'
    case 'deleted': return 'red'
    case 'updated': return 'purple'
    default: return 'gray'
  }
}

// REMOVED: Invalid exports that were causing build errors
// These utility functions are now only available internally within this file