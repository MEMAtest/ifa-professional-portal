import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { TaskSourceType, TaskPriority } from '@/modules/tasks/types'

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

const getClientName = (client?: { personal_details?: Record<string, any> | null }) => {
  const details = client?.personal_details || {}
  const name = `${details.firstName || ''} ${details.lastName || ''}`.trim()
  return name || 'Client'
}

const getOwnerName = (owner?: { first_name?: string | null; last_name?: string | null }) => {
  if (!owner) return undefined
  const name = `${owner.first_name || ''} ${owner.last_name || ''}`.trim()
  return name || undefined
}

async function safeQuery<T>(promise: Promise<{ data: T[] | null; error: any }>, label: string): Promise<T[]> {
  try {
    const { data, error } = await promise
    if (error) {
      console.warn(`[Compliance Workflow] ${label} query failed:`, error.message || error)
      return []
    }
    return data || []
  } catch (error) {
    console.warn(`[Compliance Workflow] ${label} query error:`, error)
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

    const supabase = getSupabaseServiceClient()

    const tasks: Promise<any[]>[] = []

    if (requestedSections.includes('complaint')) {
      const complaintQuery = hasFirmId
        ? supabase
            .from('complaint_register')
            .select(`
              id,
              reference_number,
              status,
              priority,
              complaint_date,
              resolution_date,
              client_id,
              assigned_to,
              clients(id, personal_details, client_ref),
              assigned_user:assigned_to(id, first_name, last_name, avatar_url)
            `)
            .eq('firm_id', firmId)
        : supabase
            .from('complaint_register')
            .select(`
              id,
              reference_number,
              status,
              priority,
              complaint_date,
              resolution_date,
              client_id,
              assigned_to,
              created_by,
              clients(id, personal_details, client_ref),
              assigned_user:assigned_to(id, first_name, last_name, avatar_url)
            `)
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      tasks.push(
        safeQuery(
          complaintQuery,
          'complaints'
        ).then((rows) =>
          rows.map((row: any) => ({
            id: `complaint-${row.id}`,
            sourceType: 'complaint' as TaskSourceType,
            sourceId: row.id,
            title: row.reference_number ? `Complaint ${row.reference_number}` : 'Complaint',
            subtitle: row.clients ? getClientName(row.clients) : undefined,
            status: row.status,
            priority: row.priority || null,
            ownerId: row.assigned_to || null,
            ownerName: getOwnerName(row.assigned_user),
            ownerAvatarUrl: row.assigned_user?.avatar_url || null,
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
            .select(`
              id,
              reference_number,
              status,
              priority,
              breach_date,
              remediation_date,
              severity,
              affected_clients,
              assigned_to,
              assigned_user:assigned_to(id, first_name, last_name, avatar_url)
            `)
            .eq('firm_id', firmId)
        : supabase
            .from('breach_register')
            .select(`
              id,
              reference_number,
              status,
              priority,
              breach_date,
              remediation_date,
              severity,
              affected_clients,
              assigned_to,
              created_by,
              assigned_user:assigned_to(id, first_name, last_name, avatar_url)
            `)
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      tasks.push(
        safeQuery(
          breachQuery,
          'breaches'
        ).then((rows) =>
          rows.map((row: any) => ({
            id: `breach-${row.id}`,
            sourceType: 'breach' as TaskSourceType,
            sourceId: row.id,
            title: row.reference_number ? `Breach ${row.reference_number}` : 'Breach',
            subtitle: row.severity ? `${row.severity} severity` : undefined,
            status: row.status,
            priority: row.priority || null,
            ownerId: row.assigned_to || null,
            ownerName: getOwnerName(row.assigned_user),
            ownerAvatarUrl: row.assigned_user?.avatar_url || null,
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
            .select(`
              id,
              client_id,
              status,
              priority,
              vulnerability_type,
              severity,
              next_review_date,
              assigned_to,
              clients(id, personal_details, client_ref),
              assigned_user:assigned_to(id, first_name, last_name, avatar_url)
            `)
            .eq('firm_id', firmId)
        : supabase
            .from('vulnerability_register')
            .select(`
              id,
              client_id,
              status,
              priority,
              vulnerability_type,
              severity,
              next_review_date,
              assigned_to,
              created_by,
              clients(id, personal_details, client_ref),
              assigned_user:assigned_to(id, first_name, last_name, avatar_url)
            `)
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      tasks.push(
        safeQuery(
          vulnerabilityQuery,
          'vulnerability'
        ).then((rows) =>
          rows.map((row: any) => ({
            id: `vulnerability-${row.id}`,
            sourceType: 'vulnerability' as TaskSourceType,
            sourceId: row.id,
            title: row.clients ? getClientName(row.clients) : 'Vulnerability',
            subtitle: row.vulnerability_type ? `${row.vulnerability_type} - ${row.severity}` : undefined,
            status: row.status,
            priority: row.priority || null,
            ownerId: row.assigned_to || null,
            ownerName: getOwnerName(row.assigned_user),
            ownerAvatarUrl: row.assigned_user?.avatar_url || null,
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
            .select(`
              id,
              client_id,
              status,
              review_type,
              risk_rating,
              due_date,
              reviewer_id,
              adviser_id,
              clients(id, personal_details, client_ref),
              reviewer:reviewer_id(id, first_name, last_name, avatar_url)
            `)
            .eq('firm_id', firmId)
        : supabase
            .from('file_reviews')
            .select(`
              id,
              client_id,
              status,
              review_type,
              risk_rating,
              due_date,
              reviewer_id,
              adviser_id,
              clients(id, personal_details, client_ref),
              reviewer:reviewer_id(id, first_name, last_name, avatar_url)
            `)
            .or(`reviewer_id.eq.${userId},adviser_id.eq.${userId}`)
      tasks.push(
        safeQuery(
          fileReviewQuery,
          'file reviews'
        ).then((rows) =>
          rows.map((row: any) => ({
            id: `file-review-${row.id}`,
            sourceType: 'file_review' as TaskSourceType,
            sourceId: row.id,
            title: row.clients ? getClientName(row.clients) : 'File Review',
            subtitle: row.review_type || undefined,
            status: row.status,
            priority: priorityFromRisk(row.risk_rating),
            ownerId: row.reviewer_id || null,
            ownerName: getOwnerName(row.reviewer),
            ownerAvatarUrl: row.reviewer?.avatar_url || null,
            dueDate: row.due_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('aml_check')) {
      const amlQuery = hasFirmId
        ? supabase
            .from('aml_client_status')
            .select(`
              id,
              client_id,
              id_verification,
              risk_rating,
              next_review_date,
              updated_at,
              created_at,
              clients!inner(id, personal_details, client_ref, firm_id)
            `)
            .eq('clients.firm_id', firmId)
        : supabase
            .from('aml_client_status')
            .select(`
              id,
              client_id,
              id_verification,
              risk_rating,
              next_review_date,
              updated_at,
              created_at,
              clients!inner(id, personal_details, client_ref, advisor_id)
            `)
            .eq('clients.advisor_id', userId)
      tasks.push(
        safeQuery(
          amlQuery,
          'aml'
        ).then((rows) =>
          rows.map((row: any) => ({
            id: `aml-${row.id}`,
            sourceType: 'aml_check' as TaskSourceType,
            sourceId: row.id,
            title: row.clients ? getClientName(row.clients) : 'AML Check',
            subtitle: row.risk_rating ? `Risk ${row.risk_rating}` : undefined,
            status: row.id_verification,
            priority: priorityFromRisk(row.risk_rating),
            dueDate: row.next_review_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('consumer_duty')) {
      const consumerDutyQuery = hasFirmId
        ? supabase
            .from('consumer_duty_status')
            .select(`
              id,
              client_id,
              overall_status,
              next_review_date,
              updated_at,
              created_at,
              clients!inner(id, personal_details, client_ref, firm_id)
            `)
            .eq('clients.firm_id', firmId)
        : supabase
            .from('consumer_duty_status')
            .select(`
              id,
              client_id,
              overall_status,
              next_review_date,
              updated_at,
              created_at,
              clients!inner(id, personal_details, client_ref, advisor_id)
            `)
            .eq('clients.advisor_id', userId)
      tasks.push(
        safeQuery(
          consumerDutyQuery,
          'consumer duty'
        ).then((rows) =>
          rows.map((row: any) => ({
            id: `consumer-duty-${row.id}`,
            sourceType: 'consumer_duty' as TaskSourceType,
            sourceId: row.id,
            title: row.clients ? getClientName(row.clients) : 'Consumer Duty',
            subtitle: row.clients?.client_ref || undefined,
            status: row.overall_status,
            dueDate: row.next_review_date || null,
            clientId: row.client_id || null,
          }))
        )
      )
    }

    if (requestedSections.includes('risk_assessment')) {
      const riskQuery = hasFirmId
        ? supabase
            .from('risk_profiles')
            .select(`
              id,
              client_id,
              final_risk_level,
              final_risk_category,
              updated_at,
              created_at,
              clients!inner(id, personal_details, client_ref, firm_id)
            `)
            .eq('clients.firm_id', firmId)
            .order('updated_at', { ascending: false })
        : supabase
            .from('risk_profiles')
            .select(`
              id,
              client_id,
              final_risk_level,
              final_risk_category,
              updated_at,
              created_at,
              clients!inner(id, personal_details, client_ref, advisor_id)
            `)
            .eq('clients.advisor_id', userId)
            .order('updated_at', { ascending: false })
      tasks.push(
        safeQuery(
          riskQuery,
          'risk profiles'
        ).then((rows) => {
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
                title: row.clients ? getClientName(row.clients) : 'Risk Assessment',
                subtitle: row.final_risk_category || row.clients?.client_ref || undefined,
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

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[Compliance Workflow] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
