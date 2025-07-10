// src/app/api/clients/route.ts
// ✅ FIXED: Static generation compatible

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ✅ CRITICAL FIX: Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/clients - Fetching clients...');
    
    // ✅ FIXED: Use request.nextUrl.searchParams instead of new URL(request.url)
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
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}