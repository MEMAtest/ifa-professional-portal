/**
 * Task API Route
 * GET /api/tasks/[taskId] - Get a single task
 * PATCH /api/tasks/[taskId] - Update a task
 * DELETE /api/tasks/[taskId] - Delete a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { UpdateTaskInput, TaskStatus, TaskType, TaskPriority } from '@/modules/tasks/types'
import type { Json } from '@/types/db'

export const dynamic = 'force-dynamic'

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

interface RouteContext {
  params: Promise<{ taskId: string }>
}

// ============================================
// GET: Get single task
// ============================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { taskId } = await context.params

    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = await createClient()

    const { data: task, error } = await supabase
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
      `)
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (error || !task) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      console.error('[Tasks API] Error fetching task:', error)
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
    }

    // Get comment count
    const { count: commentCount } = await supabase
      .from('task_comments')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId)

    // Transform to camelCase
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
      commentCount: commentCount || 0,
    }

    return NextResponse.json({ task: response })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// PATCH: Update task
// ============================================
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { taskId } = await context.params

    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body: UpdateTaskInput = await request.json()

    // Validate title if provided
    if (body.title !== undefined) {
      if (body.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      }
      if (body.title.length > 500) {
        return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 })
      }
    }

    // Validate type if provided
    const validTypes: TaskType[] = ['general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting']
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
    }

    // Validate status if provided
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Validate priority if provided
    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
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

    // Check authorization for sign-off operations
    // Only admin, supervisor, and compliance roles can sign off on tasks
    const canSignOff = ['admin', 'supervisor', 'compliance'].includes(authResult.context.role || '')
    if ((body as any).signedOffBy !== undefined || (body as any).signedOffAt !== undefined) {
      if (!canSignOff) {
        return NextResponse.json(
          { error: 'You do not have permission to sign off on tasks' },
          { status: 403 }
        )
      }
    }

    const supabase = await createClient()
    const supabaseService = getSupabaseServiceClient()

    // Get existing task
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify client belongs to firm if clientId provided
    if (body.clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', body.clientId)
        .eq('firm_id', firmIdResult.firmId)
        .single()

      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 400 })
      }
    }

    // Verify assigned user belongs to firm if assignedTo provided
    if (body.assignedTo) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', body.assignedTo)
        .eq('firm_id', firmIdResult.firmId)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.assignedTo !== undefined) updateData.assigned_to = body.assignedTo
    if (body.clientId !== undefined) updateData.client_id = body.clientId
    if (body.assessmentId !== undefined) updateData.assessment_id = body.assessmentId
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate
    if (body.requiresSignOff !== undefined) updateData.requires_sign_off = body.requiresSignOff
    if (body.isRecurring !== undefined) updateData.is_recurring = body.isRecurring
    if (body.recurrenceRule !== undefined) updateData.recurrence_rule = body.recurrenceRule
    if (body.metadata !== undefined) updateData.metadata = body.metadata as Json

    // Handle status changes
    const isStatusChange = body.status !== undefined && body.status !== existingTask.status
    if (body.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = authResult.context.userId
    } else if (body.status !== 'completed' && existingTask.status === 'completed') {
      updateData.completed_at = null
      updateData.completed_by = null
    }

    // Build update query with optimistic locking for status changes
    let updateQuery = supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)

    // Add status check to prevent race conditions during status updates
    if (isStatusChange) {
      updateQuery = updateQuery.eq('status', existingTask.status)
    }

    const { data: task, error: updateError } = await updateQuery
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

    if (updateError || !task) {
      // Check if it's a conflict (status changed by another request)
      if (updateError?.code === 'PGRST116' && isStatusChange) {
        return NextResponse.json(
          { error: 'Task was modified by another user. Please refresh and try again.' },
          { status: 409 }
        )
      }
      console.error('[Tasks API] Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // Log activity if status changed
    if (body.status && body.status !== existingTask.status) {
      await supabaseService
        .from('activity_log')
        .insert({
          id: crypto.randomUUID(),
          client_id: task.client_id || null,
          firm_id: firmIdResult.firmId,
          action: `Task status changed to ${body.status}: ${task.title}`,
          type: body.status === 'completed' ? 'task_completed' : 'task_updated',
          date: new Date().toISOString(),
          metadata: {
            task_id: task.id,
            previous_status: existingTask.status,
            new_status: body.status,
            performed_by: authResult.context.userId,
          } as Json,
        })
    }

    // Send notification if task reassigned
    if (body.assignedTo && body.assignedTo !== existingTask.assigned_to && body.assignedTo !== authResult.context.userId) {
      await supabaseService
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          user_id: body.assignedTo,
          firm_id: firmIdResult.firmId,
          type: 'task_assigned',
          title: 'Task assigned to you',
          message: `You have been assigned a task: ${task.title}`,
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

    return NextResponse.json({ task: response })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE: Delete task
// ============================================
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { taskId } = await context.params

    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = await createClient()
    const supabaseService = getSupabaseServiceClient()

    // Get task before deletion for logging and authorization
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('title, client_id, assigned_to, assigned_by')
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Authorization: Only admin, supervisor, task creator, or assignee can delete
    const canDelete =
      authResult.context.role === 'admin' ||
      authResult.context.role === 'supervisor' ||
      existingTask.assigned_by === authResult.context.userId ||
      existingTask.assigned_to === authResult.context.userId

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this task' },
        { status: 403 }
      )
    }

    // Delete task (comments will cascade)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)

    if (error) {
      console.error('[Tasks API] Error deleting task:', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    // Log activity
    await supabaseService
      .from('activity_log')
      .insert({
        id: crypto.randomUUID(),
        client_id: existingTask.client_id || null,
        firm_id: firmIdResult.firmId,
        action: `Task deleted: ${existingTask.title}`,
        type: 'task_deleted',
        date: new Date().toISOString(),
        metadata: {
          task_id: taskId,
          performed_by: authResult.context.userId,
        } as Json,
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
