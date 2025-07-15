// src/app/api/clients/route.ts
// ✅ FIXED: Ensure all paths return a response

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ✅ CRITICAL FIX: Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/clients - Fetching clients...');
    
    // ✅ FIXED: Use request.nextUrl.searchParams
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });
    
    query = query
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false });
    
    const { data: clients, error, count } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch clients',
        details: error.message
      }, { status: 500 });
    }
    
    console.log(`✅ Found ${clients?.length || 0} clients (total: ${count})`);
    
    return NextResponse.json({
      success: true,
      clients: clients || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
    
  } catch (error) {
    console.error('❌ GET /api/clients error:', error);
    // ✅ CRITICAL: Always return a response
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ADD THIS POST FUNCTION HERE:
export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/clients - Creating new client...');
    
    const body = await request.json();
    
    // Basic validation
    if (!body.personalDetails || !body.contactInfo) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: personalDetails and contactInfo'
      }, { status: 400 });
    }
    
    // Transform the data to match your database schema
    const clientData = {
      personal_details: body.personalDetails,
      contact_info: body.contactInfo,
      financial_profile: body.financialProfile || {},
      vulnerability_assessment: body.vulnerabilityAssessment || {},
      risk_profile: body.riskProfile || {},
      status: body.status || 'prospect',
      advisor_id: body.advisorId,
      firm_id: body.firmId,
      client_ref: body.clientRef,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 });
    }
    
    console.log('✅ Client created successfully:', data.id);
    
    return NextResponse.json({
      success: true,
      client: data,
      message: 'Client created successfully'
    });
    
  } catch (error) {
    console.error('❌ POST /api/clients error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}