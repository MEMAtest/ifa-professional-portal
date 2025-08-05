// ================================================================
// src/services/AssessmentService.ts
// Final Version - Fixed ComplianceStatus Import Issue
// ================================================================

import { supabase } from '@/lib/supabase';
import type { 
  AssessmentProgress, 
  AssessmentHistory, 
  AssessmentType 
} from '@/types/assessment';

// Define ComplianceStatus interface locally since it's not exported
interface ComplianceStatus {
  clientId: string;
  isCompliant: boolean;
  issues: Array<{
    type: string;
    assessmentType: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  lastChecked: string;
}

export interface AssessmentProgressUpdate {
  assessmentType: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  metadata?: Record<string, any>;
}

export interface AssessmentHistoryEntry {
  assessmentType: string;
  action: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AssessmentService {
  // ================================================================
  // EXISTING METHODS (Keep all your current methods here)
  // ================================================================
  
  /**
   * Get assessment progress for a client
   */
  static async getProgress(clientId: string): Promise<AssessmentProgress[]> {
    const { data, error } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('client_id', clientId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get assessment history for a client
   */
  static async getHistory(
    clientId: string, 
    limit: number = 50
  ): Promise<AssessmentHistory[]> {
    const { data, error } = await supabase
      .from('assessment_history')
      .select('*')
      .eq('client_id', clientId)
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get compliance status for a client
   */
  static async getComplianceStatus(clientId: string): Promise<ComplianceStatus> {
    try {
      const response = await fetch(`/api/assessments/compliance/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch compliance status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching compliance status:', error);
      throw error;
    }
  }

  // ✅ ADD THIS NEW METHOD HERE - AFTER getComplianceStatus
  /**
   * Get the most recent assessment for a client
   */
  static async getClientAssessment(clientId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching client assessment:', error);
      return null;
    }
  }

  /**
   * Check if an assessment type is complete
   */
  static async isAssessmentComplete(
    clientId: string, 
    assessmentType: AssessmentType
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('assessment_progress')
      .select('status')
      .eq('client_id', clientId)
      .eq('assessment_type', assessmentType)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.status === 'completed';
  }

  /**
   * Get all completed assessments for a client
   */
  static async getCompletedAssessments(clientId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('assessment_progress')
      .select('assessment_type')
      .eq('client_id', clientId)
      .eq('status', 'completed');

    if (error) throw error;
    return data?.map(item => item.assessment_type) || [];
  }

  // ================================================================
  // NEW METHODS FOR MONTE CARLO & CASH FLOW INTEGRATION
  // ================================================================

  /**
   * Update assessment progress with retry logic
   */
  static async updateProgress(
    clientId: string,
    update: AssessmentProgressUpdate
  ): Promise<{ success: boolean; error?: string }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`/api/assessments/progress/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Assessment progress updated: ${update.assessmentType}`, data);
        
        return { success: true };
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Assessment progress update failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    // If all retries failed, return error but don't throw
    return { 
      success: false, 
      error: lastError?.message || 'Failed to update assessment progress' 
    };
  }

  /**
   * Log assessment history with retry logic
   */
  static async logHistory(
    clientId: string,
    entry: AssessmentHistoryEntry
  ): Promise<{ success: boolean; error?: string }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`/api/assessments/history/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Assessment history logged: ${entry.assessmentType}`, data);
        
        return { success: true };
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Assessment history log failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    return { 
      success: false, 
      error: lastError?.message || 'Failed to log assessment history' 
    };
  }

  // ================================================================
  // UTILITY METHODS
  // ================================================================

  /**
   * Get scenario count from database (used by Monte Carlo & Cash Flow)
   */
  static async getScenarioCount(
    clientId: string,
    tableName: 'monte_carlo_scenarios' | 'cashflow_scenarios'
  ): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error(`Failed to get scenario count from ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Batch update multiple assessment progresses
   */
  static async batchUpdateProgress(
    updates: Array<{ clientId: string; update: AssessmentProgressUpdate }>
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const { clientId, update } of updates) {
      const result = await this.updateProgress(clientId, update);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Get assessment statistics for a client
   */
  static async getAssessmentStats(clientId: string): Promise<{
    totalAssessments: number;
    completedAssessments: number;
    inProgressAssessments: number;
    completionPercentage: number;
    lastAssessmentDate: Date | null;
  }> {
    const progress = await this.getProgress(clientId);
    
    const totalAssessments = 6; // Total number of assessment types
    const completedAssessments = progress.filter(p => p.status === 'completed').length;
    const inProgressAssessments = progress.filter(p => p.status === 'in_progress').length;
    const completionPercentage = Math.round((completedAssessments / totalAssessments) * 100);
    
    // Get most recent assessment date
    const dates = progress
      .filter(p => p.completed_at)
      .map(p => new Date(p.completed_at!))
      .sort((a, b) => b.getTime() - a.getTime());
    
    const lastAssessmentDate = dates.length > 0 ? dates[0] : null;

    return {
      totalAssessments,
      completedAssessments,
      inProgressAssessments,
      completionPercentage,
      lastAssessmentDate
    };
  }

  /**
   * Check if client needs assessment review (12+ months since last assessment)
   */
  static async needsAssessmentReview(clientId: string): Promise<boolean> {
    const stats = await this.getAssessmentStats(clientId);
    
    if (!stats.lastAssessmentDate) return true;
    
    const monthsSinceLastAssessment = 
      (Date.now() - stats.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsSinceLastAssessment >= 12;
  }
}

// ================================================================
// EXPORT HELPER FUNCTIONS FOR COMMON OPERATIONS
// ================================================================

/**
 * Helper to track Monte Carlo completion
 */
export async function trackMonteCarloCompletion(
  clientId: string,
  results: any,
  scenarioName: string
): Promise<void> {
  const scenarioCount = await AssessmentService.getScenarioCount(
    clientId, 
    'monte_carlo_scenarios'
  );
  
  await AssessmentService.updateProgress(clientId, {
    assessmentType: 'monteCarlo',
    status: 'completed',
    progressPercentage: 100,
    metadata: {
      lastSimulation: new Date().toISOString(),
      scenarioCount: scenarioCount + 1,
      lastSuccessRate: results.successRate,
      lastSimulationCount: results.simulationCount || 5000,
      lastScenarioName: scenarioName
    }
  });

  await AssessmentService.logHistory(clientId, {
    assessmentType: 'monteCarlo',
    action: 'simulation_completed',
    changes: {
      scenarioName,
      successRate: results.successRate,
      simulationCount: results.simulationCount || 5000,
      medianWealth: results.medianFinalWealth,
      failureRisk: results.failureRisk
    }
  });
}

/**
 * Helper to track Cash Flow completion
 */
export async function trackCashFlowCompletion(
  clientId: string,
  scenarioData: {
    name: string;
    type?: string;
    projectionYears?: number;
  }
): Promise<void> {
  const scenarioCount = await AssessmentService.getScenarioCount(
    clientId,
    'cashflow_scenarios'
  );
  
  await AssessmentService.updateProgress(clientId, {
    assessmentType: 'cashFlow',
    status: 'completed',
    progressPercentage: 100,
    metadata: {
      lastUpdate: new Date().toISOString(),
      scenarioCount: scenarioCount + 1,
      lastScenarioName: scenarioData.name,
      scenarioType: scenarioData.type || 'standard',
      projectionYears: scenarioData.projectionYears || 30
    }
  });

  await AssessmentService.logHistory(clientId, {
    assessmentType: 'cashFlow',
    action: 'scenario_created',
    changes: {
      scenarioName: scenarioData.name,
      type: scenarioData.type || 'standard',
      projectionYears: scenarioData.projectionYears || 30
    }
  });
}