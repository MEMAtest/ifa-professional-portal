/**
 * Tasks API Route
 * GET /api/tasks - List tasks with filters
 * POST /api/tasks - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type {
  CreateTaskInput,
  TaskListParams,
  TaskStatus,
  TaskType,
  TaskPriority,
  TaskSourceType,
} from '@/modules/tasks/types'
import type { Json } from '@/types/db'

export const dynamic = 'force-dynamic'

const ALLOWED_SOURCE_TYPES: TaskSourceType[] = [
  'complaint',
  'breach',
  'vulnerability',
  'file_review',
  'aml_check',
  'consumer_duty',
  'risk_assessment',
]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ============================================
// GET: List tasks
// ============================================
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const url = new URL(request.url)

    // Parse array filters (comma-separated values)
    const statusParam = url.searchParams.get('status')
    const typeParam = url.searchParams.get('type')
    const priorityParam = url.searchParams.get('priority')
    const sourceTypeParam = url.searchParams.get('sourceType') || undefined
    const sourceIdParam = url.searchParams.get('sourceId') || undefined

    if ((sourceTypeParam && !sourceIdParam) || (!sourceTypeParam && sourceIdParam)) {
      return NextResponse.json({ error: 'sourceType and sourceId must be provided together' }, { status: 400 })
    }

    if (sourceTypeParam && !ALLOWED_SOURCE_TYPES.includes(sourceTypeParam as TaskSourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }

    if (sourceIdParam && !isValidUUID(sourceIdParam)) {
      return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 })
    }

    const params: TaskListParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      perPage: Math.min(parseInt(url.searchParams.get('perPage') || '20'), 100),
      sortBy: (url.searchParams.get('sortBy') as TaskListParams['sortBy']) || 'due_date',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
      status: statusParam?.includes(',')
        ? statusParam.split(',') as TaskStatus[]
        : statusParam as TaskStatus | undefined,
      type: typeParam?.includes(',')
        ? typeParam.split(',') as TaskType[]
        : typeParam as TaskType | undefined,
      priority: priorityParam?.includes(',')
        ? priorityParam.split(',') as TaskPriority[]
        : priorityParam as TaskPriority | undefined,
      assignedTo: url.searchParams.get('assignedTo') || undefined,
      clientId: url.searchParams.get('clientId') || undefined,
      sourceType: sourceTypeParam as TaskSourceType | undefined,
      sourceId: sourceIdParam || undefined,
      dueBefore: url.searchParams.get('dueBefore') || undefined,
      dueAfter: url.searchParams.get('dueAfter') || undefined,
      overdue: url.searchParams.get('overdue') === 'true',
      search: url.searchParams.get('search') || undefined,
    }

    const supabase = getSupabaseServiceClient()

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        clients:client_id (
          id,
          personal_details,
          client_ref
        ),
        assigned_user:assigned_to (
          id,
          first_name,
          last_name,
          email
        ),
        assigner:assigned_by (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .eq('firm_id', firmIdResult.firmId)

    // Apply filters
    if (params.status) {
      if (Array.isArray(params.status)) {
        query = query.in('status', params.status)
      } else {
        query = query.eq('status', params.status)
      }
    }

    if (params.type) {
      if (Array.isArray(params.type)) {
        query = query.in('type', params.type)
      } else {
        query = query.eq('type', params.type)
      }
    }

    if (params.priority) {
      if (Array.isArray(params.priority)) {
        query = query.in('priority', params.priority)
      } else {
        query = query.eq('priority', params.priority)
      }
    }

    if (params.assignedTo) {
      if (params.assignedTo === 'me') {
        query = query.eq('assigned_to', authResult.context.userId)
      } else if (params.assignedTo === 'unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', params.assignedTo)
      }
    }

    if (params.clientId) {
      query = query.eq('client_id', params.clientId)
    }

    if (params.sourceType) {
      query = query.eq('source_type', params.sourceType)
    }

    if (params.sourceId) {
      query = query.eq('source_id', params.sourceId)
    }

    // Date range filters for calendar integration
    if (params.dueAfter) {
      const dueAfter = new Date(params.dueAfter)
      if (!isNaN(dueAfter.getTime())) {
        query = query.gte('due_date', dueAfter.toISOString())
      }
    }

    if (params.dueBefore) {
      const dueBefore = new Date(params.dueBefore)
      if (!isNaN(dueBefore.getTime())) {
        query = query.lte('due_date', dueBefore.toISOString())
      }
    }

    if (params.overdue) {
      query = query
        .lt('due_date', new Date().toISOString())
        .not('status', 'in', '("completed","cancelled")')
    }

    if (params.search) {
      // Sanitize search input to prevent SQL injection via ILIKE wildcards
      const sanitizedSearch = params.search
        .replace(/[%_\\]/g, '\\$&')  // Escape special LIKE characters
        .substring(0, 100)           // Limit length
      query = query.ilike('title', `%${sanitizedSearch}%`)
    }

    // Apply sorting
    const sortColumn = params.sortBy === 'due_date' ? 'due_date' :
                       params.sortBy === 'priority' ? 'priority' :
                       params.sortBy === 'status' ? 'status' :
                       params.sortBy === 'title' ? 'title' :
                       'created_at'

    query = query.order(sortColumn, {
      ascending: params.sortOrder === 'asc',
      nullsFirst: false,
    })

    // Apply pagination
    const offset = ((params.page || 1) - 1) * (params.perPage || 20)
    query = query.range(offset, offset + (params.perPage || 20) - 1)

    const { data: tasks, error, count } = await query

    if (error) {
      console.error('[Tasks API] Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Get comment counts for all returned tasks (efficient batch query)
    const taskIds = (tasks || []).map((t: any) => t.id)
    let commentCounts: Record<string, number> = {}

    if (taskIds.length > 0) {
      const { data: comments } = await supabase
        .from('task_comments')
        .select('task_id')
        .in('task_id', taskIds)

      // Count comments per task
      if (comments) {
        commentCounts = comments.reduce((acc: Record<string, number>, comment: any) => {
          acc[comment.task_id] = (acc[comment.task_id] || 0) + 1
          return acc
        }, {})
      }
    }

    // Transform to camelCase
    const transformedTasks = (tasks || []).map((task: any) => ({
      id: task.id,
      firmId: task.firm_id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      assignedBy: task.assigned_by,
      clientId: task.client_id,
      assessmentId: task.assessment_id,
      sourceType: task.source_type,
      sourceId: task.source_id,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      completedBy: task.completed_by,
      requiresSignOff: task.requires_sign_off,
      signedOffBy: task.signed_off_by,
      signedOffAt: task.signed_off_at,
      isRecurring: task.is_recurring,
      recurrenceRule: task.recurrence_rule,
      parentTaskId: task.parent_task_id,
      metadata: task.metadata,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      // Related data
      clientFirstName: task.clients?.personal_details?.firstName,
      clientLastName: task.clients?.personal_details?.lastName,
      clientRef: task.clients?.client_ref,
      assignedToFirstName: task.assigned_user?.first_name,
      assignedToLastName: task.assigned_user?.last_name,
      assignedToEmail: task.assigned_user?.email,
      assignedByFirstName: task.assigner?.first_name,
      assignedByLastName: task.assigner?.last_name,
      commentCount: commentCounts[task.id] || 0,
    }))

    return NextResponse.json({
      tasks: transformedTasks,
      total: count || 0,
      page: params.page || 1,
      perPage: params.perPage || 20,
      hasMore: (count || 0) > offset + (params.perPage || 20),
    })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST: Create task
// ============================================
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body: CreateTaskInput = await request.json()

    // Validate required fields
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (body.title.length > 500) {
      return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 })
    }

    // Validate type if provided
    const validTypes: TaskType[] = ['general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting']
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
    }

    // Validate priority if provided
    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    // Validate source type if provided
    if (body.sourceType && !ALLOWED_SOURCE_TYPES.includes(body.sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }

    if ((body.sourceType && !body.sourceId) || (!body.sourceType && body.sourceId)) {
      return NextResponse.json({ error: 'sourceType and sourceId must be provided together' }, { status: 400 })
    }

    if (body.sourceId && !isValidUUID(body.sourceId)) {
      return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 })
    }

    // Validate due date format if provided
    if (body.dueDate) {
      const dueDate = new Date(body.dueDate)
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 })
      }
    }

    // Validate metadata size (prevent DoS via large payloads)
    if (body.metadata) {
      const metadataStr = JSON.stringify(body.metadata)
      if (metadataStr.length > 10000) { // 10KB limit
        return NextResponse.json({ error: 'Metadata too large (max 10KB)' }, { status: 400 })
      }
    }

    const supabase = getSupabaseServiceClient()
    const supabaseService = getSupabaseServiceClient()

    // Verify client belongs to firm if clientId provided
    if (body.clientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', body.clientId)
        .eq('firm_id', firmIdResult.firmId)
        .single()

      if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 400 })
      }
    }

    // Verify assigned user belongs to firm if assignedTo provided
    if (body.assignedTo) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', body.assignedTo)
        .eq('firm_id', firmIdResult.firmId)
        .single()

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 })
      }
    }

    // Create task
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        firm_id: firmIdResult.firmId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        type: body.type || 'general',
        status: 'pending',
        priority: body.priority || 'medium',
        assigned_to: body.assignedTo || null,
        assigned_by: authResult.context.userId,
        client_id: body.clientId || null,
        assessment_id: body.assessmentId || null,
        source_type: body.sourceType || null,
        source_id: body.sourceId || null,
        due_date: body.dueDate || null,
        requires_sign_off: body.requiresSignOff || false,
        is_recurring: body.isRecurring || false,
        recurrence_rule: body.recurrenceRule || null,
        parent_task_id: body.parentTaskId || null,
        metadata: (body.metadata || {}) as Json,
      })
      .select(`
        *,
        clients:client_id (
          id,
          personal_details,
          client_ref
        ),
        assigned_user:assigned_to (
          id,
          first_name,
          last_name,
          email
        ),
        assigner:assigned_by (
          id,
          first_name,
          last_name
        )
      `)
      .single()

    if (createError || !task) {
      console.error('[Tasks API] Error creating task:', createError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Log activity
    await supabaseService
      .from('activity_log')
      .insert({
        id: crypto.randomUUID(),
        client_id: body.clientId || null,
        firm_id: firmIdResult.firmId,
        action: `Task created: ${body.title}`,
        type: 'task_created',
        date: new Date().toISOString(),
        user_name: null, // Will be populated from session if needed
        metadata: {
          task_id: task.id,
          task_type: task.type,
          assigned_to: task.assigned_to,
          performed_by: authResult.context.userId,
        } as Json,
      })

    // Create notification if task is assigned to someone else
    if (task.assigned_to && task.assigned_to !== authResult.context.userId) {
      await supabaseService
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          user_id: task.assigned_to,
          firm_id: firmIdResult.firmId,
          type: 'task_assigned',
          title: 'New task assigned',
          message: `You have been assigned a new task: ${task.title}`,
          action_url: `/tasks/${task.id}`,
          read: false,
          created_at: new Date().toISOString(),
        })
    }

    // Transform response
    const response = {
      id: task.id,
      firmId: task.firm_id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assigned_to,
      assignedBy: task.assigned_by,
      clientId: task.client_id,
      assessmentId: task.assessment_id,
      sourceType: task.source_type,
      sourceId: task.source_id,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      completedBy: task.completed_by,
      requiresSignOff: task.requires_sign_off,
      signedOffBy: task.signed_off_by,
      signedOffAt: task.signed_off_at,
      isRecurring: task.is_recurring,
      recurrenceRule: task.recurrence_rule,
      parentTaskId: task.parent_task_id,
      metadata: task.metadata,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      clientFirstName: (task as any).clients?.personal_details?.firstName,
      clientLastName: (task as any).clients?.personal_details?.lastName,
      clientRef: (task as any).clients?.client_ref,
      assignedToFirstName: (task as any).assigned_user?.first_name,
      assignedToLastName: (task as any).assigned_user?.last_name,
      assignedToEmail: (task as any).assigned_user?.email,
      assignedByFirstName: (task as any).assigner?.first_name,
      assignedByLastName: (task as any).assigner?.last_name,
    }

    return NextResponse.json({ task: response }, { status: 201 })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
