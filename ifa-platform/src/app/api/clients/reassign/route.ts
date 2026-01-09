// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/clients/reassign/route.ts
// Bulk client reassignment API

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'
import { notifyClientReassigned } from '@/lib/notifications/notificationService'
import type { Json } from '@/types/db'

interface ReassignRequest {
  clientIds: string[]
  newAdvisorId: string
  transferAssessments?: boolean
  reason?: string
}

interface ClientRow {
  id: string
  advisor_id: string | null
  personal_details: Record<string, unknown> | null
  firm_id: string | null
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
}

/**
 * POST /api/clients/reassign
 * Bulk reassign clients to a different advisor
 *
 * Required permissions: supervisor or admin
 */
export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check user's role - must be supervisor or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, firm_id, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
    }

    if (!['admin', 'supervisor'].includes(profile.role || '')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Supervisor or admin role required.' },
        { status: 403 }
      )
    }

    const body: ReassignRequest = await request.json()
    const { clientIds, newAdvisorId, transferAssessments = false, reason } = body

    // Validate request
    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'clientIds array is required' },
        { status: 400 }
      )
    }

    if (!newAdvisorId) {
      return NextResponse.json(
        { success: false, error: 'newAdvisorId is required' },
        { status: 400 }
      )
    }

    logger.info('Client reassignment request', {
      clientCount: clientIds.length,
      newAdvisorId,
      transferAssessments,
      requestedBy: user.id
    })

    // Verify new advisor exists and is in the same firm
    const { data: newAdvisor, error: advisorError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, firm_id, role')
      .eq('id', newAdvisorId)
      .single()

    if (advisorError || !newAdvisor) {
      return NextResponse.json(
        { success: false, error: 'New advisor not found' },
        { status: 404 }
      )
    }

    if (newAdvisor.firm_id !== profile.firm_id) {
      return NextResponse.json(
        { success: false, error: 'New advisor must be in the same firm' },
        { status: 400 }
      )
    }

    const newAdvisorName = `${newAdvisor.first_name || ''} ${newAdvisor.last_name || ''}`.trim() || 'Unknown'
    const performerName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || 'System'

    // Fetch clients to reassign with their current advisor info
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, advisor_id, personal_details, firm_id')
      .in('id', clientIds)
      .eq('firm_id', profile.firm_id) // Security: only reassign clients in user's firm

    if (clientsError) {
      logger.error('Error fetching clients', clientsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No clients found with the provided IDs in your firm' },
        { status: 404 }
      )
    }

    // Get unique previous advisor IDs
    const previousAdvisorIds = [...new Set((clients as ClientRow[]).map((c: ClientRow) => c.advisor_id).filter(Boolean))] as string[]

    // Fetch previous advisor names
    const { data: previousAdvisors } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', previousAdvisorIds)

    const advisorNameMap = new Map<string, string>()
    ;(previousAdvisors as ProfileRow[] | null)?.forEach((a: ProfileRow) => {
      advisorNameMap.set(a.id, `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unassigned')
    })

    // Use service client for operations that need elevated permissions
    const supabaseService = getSupabaseServiceClient()
    const nowIso = new Date().toISOString()
    const activityEntries: Array<{
      id: string
      client_id: string
      action: string
      type: string
      date: string
      user_name: string
      metadata: Json
    }> = []

    const reassignedClients: Array<{
      id: string
      clientName: string
      previousAdvisorId: string | null
      previousAdvisorName: string
    }> = []

    // Update each client
    for (const client of clients) {
      const clientName = getClientDisplayName(client.personal_details) || 'Client'
      const previousAdvisorId = client.advisor_id
      const previousAdvisorName = previousAdvisorId
        ? advisorNameMap.get(previousAdvisorId) || 'Unknown'
        : 'Unassigned'

      // Skip if already assigned to the new advisor
      if (previousAdvisorId === newAdvisorId) {
        logger.debug('Client already assigned to target advisor', { clientId: client.id })
        continue
      }

      // Update client's advisor_id
      const { error: updateError } = await supabaseService
        .from('clients')
        .update({
          advisor_id: newAdvisorId,
          updated_at: nowIso
        })
        .eq('id', client.id)

      if (updateError) {
        logger.error('Error updating client advisor', { clientId: client.id, error: updateError })
        continue
      }

      reassignedClients.push({
        id: client.id,
        clientName,
        previousAdvisorId,
        previousAdvisorName
      })

      // Create activity log entry
      activityEntries.push({
        id: crypto.randomUUID(),
        client_id: client.id,
        action: `Client reassigned from ${previousAdvisorName} to ${newAdvisorName}${reason ? `. Reason: ${reason}` : ''}`,
        type: 'client_reassignment',
        date: nowIso,
        user_name: performerName,
        metadata: {
          field: 'advisor',
          previous_advisor_id: previousAdvisorId,
          previous_advisor_name: previousAdvisorName,
          new_advisor_id: newAdvisorId,
          new_advisor_name: newAdvisorName,
          reason: reason || null,
          performed_by: user.id
        } as Json
      })
    }

    // Log activity entries
    if (activityEntries.length > 0) {
      const { error: activityError } = await supabaseService
        .from('activity_log')
        .insert(activityEntries)

      if (activityError) {
        logger.warn('Failed to log reassignment activities', { error: activityError })
      }
    }

    // Optionally transfer assessments
    if (transferAssessments && reassignedClients.length > 0) {
      const reassignedIds = reassignedClients.map(c => c.id)

      // Update assessments table if it has an advisor field
      // Note: This depends on your assessment schema
      try {
        await supabaseService
          .from('assessments')
          .update({
            advisor_id: newAdvisorId,
            updated_at: nowIso
          })
          .in('client_id', reassignedIds)
          .is('completed_at', null) // Only transfer in-progress assessments
      } catch (assessmentError) {
        logger.warn('Assessment transfer failed (table may not have advisor_id)', { error: assessmentError })
      }
    }

    // Send notifications
    for (const client of reassignedClients) {
      try {
        // Notify the previous advisor (client removed)
        if (client.previousAdvisorId) {
          await notifyClientReassigned(
            client.previousAdvisorId,
            client.id,
            client.clientName,
            'removed',
            newAdvisorName,
            profile.firm_id || undefined
          )
        }

        // Notify the new advisor (client assigned)
        await notifyClientReassigned(
          newAdvisorId,
          client.id,
          client.clientName,
          'assigned',
          client.previousAdvisorName,
          profile.firm_id || undefined
        )
      } catch (notifyError) {
        logger.warn('Failed to send reassignment notification', {
          clientId: client.id,
          error: notifyError
        })
      }
    }

    // Revalidate caches
    revalidatePath('/api/clients')
    revalidatePath('/clients')
    for (const client of reassignedClients) {
      revalidatePath(`/api/clients/${client.id}`)
    }

    logger.info('Client reassignment completed', {
      total: clientIds.length,
      reassigned: reassignedClients.length,
      skipped: clientIds.length - reassignedClients.length
    })

    return NextResponse.json({
      success: true,
      message: `Successfully reassigned ${reassignedClients.length} client(s)`,
      reassigned: reassignedClients.length,
      skipped: clientIds.length - reassignedClients.length,
      details: reassignedClients.map(c => ({
        id: c.id,
        name: c.clientName,
        previousAdvisor: c.previousAdvisorName
      }))
    })

  } catch (error) {
    logger.error('Client reassignment error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Extract display name from personal_details
 */
function getClientDisplayName(personalDetails: any): string {
  if (!personalDetails) return ''
  const firstName = personalDetails.firstName || personalDetails.first_name || ''
  const lastName = personalDetails.lastName || personalDetails.last_name || ''
  return `${firstName} ${lastName}`.trim()
}
