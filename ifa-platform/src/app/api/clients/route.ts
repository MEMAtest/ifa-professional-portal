import { createClient } from "@/lib/supabase/server"
// src/app/api/clients/route.ts
// ✅ FIXED: Returns RAW database data, no transformation

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/apiAuth';
import { createRequestLogger } from '@/lib/logging/structured';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await getAuthContext(request);
  if (!auth.success) {
    return auth.response!;
  }

  const supabase = await createClient()
  const logger = createRequestLogger(request)
  try {
    logger.info('GET /api/clients - Fetching clients');
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const status = searchParams.getAll('status');
    const vulnerabilityStatus = searchParams.get('vulnerabilityStatus');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (status.length > 0) {
      query = query.in('status', status);
    }
    
    if (vulnerabilityStatus && vulnerabilityStatus !== 'all') {
      if (vulnerabilityStatus === 'vulnerable') {
        // Check for true boolean values in JSONB
        query = query.eq('vulnerability_assessment->>is_vulnerable', 'true');
      } else if (vulnerabilityStatus === 'not_vulnerable') {
        // Check for false or null/missing values
        query = query.or('vulnerability_assessment->>is_vulnerable.eq.false,vulnerability_assessment.is.null');
      }
    }
    
    if (search) {
      query = query.or(`
        personal_details->first_name.ilike.%${search}%,
        personal_details->last_name.ilike.%${search}%,
        client_ref.ilike.%${search}%,
        contact_info->email.ilike.%${search}%
      `);
    }
    
    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);
    
    const { data: clients, error, count } = await query;

    if (error) {
      logger.error('Database error fetching clients', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch clients',
        details: error.message
      }, { status: 500 });
    }
    
    logger.info('Clients fetched successfully', { count: clients?.length || 0, total: count });
    
    // ✅ CRITICAL: Return RAW data, no transformation!
    return NextResponse.json({
      success: true,
      clients: clients || [], // RAW database data
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
    
  } catch (error) {
    logger.error('GET /api/clients error', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const auth = await getAuthContext(request);
  if (!auth.success) {
    return auth.response!;
  }

  const supabase = await createClient()
  const logger = createRequestLogger(request)
  try {
    logger.info('POST /api/clients - Creating new client');
    
    const body = await request.json();
    
    // Prepare data for database (already in snake_case from frontend)
    const clientData = {
      client_ref: body.clientRef,
      personal_details: body.personalDetails,
      contact_info: body.contactInfo,
      financial_profile: body.financialProfile,
      vulnerability_assessment: body.vulnerabilityAssessment,
      risk_profile: body.riskProfile,
      status: body.status || 'prospect',
      advisor_id: auth.context?.advisorId || auth.context?.userId, // Link to current advisor
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: client, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (error) {
      logger.error('Database error creating client', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create client',
        details: error.message
      }, { status: 500 });
    }

    logger.info('Client created successfully', { clientRef: client.client_ref });
    
    // ✅ Return RAW data
    return NextResponse.json({
      success: true,
      client // RAW database data
    }, { status: 201 });
    
  } catch (error) {
    logger.error('POST /api/clients error', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}