// src/app/api/assessments/compliance/[clientId]/route.ts
// ================================================================
// ASSESSMENT COMPLIANCE CHECKING API - FIXED VERSION
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database, DbInsert, DbRow } from '@/types/db';
import { log } from '@/lib/logging/structured';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

// Type aliases from database
type AssessmentProgressRow = DbRow<'assessment_progress'>;
type AssessmentHistoryInsert = DbInsert<'assessment_history'>;

// Define types locally if not available from imports
interface AssessmentProgress {
  id: string;
  client_id: string;
  assessment_type: string;
  status: string;
  progress_percentage: number | null;
  completed_at: string | null;
  completed_by: string | null;
  metadata: any;
  last_updated: string | null;
  created_at: string | null;
  started_at: string | null;
  score: any;
  updated_at: string | null;
}

interface ComplianceAlert {
  id: string;
  clientId: string;
  type: 'overdue' | 'incomplete' | 'mismatch';
  assessmentType: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  metadata?: any;
}

interface ComplianceCheckResult {
  compliant: boolean;
  alerts: ComplianceAlert[];
  requiredAssessments: string[];
  completedAssessments: string[];
  overdueAssessments: string[];
  recommendations: string[];
}

// GET: Check compliance status for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const supabase = await createClient();

    // Get assessment progress - fixed typing
    const { data: progress, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      log.error('Error fetching progress', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment progress' },
        { status: 500 }
      );
    }

    // Cast the data to our interface
    const progressData = (progress || []) as AssessmentProgress[];

    // Define required assessments
    const requiredAssessments = ['atr', 'cfl', 'persona', 'suitability'];
    
    // Initialize alerts array with proper typing
    const alerts: ComplianceAlert[] = [];
    const completedAssessments: string[] = [];
    const overdueAssessments: string[] = [];
    const recommendations: string[] = [];

    // Check each assessment
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    progressData.forEach((p: AssessmentProgress) => {
      if (p.status === 'completed') {
        completedAssessments.push(p.assessment_type);
        
        // Check if overdue for review
        if (p.completed_at) {
          const completedDate = new Date(p.completed_at);
          if (completedDate < twelveMonthsAgo) {
            overdueAssessments.push(p.assessment_type);
            
            // Create overdue alert
            const overdueAlert: ComplianceAlert = {
              id: `overdue-${p.assessment_type}`,
              clientId: clientId,
              type: 'overdue',
              assessmentType: p.assessment_type,
              message: `${p.assessment_type.toUpperCase()} assessment is overdue for annual review`,
              severity: 'high',
              createdAt: new Date().toISOString()
            };
            alerts.push(overdueAlert);
          }
        }
      }
    });

    // Check for missing required assessments
    requiredAssessments.forEach(required => {
      if (!completedAssessments.includes(required)) {
        const missingAlert: ComplianceAlert = {
          id: `missing-${required}`,
          clientId: clientId,
          type: 'incomplete',
          assessmentType: required,
          message: `${required.toUpperCase()} assessment is required but not completed`,
          severity: 'medium',
          createdAt: new Date().toISOString()
        };
        alerts.push(missingAlert);
        
        recommendations.push(`Complete ${required.toUpperCase()} assessment`);
      }
    });

    // Check for mismatches (ATR vs CFL)
    const atrProgress = progressData.find(p => p.assessment_type === 'atr');
    const cflProgress = progressData.find(p => p.assessment_type === 'cfl');
    
    if (atrProgress?.status === 'completed' && cflProgress?.status === 'completed') {
      // Check actual scores from the score field or metadata
      const atrScore = atrProgress.score?.total_score || 
                      atrProgress.metadata?.score || 
                      atrProgress.metadata?.total_score || 0;
      const cflScore = cflProgress.score?.total_score || 
                      cflProgress.metadata?.score || 
                      cflProgress.metadata?.total_score || 0;
      
      if (atrScore && cflScore) {
        const scoreDiff = Math.abs(atrScore - cflScore);
        if (scoreDiff > 2) {
          const mismatchAlert: ComplianceAlert = {
            id: 'risk-mismatch',
            clientId: clientId,
            type: 'mismatch',
            assessmentType: 'risk_profile',
            message: 'Significant mismatch between ATR and CFL scores',
            severity: 'medium',
            createdAt: new Date().toISOString(),
            metadata: {
              atrScore: atrScore,
              cflScore: cflScore,
              difference: scoreDiff
            }
          };
          alerts.push(mismatchAlert);
          
          recommendations.push('Review risk assessments for consistency');
        }
      }
    }

    // Add recommendations based on status
    if (overdueAssessments.length > 0) {
      recommendations.push('Schedule annual review for overdue assessments');
    }
    
    if (completedAssessments.length === requiredAssessments.length && overdueAssessments.length === 0) {
      recommendations.push('All assessments are current - schedule next annual review');
    }

    const result: ComplianceCheckResult = {
      compliant: alerts.length === 0,
      alerts,
      requiredAssessments,
      completedAssessments,
      overdueAssessments,
      recommendations
    };

    return NextResponse.json(result);
  } catch (error) {
    log.error('API Error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Resolve a compliance alert
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const body = await request.json();
    const { alertId, resolution, notes } = body;
    const supabase = await createClient();

    if (!alertId || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: alertId, resolution' },
        { status: 400 }
      );
    }

    // Get user context for performed_by field
    const { data: { user } } = await supabase.auth.getUser();

    // Log the resolution in history with proper typing
    const historyData: AssessmentHistoryInsert = {
      client_id: clientId,
      assessment_type: 'compliance',
      action: 'alert_resolved',
      performed_at: new Date().toISOString(),
      performed_by: user?.id || null,
      changes: {
        alertId,
        resolution,
        notes
      },
      metadata: {
        alertId,
        resolution,
        notes,
        resolvedAt: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('assessment_history')
      .insert(historyData);

    if (error) {
      log.error('Error logging resolution', error);
      return NextResponse.json(
        { error: 'Failed to log resolution' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Compliance alert resolved',
      data: {
        alertId,
        resolution,
        notes,
        resolvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('API Error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update compliance settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const body = await request.json();
    const { remindersEnabled, reviewFrequency } = body;
    const supabase = await createClient();

    // Validate input
    if (typeof remindersEnabled !== 'boolean' || !reviewFrequency) {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }

    // Get user context
    const { data: { user } } = await supabase.auth.getUser();

    // Update client settings via assessment history
    // In production, you might have a dedicated settings table
    const historyData: AssessmentHistoryInsert = {
      client_id: clientId,
      assessment_type: 'compliance',
      action: 'settings_updated',
      performed_at: new Date().toISOString(),
      performed_by: user?.id || null,
      changes: {
        remindersEnabled,
        reviewFrequency
      },
      metadata: {
        remindersEnabled,
        reviewFrequency,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'system'
      }
    };

    const { error } = await supabase
      .from('assessment_history')
      .insert(historyData);

    if (error) {
      log.error('Error updating settings', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    // If you have a clients table with settings, update it too
    const { error: clientError } = await supabase
      .from('clients')
      .update({
        assessment_summary: {
          compliance_settings: {
            remindersEnabled,
            reviewFrequency,
            lastUpdated: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (clientError) {
      log.error('Error updating client settings', clientError);
      // Don't fail the request if client update fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Compliance settings updated successfully',
      settings: {
        remindersEnabled,
        reviewFrequency,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('API Error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Clear compliance alerts for a client (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const supabase = await createClient();

    // Check user authorization
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role (you'd implement this based on your auth system)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'advisor') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Log the clearing action
    const historyData: AssessmentHistoryInsert = {
      client_id: clientId,
      assessment_type: 'compliance',
      action: 'alerts_cleared',
      performed_at: new Date().toISOString(),
      performed_by: user.id,
      metadata: {
        clearedBy: user.email,
        clearedAt: new Date().toISOString(),
        reason: 'Manual clear by administrator'
      }
    };

    const { error } = await supabase
      .from('assessment_history')
      .insert(historyData);

    if (error) {
      log.error('Error logging clear action', error);
      return NextResponse.json(
        { error: 'Failed to clear alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Compliance alerts cleared successfully',
      clearedBy: user.email,
      clearedAt: new Date().toISOString()
    });
  } catch (error) {
    log.error('API Error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
