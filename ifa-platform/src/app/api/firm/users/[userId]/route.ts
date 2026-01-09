/**
 * Individual User API Route
 * GET /api/firm/users/[userId] - Get a specific user
 * PUT /api/firm/users/[userId] - Update a specific user
 * DELETE /api/firm/users/[userId] - Deactivate a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { createClient } from '@/lib/supabase/server'
import type { FirmUser, UserRole, UserStatus } from '@/modules/firm/types/user.types'

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = await createClient()

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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
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

    const supabase = await createClient()

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (firstName !== undefined) updateData.first_name = firstName
    if (lastName !== undefined) updateData.last_name = lastName
    if (phone !== undefined) updateData.phone = phone

    // Only admins can change role and status
    if (isAdmin && !isSelf) {
      if (role !== undefined) updateData.role = role
      if (status !== undefined) updateData.status = status
    }

    // Verify user belongs to the same firm
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', userId)
      .single()

    if (!existingProfile || existingProfile.firm_id !== firmIdResult.firmId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

    const supabase = await createClient()

    // Verify user belongs to the same firm
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('firm_id, status')
      .eq('id', userId)
      .single()

    if (!existingProfile || existingProfile.firm_id !== firmIdResult.firmId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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

    return NextResponse.json({ success: true, message: 'User deactivated' })
  } catch (error) {
    console.error('[User API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
