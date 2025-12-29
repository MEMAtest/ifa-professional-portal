// src/app/api/activity-log/route.ts
// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logging/structured'

interface AggregatedActivity {
  id: string
  client_id: string | null
  action: string
  type: string
  date: string
  user_name: string | null
  clientName: string
  clientRef: string | null
}

interface MonteCarloRow {
  id: string
  client_id: string | null
  scenario_id: string | null
  scenario_name: string | null
  created_at: string | null
}

interface CashFlowScenarioRow {
  id: string
  client_id: string | null
  scenario_name: string | null
}

interface ClientRow {
  id: string
  personal_details?: Record<string, any> | null
  client_ref?: string | null
}

// GET - Fetch activity log for a client OR recent activities for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const recent = searchParams.get('recent');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    // If requesting recent activities across all clients - aggregate from multiple sources
    if (recent === 'true') {
      const allActivities: AggregatedActivity[] = []

      // 1. Fetch from activity_log table
      const { data: activityLogData } = await supabase
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
        .limit(50);

      if (activityLogData) {
        activityLogData.forEach((activity: any) => {
          allActivities.push({
            id: activity.id,
            client_id: activity.client_id,
            action: activity.action,
            type: activity.type || 'activity',
            date: activity.date,
            user_name: activity.user_name,
            clientName: activity.client
              ? `${activity.client.personal_details?.firstName || ''} ${activity.client.personal_details?.lastName || ''}`.trim()
              : 'Unknown Client',
            clientRef: activity.client?.client_ref || null
          })
        })
      }

      // 2. Fetch recent communications
      const { data: commsData } = await supabase
        .from('client_communications')
        .select(`
          id,
          client_id,
          communication_type,
          subject,
          communication_date,
          created_by,
          client:clients(
            id,
            personal_details,
            client_ref
          )
        `)
        .order('communication_date', { ascending: false })
        .limit(30);

      if (commsData) {
        commsData.forEach((comm: any) => {
          allActivities.push({
            id: `comm-${comm.id}`,
            client_id: comm.client_id,
            action: `${comm.communication_type || 'Communication'}: "${comm.subject || 'No subject'}"`,
            type: 'communication',
            date: comm.communication_date,
            user_name: comm.created_by || null,
            clientName: comm.client
              ? `${comm.client.personal_details?.firstName || ''} ${comm.client.personal_details?.lastName || ''}`.trim()
              : 'Unknown Client',
            clientRef: comm.client?.client_ref || null
          })
        })
      }

      // 3. Fetch recent reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          client_id,
          review_type,
          status,
          created_at,
          updated_at,
          client:clients(
            id,
            personal_details,
            client_ref
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (reviewsData) {
        reviewsData.forEach((review: any) => {
          const statusText = review.status === 'completed' ? 'completed' :
                           review.status === 'overdue' ? 'is overdue' : 'scheduled'
          allActivities.push({
            id: `review-${review.id}`,
            client_id: review.client_id,
            action: `${review.review_type || 'Review'} ${statusText}`,
            type: 'review',
            date: review.updated_at || review.created_at,
            user_name: null,
            clientName: review.client
              ? `${review.client.personal_details?.firstName || ''} ${review.client.personal_details?.lastName || ''}`.trim()
              : 'Unknown Client',
            clientRef: review.client?.client_ref || null
          })
        })
      }

      // 4. Fetch recently created/updated clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, personal_details, client_ref, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (clientsData) {
        clientsData.forEach((client: any) => {
          const clientName = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Unknown Client'
          // Only add if created recently (within last 90 days) - as a "client added" activity
          const createdDate = new Date(client.created_at)
          const ninetyDaysAgo = new Date()
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

          if (createdDate > ninetyDaysAgo) {
            allActivities.push({
              id: `client-created-${client.id}`,
              client_id: client.id,
              action: 'Client added to system',
              type: 'client_added',
              date: client.created_at,
              user_name: null,
              clientName,
              clientRef: client.client_ref || null
            })
          }
        })
      }

      // 5. Fetch recent suitability assessments
      const { data: assessmentsData } = await supabase
        .from('suitability_assessments')
        .select(`
          id,
          client_id,
          status,
          created_at,
          updated_at,
          client:clients(
            id,
            personal_details,
            client_ref
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (assessmentsData) {
        assessmentsData.forEach((assessment: any) => {
          const statusText = assessment.status === 'completed' ? 'Suitability assessment completed' :
                           assessment.status === 'in_progress' ? 'Suitability assessment started' :
                           'Suitability assessment created'
          allActivities.push({
            id: `assessment-${assessment.id}`,
            client_id: assessment.client_id,
            action: statusText,
            type: 'assessment',
            date: assessment.updated_at || assessment.created_at,
            user_name: null,
            clientName: assessment.client
              ? `${assessment.client.personal_details?.firstName || ''} ${assessment.client.personal_details?.lastName || ''}`.trim()
              : 'Unknown Client',
            clientRef: assessment.client?.client_ref || null
          })
        })
      }

      // 6. Fetch recent Monte Carlo simulations
      const { data: monteCarloData, error: mcError } = await supabase
        .from('monte_carlo_results')
        .select(`
          id,
          client_id,
          scenario_id,
          scenario_name,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (mcError) {
        console.error('Error fetching Monte Carlo data:', mcError);
      }

      if (monteCarloData && monteCarloData.length > 0) {
        const monteCarloRows = monteCarloData as MonteCarloRow[];
        // Get unique scenario IDs to fetch client info
        const scenarioIds = [
          ...new Set(monteCarloRows.map((mc) => mc.scenario_id).filter((id): id is string => Boolean(id)))
        ];

        // Fetch scenario -> client mapping
        const { data: scenarioData } = await supabase
          .from('cash_flow_scenarios')
          .select('id, client_id, scenario_name')
          .in('id', scenarioIds);

        const scenarioMap = new Map<string, CashFlowScenarioRow>(
          (scenarioData || []).map((s: CashFlowScenarioRow) => [s.id, s])
        );

        // Get all client IDs (direct + via scenario)
        const clientIds = new Set<string>();
        monteCarloRows.forEach((mc) => {
          if (mc.client_id) clientIds.add(mc.client_id);
          const scenario = mc.scenario_id ? scenarioMap.get(mc.scenario_id) : undefined;
          if (scenario?.client_id) clientIds.add(scenario.client_id);
        });

        // Fetch client names (only if we have client IDs)
        let clientMap = new Map<string, ClientRow>();
        if (clientIds.size > 0) {
          const { data: clientsData } = await supabase
            .from('clients')
            .select('id, personal_details, client_ref')
            .in('id', Array.from(clientIds));
          clientMap = new Map(
            (clientsData || []).map((c: ClientRow) => [c.id, c])
          );
        }

        monteCarloRows.forEach((mc) => {
          // Try direct client_id first, then fall back to scenario's client_id
          const scenario = mc.scenario_id ? scenarioMap.get(mc.scenario_id) : undefined;
          const clientId = mc.client_id || scenario?.client_id || null;
          const client = clientId ? clientMap.get(clientId) : null;

          // Include ALL Monte Carlo activities
          // If client is resolved, show client name; otherwise show as "Projection Analysis"
          if (client) {
            const firstName = client.personal_details?.firstName || client.personal_details?.first_name || '';
            const lastName = client.personal_details?.lastName || client.personal_details?.last_name || '';
            const clientName = `${firstName} ${lastName}`.trim();
            allActivities.push({
              id: `mc-${mc.id}`,
              client_id: clientId,
              action: `Monte Carlo simulation: ${mc.scenario_name || scenario?.scenario_name || 'Analysis completed'}`,
              type: 'monte_carlo',
              date: mc.created_at || new Date().toISOString(),
              user_name: null,
              clientName: clientName || 'Projection Analysis',
              clientRef: client?.client_ref ?? null
            })
          } else {
            // No client linked - show as system-level activity
            allActivities.push({
              id: `mc-${mc.id}`,
              client_id: null,
              action: `Monte Carlo simulation: ${mc.scenario_name || scenario?.scenario_name || 'Analysis completed'}`,
              type: 'monte_carlo',
              date: mc.created_at || new Date().toISOString(),
              user_name: null,
              clientName: 'Projection Analysis',
              clientRef: null
            })
          }
        })
      }

      // Sort all activities by date descending and deduplicate
      const seen = new Set<string>()
      const sortedActivities = allActivities
        .filter(a => {
          // Deduplicate by action + client + date (rounded to minute)
          const key = `${a.action}-${a.client_id}-${a.date?.slice(0, 16)}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)

      return NextResponse.json({
        data: sortedActivities
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
      log.error('Error fetching activity log', error, { clientId });
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
    log.error('Error in GET /api/activity-log', error);
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

    const supabase = await createClient();  // FIXED: Using await, no parameters

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
      log.error('Error creating activity log', error);
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
    log.error('Error in POST /api/activity-log', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
