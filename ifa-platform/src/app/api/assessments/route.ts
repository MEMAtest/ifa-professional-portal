// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/assessments/route.ts
// SECURITY: Fixed to use proper firm isolation
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/db';
import type { TablesInsert } from '@/types/db';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Require firm_id for multi-tenant isolation
    const firmIdResult = requireFirmId(auth.context);
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult;
    }
    const firmId = firmIdResult.firmId;

    const supabase = getSupabaseServiceClient();
    const body = await request.json();

    const clientId = body.client_id || body.clientId;

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the client belongs to the user's firm before creating assessment
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, firm_id')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .single();

    if (clientError || !client) {
      log.warn('Assessment creation blocked - client not in user firm', { clientId, firmId });
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Build assessment data directly for insert
    const insertData = {
      client_id: clientId,
      advisor_id: auth.context.userId,
      assessment_data: body.assessment_data || body.assessmentData || {},
      status: body.status || 'draft',
      version: body.version || 1,
      ...(body.risk_analysis || body.riskAnalysis ? { risk_analysis: body.risk_analysis || body.riskAnalysis } : {}),
      ...(body.vulnerability_analysis || body.vulnerabilityAnalysis ? { vulnerability_analysis: body.vulnerability_analysis || body.vulnerabilityAnalysis } : {}),
      ...(body.consumer_duty_compliance || body.consumerDutyCompliance ? { consumer_duty_compliance: body.consumer_duty_compliance || body.consumerDutyCompliance } : {}),
      ...(body.legacy_form_id || body.legacyFormId ? { legacy_form_id: body.legacy_form_id || body.legacyFormId } : {})
    };

    const { data, error } = await supabase
      .from('assessments')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      log.error('Assessment save error', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Assessment saved successfully'
    });

  } catch (error) {
    log.error('Assessment route error', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Require firm_id for multi-tenant isolation
    const firmIdResult = requireFirmId(auth.context);
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult;
    }
    const firmId = firmIdResult.firmId;

    const supabase = getSupabaseServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const assessmentId = searchParams.get('id');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam))) : null;

    // Build the query based on parameters
    if (assessmentId) {
      // SECURITY: Join with clients to verify firm ownership
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          clients!inner(id, firm_id)
        `)
        .eq('id', assessmentId)
        .eq('clients.firm_id', firmId)
        .maybeSingle();

      if (error) {
        log.error('Assessment fetch error by ID', error, { assessmentId });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Assessment not found or access denied' },
          { status: 404 }
        );
      }

      // Remove the joined clients data from response
      const { clients, ...assessmentData } = data as any;

      return NextResponse.json({
        success: true,
        data: assessmentData
      });
    } else if (clientId) {
      // SECURITY: First verify the client belongs to the user's firm
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('firm_id', firmId)
        .single();

      if (clientError || !client) {
        log.warn('Assessment fetch blocked - client not in user firm', { clientId, firmId });
        return NextResponse.json(
          { error: 'Client not found or access denied' },
          { status: 404 }
        );
      }

      let query = supabase
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        log.error('Assessment fetch error by clientId', error, { clientId });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data
      });
    } else {
      return NextResponse.json(
        { error: 'Either clientId or id parameter required' },
        { status: 400 }
      );
    }

  } catch (error) {
    log.error('Assessment GET error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
