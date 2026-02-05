// src/app/api/assessments/progress/[clientId]/route.ts
// COMPLETE UNABRIDGED CODE - MATCHES useAssessmentProgress.ts EXACTLY

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient';
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth';
import { requireClientAccess } from '@/lib/auth/requireClientAccess';
import { parseRequestBody } from '@/app/api/utils'
import { rateLimit } from '@/lib/security/rateLimit'

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
    const rateLimitResponse = await rateLimit(request, 'api')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult;
    }
    const permissionError = requirePermission(auth.context, 'assessments:read')
    if (permissionError) {
      return permissionError
    }

    const supabase = getSupabaseServiceClient();
    const clientId = params.clientId;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Validate client ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 }
      );
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    });
    if (!access.ok) {
      return access.response;
    }

    // Get all assessment progress for the client
    const { data: progressData, error: progressError } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('client_id', clientId)
      .order('assessment_type');

    // Handle specific error codes
    if (progressError) {
      log.error('Error fetching assessment progress:', {
        code: progressError.code,
        message: progressError.message,
        details: progressError.details,
        hint: progressError.hint,
        clientId
      });

      // Check for table not found error
      if (progressError.code === '42P01' || progressError.message?.includes('does not exist')) {
        // Table doesn't exist - return empty progress with default values
        log.warn('assessment_progress table not found, returning defaults');
        return NextResponse.json({
          progress: {
            atr: { status: 'not_started' },
            cfl: { status: 'not_started' },
            suitability: { status: 'not_started' },
            monte_carlo: { status: 'not_started' },
            cashflow: { status: 'not_started' },
            persona: { status: 'not_started' },
            investor_persona: { status: 'not_started' }
          },
          overallProgress: 0,
          completedCount: 0,
          totalAssessments: 7,
          _warning: 'assessment_progress table not configured'
        });
      }

      // Permission/RLS error - return defaults gracefully
      if (progressError.code === '42501' || progressError.message?.includes('permission')) {
        log.warn('Permission denied accessing assessment_progress, returning defaults');
        return NextResponse.json({
          progress: {
            atr: { status: 'not_started' },
            cfl: { status: 'not_started' },
            suitability: { status: 'not_started' },
            monte_carlo: { status: 'not_started' },
            cashflow: { status: 'not_started' },
            persona: { status: 'not_started' },
            investor_persona: { status: 'not_started' }
          },
          overallProgress: 0,
          completedCount: 0,
          totalAssessments: 7,
          _warning: 'Permission configuration needed'
        });
      }

      throw new Error(`Failed to fetch assessment progress: ${progressError.message}`);
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
    // Extract error details properly for logging
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { raw: String(error) };
    log.error('Error in assessment progress GET:', errorDetails);
    return NextResponse.json(
      {
        error: 'Failed to fetch assessment progress'
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
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult;
    }
    const permissionError = requirePermission(auth.context, 'assessments:write')
    if (permissionError) {
      return permissionError
    }

    const supabase = getSupabaseServiceClient();
    const clientId = params.clientId;
    const body = await parseRequestBody(request);

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

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    });
    if (!access.ok) {
      return access.response;
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
      const { data: existing, error: existingFetchError } = await supabase
        .from('assessment_progress')
        .select('progress_percentage, started_at')
        .eq('client_id', clientId)
        .eq('assessment_type', normalizedType)
        .maybeSingle();

      // PGRST116 means no rows found - that's OK for a new record
      if (existingFetchError && existingFetchError.code !== 'PGRST116') {
        log.error('Error fetching existing progress:', {
          code: existingFetchError.code,
          message: existingFetchError.message,
          details: existingFetchError.details
        });
        throw new Error(`Failed to fetch existing progress: ${existingFetchError.message}`);
      }

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
      log.error('Error looking up assessment progress:', {
        code: existingError.code,
        message: existingError.message,
        details: existingError.details,
        hint: existingError.hint
      });
      throw new Error(`Failed to lookup assessment progress: ${existingError.message}`);
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
      // Log with properly extracted error properties
      const errorInfo = {
        code: write.error.code || 'UNKNOWN',
        message: write.error.message || 'Unknown error',
        details: typeof write.error.details === 'string' ? write.error.details : JSON.stringify(write.error.details),
        hint: write.error.hint || ''
      };
      log.error('Error writing assessment progress:', errorInfo);

      // Handle table not exist or permission errors gracefully
      if (write.error.code === '42P01' || write.error.message?.includes('does not exist')) {
        log.warn('assessment_progress table not found, returning success anyway');
        return NextResponse.json({
          success: true,
          data: null,
          _warning: 'Assessment progress table not configured'
        });
      }

      if (write.error.code === '42501' || write.error.message?.includes('permission')) {
        log.warn('Permission denied writing assessment_progress, returning success anyway');
        return NextResponse.json({
          success: true,
          data: null,
          _warning: 'Permission configuration needed'
        });
      }

      throw new Error(`Failed to update assessment progress: ${write.error.message}`);
    }

    // Log to history (non-blocking)
    try {
      await logAssessmentHistory(supabase, clientId, normalizedType, status, updateData);
    } catch (historyError) {
      log.warn('Failed to log assessment history (non-critical)', {
        error: historyError instanceof Error ? historyError.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      data: write.data
    });

  } catch (error) {
    // Extract error details properly for logging
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack?.substring(0, 500) }
      : { raw: String(error) };
    log.error('Error in assessment progress POST:', errorDetails);

    // Return success anyway for non-critical tracking - don't break the main flow
    return NextResponse.json({
      success: true,
      data: null,
      _warning: 'Assessment progress tracking encountered an error'
    });
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
