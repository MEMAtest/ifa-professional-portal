// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@supabase/ssr';

// Initialize Supabase client
function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET - Fetch activity log for a client OR recent activities for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const recent = searchParams.get('recent'); // Add this to get recent activities
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // If requesting recent activities across all clients
    if (recent === 'true') {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          client:clients(
            id,
            personal_details,
            client_ref
          )
        `)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent activities:', error);
        return NextResponse.json(
          { error: 'Failed to fetch recent activities' },
          { status: 500 }
        );
      }

      // Format the response to include client names
      const formattedData = (data || []).map(activity => ({
        ...activity,
        clientName: activity.client ? 
          `${activity.client.personal_details?.firstName || ''} ${activity.client.personal_details?.lastName || ''}`.trim() : 
          'Unknown Client',
        clientRef: activity.client?.client_ref || null
      }));

      return NextResponse.json({ 
        data: formattedData 
      });
    }

    // Regular client-specific activity log
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const { data, error, count } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching activity log:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      data: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in GET /api/activity-log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new activity log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId, 
      action, 
      type,
      userName
    } = body;

    // Validate required fields
    if (!clientId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Create the activity log entry matching your table structure
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        client_id: clientId,
        action,
        type: type || null,
        user_name: userName || null,
        date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity log:', error);
      return NextResponse.json(
        { error: 'Failed to create activity log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error in POST /api/activity-log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// REMOVED: getRecentActivities export (not a valid Next.js route handler)
// Now integrated into GET handler with ?recent=true parameter