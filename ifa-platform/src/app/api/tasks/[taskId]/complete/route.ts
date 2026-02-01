/**
 * Complete Task API Route
 * POST /api/tasks/[taskId]/complete - Mark task as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
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

interface CompleteTaskInput {
  signOff?: boolean
}

export async function POST(request: NextRequest, context: RouteContext) {
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

    const body: CompleteTaskInput = await request.json().catch(() => ({}))

    const supabase = getSupabaseServiceClient()
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

    // Check if already completed
    if (existingTask.status === 'completed') {
      return NextResponse.json({ error: 'Task is already completed' }, { status: 400 })
    }

    // Check if task requires sign-off
    if (existingTask.requires_sign_off) {
      // Only admin, supervisor, and compliance roles can sign off
      const canSignOff = ['admin', 'supervisor', 'compliance'].includes(authResult.context.role || '')

      if (!canSignOff) {
        return NextResponse.json({
          error: 'This task requires supervisor sign-off. Please ask a supervisor to complete it.',
          requiresSignOff: true,
        }, { status: 403 })
      }

      // Require explicit sign-off confirmation
      if (!body.signOff) {
        return NextResponse.json({
          error: 'Sign-off confirmation required to complete this task',
          requiresSignOff: true,
        }, { status: 400 })
      }
    }

    // Build update
    const updateData: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: authResult.context.userId,
      updated_at: new Date().toISOString(),
    }

    // Add sign-off if applicable
    if (existingTask.requires_sign_off && body.signOff) {
      updateData.signed_off_by = authResult.context.userId
      updateData.signed_off_at = new Date().toISOString()
    }

    // Update task
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)
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
      console.error('[Tasks API] Error completing task:', updateError)
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
    }

    // Log activity
    await supabaseService
      .from('activity_log')
      .insert({
        id: crypto.randomUUID(),
        client_id: task.client_id || null,
        firm_id: firmIdResult.firmId,
        action: `Task completed: ${task.title}`,
        type: 'task_completed',
        date: new Date().toISOString(),
        metadata: {
          task_id: task.id,
          signed_off: body.signOff || false,
          performed_by: authResult.context.userId,
        } as Json,
      })

    // Notify task creator if different from completer
    if (task.assigned_by && task.assigned_by !== authResult.context.userId) {
      await supabaseService
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          user_id: task.assigned_by,
          firm_id: firmIdResult.firmId,
          type: 'task_completed',
          title: 'Task completed',
          message: `Task "${task.title}" has been completed`,
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
