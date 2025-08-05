// src/app/api/assessments/progress/[clientId]/route.ts
// ================================================================
// ASSESSMENT PROGRESS TRACKING API - FIXED VERSION
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AssessmentProgress } from '@/types/assessment';

// GET: Fetch assessment progress for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;

    // Get all assessment progress for this client
    const { data: progress, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('client_id', clientId)
      .order('assessment_type');

    if (error) {
      console.error('Error fetching assessment progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment progress' },
        { status: 500 }
      );
    }

    // Calculate overall stats
    const requiredTypes = ['atr', 'cfl', 'persona', 'suitability'];
    const completedRequired = (progress || []).filter(
      (p: AssessmentProgress) => requiredTypes.includes(p.assessment_type) && p.status === 'completed'
    ).length;

    const stats = {
      totalAssessments: progress?.length || 0,
      completedAssessments: (progress || []).filter((p: AssessmentProgress) => p.status === 'completed').length,
      requiredComplete: completedRequired,
      requiredTotal: requiredTypes.length,
      overallProgress: requiredTypes.length > 0 
        ? Math.round((completedRequired / requiredTypes.length) * 100)
        : 0
    };

    return NextResponse.json({
      progress: progress || [],
      stats
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create or update assessment progress
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const body = await request.json();
    const { assessmentType, status, progressPercentage, metadata } = body;

    // Validate required fields
    if (!assessmentType || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: assessmentType, status' },
        { status: 400 }
      );
    }

    // Check if progress record exists
    const { data: existing } = await supabase
      .from('assessment_progress')
      .select('id')
      .eq('client_id', clientId)
      .eq('assessment_type', assessmentType)
      .single();

    const now = new Date().toISOString();
    
    if (existing) {
      // Update existing progress
      const updateData: any = {
        status,
        progress_percentage: progressPercentage || 0,
        last_updated: now,
        metadata: metadata || {}
      };

      if (status === 'completed') {
        updateData.completed_at = now;
      }

      const { data, error } = await supabase
        .from('assessment_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating progress:', error);
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        );
      }

      // Log to history
      await logAssessmentHistory(clientId, assessmentType, 'progress_updated', {
        status,
        progress_percentage: progressPercentage
      });

      return NextResponse.json({ progress: data });
    } else {
      // Create new progress record
      const { data, error } = await supabase
        .from('assessment_progress')
        .insert({
          client_id: clientId,
          assessment_type: assessmentType,
          status,
          progress_percentage: progressPercentage || 0,
          started_at: now,
          last_updated: now,
          completed_at: status === 'completed' ? now : null,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating progress:', error);
        return NextResponse.json(
          { error: 'Failed to create progress' },
          { status: 500 }
        );
      }

      // Log to history
      await logAssessmentHistory(clientId, assessmentType, 'started', {
        status,
        progress_percentage: progressPercentage
      });

      return NextResponse.json({ progress: data });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update progress percentage
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const body = await request.json();
    const { assessmentType, progressPercentage } = body;

    if (!assessmentType || progressPercentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('assessment_progress')
      .update({
        progress_percentage: progressPercentage,
        last_updated: new Date().toISOString()
      })
      .eq('client_id', clientId)
      .eq('assessment_type', assessmentType)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress percentage:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to log to assessment history
async function logAssessmentHistory(
  clientId: string,
  assessmentType: string,
  action: string,
  changes?: any
) {
  try {
    await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_type: assessmentType,
        action,
        performed_at: new Date().toISOString(),
        changes: changes || {},
        metadata: {}
      });
  } catch (error) {
    console.error('Error logging to history:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}