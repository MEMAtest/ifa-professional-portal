// src/app/api/assessments/progress/[clientId]/route.ts
// COMPLETE UNABRIDGED CODE - MATCHES useAssessmentProgress.ts EXACTLY

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface AssessmentProgressRecord {
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  score?: any;
  metadata?: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    const clientId = params.clientId;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Get all assessment progress for the client
    const { data: progressData, error: progressError } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('client_id', clientId)
      .order('assessment_type');

    if (progressError) {
      console.error('Error fetching assessment progress:', progressError);
      throw new Error('Failed to fetch assessment progress');
    }

    // Transform array to Record<string, AssessmentProgressRecord> format expected by the hook
    const progressRecord: Record<string, AssessmentProgressRecord> = {};
    let completedCount = 0;
    
    // Define all assessment types
    const allAssessmentTypes = [
      'atr',
      'cfl', 
      'suitability',
      'monte_carlo',
      'cashflow',
      'persona',
      'investor_persona'
    ];

    // Process existing progress data
    if (progressData && progressData.length > 0) {
      progressData.forEach(item => {
        // Normalize assessment type
        const normalizedType = item.assessment_type.replace('-', '_');
        
        // Auto-correct status based on progress_percentage
        let correctedStatus = item.status;
        if (item.progress_percentage === 100 && item.status !== 'completed') {
          correctedStatus = 'completed';
        } else if (item.progress_percentage > 0 && item.progress_percentage < 100 && item.status === 'not_started') {
          correctedStatus = 'in_progress';
        }
        
        if (correctedStatus === 'completed') {
          completedCount++;
        }
        
        progressRecord[normalizedType] = {
          status: correctedStatus as 'not_started' | 'in_progress' | 'completed' | 'needs_review',
          startedAt: item.started_at || undefined,
          completedAt: item.completed_at || undefined,
          completedBy: item.completed_by || undefined,
          score: item.score || undefined,
          metadata: item.metadata || undefined
        };
      });
    }

    // Add default entries for missing assessment types
    allAssessmentTypes.forEach(type => {
      if (!progressRecord[type]) {
        progressRecord[type] = {
          status: 'not_started'
        };
      }
    });

    const totalAssessments = allAssessmentTypes.length;
    const overallProgress = totalAssessments > 0 
      ? Math.round((completedCount / totalAssessments) * 100) 
      : 0;

    // Return in the exact format expected by useAssessmentProgress hook
    return NextResponse.json({
      progress: progressRecord,
      overallProgress,
      completedCount,
      totalAssessments
    });

  } catch (error) {
    console.error('Error in assessment progress GET:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch assessment progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    const clientId = params.clientId;
    const body = await request.json();

    const { 
      assessmentType, 
      status, 
      score,
      metadata 
    } = body;

    if (!clientId || !assessmentType) {
      return NextResponse.json(
        { error: 'Client ID and assessment type are required' },
        { status: 400 }
      );
    }

    // Normalize assessment type (convert any hyphens to underscores)
    const normalizedType = assessmentType.replace('-', '_');

    // Build update object
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    // Calculate progress percentage based on status
    if (status === 'completed') {
      updateData.progress_percentage = 100;
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'in_progress') {
      // Don't override existing progress_percentage unless it's 0 or null
      const { data: existing } = await supabase
        .from('assessment_progress')
        .select('progress_percentage, started_at')
        .eq('client_id', clientId)
        .eq('assessment_type', normalizedType)
        .single();

      if (existing) {
        if (!existing.progress_percentage || existing.progress_percentage === 0) {
          updateData.progress_percentage = 1; // Set to 1% to indicate started
        }
        if (!existing.started_at) {
          updateData.started_at = new Date().toISOString();
        }
      } else {
        updateData.progress_percentage = 1;
        updateData.started_at = new Date().toISOString();
      }
    } else if (status === 'not_started') {
      updateData.progress_percentage = 0;
      updateData.started_at = null;
      updateData.completed_at = null;
    } else if (status === 'needs_review') {
      // Keep existing progress_percentage for needs_review status
    }

    if (score !== undefined) {
      updateData.score = score;
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    // Try to update first
    const { data: updateResult, error: updateError } = await supabase
      .from('assessment_progress')
      .update(updateData)
      .eq('client_id', clientId)
      .eq('assessment_type', normalizedType)
      .select()
      .single();

    if (updateError) {
      // If record doesn't exist (PGRST116), create it
      if (updateError.code === 'PGRST116' || updateError.message?.includes('0 rows')) {
        const insertData = {
          client_id: clientId,
          assessment_type: normalizedType,
          ...updateData,
          created_at: new Date().toISOString()
        };

        const { data: insertResult, error: insertError } = await supabase
          .from('assessment_progress')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating assessment progress:', insertError);
          throw new Error('Failed to create assessment progress');
        }

        // Log to history
        await logAssessmentHistory(supabase, clientId, normalizedType, status, updateData);

        return NextResponse.json({ 
          success: true, 
          data: insertResult,
          created: true 
        });
      }

      console.error('Error updating assessment progress:', updateError);
      throw new Error('Failed to update assessment progress');
    }

    // Log to history
    await logAssessmentHistory(supabase, clientId, normalizedType, status, updateData);

    return NextResponse.json({ 
      success: true, 
      data: updateResult 
    });

  } catch (error) {
    console.error('Error in assessment progress POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update assessment progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to log assessment history
async function logAssessmentHistory(
  supabase: any,
  clientId: string,
  assessmentType: string,
  action: string,
  changes: any
) {
  try {
    await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_type: assessmentType,
        action: action === 'completed' ? 'completed' : 
                action === 'in_progress' ? 'started' : 
                action === 'needs_review' ? 'marked_for_review' : 
                'updated',
        performed_at: new Date().toISOString(),
        changes: changes,
        metadata: changes.metadata || {},
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging assessment history:', error);
    // Don't throw - history logging is non-critical
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  // Redirect PATCH to POST for compatibility
  return POST(request, { params });
}