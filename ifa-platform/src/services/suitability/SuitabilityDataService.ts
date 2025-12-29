import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';
import type { AssessmentStatus } from '@/types/assessment-status';
import type { SuitabilityUpdatePayload, SuitabilityFormData } from '@/types/suitability';
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
  logger,
  getErrorMessage
} from '@/lib/errors';

// Type for assessment data - accepts both SuitabilityFormData and raw JSON objects
// Note: using any type here for flexibility
type AssessmentDataSections = SuitabilityFormData | Record<string, any> | null

// Service client (service role preferred; falls back to anon if not set)
function getServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('SuitabilityDataService requires a Supabase client in the browser')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase credentials missing');
  }
  return createSupabaseClient<Database>(url, key);
}

export class SuitabilityDataService {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient ?? getServiceClient();
  }

  // Get all assessments for a client
  async getAssessmentsByClient(clientId: string) {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching assessments', error, { clientId });
      throw new DatabaseError('Failed to fetch assessments for client', {
        clientId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Get a specific assessment by ID
  async getAssessment(assessmentId: string) {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) throw error;

      // Map database columns to expected format
      if (data) {
        return {
          id: data.id,
          clientId: data.client_id,
          versionNumber: data.version_number,
          isDraft: data.is_draft,
          isFinal: data.is_final,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          createdBy: data.completed_by, // Using completed_by instead of created_by
          completionPercentage: data.completion_percentage,
          status: data.status,
          submittedAt: data.completed_at, // Using completed_at instead of submitted_at
          parentVersionId: data.parent_assessment_id, // Using parent_assessment_id
          // Combine all the JSON columns into assessmentData
          assessmentData: {
            objectives: data.objectives,
            risk_assessment: data.risk_assessment,
            financial_situation: data.financial_situation,
            investment_objectives: data.investment_objectives,
            knowledge_experience: data.knowledge_experience,
            personal_circumstances: data.personal_circumstances,
            existing_arrangements: data.existing_arrangements,
            recommendations: data.recommendations,
            risk_profile: data.risk_profile,
            vulnerability: data.vulnerability,
            costs_charges: data.costs_charges,
            regulatory: data.regulatory,
            contact_details: data.contact_details,
            metadata: data.metadata
          }
        };
      }

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching assessment', error, { assessmentId });
      throw new NotFoundError('Assessment', assessmentId);
    }
  }

  // Get the latest version number for a client
  async getLatestVersionNumber(clientId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('version_number')
        .eq('client_id', clientId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return 0;
      return data.version_number || 0;
    } catch (error) {
      logger.error('Error getting latest version', error, { clientId });
      // Return 0 as safe default - version number will start fresh
      return 0;
    }
  }

  // Create a new assessment
  async createAssessment(assessmentData: {
    client_id: string;
    assessment_data: AssessmentDataSections;
    created_by: string | null;
    updated_by: string | null;
  }) {
    try {
      // Get the latest version number
      const latestVersion = await this.getLatestVersionNumber(assessmentData.client_id);
      const newVersionNumber = latestVersion + 1;

      // Parse assessment_data into individual columns
      const parsedData = assessmentData.assessment_data || {};

      const insertPayload = {
        client_id: assessmentData.client_id,
        version_number: newVersionNumber,
        is_draft: true,
        is_final: false,
        completed_by: assessmentData.created_by, // Map to completed_by
        completion_percentage: 0,
        status: 'draft',
        // Map the assessment data to individual JSON columns
        objectives: parsedData.objectives || null,
        risk_assessment: parsedData.risk_assessment || null,
        financial_situation: parsedData.financial_situation || null,
        investment_objectives: parsedData.investment_objectives || null,
        knowledge_experience: parsedData.knowledge_experience || null,
        personal_circumstances: parsedData.personal_circumstances || null,
        existing_arrangements: parsedData.existing_arrangements || null,
        recommendations: parsedData.recommendations || null,
        risk_profile: parsedData.risk_profile || null,
        vulnerability: parsedData.vulnerability || null,
        costs_charges: parsedData.costs_charges || null,
        regulatory: parsedData.regulatory || null,
        contact_details: parsedData.contact_details || null,
        metadata: parsedData.metadata || null,
        assessment_date: new Date().toISOString()
      };

      const attemptInsert = async () => {
        const { data, error } = await this.supabase
          .from('suitability_assessments')
          .insert(insertPayload)
          .select()
          .single();
        if (error && error.code === '23505') {
          // Duplicate version number, refetch latest and retry once
          const latest = await this.getLatestVersionNumber(assessmentData.client_id);
          insertPayload.version_number = latest + 1;
          const { data: retryData, error: retryError } = await this.supabase
            .from('suitability_assessments')
            .insert(insertPayload)
            .select()
            .single();
          return { data: retryData, error: retryError };
        }
        return { data, error };
      };

      const { data, error } = await attemptInsert();

      if (error || !data) throw error || new Error('No data returned');

      return {
        success: true,
        data: {
          assessmentId: data.id,
          id: data.id,
          versionNumber: data.version_number,
          isDraft: data.is_draft,
          isFinal: data.is_final,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          createdBy: data.completed_by,
          completionPercentage: data.completion_percentage,
          status: data.status,
          submittedAt: data.completed_at,
          parentVersionId: data.parent_assessment_id
        },
        error: null
      };
    } catch (error) {
      logger.error('Error creating assessment', error, { clientId: assessmentData.client_id });
      throw new DatabaseError('Failed to create assessment', {
        clientId: assessmentData.client_id,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Update an assessment
  async updateAssessment(
    assessmentId: string,
    updates: {
      assessment_data?: AssessmentDataSections;
      completion_percentage?: number;
      updated_by?: string | null;
      status?: string;
    }
  ) {
    try {
      // Parse assessment_data if provided
      const parsedData = updates.assessment_data || {};

      // Note: using any type here for flexibility
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
        status: updates.status
      };

      // Only update completion_percentage if provided
      if (updates.completion_percentage !== undefined) {
        updatePayload.completion_percentage = updates.completion_percentage;
      }

      // Map updated_by to completed_by if provided
      if (updates.updated_by !== undefined) {
        updatePayload.completed_by = updates.updated_by;
      }

      // Update individual JSON columns if assessment_data is provided
      if (updates.assessment_data) {
        updatePayload.objectives = parsedData.objectives || null;
        updatePayload.risk_assessment = parsedData.risk_assessment || null;
        updatePayload.financial_situation = parsedData.financial_situation || null;
        updatePayload.investment_objectives = parsedData.investment_objectives || null;
        updatePayload.knowledge_experience = parsedData.knowledge_experience || null;
        updatePayload.personal_circumstances = parsedData.personal_circumstances || null;
        updatePayload.existing_arrangements = parsedData.existing_arrangements || null;
        updatePayload.recommendations = parsedData.recommendations || null;
        updatePayload.risk_profile = parsedData.risk_profile || null;
        updatePayload.vulnerability = parsedData.vulnerability || null;
        updatePayload.costs_charges = parsedData.costs_charges || null;
        updatePayload.regulatory = parsedData.regulatory || null;
        updatePayload.contact_details = parsedData.contact_details || null;
        updatePayload.metadata = parsedData.metadata || null;
      }

      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .update(updatePayload)
        .eq('id', assessmentId)
        .select()
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Assessment not found');
      return { success: true, data, error: null };
    } catch (error) {
      logger.error('Error updating assessment', error, { assessmentId });
      throw new DatabaseError('Failed to update assessment', {
        assessmentId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Submit an assessment (mark as final)
  async submitAssessment(assessmentId: string, userId: string | null) {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .update({
          is_draft: false,
          is_final: true,
          status: 'submitted',
          completed_at: new Date().toISOString(), // Using completed_at instead of submitted_at
          completed_by: userId, // Using completed_by
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId)
        .select()
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Assessment not found');
      return { success: true, data, error: null };
    } catch (error) {
      logger.error('Error submitting assessment', error, { assessmentId, userId });
      throw new DatabaseError('Failed to submit assessment', {
        assessmentId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Create a new version from an existing assessment
  async createNewVersion(
    clientId: string,
    parentAssessmentId: string,
    reason: string | null,
    userId?: string | null
  ) {
    try {
      // Get the parent assessment
      const { data: parentData, error: parentError } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('id', parentAssessmentId)
        .single();

      if (parentError || !parentData) throw parentError || new Error('Parent assessment not found');

      // Get the latest version number
      const latestVersion = await this.getLatestVersionNumber(clientId);
      const newVersionNumber = latestVersion + 1;

      // Create new version
      const insertPayload = {
        client_id: clientId,
        version_number: newVersionNumber,
        is_draft: true,
        is_final: false,
        // Copy all JSON columns from parent
        objectives: parentData.objectives,
        risk_assessment: parentData.risk_assessment,
        financial_situation: parentData.financial_situation,
        investment_objectives: parentData.investment_objectives,
        knowledge_experience: parentData.knowledge_experience,
        personal_circumstances: parentData.personal_circumstances,
        existing_arrangements: parentData.existing_arrangements,
        recommendations: parentData.recommendations,
        risk_profile: parentData.risk_profile,
        vulnerability: parentData.vulnerability,
        costs_charges: parentData.costs_charges,
        regulatory: parentData.regulatory,
        contact_details: parentData.contact_details,
        metadata: parentData.metadata,
        completed_by: userId || null,
        completion_percentage: parentData.completion_percentage,
        status: 'draft',
        parent_assessment_id: parentAssessmentId, // Using parent_assessment_id
        assessment_reason: reason || null,
        assessment_date: new Date().toISOString()
      };

      const attemptInsert = async () => {
        const { data, error } = await this.supabase
          .from('suitability_assessments')
          .insert(insertPayload)
          .select()
          .single();
        if (error && error.code === '23505') {
          // Duplicate version, bump and retry once
          const latest = await this.getLatestVersionNumber(clientId);
          insertPayload.version_number = latest + 1;
          const { data: retryData, error: retryError } = await this.supabase
            .from('suitability_assessments')
            .insert(insertPayload)
            .select()
            .single();
          return { data: retryData, error: retryError };
        }
        return { data, error };
      };

      const { data, error } = await attemptInsert();

      if (error || !data) throw error || new Error('No data returned');

      return {
        success: true,
        data: {
          assessmentId: data.id,
          id: data.id,
          versionNumber: data.version_number,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          createdBy: data.completed_by,
          completionPercentage: data.completion_percentage,
          status: data.status,
          submittedAt: data.completed_at,
          parentVersionId: data.parent_assessment_id
        },
        error: null
      };
    } catch (error) {
      logger.error('Error creating new version', error, { clientId, parentAssessmentId });
      throw new DatabaseError('Failed to create new version', {
        clientId,
        parentAssessmentId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Get draft assessment for a client
  async getDraftAssessment(clientId: string) {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_draft', true)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

      if (data) {
        // Combine all JSON columns into assessmentData
        const assessmentData = {
          objectives: data.objectives,
          risk_assessment: data.risk_assessment,
          financial_situation: data.financial_situation,
          investment_objectives: data.investment_objectives,
          knowledge_experience: data.knowledge_experience,
          personal_circumstances: data.personal_circumstances,
          existing_arrangements: data.existing_arrangements,
          recommendations: data.recommendations,
          risk_profile: data.risk_profile,
          vulnerability: data.vulnerability,
          costs_charges: data.costs_charges,
          regulatory: data.regulatory,
          contact_details: data.contact_details,
          metadata: data.metadata
        };

        return {
          assessmentId: data.id,
          assessmentData,
          versionNumber: data.version_number,
          completionPercentage: data.completion_percentage,
          status: data.status
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching draft assessment', error, { clientId });
      // Return null for no draft - this is expected behavior when no draft exists
      return null;
    }
  }

  // Get all versions of assessments for a client
  async getAssessmentHistory(clientId: string) {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return data.map((assessment) => ({
        id: assessment.id,
        versionNumber: assessment.version_number,
        isDraft: assessment.is_draft,
        isFinal: assessment.is_final,
        createdAt: assessment.created_at,
        updatedAt: assessment.updated_at,
        createdBy: assessment.completed_by, // Using completed_by
        completionPercentage: assessment.completion_percentage,
        status: assessment.status,
        submittedAt: assessment.completed_at, // Using completed_at
        parentVersionId: assessment.parent_assessment_id // Using parent_assessment_id
      }));
    } catch (error) {
      logger.error('Error fetching assessment history', error, { clientId });
      throw new DatabaseError('Failed to fetch assessment history', {
        clientId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Calculate completion percentage based on assessment data
  calculateCompletionPercentage(assessmentData: AssessmentDataSections | null | undefined): number {
    if (!assessmentData) return 0;

    const sections = [
      'objectives',
      'investment_objectives',
      'risk_assessment',
      'knowledge_experience',
      'financial_situation',
      'personal_circumstances',
      'recommendations'
    ];

    let completedSections = 0;
    
    sections.forEach(section => {
      if (assessmentData[section] && Object.keys(assessmentData[section]).length > 0) {
        completedSections++;
      }
    });

    return Math.round((completedSections / sections.length) * 100);
  }

  // Auto-save functionality
  async autoSaveAssessment(
    assessmentId: string,
    assessmentData: AssessmentDataSections | null,
    userId: string | null
  ) {
    try {
      const completionPercentage = this.calculateCompletionPercentage(assessmentData);

      // Build update payload with individual JSON columns
      // Note: using any type here for flexibility
      const updatePayload: Record<string, any> = {
        completion_percentage: completionPercentage,
        updated_at: new Date().toISOString(),
        completed_by: userId,
        status: (completionPercentage === 100 ? 'completed' : 'in_progress') as AssessmentStatus
      };

      // Update individual JSON columns
      if (assessmentData) {
        updatePayload.objectives = assessmentData.objectives || null;
        updatePayload.risk_assessment = assessmentData.risk_assessment || null;
        updatePayload.financial_situation = assessmentData.financial_situation || null;
        updatePayload.investment_objectives = assessmentData.investment_objectives || null;
        updatePayload.knowledge_experience = assessmentData.knowledge_experience || null;
        updatePayload.personal_circumstances = assessmentData.personal_circumstances || null;
        updatePayload.existing_arrangements = assessmentData.existing_arrangements || null;
        updatePayload.recommendations = assessmentData.recommendations || null;
        updatePayload.risk_profile = assessmentData.risk_profile || null;
        updatePayload.vulnerability = assessmentData.vulnerability || null;
        updatePayload.costs_charges = assessmentData.costs_charges || null;
        updatePayload.regulatory = assessmentData.regulatory || null;
        updatePayload.contact_details = assessmentData.contact_details || null;
        updatePayload.metadata = assessmentData.metadata || null;
      }

      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .update(updatePayload)
        .eq('id', assessmentId)
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows updated – return a graceful message
          return { success: false, data: null, error: 'No matching assessment to autosave' };
        }
        throw error;
      }
      if (!data) {
        return { success: false, data: null, error: 'No matching assessment to autosave' };
      }
      return { success: true, data, error: null };
    } catch (error) {
      logger.error('Error auto-saving assessment', error, { assessmentId, userId });
      throw new DatabaseError('Failed to auto-save assessment', {
        assessmentId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Delete an assessment (only drafts)
  async deleteAssessment(assessmentId: string) {
    try {
      const { error } = await this.supabase
        .from('suitability_assessments')
        .delete()
        .eq('id', assessmentId)
        .eq('is_draft', true); // Only allow deletion of drafts

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      logger.error('Error deleting assessment', error, { assessmentId });
      throw new DatabaseError('Failed to delete assessment', {
        assessmentId,
        originalError: getErrorMessage(error)
      });
    }
  }

  // Check if client has any assessments
  async hasAssessments(clientId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('suitability_assessments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (error) {
      logger.error('Error checking assessments', error, { clientId });
      // Return false as safe default - will treat as no assessments
      return false;
    }
  }

  // Get the latest final assessment for a client
  async getLatestFinalAssessment(clientId: string) {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_final', true)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Combine all JSON columns into assessmentData
        const assessmentData = {
          objectives: data.objectives,
          risk_assessment: data.risk_assessment,
          financial_situation: data.financial_situation,
          investment_objectives: data.investment_objectives,
          knowledge_experience: data.knowledge_experience,
          personal_circumstances: data.personal_circumstances,
          existing_arrangements: data.existing_arrangements,
          recommendations: data.recommendations,
          risk_profile: data.risk_profile,
          vulnerability: data.vulnerability,
          costs_charges: data.costs_charges,
          regulatory: data.regulatory,
          contact_details: data.contact_details,
          metadata: data.metadata
        };

        return {
          id: data.id,
          assessmentData,
          versionNumber: data.version_number,
          submittedAt: data.completed_at, // Using completed_at
          createdBy: data.completed_by // Using completed_by
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching latest final assessment', error, { clientId });
      // Return null as safe default - no final assessment found
      return null;
    }
  }

  // Clone assessment to new client
  async cloneAssessment(
    sourceAssessmentId: string,
    targetClientId: string,
    userId: string | null
  ) {
    try {
      // Get source assessment
      const { data: sourceData, error: sourceError } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('id', sourceAssessmentId)
        .single();

      if (sourceError || !sourceData) throw sourceError || new Error('Source assessment not found');

      // Create new assessment for target client
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .insert({
          client_id: targetClientId,
          version_number: 1, // Start at version 1 for new client
          is_draft: true,
          is_final: false,
          // Copy all JSON columns
          objectives: sourceData.objectives,
          risk_assessment: sourceData.risk_assessment,
          financial_situation: sourceData.financial_situation,
          investment_objectives: sourceData.investment_objectives,
          knowledge_experience: sourceData.knowledge_experience,
          personal_circumstances: sourceData.personal_circumstances,
          existing_arrangements: sourceData.existing_arrangements,
          recommendations: sourceData.recommendations,
          risk_profile: sourceData.risk_profile,
          vulnerability: sourceData.vulnerability,
          costs_charges: sourceData.costs_charges,
          regulatory: sourceData.regulatory,
          contact_details: sourceData.contact_details,
          metadata: sourceData.metadata,
          completed_by: userId,
          completion_percentage: sourceData.completion_percentage,
          status: 'draft',
          assessment_date: new Date().toISOString()
        })
        .select()
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to clone assessment');

      return {
        success: true,
        data: {
          assessmentId: data.id,
          clientId: data.client_id,
          versionNumber: data.version_number
        },
        error: null
      };
    } catch (error) {
      logger.error('Error cloning assessment', error, { sourceAssessmentId, targetClientId });
      throw new DatabaseError('Failed to clone assessment', {
        sourceAssessmentId,
        targetClientId,
        originalError: getErrorMessage(error)
      });
    }
  }
}
