/**
 * Individual User API Route
 * GET /api/firm/users/[userId] - Get a specific user
 * PUT /api/firm/users/[userId] - Update a specific user
 * DELETE /api/firm/users/[userId] - Deactivate a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { FirmUser, UserRole, UserStatus } from '@/modules/firm/types/user.types'
import type { Json } from '@/types/db'

// UUID validation regex (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params

    // Validate UUID format to prevent database errors
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = getSupabaseServiceClient()

    // Get the user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        status,
        firm_id,
        phone,
        avatar_url,
        last_login_at,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get email using RPC function
    const { data: emailData } = await supabase
      .rpc('get_firm_user_emails', { firm_uuid: firmIdResult.firmId })

    const userEmail = emailData?.find((e: { user_id: string; email: string }) => e.user_id === userId)?.email || ''

    const user: FirmUser = {
      id: profile.id,
      email: userEmail,
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: `${profile.first_name} ${profile.last_name}`.trim(),
      role: profile.role as UserRole,
      status: (profile.status ?? 'active') as UserStatus,
      firmId: profile.firm_id ?? '',
      phone: profile.phone ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
      lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('[User API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Valid role and status values
const VALID_ROLES: UserRole[] = ['advisor', 'supervisor', 'admin']
const VALID_STATUSES: UserStatus[] = ['active', 'invited', 'deactivated']

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params

    // Validate UUID format to prevent database errors
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update other users
    const isAdmin = authResult.context.role === 'admin'
    const isSelf = authResult.context.userId === userId

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only update your own profile' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body = await request.json()
    const { firstName, lastName, phone, role, status } = body

    // ========================================
    // INPUT VALIDATION
    // ========================================

    // Validate firstName if provided
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 100) {
        return NextResponse.json({ error: 'First name must be 1-100 characters' }, { status: 400 })
      }
    }

    // Validate lastName if provided
    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 100) {
        return NextResponse.json({ error: 'Last name must be 1-100 characters' }, { status: 400 })
      }
    }

    // Validate phone if provided (allow E.164 format)
    if (phone !== undefined && phone !== null && phone !== '') {
      const cleanPhone = String(phone).replace(/[\s\-()]/g, '')
      if (cleanPhone.length > 20 || !/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
    }

    // Validate role if provided
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be advisor, supervisor, or admin' }, { status: 400 })
    }

    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be active, invited, or deactivated' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (firstName !== undefined) updateData.first_name = firstName.trim()
    if (lastName !== undefined) updateData.last_name = lastName.trim()
    if (phone !== undefined) updateData.phone = phone

    // Only admins can change role and status (including self if not last admin)
    // Self-demotion will be blocked by the last admin check below
    if (isAdmin) {
      if (role !== undefined) updateData.role = role
      if (status !== undefined) updateData.status = status
    }

    // Verify user belongs to the same firm and get current values for rollback
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('firm_id, role, status, first_name, last_name, phone')
      .eq('id', userId)
      .single()

    if (!existingProfile || existingProfile.firm_id !== firmIdResult.firmId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ========================================
    // LAST ADMIN PROTECTION (Pre-check)
    // Prevent removing/demoting the last admin in the firm
    // Note: This includes self-demotion protection for admins
    // ========================================
    const isCurrentlyAdmin = existingProfile.role === 'admin'
    const wouldRemoveAdmin = (
      (role !== undefined && role !== 'admin') ||
      (status !== undefined && status === 'deactivated')
    )

    // Check applies to ANY admin being demoted (including self)
    if (isCurrentlyAdmin && wouldRemoveAdmin) {
      // Pre-check admin count (will also do post-check for race condition protection)
      const { count: adminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if ((adminCount ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove or demote the last admin in the firm' },
          { status: 400 }
        )
      }
    }

    // Update the profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .eq('firm_id', firmIdResult.firmId)
      .select(`
        id,
        first_name,
        last_name,
        role,
        status,
        firm_id,
        phone,
        avatar_url,
        last_login_at,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('[User API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // ========================================
    // RACE CONDITION PROTECTION (Post-check)
    // If we just demoted/deactivated an admin, verify firm still has at least one
    // This catches race conditions where multiple demotions happen simultaneously
    // ========================================
    if (isCurrentlyAdmin && wouldRemoveAdmin) {
      const { count: postUpdateAdminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if ((postUpdateAdminCount ?? 0) < 1) {
        // Race condition detected! Rollback ALL changes (not just role/status)
        console.warn('[User API] Race condition detected - rolling back admin demotion')
        await supabase
          .from('profiles')
          .update({
            role: existingProfile.role,
            status: existingProfile.status,
            first_name: existingProfile.first_name,
            last_name: existingProfile.last_name,
            phone: existingProfile.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .eq('firm_id', firmIdResult.firmId)

        return NextResponse.json(
          { error: 'Cannot remove or demote the last admin in the firm (concurrent modification detected)' },
          { status: 409 }
        )
      }
    }

    // ========================================
    // ACTIVITY LOGGING
    // Log significant changes (role, status) for audit trail
    // ========================================
    const supabaseService = getSupabaseServiceClient()
    const activityEntries: Array<{
      id: string
      client_id: string | null
      firm_id: string
      action: string
      type: string
      date: string
      user_name: string
      metadata: Json
    }> = []

    // Get performer name
    const { data: performerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', authResult.context.userId)
      .single()

    const performerName = performerProfile
      ? `${performerProfile.first_name || ''} ${performerProfile.last_name || ''}`.trim() || 'Admin'
      : 'Admin'
    const targetUserName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
    const nowIso = new Date().toISOString()

    // Log role change
    if (role !== undefined && role !== existingProfile.role) {
      activityEntries.push({
        id: crypto.randomUUID(),
        client_id: null,
        firm_id: firmIdResult.firmId, // Required for RLS policy
        action: `Role changed for ${targetUserName}: ${existingProfile.role} → ${role}`,
        type: 'user_role_change',
        date: nowIso,
        user_name: performerName,
        metadata: {
          target_user_id: userId,
          target_user_name: targetUserName,
          previous_role: existingProfile.role,
          new_role: role,
          performed_by: authResult.context.userId
        } as Json
      })
    }

    // Log status change
    if (status !== undefined && status !== existingProfile.status) {
      const statusAction = status === 'deactivated' ? 'deactivated' : status === 'active' ? 'reactivated' : 'status changed'
      activityEntries.push({
        id: crypto.randomUUID(),
        client_id: null,
        firm_id: firmIdResult.firmId, // Required for RLS policy
        action: `User ${targetUserName} ${statusAction}`,
        type: 'user_status_change',
        date: nowIso,
        user_name: performerName,
        metadata: {
          target_user_id: userId,
          target_user_name: targetUserName,
          previous_status: existingProfile.status,
          new_status: status,
          performed_by: authResult.context.userId
        } as Json
      })
    }

    // Insert activity log entries
    if (activityEntries.length > 0) {
      const { error: activityError } = await supabaseService
        .from('activity_log')
        .insert(activityEntries)

      if (activityError) {
        console.warn('[User API] Failed to log activity:', activityError)
        // Don't fail the request - activity logging is non-critical
      }
    }

    // Get email using RPC function
    const { data: emailData } = await supabase
      .rpc('get_firm_user_emails', { firm_uuid: firmIdResult.firmId })

    const userEmail = emailData?.find((e: { user_id: string; email: string }) => e.user_id === userId)?.email || ''

    const user: FirmUser = {
      id: profile.id,
      email: userEmail,
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: `${profile.first_name} ${profile.last_name}`.trim(),
      role: profile.role as UserRole,
      status: (profile.status ?? 'active') as UserStatus,
      firmId: profile.firm_id ?? '',
      phone: profile.phone ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
      lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('[User API] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params

    // Validate UUID format to prevent database errors
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can deactivate users
    if (authResult.context.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can deactivate users' },
        { status: 403 }
      )
    }

    // Can't deactivate yourself
    if (authResult.context.userId === userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = getSupabaseServiceClient()

    // Verify user belongs to the same firm and get role
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('firm_id, status, role')
      .eq('id', userId)
      .single()

    if (!existingProfile || existingProfile.firm_id !== firmIdResult.firmId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ========================================
    // LAST ADMIN PROTECTION
    // Prevent deactivating the last admin in the firm
    // ========================================
    if (existingProfile.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if ((adminCount ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last admin in the firm' },
          { status: 400 }
        )
      }
    }

    // ========================================
    // ORPHAN CLIENT CHECK
    // Check if user has active clients that need reassignment
    // ========================================
    const url = new URL(request.url)
    const confirmOrphan = url.searchParams.get('confirmOrphan') === 'true'

    // Check for clients assigned to this user
    const { data: assignedClients, count: clientCount } = await supabase
      .from('clients')
      .select('id, personal_details', { count: 'exact' })
      .eq('advisor_id', userId)
      .eq('firm_id', firmIdResult.firmId)
      .limit(5) // Just get a few for the response

    if ((clientCount ?? 0) > 0 && !confirmOrphan) {
      // Return 409 Conflict with client info so UI can prompt for reassignment
      const clientNames = (assignedClients ?? []).map((c: { id: string; personal_details: Record<string, unknown> | null }) => {
        const pd = c.personal_details
        if (!pd) return 'Unknown'
        const firstName = (pd.firstName || pd.first_name || '') as string
        const lastName = (pd.lastName || pd.last_name || '') as string
        return `${firstName} ${lastName}`.trim() || 'Unknown'
      })

      return NextResponse.json(
        {
          error: 'User has assigned clients',
          code: 'HAS_CLIENTS',
          message: `This user has ${clientCount} client(s) assigned. Reassign clients before deactivating or confirm to leave them orphaned.`,
          clientCount,
          clientSamples: clientNames,
          requiresReassignment: true
        },
        { status: 409 }
      )
    }

    // Get user info before deactivation for logging
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    const targetUserName = targetProfile
      ? `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim() || 'User'
      : 'User'

    // Soft delete - set status to deactivated
    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'deactivated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('firm_id', firmIdResult.firmId)

    if (error) {
      console.error('[User API] Deactivate error:', error)
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
    }

    // ========================================
    // RACE CONDITION PROTECTION (Post-check for DELETE)
    // If we just deactivated an admin, verify firm still has at least one
    // ========================================
    if (existingProfile.role === 'admin') {
      const { count: postDeleteAdminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if ((postDeleteAdminCount ?? 0) < 1) {
        // Race condition detected! Rollback the deactivation
        console.warn('[User API] Race condition in DELETE - rolling back admin deactivation')
        await supabase
          .from('profiles')
          .update({
            status: existingProfile.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .eq('firm_id', firmIdResult.firmId)

        return NextResponse.json(
          { error: 'Cannot deactivate the last admin in the firm (concurrent modification detected)' },
          { status: 409 }
        )
      }
    }

    // ========================================
    // ACTIVITY LOGGING - User deactivation
    // ========================================
    const supabaseService = getSupabaseServiceClient()

    // Get performer name
    const { data: performerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', authResult.context.userId)
      .single()

    const performerName = performerProfile
      ? `${performerProfile.first_name || ''} ${performerProfile.last_name || ''}`.trim() || 'Admin'
      : 'Admin'

    const { error: activityError } = await supabaseService
      .from('activity_log')
      .insert({
        id: crypto.randomUUID(),
        client_id: null,
        firm_id: firmIdResult.firmId, // Required for RLS policy
        action: `User ${targetUserName} deactivated${confirmOrphan && (clientCount ?? 0) > 0 ? ` (${clientCount} orphaned clients)` : ''}`,
        type: 'user_deactivated',
        date: new Date().toISOString(),
        user_name: performerName,
        metadata: {
          target_user_id: userId,
          target_user_name: targetUserName,
          orphaned_clients: confirmOrphan ? (clientCount ?? 0) : 0,
          performed_by: authResult.context.userId
        }
      })

    if (activityError) {
      console.warn('[User API] Failed to log deactivation:', activityError)
    }

    return NextResponse.json({ success: true, message: 'User deactivated' })
  } catch (error) {
    console.error('[User API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
