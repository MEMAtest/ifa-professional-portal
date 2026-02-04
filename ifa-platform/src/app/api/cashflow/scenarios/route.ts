// src/app/api/cash-flow/scenarios/route.ts
// Fixed route for cash flow scenarios with correct column names

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json({ 
        scenarios: [], 
        count: 0 
      });
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    // Use correct column names: client_id (not clientId), is_active (not isActive)
    const { data, error } = await supabase
      .from('cash_flow_scenarios')
      .select('*')
      .eq('client_id', clientId)  // ✅ FIXED: was 'clientId'
      .eq('firm_id', firmId)
      .eq('is_active', true);     // ✅ FIXED: was 'isActive'

    if (error) {
      log.error('Cash flow scenarios error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch scenarios'
      }, { status: 400 });
    }

    return NextResponse.json({
      scenarios: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    log.error('Cash flow route error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: ''
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const body = await parseRequestBody(request);
    
    if (!body.clientId) {
      return NextResponse.json({ 
        error: 'Client ID is required' 
      }, { status: 400 });
    }

    const access = await requireClientAccess({
      supabase,
      clientId: body.clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    const scenarioData = {
      client_id: body.clientId,          // ✅ FIXED: snake_case
      scenario_name: body.scenarioName || `Scenario ${Date.now()}`,
      scenario_type: body.scenarioType || 'base',
      projection_years: body.projectionYears || 30,
      firm_id: firmId,
      is_active: true,                   // ✅ FIXED: snake_case
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cash_flow_scenarios')
      .insert(scenarioData)
      .select()
      .single();

    if (error) {
      log.error('Create scenario error:', error);
      return NextResponse.json({ 
        error: 'Failed to create scenario'
      }, { status: 400 });
    }

    return NextResponse.json({
      scenario: data,
      message: 'Scenario created successfully'
    }, { status: 201 });

  } catch (error) {
    log.error('Create scenario error:', error);
    return NextResponse.json({ 
      error: 'Failed to create scenario' 
    }, { status: 500 });
  }
}
