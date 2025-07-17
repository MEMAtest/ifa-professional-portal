// src/app/api/clients/[id]/route.ts
// ✅ FIXED: Returns RAW database data, no transformation

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/clients/[id]
 * Get a single client by ID - returns RAW data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 GET /api/clients/${params.id} - Fetching client...`);
    
    if (!params.id) {
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
      .eq('id', params.id)
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
          error: 'Failed to fetch client',
          details: error.message 
        }, 
        { status: 500 }
      );
    }

    console.log(`✅ Found client: ${client.client_ref}`);

    // ✅ CRITICAL: Return RAW data, no transformation!
    return NextResponse.json({
      success: true,
      client // RAW database data
    });

  } catch (error) {
    console.error(`❌ GET /api/clients/${params.id} error:`, error);
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
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 PATCH /api/clients/${params.id} - Updating client...`);
    
    if (!params.id) {
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
      .eq('id', params.id)
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
    revalidatePath(`/api/clients/${params.id}`);
    revalidatePath('/clients');

    // ✅ Return RAW data
    return NextResponse.json({
      success: true,
      client // RAW database data
    });

  } catch (error) {
    console.error(`❌ PATCH /api/clients/${params.id} error:`, error);
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
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 DELETE /api/clients/${params.id} - Deleting client...`);
    
    if (!params.id) {
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
      .eq('id', params.id);

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

    console.log(`✅ Deleted client: ${params.id}`);
    
    // Revalidate the cache
    revalidatePath('/api/clients');
    revalidatePath('/clients');

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error(`❌ DELETE /api/clients/${params.id} error:`, error);
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