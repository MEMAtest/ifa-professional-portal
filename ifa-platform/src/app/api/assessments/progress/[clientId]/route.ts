// src/app/api/assessments/progress/[clientId]/route.ts
// COMPLETE UNABRIDGED CODE - MATCHES useAssessmentProgress.ts EXACTLY

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { log } from '@/lib/logging/structured';

export const dynamic = 'force-dynamic';

interface AssessmentProgressRecord {
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  score?: any;
  metadata?: any;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase credentials missing');
  }
  return createSupabaseClient<Database>(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = getServiceClient();
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
      log.error('Error fetching assessment progress:', progressError);
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
        const progressPct = item.progress_percentage ?? 0;
        let correctedStatus = item.status;
        if (progressPct === 100 && item.status !== 'completed') {
          correctedStatus = 'completed';
        } else if (progressPct > 0 && progressPct < 100 && item.status === 'not_started') {
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
    log.error('Error in assessment progress GET:', error);
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
    const supabase = getServiceClient();
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

    const now = new Date().toISOString();

    // Normalize assessment type (convert any hyphens to underscores)
    const normalizedType = assessmentType.replace('-', '_');

    // Build update object
    const updateData: any = {
      status,
      updated_at: now,
      last_updated: now
    };

    // Calculate progress percentage based on status
    if (status === 'completed') {
      updateData.progress_percentage = 100;
      updateData.completed_at = now;
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
          updateData.started_at = now;
        }
      } else {
        updateData.progress_percentage = 1;
        updateData.started_at = now;
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

    // Update-or-insert (DB may not have a unique constraint for ON CONFLICT).
    const { data: existingRow, error: existingError } = await supabase
      .from('assessment_progress')
      .select('id')
      .eq('client_id', clientId)
      .eq('assessment_type', normalizedType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      log.error('Error looking up assessment progress:', existingError);
      throw new Error('Failed to update assessment progress');
    }

    const write = existingRow?.id
      ? await supabase
          .from('assessment_progress')
          .update({ ...updateData })
          .eq('id', existingRow.id)
          .select()
          .maybeSingle()
      : await supabase
          .from('assessment_progress')
          .insert({
            client_id: clientId,
            assessment_type: normalizedType,
            ...updateData,
            created_at: now
          })
          .select()
          .maybeSingle();

    if (write.error) {
      log.error('Error writing assessment progress:', write.error);
      throw new Error('Failed to update assessment progress');
    }

    // Log to history
    await logAssessmentHistory(supabase, clientId, normalizedType, status, updateData);

    return NextResponse.json({ 
      success: true, 
      data: write.data 
    });

  } catch (error) {
    log.error('Error in assessment progress POST:', error);
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
    log.error('Error logging assessment history:', error);
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
