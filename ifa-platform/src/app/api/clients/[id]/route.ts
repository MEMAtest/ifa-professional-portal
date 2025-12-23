// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/clients/[id]/route.ts
// ✅ FIXED: Using proper server-side Supabase client

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createRequestLogger } from '@/lib/logging/structured'

/**
 * GET /api/clients/[id]
 * Get a single client by ID - returns RAW data
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id;
    logger.debug('GET /api/clients/[id] - Request received', { clientId })

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

    // Fetch client from database
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

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
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id;
    logger.debug('PATCH /api/clients/[id] - Updating client', { clientId })

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

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

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
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id;
    logger.debug('DELETE /api/clients/[id] - Deleting client', { clientId })

    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      return NextResponse.json(
        {
          success: false,
          error: 'Client ID is required'
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

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
