// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/clients/[id]/route.ts
// ✅ DEFINITIVE FIX: Enhanced error handling and parameter extraction

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/clients/[id]
 * Get a single client by ID - returns RAW data
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }  // Changed parameter name for clarity
) {
  try {
    // Enhanced logging to debug the issue
    console.log('📋 GET /api/clients/[id] - Request received');
    console.log('Context:', JSON.stringify(context));
    console.log('Params:', JSON.stringify(context?.params));
    console.log('ID:', context?.params?.id);
    
    // More robust parameter extraction
    const clientId = context?.params?.id;
    
    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      console.error('❌ No valid client ID provided');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client ID is required',
          debug: {
            context: JSON.stringify(context),
            params: JSON.stringify(context?.params),
            receivedId: clientId
          }
        }, 
        { status: 400 }
      );
    }

    console.log(`📋 Fetching client with ID: ${clientId}`);

    // Fetch client from database
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`❌ Client not found: ${clientId}`);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Client not found',
            clientId: clientId
          }, 
          { status: 404 }
        );
      }
      
      console.error('❌ Database error:', error);
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
      console.log(`❌ No client data returned for ID: ${clientId}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client not found',
          clientId: clientId
        }, 
        { status: 404 }
      );
    }

    console.log(`✅ Found client: ${client.client_ref || clientId}`);

    // ✅ Return RAW data
    return NextResponse.json({
      success: true,
      client // RAW database data
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET /api/clients/[id]:', error);
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
  try {
    const clientId = context?.params?.id;
    
    console.log(`📋 PATCH /api/clients/${clientId} - Updating client...`);
    
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
    const updateData: any = {
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
      
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update client',
          details: error.message 
        }, 
        { status: 500 }
      );
    }

    console.log(`✅ Updated client: ${client.client_ref}`);
    
    // Revalidate the cache
    revalidatePath('/api/clients');
    revalidatePath(`/api/clients/${clientId}`);
    revalidatePath('/clients');

    // ✅ Return RAW data
    return NextResponse.json({
      success: true,
      client // RAW database data
    });

  } catch (error) {
    console.error(`❌ PATCH /api/clients/[id] error:`, error);
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
  try {
    const clientId = context?.params?.id;
    
    console.log(`📋 DELETE /api/clients/${clientId} - Deleting client...`);
    
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
      
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete client',
          details: error.message 
        }, 
        { status: 500 }
      );
    }

    console.log(`✅ Deleted client: ${clientId}`);
    
    // Revalidate the cache
    revalidatePath('/api/clients');
    revalidatePath('/clients');

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error(`❌ DELETE /api/clients/[id] error:`, error);
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