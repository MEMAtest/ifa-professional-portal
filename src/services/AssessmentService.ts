// ================================================================
// src/services/AssessmentService.ts - FIXED
// This version includes the required methods and correct types
// ================================================================

import { supabase } from '@/lib/supabase';
// FIX: Import all the necessary types from the assessment type definition file.
import type { AssessmentResult, ATRAnswers, CFLAnswers, RiskMetrics } from '@/types/assessment';

export class AssessmentService {

  /**
   * Calculates risk metrics based on Attitude to Risk (ATR) and Capacity for Loss (CFL) answers.
   * This is part of the core assessment logic.
   */
  static calculateRiskMetrics(atrAnswers: ATRAnswers, cflAnswers: CFLAnswers): RiskMetrics {
    const atrScores = Object.values(atrAnswers);
    if (atrScores.length === 0) {
      // Return a default or error state if no answers are provided
      return {
        atrScore: 0,
        atrCategory: 'Not Assessed',
        behavioralBias: 'neutral',
        finalRiskProfile: 3, // Default to Balanced
        confidenceLevel: 0
      };
    }

    const atrScore = atrScores.reduce((sum, score) => sum + score, 0);
    const avgScore = atrScore / atrScores.length;

    // Determine ATR category
    let atrCategory: string;
    if (avgScore < 1.5) atrCategory = 'Conservative';
    else if (avgScore < 2.5) atrCategory = 'Cautious';
    else if (avgScore < 3.5) atrCategory = 'Balanced';
    else if (avgScore < 4.5) atrCategory = 'Growth';
    else atrCategory = 'Aggressive';

    // Determine behavioral bias
    let behavioralBias: 'conservative' | 'neutral' | 'aggressive';
    if (avgScore < 2) behavioralBias = 'conservative';
    else if (avgScore > 3.5) behavioralBias = 'aggressive';
    else behavioralBias = 'neutral';

    // Calculate final risk profile (assuming 1-10 scale, mapping from 1-5)
    const finalRiskProfile = Math.min(10, Math.max(1, Math.round(avgScore * 2)));

    // Calculate confidence level based on consistency of answers
    const answerVariance = atrScores.reduce((variance, score) => {
      return variance + Math.pow(score - avgScore, 2);
    }, 0) / atrScores.length;

    const confidenceLevel = Math.max(50, Math.min(99, 95 - (answerVariance * 10)));

    return {
      atrScore: Math.round(atrScore),
      atrCategory,
      behavioralBias,
      finalRiskProfile,
      confidenceLevel: Math.round(confidenceLevel)
    };
  }

  /**
   * Saves a completed assessment result to the database.
   */
  static async saveAssessment(assessment: AssessmentResult): Promise<string> {
    const { data, error } = await supabase
      .from('assessments')
      .insert([{
        // Assumes your table might use client_id or client_email.
        // client_id: assessment.clientId, 
        client_email: assessment.clientData.email,
        payload: assessment, // The entire assessment object is stored in a JSONB column
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Error saving assessment:', error);
      throw new Error(`Failed to save assessment: ${error.message}`);
    }

    return data.id;
  }

  /**
   * FIX: Added the missing 'getAssessmentsByClientId' method.
   * Retrieves all assessments for a specific client.
   */
  static async getAssessmentsByClientId(clientId: string): Promise<AssessmentResult[]> {
    try {
      // Assumes your assessments table has a 'client_id' foreign key.
      const { data, error } = await supabase
        .from('assessments')
        .select('payload') // Select only the JSONB column containing the full assessment
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching assessments for client ${clientId}:`, error);
        return []; // Return empty array on error to prevent crashes
      }

      // The query returns an array of objects like [{ payload: ... }, { payload: ... }]
      // We need to extract the payload from each object.
      return data?.map(item => item.payload) || [];
    } catch (err) {
      console.error('Unexpected error in getAssessmentsByClientId:', err);
      return [];
    }
  }
  
  /**
   * FIX: Added the 'getLatestAssessment' method, which is what the cash flow service needs.
   * Retrieves the most recent assessment for a specific client.
   */
  static async getLatestAssessment(clientId: string): Promise<AssessmentResult | null> {
    try {
      const assessments = await this.getAssessmentsByClientId(clientId);
      // The assessments are already sorted by date, so the first one is the latest.
      return assessments.length > 0 ? assessments[0] : null;
    } catch (err) {
      console.error('Unexpected error in getLatestAssessment:', err);
      return null;
    }
  }

  /**
   * Retrieves all assessments from the database.
   */
  static async getAllAssessments(): Promise<AssessmentResult[]> {
    try {
        const { data, error } = await supabase
            .from('assessments')
            .select('payload')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all assessments:', error);
            return [];
        }

        return data?.map(item => item.payload) || [];
    } catch (err) {
        console.error('Unexpected error in getAllAssessments:', err);
        return [];
    }
  }
}

export default AssessmentService;