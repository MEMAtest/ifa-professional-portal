// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/assessments/history/[clientId]/route.ts
// ================================================================
// ASSESSMENT HISTORY API - FIXED VERSION
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AssessmentHistory } from '@/types/assessment';

// GET: Fetch assessment history for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const assessmentType = searchParams.get('assessmentType');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('assessment_history')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (assessmentType) {
      query = query.eq('assessment_type', assessmentType);
    }
    
    if (startDate) {
      query = query.gte('performed_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('performed_at', endDate);
    }

    const { data: history, error, count } = await query;

    if (error) {
      console.error('Error fetching assessment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment history' },
        { status: 500 }
      );
    }

    // Group by assessment type for summary
    const summary: Record<string, any> = {};
    (history || []).forEach((entry: AssessmentHistory) => {
      if (!summary[entry.assessment_type]) {
        summary[entry.assessment_type] = {
          type: entry.assessment_type,
          totalActions: 0,
          lastAction: null,
          actions: {}
        };
      }
      
      summary[entry.assessment_type].totalActions++;
      
      if (!summary[entry.assessment_type].lastAction || 
          new Date(entry.performed_at) > new Date(summary[entry.assessment_type].lastAction)) {
        summary[entry.assessment_type].lastAction = entry.performed_at;
      }
      
      // Count actions by type
      if (!summary[entry.assessment_type].actions[entry.action]) {
        summary[entry.assessment_type].actions[entry.action] = 0;
      }
      summary[entry.assessment_type].actions[entry.action]++;
    });

    return NextResponse.json({
      history: history || [],
      totalCount: count || 0,
      summary: Object.values(summary),
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Log a new history entry
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const body = await request.json();
    const { assessmentType, assessmentId, action, changes, metadata } = body;

    // Validate required fields
    if (!assessmentType || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: assessmentType, action' },
        { status: 400 }
      );
    }

    // Create history entry
    const { data, error } = await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_id: assessmentId || null,
        assessment_type: assessmentType,
        action,
        performed_at: new Date().toISOString(),
        performed_by: null, // Would come from auth context
        changes: changes || {},
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating history entry:', error);
      return NextResponse.json(
        { error: 'Failed to create history entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Clear history (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const { searchParams } = new URL(request.url);
    const assessmentType = searchParams.get('assessmentType');
    
    // In production, add proper auth checks here
    
    let query = supabase
      .from('assessment_history')
      .delete()
      .eq('client_id', clientId);
      
    if (assessmentType) {
      query = query.eq('assessment_type', assessmentType);
    }
    
    const { error } = await query;

    if (error) {
      console.error('Error deleting history:', error);
      return NextResponse.json(
        { error: 'Failed to delete history' },
        { status: 500 }
      );
    }

    // Log the deletion action
    await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_type: assessmentType || 'all',
        action: 'history_cleared',
        performed_at: new Date().toISOString(),
        metadata: { clearedBy: 'admin' }
      });

    return NextResponse.json({ 
      success: true,
      message: assessmentType 
        ? `History cleared for ${assessmentType}`
        : 'All history cleared'
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}