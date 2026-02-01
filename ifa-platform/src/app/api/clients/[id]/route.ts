// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/clients/[id]/route.ts
// ✅ FIXED: Using proper server-side Supabase client
// ✅ SECURITY: Added explicit firm_id check for defense in depth

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { createRequestLogger } from '@/lib/logging/structured'
import { notifyProfileUpdated } from '@/lib/notifications/notificationService'

/**
 * GET /api/clients/[id]
 * Get a single client by ID - returns RAW data
 * SECURITY: Includes explicit firm_id check for defense in depth
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    // SECURITY: Require authentication
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const firmId = getValidatedFirmId(auth.context);
    const clientId = context?.params?.id;
    logger.debug('GET /api/clients/[id] - Request received', { clientId, firmId })

    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      logger.warn('No valid client ID provided', { receivedId: clientId })
      return NextResponse.json(
        {
          success: false,
          error: 'Client ID is required'
        },
        { status: 400 }
      );
    }

    // Fetch client with firm_id filter when available
    let query = supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)

    if (firmId) {
      query = query.eq('firm_id', firmId)
    }

    const { data: client, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.info('Client not found', { clientId })
        return NextResponse.json(
          {
            success: false,
            error: 'Client not found',
            clientId: clientId
          },
          { status: 404 }
        );
      }

      logger.error('Database error fetching client', error, { clientId })
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch client',
          details: error.message
        },
        { status: 500 }
      );
    }

    if (!client) {
      logger.info('No client data returned', { clientId })
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found',
          clientId: clientId
        },
        { status: 404 }
      );
    }

    logger.info('Client fetched successfully', { clientId, clientRef: client.client_ref })

    return NextResponse.json({
      success: true,
      client
    });

  } catch (error) {
    logger.error('Unexpected error in GET /api/clients/[id]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/[id]
 * Update a client - accepts camelCase, stores as snake_case
 * SECURITY: Includes explicit firm_id check for defense in depth
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    // SECURITY: Require authentication
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const firmId = getValidatedFirmId(auth.context);
    const user = { id: auth.context.userId, email: auth.context.email, user_metadata: {} };
    const clientId = context?.params?.id;
    logger.debug('PATCH /api/clients/[id] - Updating client', { clientId, firmId })

    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      return NextResponse.json(
        {
          success: false,
          error: 'Client ID is required'
        },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // ========================================
    // OPTIMISTIC LOCKING
    // If client sends expectedUpdatedAt, verify no concurrent edits
    // ========================================
    const expectedUpdatedAt = updates.expectedUpdatedAt || updates._expectedUpdatedAt;

    // Fetch existing client for comparison
    let prevQuery = supabase
      .from('clients')
      .select('personal_details, status, updated_at, firm_id')
      .eq('id', clientId)

    if (firmId) {
      prevQuery = prevQuery.eq('firm_id', firmId)
    }

    const { data: previousClient, error: previousError } = await prevQuery.maybeSingle()

    if (previousError) {
      logger.warn('Unable to fetch existing client for comparison', { clientId, error: previousError.message })
    }

    // Check for concurrent edit conflict
    if (expectedUpdatedAt && previousClient?.updated_at) {
      const expectedTime = new Date(expectedUpdatedAt).getTime()
      const actualTime = new Date(previousClient.updated_at).getTime()

      // Allow 100ms tolerance for timing differences (network latency, clock skew)
      if (Math.abs(expectedTime - actualTime) > 100) {
        logger.info('Optimistic lock conflict detected', {
          clientId,
          expected: expectedUpdatedAt,
          actual: previousClient.updated_at
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Conflict',
            code: 'CONCURRENT_EDIT',
            message: 'This record was modified by another user. Please refresh and try again.',
            serverUpdatedAt: previousClient.updated_at,
            yourExpectedAt: expectedUpdatedAt
          },
          { status: 409 }
        )
      }
    }

    // Prepare update data (convert to snake_case for DB)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Map camelCase fields to snake_case
    if (updates.personalDetails) updateData.personal_details = updates.personalDetails;
    if (updates.contactInfo) updateData.contact_info = updates.contactInfo;
    if (updates.financialProfile) updateData.financial_profile = updates.financialProfile;
    if (updates.vulnerabilityAssessment) updateData.vulnerability_assessment = updates.vulnerabilityAssessment;
    if (updates.riskProfile) updateData.risk_profile = updates.riskProfile;
    if (updates.status) updateData.status = updates.status;
    if (updates.clientRef) updateData.client_ref = updates.clientRef;

    let updateQuery = supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)

    if (firmId) {
      updateQuery = updateQuery.eq('firm_id', firmId)
    }

    const { data: client, error } = await updateQuery.select().single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Client not found'
          },
          { status: 404 }
        );
      }

      logger.error('Database error updating client', error, { clientId })
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update client',
          details: error.message
        },
        { status: 500 }
      );
    }

    logger.info('Client updated successfully', { clientId, clientRef: client.client_ref })

    const formatName = (details: any | null | undefined): string => {
      if (!details) return ''
      const first = details.firstName || details.first_name || ''
      const last = details.lastName || details.last_name || ''
      return `${first} ${last}`.trim()
    }

    const formatStatus = (status?: string | null): string => {
      if (!status) return 'Unknown'
      return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    }

    const previousName = formatName(previousClient?.personal_details)
    const updatedName = formatName(client.personal_details)
    const previousStatus = previousClient?.status || null
    const updatedStatus = client.status || null

    const activityEntries: Array<{
      id: string
      client_id: string
      firm_id: string | null
      action: string
      type: string
      date: string
      user_name?: string | null
      metadata?: Record<string, any>
    }> = []
    const nowIso = new Date().toISOString()
    const userName = (user?.user_metadata as any)?.full_name || user?.email || null

    if (previousName && updatedName && previousName !== updatedName) {
      activityEntries.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        firm_id: client.firm_id, // Required for RLS policy
        action: `Client name updated from ${previousName} to ${updatedName}`,
        type: 'profile_update',
        user_name: userName,
        date: nowIso,
        metadata: {
          field: 'name',
          previous_name: previousName,
          updated_name: updatedName
        }
      })
    }

    if (previousStatus && updatedStatus && previousStatus !== updatedStatus) {
      activityEntries.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        firm_id: client.firm_id, // Required for RLS policy
        action: `Client status updated from ${formatStatus(previousStatus)} to ${formatStatus(updatedStatus)}`,
        type: 'profile_update',
        user_name: userName,
        date: nowIso,
        metadata: {
          field: 'status',
          previous_status: previousStatus,
          updated_status: updatedStatus
        }
      })
    }

    if (activityEntries.length === 0) {
      activityEntries.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        firm_id: client.firm_id, // Required for RLS policy
        action: 'Profile updated',
        type: 'profile_update',
        user_name: userName,
        date: nowIso
      })
    }

    try {
      const supabaseService = getSupabaseServiceClient()
      const { error: activityError } = await supabaseService
        .from('activity_log')
        .insert(activityEntries)
      if (activityError) {
        logger.warn('Failed to log profile update activity', { clientId, error: activityError.message })
      }
    } catch (activityError) {
      // Don't fail the request if activity logging fails
      logger.warn('Failed to log profile update activity', { clientId, error: activityError })
    }

    // Send bell notification
    try {
      const pd = client.personal_details as Record<string, any> | null
      const clientName = updatedName || pd?.firstName || pd?.first_name || 'Client'
      logger.info('Creating profile update notification', { userId: user.id, clientId, clientName })
      await notifyProfileUpdated(user.id, clientId, clientName)
      logger.info('Profile update notification created successfully')
    } catch (notifyError) {
      logger.error('Failed to send profile update notification', { clientId, error: notifyError })
    }

    // Revalidate the cache
    revalidatePath('/api/clients');
    revalidatePath(`/api/clients/${clientId}`);
    revalidatePath('/clients');

    return NextResponse.json({
      success: true,
      client
    });

  } catch (error) {
    logger.error('PATCH /api/clients/[id] error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[id]
 * Delete a client
 * SECURITY: Includes explicit firm_id check for defense in depth
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    // SECURITY: Require authentication
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const firmId = getValidatedFirmId(auth.context);
    const clientId = context?.params?.id;
    logger.debug('DELETE /api/clients/[id] - Deleting client', { clientId, firmId })

    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      return NextResponse.json(
        {
          success: false,
          error: 'Client ID is required'
        },
        { status: 400 }
      );
    }

    // Verify the client exists and belongs to this firm before deleting
    let verifyQuery = supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)

    if (firmId) {
      verifyQuery = verifyQuery.eq('firm_id', firmId)
    }

    const { data: clientRow, error: verifyError } = await verifyQuery.maybeSingle()

    if (verifyError || !clientRow) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete all related records first (FK constraints may lack ON DELETE CASCADE)
    const relatedTables = [
      'activity_log',
      'assessment_documents',
      'assessment_drafts',
      'assessment_history',
      'assessment_progress',
      'assessments',
      'atr_assessments',
      'audit_logs',
      'calendar_events',
      'cash_flow_scenarios',
      'cfl_assessments',
      'client_communications',
      'client_goals',
      'client_reviews',
      'client_workflows',
      'compliance_evidence',
      'document_generation_logs',
      'document_tracking',
      'document_workflows',
      'documents',
      'generated_documents',
      'meetings',
      'monte_carlo_results',
      'monte_carlo_scenarios',
      'pending_actions',
      'persona_assessments',
      'reviews',
      'risk_profiles',
      'signature_requests',
      'stress_test_configs',
      'stress_test_results',
      'suitability_assessments',
      'system_document_queue',
      'tasks',
    ] as const

    for (const table of relatedTables) {
      const { error: delErr } = await supabase
        .from(table as any)
        .delete()
        .eq('client_id', clientId)

      if (delErr) {
        // Log but continue — table may not exist or have no matching rows
        logger.debug(`Failed to clean ${table} for client ${clientId}`, { error: delErr.message })
      }
    }

    // Also clean client_relationships (uses different column names)
    await supabase.from('client_relationships' as any).delete().eq('primary_client_id', clientId)
    await supabase.from('client_relationships' as any).delete().eq('related_client_id', clientId)

    // Now delete the client itself
    let deleteQuery = supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (firmId) {
      deleteQuery = deleteQuery.eq('firm_id', firmId)
    }

    const { error } = await deleteQuery;

    if (error) {
      logger.error('Database error deleting client', error, { clientId })
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete client',
          details: error.message
        },
        { status: 500 }
      );
    }

    logger.info('Client deleted successfully', { clientId })

    // Revalidate the cache
    revalidatePath('/api/clients');
    revalidatePath('/clients');

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    logger.error('DELETE /api/clients/[id] error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
