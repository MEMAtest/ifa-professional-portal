// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ============================================
// FILE 1: /src/app/api/calendar/route.ts - COMPLETE FIXED VERSION
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { parseRequestBody } from '@/app/api/utils'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'

// Review type configurations
const REVIEW_EVENT_CONFIG = {
  annual: { 
    color: '#10B981', 
    title: 'Annual Review',
    defaultDuration: 90
  },
  periodic: { 
    color: '#3B82F6', 
    title: 'Periodic Review',
    defaultDuration: 60
  },
  regulatory: { 
    color: '#F59E0B', 
    title: 'Regulatory Review',
    defaultDuration: 120
  },
  ad_hoc: { 
    color: '#8B5CF6', 
    title: 'Ad Hoc Review',
    defaultDuration: 60
  }
};

// GET - Fetch calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const clientId = searchParams.get('clientId');
    const eventType = searchParams.get('eventType');

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'clients:read')
    if (permissionError) {
      return permissionError
    }
    const supabase = getSupabaseServiceClient()
    const userId = auth.context.userId

    if (clientId) {
      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }
    }

    // Build query
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        clients!calendar_events_client_id_fkey (
          id,
          client_ref,
          personal_details
        )
      `)
      .eq('user_id', userId)
      .order('start_date', { ascending: true });

    // Apply filters
    if (startDate && endDate) {
      query = query
        .gte('start_date', startDate)
        .lte('start_date', endDate);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching calendar events', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    // Format events for calendar display
    const events: any[] = data || [];
    const formattedEvents = events.map((event: any) => {
      // Extract duration from description if stored there
      const durationMatch = event.description?.match(/Duration: (\d+) minutes/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 60;
      
      // Get client name safely
      let clientName = 'Unknown Client';
      if (event.clients?.personal_details) {
        const firstName = event.clients.personal_details.firstName || '';
        const lastName = event.clients.personal_details.lastName || '';
        clientName = `${firstName} ${lastName}`.trim() || 'Unknown Client';
      }
      
      return {
        id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        date: new Date(event.start_date).toISOString().split('T')[0],
        time: new Date(event.start_date).toTimeString().slice(0, 5),
        duration: duration,
        clientId: event.client_id,
        clientName: clientName,
        clientRef: event.clients?.client_ref || '',
        type: event.event_type || 'meeting',
        location: '', // Not in table
        notes: event.description || '',
        color: event.color,
        status: 'scheduled', // Default since not in table
        eventType: event.event_type,
        relatedEntityType: event.related_entity_type,
        relatedEntityId: event.related_entity_id
      };
    });

    return NextResponse.json({ 
      success: true, 
      events: formattedEvents 
    });

  } catch (error) {
    log.error('Error in GET /api/calendar', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create calendar event
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const { 
      title,
      description,
      eventType,
      eventSubtype,
      startDate,
      duration = 60,
      clientId,
      location,
      relatedEntityType,
      relatedEntityId,
      color
    } = body;

    // Validate required fields
    if (!title || !startDate || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'clients:write')
    if (permissionError) {
      return permissionError
    }
    const supabase = getSupabaseServiceClient()
    const userId = auth.context.userId

    if (clientId) {
      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }
    }

    // Calculate end date based on duration
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Store metadata in description since some fields don't exist in table
    const enhancedDescription = `${description || ''}${duration ? `\nDuration: ${duration} minutes` : ''}${location ? `\nLocation: ${location}` : ''}`;

    // Create the event
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        title,
        description: enhancedDescription,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        all_day: false,
        event_type: eventType,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        client_id: clientId,
        color: color || '#3B82F6',
        reminders: []
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating calendar event', error);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      event: data 
    });

  } catch (error) {
    log.error('Error in POST /api/calendar', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update calendar event
export async function PATCH(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'clients:write')
    if (permissionError) {
      return permissionError
    }
    const supabase = getSupabaseServiceClient()
    const userId = auth.context.userId

    if (updates.client_id) {
      const access = await requireClientAccess({
        supabase,
        clientId: updates.client_id,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }
    }

    // If updating dates, recalculate end date
    if (updates.startDate && updates.duration) {
      const startDateTime = new Date(updates.startDate);
      const endDateTime = new Date(startDateTime.getTime() + updates.duration * 60000);
      updates.start_date = startDateTime.toISOString();
      updates.end_date = endDateTime.toISOString();
      delete updates.startDate;
      delete updates.duration;
    }

    // Update the event (only update fields that exist in table)
    const updateData: any = {};
    
    // Map the updates to actual columns
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.event_type) updateData.event_type = updates.event_type;
    if (updates.client_id) updateData.client_id = updates.client_id;
    if (updates.color) updateData.color = updates.color;
    if (updates.all_day !== undefined) updateData.all_day = updates.all_day;
    if (updates.start_date) updateData.start_date = updates.start_date;
    if (updates.end_date) updateData.end_date = updates.end_date;
    
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user owns the event
      .select()
      .single();

    if (error) {
      log.error('Error updating calendar event', error);
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500 }
      );
    }

    // If this is a review event and dates changed, update the review too
    if (data.related_entity_type === 'client_review' && data.related_entity_id && updates.start_date) {
      const reviewDate = new Date(data.start_date).toISOString().split('T')[0];
      
      await supabase
        .from('client_reviews')
        .update({
          due_date: reviewDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.related_entity_id);
    }

    return NextResponse.json({ 
      success: true, 
      event: data 
    });

  } catch (error) {
    log.error('Error in PATCH /api/calendar', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete calendar event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'clients:write')
    if (permissionError) {
      return permissionError
    }
    const supabase = getSupabaseServiceClient()
    const userId = auth.context.userId

    // Delete the event
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user owns the event

    if (error) {
      log.error('Error deleting calendar event', error);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    log.error('Error in DELETE /api/calendar', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
