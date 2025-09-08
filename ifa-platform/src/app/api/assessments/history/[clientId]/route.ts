// src/app/api/assessments/history/[clientId]/route.ts
// COMPLETE UPDATED VERSION - NO ASSUMPTIONS

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AssessmentHistory } from '@/types/assessment';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

// GET: Fetch assessment history for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    const clientId = params.clientId;
    const { searchParams } = new URL(request.url);
    
    // Get limit from query params (default to what useClientAssessments expects: 10)
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const assessmentType = searchParams.get('assessmentType');
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

    const { data: historyData, error, count } = await query;

    if (error) {
      console.error('Error fetching assessment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment history' },
        { status: 500 }
      );
    }

    // Format the history to match what useClientAssessments expects
    const formattedHistory = (historyData || []).map((entry: AssessmentHistory) => ({
      id: entry.id,
      assessmentType: entry.assessment_type,
      action: entry.action,
      performedAt: entry.performed_at,
      performedBy: entry.performed_by ? {
        id: entry.performed_by,
        email: 'user@example.com', // TODO: Join with profiles table if needed
        full_name: 'System User'
      } : null,
      changes: entry.changes || {},
      metadata: entry.metadata || {}
    }));

    // Group by assessment type for summary (keep your existing logic)
    const summary: Record<string, any> = {};
    (historyData || []).forEach((entry: AssessmentHistory) => {
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

    // Return in format expected by useClientAssessments
    return NextResponse.json({
      history: formattedHistory,
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
    const supabase = await createClient();
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

    // Normalize assessment type
    const normalizedType = assessmentType.replace('-', '_');

    // Create history entry
    const { data, error } = await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_id: assessmentId || null,
        assessment_type: normalizedType,
        action,
        performed_at: new Date().toISOString(),
        performed_by: null, // TODO: Get from auth context when available
        changes: changes || {},
        metadata: metadata || {},
        created_at: new Date().toISOString()
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

    return NextResponse.json({ 
      success: true,
      history: data 
    });
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
    const supabase = await createClient();
    const clientId = params.clientId;
    const { searchParams } = new URL(request.url);
    const assessmentType = searchParams.get('assessmentType');
    
    // TODO: Add proper auth checks here for admin role
    
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
        performed_by: null, // TODO: Get from auth context
        metadata: { clearedBy: 'admin' },
        created_at: new Date().toISOString()
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