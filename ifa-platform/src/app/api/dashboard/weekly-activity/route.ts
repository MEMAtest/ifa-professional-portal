import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient';
import { log } from '@/lib/logging/structured';
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  day: string;
  value: number;
  date: string;
}

interface WeeklyStats {
  clientsChart: ChartDataPoint[];
  assessmentsChart: ChartDataPoint[];
  documentsChart: ChartDataPoint[];
  monteCarloChart: ChartDataPoint[];
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) return firmIdResult

    // Fetch firm's client IDs once for scoping
    const { data: firmClients } = await supabase
      .from('clients').select('id').eq('firm_id', firmIdResult.firmId)
    const firmClientIds = (firmClients || []).map((c: any) => c.id)

    // If no clients, return zeros without querying
    if (firmClientIds.length === 0) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const emptyChart = days.map((day, i) => {
        const d = new Date()
        d.setDate(d.getDate() - 6 + i)
        return { day, value: 0, date: d.toISOString() }
      })
      return NextResponse.json({
        success: true,
        weeklyStats: {
          clientsChart: emptyChart,
          assessmentsChart: emptyChart.map(d => ({ ...d })),
          documentsChart: emptyChart.map(d => ({ ...d })),
          monteCarloChart: emptyChart.map(d => ({ ...d })),
        }
      })
    }

    log.debug('GET /api/dashboard/weekly-activity - Fetching weekly data');
    
    // Get the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days including today
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Initialize the response structure
    const weeklyStats: WeeklyStats = {
      clientsChart: [],
      assessmentsChart: [],
      documentsChart: [],
      monteCarloChart: []
    };

    // Get data for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayName = days[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]; // Adjust for Monday start
      
      // Fetch clients onboarded this day
      const clientsCount = await getClientsForDay(supabase, dayStart, dayEnd, firmClientIds);

      // Fetch assessments completed this day
      const assessmentsCount = await getAssessmentsForDay(supabase, dayStart, dayEnd, firmClientIds);

      // Fetch documents generated this day
      const documentsCount = await getDocumentsForDay(supabase, dayStart, dayEnd, firmClientIds);

      // Fetch Monte Carlo simulations this day
      const monteCarloCount = await getMonteCarloForDay(supabase, dayStart, dayEnd, firmClientIds);
      
      weeklyStats.clientsChart.push({
        day: dayName,
        value: clientsCount,
        date: currentDate.toISOString()
      });
      
      weeklyStats.assessmentsChart.push({
        day: dayName,
        value: assessmentsCount,
        date: currentDate.toISOString()
      });
      
      weeklyStats.documentsChart.push({
        day: dayName,
        value: documentsCount,
        date: currentDate.toISOString()
      });
      
      weeklyStats.monteCarloChart.push({
        day: dayName,
        value: monteCarloCount,
        date: currentDate.toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      weeklyStats
    });

  } catch (error) {
    log.error('Weekly activity error', error);

    // Return empty data with error message instead of fake data
    return NextResponse.json({
      success: false,
      weeklyStats: {
        clientsChart: [],
        assessmentsChart: [],
        documentsChart: [],
        monteCarloChart: []
      },
      error: 'Failed to fetch weekly activity data'
    }, { status: 500 });
  }
}

// Helper function to get clients for a specific day
async function getClientsForDay(supabase: ReturnType<typeof getSupabaseServiceClient>, dayStart: Date, dayEnd: Date, firmClientIds: string[]): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .in('id', firmClientIds)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString());

    if (error) {
      log.warn('Error fetching clients for day', { error: error.message });
      return 0;
    }

    return count || 0;
  } catch (error) {
    log.warn('Error in getClientsForDay', { error: '' });
    return 0;
  }
}

// Helper function to get assessments for a specific day
async function getAssessmentsForDay(supabase: ReturnType<typeof getSupabaseServiceClient>, dayStart: Date, dayEnd: Date, firmClientIds: string[]): Promise<number> {
  try {
    // Try suitability_assessments first, then fall back to assessments table
    const { count, error } = await supabase
      .from('suitability_assessments')
      .select('*', { count: 'exact', head: true })
      .in('client_id', firmClientIds)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString());

    if (error) {
      // Try alternative table name
      const { count: altCount, error: altError } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .in('client_id', firmClientIds)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      if (altError) {
        log.warn('Error fetching assessments for day', { error: altError.message });
        return 0;
      }
      return altCount || 0;
    }

    return count || 0;
  } catch (error) {
    log.warn('Error in getAssessmentsForDay', { error: '' });
    return 0;
  }
}

// Helper function to get documents for a specific day
async function getDocumentsForDay(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  dayStart: Date,
  dayEnd: Date,
  firmClientIds: string[]
): Promise<number> {
  try {
    // Primary source: documents table (used by assessment report generation)
    const { count: docsCount, error: docsError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .in('client_id', firmClientIds)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString());

    if (!docsError) {
      const { count: generatedCount, error: generatedError } = await supabase
        .from('generated_documents')
        .select('*', { count: 'exact', head: true })
        .in('client_id', firmClientIds)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      return (docsCount || 0) + (generatedError ? 0 : (generatedCount || 0));
    }

    // Fallback: generated_documents if documents table is unavailable
    const { count: generatedCount, error: generatedError } = await supabase
      .from('generated_documents')
      .select('*', { count: 'exact', head: true })
      .in('client_id', firmClientIds)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString());

    if (generatedError) {
      log.warn('Error fetching documents for day', {
        docsError: docsError.message,
        generatedError: generatedError.message
      });
      return 0;
    }

    return generatedCount || 0;
  } catch (error) {
    log.warn('Error in getDocumentsForDay', { error: '' });
    return 0;
  }
}

// Helper function to get Monte Carlo simulations for a specific day
async function getMonteCarloForDay(supabase: ReturnType<typeof getSupabaseServiceClient>, dayStart: Date, dayEnd: Date, firmClientIds: string[]): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('monte_carlo_results')
      .select('*', { count: 'exact', head: true })
      .in('client_id', firmClientIds)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString());

    if (error) {
      log.debug('Monte Carlo table query error', { error: error.message });
      return 0;
    }

    return count || 0;
  } catch (error) {
    log.warn('Error in getMonteCarloForDay', { error: '' });
    return 0;
  }
}
