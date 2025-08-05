// src/app/api/communications/route.ts
// ✅ FIXED: Using correct Supabase import for API routes

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

// GET - Fetch communications for a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Use correct table and columns
    const { data, error } = await supabase
      .from('client_communications')
      .select('*')
      .eq('client_id', clientId)
      .order('communication_date', { ascending: false });

    if (error) {
      console.error('Error fetching communications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch communications' },
        { status: 500 }
      );
    }

    // Transform to expected format for frontend
    const transformedData = (data || []).map(comm => ({
      id: comm.id,
      clientId: comm.client_id,
      type: comm.communication_type,
      subject: comm.subject || '',
      content: comm.summary || '',
      date: comm.communication_date,
      status: 'completed',
      direction: comm.direction || 'outbound',
      method: comm.contact_method || 'email',
      requiresFollowup: comm.requires_followup || false,
      followupDate: comm.followup_date,
      followupCompleted: comm.followup_completed || false
    }));

    return NextResponse.json({ 
      data: transformedData,
      success: true 
    });
  } catch (error) {
    console.error('Error in GET /api/communications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new communication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId, 
      type, 
      subject, 
      content, 
      date, 
      requiresFollowup = false,
      followupDate,
      direction = 'outbound',
      contactMethod = 'email'
    } = body;

    // Validate required fields
    if (!clientId || !type || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, type, and subject are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    // Insert with correct column names
    const { data, error } = await supabase
      .from('client_communications')
      .insert({
        client_id: clientId,
        communication_type: type,
        subject,
        summary: content || '',
        communication_date: date || new Date().toISOString(),
        requires_followup: requiresFollowup,
        followup_date: followupDate || null,
        followup_completed: false,
        direction: direction,
        contact_method: contactMethod,
        created_by: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating communication:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create communication',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Log to activity log if table exists
    try {
      await supabase
        .from('activity_log')
        .insert({
          client_id: clientId,
          action: 'communication_logged',
          type: 'communication',
          date: new Date().toISOString(),
          user_name: user?.email || 'System'
        });
    } catch (logError) {
      console.warn('Could not create activity log:', logError);
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error in POST /api/communications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update communication
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Communication ID is required' },
        { status: 400 }
      );
    }

    // Map frontend field names to database columns
    const dbUpdates: any = {};
    if (updates.type) dbUpdates.communication_type = updates.type;
    if (updates.content) dbUpdates.summary = updates.content;
    if (updates.subject) dbUpdates.subject = updates.subject;
    if (updates.date) dbUpdates.communication_date = updates.date;
    if (updates.requiresFollowup !== undefined) dbUpdates.requires_followup = updates.requiresFollowup;
    if (updates.followupDate) dbUpdates.followup_date = updates.followupDate;
    if (updates.followupCompleted !== undefined) dbUpdates.followup_completed = updates.followupCompleted;
    if (updates.direction) dbUpdates.direction = updates.direction;
    if (updates.contactMethod) dbUpdates.contact_method = updates.contactMethod;

    const { data, error } = await supabase
      .from('client_communications')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating communication:', error);
      return NextResponse.json(
        { 
          error: 'Failed to update communication',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error in PATCH /api/communications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete communication
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Communication ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('client_communications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting communication:', error);
      return NextResponse.json(
        { 
          error: 'Failed to delete communication',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true 
    });
  } catch (error) {
    console.error('Error in DELETE /api/communications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}