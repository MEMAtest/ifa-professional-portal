import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { TaskPriority, TaskSourceType } from '@/modules/tasks/types'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

const SECTIONS: TaskSourceType[] = [
  'complaint',
  'breach',
  'vulnerability',
  'file_review',
  'aml_check',
  'consumer_duty',
  'risk_assessment',
]

const priorityFromRisk = (risk?: string | null): TaskPriority | null => {
  if (!risk) return null
  if (risk === 'critical') return 'urgent'
  if (risk === 'high') return 'high'
  if (risk === 'enhanced_due_diligence' || risk === 'edd' || risk === 'enhanced') return 'high'
  if (risk === 'medium') return 'medium'
  if (risk === 'low') return 'low'
  return null
}

const getClientName = (client?: { personal_details?: Record<string, any> | null; client_ref?: string | null }) => {
  if (!client?.personal_details) return client?.client_ref || 'Client'
  const name = `${client.personal_details.firstName || ''} ${client.personal_details.lastName || ''}`.trim()
  return name || client.client_ref || 'Client'
}

const getOwnerName = (owner?: { full_name?: string | null; first_name?: string | null; last_name?: string | null }) => {
  if (!owner) return undefined
  const name = owner.full_name || `${owner.first_name || ''} ${owner.last_name || ''}`.trim()
  return name?.trim() || undefined
}

async function safeQuery<T>(promise: Promise<{ data: T[] | null; error: any }>, label: string): Promise<T[]> {
  try {
    const { data, error } = await promise
    if (error) {
      log.warn(`[Compliance Workflow] ${label} query failed`, {
        error: error?.message || String(error)
      })
      return []
    }
    return data || []
  } catch (error) {
    log.warn(`[Compliance Workflow] ${label} query error`, {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmResult = requireFirmId(authResult.context)
    const firmId = firmResult instanceof NextResponse ? authResult.context.firmId : firmResult.firmId
    const userId = authResult.context.userId
    const hasFirmId = typeof firmId === 'string' && firmId.trim().length > 0

    const url = new URL(request.url)
    const sectionParam = url.searchParams.get('section') || 'all'
    const requestedSections = sectionParam === 'all'
      ? SECTIONS
      : SECTIONS.filter((section) => section === sectionParam)

    if (requestedSections.length === 0) {
      return NextResponse.json({ error: 'Invalid section filter' }, { status: 400 })
    }

    const supabase: any = getSupabaseServiceClient()

    const clients = await safeQuery(
      hasFirmId
        ? supabase
            .from('clients')
            .select('id, personal_details, client_ref, advisor_id')
            .eq('firm_id', firmId)
        : supabase
            .from('clients')
            .select('id, personal_details, client_ref, advisor_id')
            .eq('advisor_id', userId),
      'clients'
    )

    const clientMap = new Map<string, any>()
    const clientIds: string[] = []
    clients.forEach((client: any) => {
      clientMap.set(client.id, client)
      clientIds.push(client.id)
    })

    const tasks: Promise<any[]>[] = []

    if (requestedSections.includes('complaint')) {
      const complaintQuery = hasFirmId
        ? supabase
            .from('complaint_register')
            .select('*')
            .eq('firm_id', firmId)
        : supabase
            .from('complaint_register')
            .select('*')
            .eq('created_by', userId)
      tasks.push(
        safeQuery(complaintQuery, 'complaints').then((rows) =>
          rows.map((row: any) => ({
            id: `complaint-${row.id}`,
            sourceType: 'complaint' as TaskSourceType,
            sourceId: row.id,
            title: row.reference_number ? `Complaint ${row.reference_number}` : 'Complaint',
            subtitle: row.client_id ? getClientName(clientMap.get(row.client_id)) : undefined,
            status: row.status,
            priority: row.priority || null,
            ownerId: row.assigned_to || null,
            dueDate: row.resolution_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('breach')) {
      const breachQuery = hasFirmId
        ? supabase
            .from('breach_register')
            .select('*')
            .eq('firm_id', firmId)
        : supabase
            .from('breach_register')
            .select('*')
            .eq('created_by', userId)
      tasks.push(
        safeQuery(breachQuery, 'breaches').then((rows) =>
          rows.map((row: any) => ({
            id: `breach-${row.id}`,
            sourceType: 'breach' as TaskSourceType,
            sourceId: row.id,
            title: row.reference_number ? `Breach ${row.reference_number}` : 'Breach',
            subtitle: row.severity ? `${row.severity} severity` : undefined,
            status: row.status,
            priority: row.priority || null,
            ownerId: row.assigned_to || null,
            dueDate: row.remediation_date || null,
            description: row.affected_clients ? `${row.affected_clients} affected client(s)` : undefined,
          }))
        )
      )
    }

    if (requestedSections.includes('vulnerability')) {
      const vulnerabilityQuery = hasFirmId
        ? supabase
            .from('vulnerability_register')
            .select('*')
            .eq('firm_id', firmId)
        : supabase
            .from('vulnerability_register')
            .select('*')
            .eq('created_by', userId)
      tasks.push(
        safeQuery(vulnerabilityQuery, 'vulnerability').then((rows) =>
          rows.map((row: any) => ({
            id: `vulnerability-${row.id}`,
            sourceType: 'vulnerability' as TaskSourceType,
            sourceId: row.id,
            title: row.client_id ? getClientName(clientMap.get(row.client_id)) : 'Vulnerability',
            subtitle: row.vulnerability_type ? `${row.vulnerability_type} - ${row.severity}` : undefined,
            status: row.status,
            priority: row.priority || null,
            ownerId: row.assigned_to || null,
            dueDate: row.next_review_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('file_review')) {
      const fileReviewQuery = hasFirmId
        ? supabase
            .from('file_reviews')
            .select('*')
            .eq('firm_id', firmId)
        : supabase
            .from('file_reviews')
            .select('*')
            .eq('adviser_id', userId)
      tasks.push(
        safeQuery(fileReviewQuery, 'file reviews').then((rows) =>
          rows.map((row: any) => ({
            id: `file-review-${row.id}`,
            sourceType: 'file_review' as TaskSourceType,
            sourceId: row.id,
            title: row.client_id ? getClientName(clientMap.get(row.client_id)) : 'File Review',
            subtitle: row.review_type || undefined,
            status: row.status,
            priority: priorityFromRisk(row.risk_rating),
            ownerId: row.reviewer_id || null,
            dueDate: row.due_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('aml_check') && clientIds.length > 0) {
      const amlQuery = supabase
        .from('aml_client_status')
        .select('id, client_id, id_verification, risk_rating, next_review_date, updated_at, created_at')
        .in('client_id', clientIds)
      tasks.push(
        safeQuery(amlQuery, 'aml').then((rows) =>
          rows.map((row: any) => ({
            id: `aml-${row.id}`,
            sourceType: 'aml_check' as TaskSourceType,
            sourceId: row.id,
            title: row.client_id ? getClientName(clientMap.get(row.client_id)) : 'AML Check',
            subtitle: row.risk_rating ? `Risk ${row.risk_rating}` : undefined,
            status: row.id_verification,
            priority: priorityFromRisk(row.risk_rating),
            dueDate: row.next_review_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('consumer_duty') && clientIds.length > 0) {
      const consumerDutyQuery = supabase
        .from('consumer_duty_status')
        .select('id, client_id, overall_status, next_review_date, updated_at, created_at')
        .in('client_id', clientIds)
      tasks.push(
        safeQuery(consumerDutyQuery, 'consumer duty').then((rows) =>
          rows.map((row: any) => ({
            id: `consumer-duty-${row.id}`,
            sourceType: 'consumer_duty' as TaskSourceType,
            sourceId: row.id,
            title: row.client_id ? getClientName(clientMap.get(row.client_id)) : 'Consumer Duty',
            subtitle: row.client_id ? clientMap.get(row.client_id)?.client_ref || undefined : undefined,
            status: row.overall_status,
            dueDate: row.next_review_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('risk_assessment') && clientIds.length > 0) {
      const riskQuery = supabase
        .from('risk_profiles')
        .select('id, client_id, final_risk_level, final_risk_category, updated_at, created_at')
        .in('client_id', clientIds)
        .order('updated_at', { ascending: false })
      tasks.push(
        safeQuery(riskQuery, 'risk profiles').then((rows) => {
          const seen = new Set<string>()
          return rows
            .filter((row: any) => {
              if (!row.client_id || seen.has(row.client_id)) return false
              seen.add(row.client_id)
              return true
            })
            .map((row: any) => {
              const lastDate = row.updated_at || row.created_at
              let recencyStatus = 'current'
              if (lastDate) {
                const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
                if (days > 365) recencyStatus = 'overdue'
                else if (days > 300) recencyStatus = 'due_soon'
                else if (days < 30) recencyStatus = 'recent'
                else recencyStatus = 'current'
              }
              return {
                id: `risk-${row.id}`,
                sourceType: 'risk_assessment' as TaskSourceType,
                sourceId: row.client_id,
                title: row.client_id ? getClientName(clientMap.get(row.client_id)) : 'Risk Assessment',
                subtitle: row.final_risk_category || (row.client_id ? clientMap.get(row.client_id)?.client_ref : undefined),
                status: recencyStatus,
                dueDate: lastDate || null,
                clientId: row.client_id || null,
                description: row.final_risk_level ? `Risk score ${row.final_risk_level}` : undefined,
              }
            })
        })
      )
    }

    const results = await Promise.all(tasks)
    const items = results.flat()

    const ownerIds = new Set<string>()
    items.forEach((item: any) => {
      if (item.ownerId) ownerIds.add(item.ownerId)
    })

    const ownerProfiles = ownerIds.size
      ? await safeQuery(
          (supabase
            .from('profiles') as any)
            .select('id, full_name, first_name, last_name, avatar_url')
            .in('id', Array.from(ownerIds)),
          'profiles'
        )
      : []

    const ownerMap = new Map<string, any>()
    ownerProfiles.forEach((profile: any) => {
      ownerMap.set(profile.id, profile)
    })

    const enrichedItems = items.map((item: any) => {
      if (!item.ownerId) return item
      const profile = ownerMap.get(item.ownerId)
      if (!profile) return item
      return {
        ...item,
        ownerName: getOwnerName(profile),
        ownerAvatarUrl: profile.avatar_url || null,
      }
    })

    return NextResponse.json({ items: enrichedItems })
  } catch (error) {
    log.error('[Compliance Workflow] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
