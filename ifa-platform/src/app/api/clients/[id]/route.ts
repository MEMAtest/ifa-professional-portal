// src/app/api/clients/[id]/route.ts
// ✅ COMPLETE DYNAMIC CLIENT ROUTE HANDLER

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/clients/[id]
 * Get a single client by ID
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
        // No rows returned
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

    console.log(`✅ Found client: ${client.personalDetails?.firstName || 'Unknown'} ${client.personalDetails?.lastName || ''}`);

    return NextResponse.json({
      success: true,
      client: client
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
 * Update a client
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📝 PATCH /api/clients/${params.id} - Updating client...`);
    
    if (!params.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client ID is required' 
        }, 
        { status: 400 }
      );
    }

    // Parse request body
    const updates = await request.json();
    
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No update data provided' 
        }, 
        { status: 400 }
      );
    }

    // Add updated timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Update client in database
    const { data: updatedClient, error } = await supabase
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

    console.log(`✅ Updated client: ${params.id}`);

    return NextResponse.json({
      success: true,
      client: updatedClient,
      message: 'Client updated successfully'
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
 * Delete a client (soft delete - mark as archived)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗑️ DELETE /api/clients/${params.id} - Deleting client...`);
    
    if (!params.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client ID is required' 
        }, 
        { status: 400 }
      );
    }

    // Check if client exists first
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id, personalDetails')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Client not found' 
          }, 
          { status: 404 }
        );
      }
      
      console.error('❌ Database error:', fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to check client existence',
          details: fetchError.message 
        }, 
        { status: 500 }
      );
    }

    // Soft delete - mark as archived instead of hard delete
    const { error: deleteError } = await supabase
      .from('clients')
      .update({ 
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (deleteError) {
      console.error('❌ Database error:', deleteError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete client',
          details: deleteError.message 
        }, 
        { status: 500 }
      );
    }

    console.log(`✅ Archived client: ${params.id}`);

    return NextResponse.json({
      success: true,
      message: 'Client archived successfully'
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