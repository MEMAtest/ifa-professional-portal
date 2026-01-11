/**
 * Task Comments API Route
 * GET /api/tasks/[taskId]/comments - List task comments
 * POST /api/tasks/[taskId]/comments - Add a comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { createClient } from '@/lib/supabase/server'
import type { CreateTaskCommentInput } from '@/modules/tasks/types'

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
// GET: List comments
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

    // Verify task exists and belongs to firm
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get comments with user info
    const { data: comments, error, count } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Tasks API] Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Transform to camelCase
    const transformedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      taskId: comment.task_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      userFirstName: comment.user?.first_name,
      userLastName: comment.user?.last_name,
      userEmail: comment.user?.email,
      userAvatarUrl: comment.user?.avatar_url,
    }))

    return NextResponse.json({
      comments: transformedComments,
      total: count || 0,
    })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST: Add comment
// ============================================
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

    const body: CreateTaskCommentInput = await request.json()

    // Validate content
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    if (body.content.length > 5000) {
      return NextResponse.json({ error: 'Comment must be 5000 characters or less' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify task exists and belongs to firm
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: authResult.context.userId,
        content: body.content.trim(),
      })
      .select(`
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (createError || !comment) {
      console.error('[Tasks API] Error creating comment:', createError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Transform response
    const response = {
      id: comment.id,
      taskId: comment.task_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      userFirstName: (comment as any).user?.first_name,
      userLastName: (comment as any).user?.last_name,
      userEmail: (comment as any).user?.email,
      userAvatarUrl: (comment as any).user?.avatar_url,
    }

    return NextResponse.json({ comment: response }, { status: 201 })
  } catch (error) {
    console.error('[Tasks API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
