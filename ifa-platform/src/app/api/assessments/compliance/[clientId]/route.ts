// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/assessments/compliance/[clientId]/route.ts
// ================================================================
// ASSESSMENT COMPLIANCE CHECKING API - FIXED VERSION
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AssessmentProgress, ComplianceAlert } from '@/types/assessment';

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

    // Get assessment progress
    const { data: progress, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment progress' },
        { status: 500 }
      );
    }

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

    // Process progress data
    (progress || []).forEach((p: AssessmentProgress) => {
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
    const atrProgress = progress?.find(p => p.assessment_type === 'atr');
    const cflProgress = progress?.find(p => p.assessment_type === 'cfl');
    
    if (atrProgress?.status === 'completed' && cflProgress?.status === 'completed') {
      // In a real implementation, you'd check actual scores
      // This is a placeholder for demonstration
      const atrMetadata = atrProgress.metadata as any;
      const cflMetadata = cflProgress.metadata as any;
      
      if (atrMetadata?.score && cflMetadata?.score) {
        const scoreDiff = Math.abs((atrMetadata.score || 0) - (cflMetadata.score || 0));
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
              atrScore: atrMetadata.score,
              cflScore: cflMetadata.score,
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
    console.error('API Error:', error);
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

    if (!alertId || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: alertId, resolution' },
        { status: 400 }
      );
    }

    // Log the resolution in history
    await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_type: 'compliance',
        action: 'alert_resolved',
        performed_at: new Date().toISOString(),
        metadata: {
          alertId,
          resolution,
          notes
        }
      });

    return NextResponse.json({ 
      success: true,
      message: 'Compliance alert resolved'
    });
  } catch (error) {
    console.error('API Error:', error);
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

    // Update client settings (if you have a client settings table)
    // For now, we'll log it to history
    await supabase
      .from('assessment_history')
      .insert({
        client_id: clientId,
        assessment_type: 'compliance',
        action: 'settings_updated',
        performed_at: new Date().toISOString(),
        metadata: {
          remindersEnabled,
          reviewFrequency
        }
      });

    return NextResponse.json({ 
      success: true,
      settings: {
        remindersEnabled,
        reviewFrequency
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