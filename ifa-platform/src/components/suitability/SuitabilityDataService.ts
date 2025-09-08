// =====================================================
// FILE: src/services/suitability/SuitabilityDataService.ts
// PRODUCTION-READY WITH PROPER COLUMN MAPPING
// =====================================================

import { createClient } from '@/lib/supabase/client'
import type { SuitabilityFormData } from '@/types/suitability'

export class SuitabilityDataService {
  private supabase: any  // Or ReturnType<typeof createClient> if you import the type
  private clientId: string

constructor(clientId: string) {
  this.clientId = clientId
  this.supabase = createClient()  // No parameters
}
  
  /**
   * Maps form structure to database columns
   * CRITICAL: Database has separate JSONB columns, NOT a single assessment_data column
   */
  private mapFormToDatabase(formData: SuitabilityFormData) {
    return {
      client_id: this.clientId,
      // Map form sections to database columns
      personal_circumstances: formData.personal_information || {},  // RENAMED
      financial_situation: formData.financial_situation || {},       // Direct
      investment_objectives: formData.objectives || {},              // RENAMED
      risk_assessment: formData.risk_assessment || {},              // Direct
      knowledge_experience: formData.knowledge_experience || {},     // Direct
      contact_details: formData.contact_details || {},              // Direct
      existing_arrangements: formData.existing_arrangements || {},   // Direct
      vulnerability: formData.vulnerability_assessment || {},        // RENAMED
      regulatory: formData.regulatory_compliance || {},              // RENAMED
      costs_charges: formData.costs_charges || {},                  // Direct
      recommendations: formData.recommendation || {},                // RENAMED
      
      // Additional metadata
      status: this.calculateCompletionStatus(formData),
      completion_percentage: this.calculateCompletionPercentage(formData),
      assessment_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Store metadata separately
      metadata: {
        version: formData._metadata?.version || '1.0',
        aiEnabled: formData._metadata?.aiEnabled || false,
        pulledData: formData._metadata?.pulledData || {},
        lastSyncedAt: formData._metadata?.lastSyncedAt,
        parentAssessmentId: formData._metadata?.parentAssessmentId
      }
    }
  }
  
  /**
   * Save complete assessment to suitability_assessments table
   */
  async saveAssessment(formData: SuitabilityFormData): Promise<string> {
    try {
      const dbData = this.mapFormToDatabase(formData)
      
      // Check if assessment already exists for this client
      const { data: existing } = await this.supabase
        .from('suitability_assessments')
        .select('id')
        .eq('client_id', this.clientId)
        .single()
      
      let result
      
      if (existing) {
        // Update existing assessment
        const { data, error } = await this.supabase
          .from('suitability_assessments')
          .update(dbData)
          .eq('id', existing.id)
          .select()
          .single()
          
        if (error) throw error
        result = data
      } else {
        // Insert new assessment
        const { data, error } = await this.supabase
          .from('suitability_assessments')
          .insert(dbData)
          .select()
          .single()
          
        if (error) throw error
        result = data
      }
      
      // Also clear draft after successful save
      await this.clearDraft()
      
      return result.id
    } catch (error) {
      console.error('Error saving assessment:', error)
      throw new Error(
        error instanceof Error 
          ? `Failed to save assessment: ${error.message}`
          : 'Failed to save assessment'
      )
    }
  }
  
  /**
   * Load existing assessment from database
   */
  async loadAssessment(): Promise<SuitabilityFormData | null> {
    try {
      const { data, error } = await this.supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', this.clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is okay
          return null
        }
        throw error
      }
      
      if (!data) return null
      
      // Map database columns back to form structure
      return this.mapDatabaseToForm(data)
    } catch (error) {
      console.error('Error loading assessment:', error)
      return null
    }
  }
  
  /**
   * Map database columns back to form structure
   */
  private mapDatabaseToForm(dbData: any): SuitabilityFormData {
    return {
      _metadata: {
        version: dbData.metadata?.version || '1.0',
        createdAt: dbData.created_at,
        updatedAt: dbData.updated_at,
        completionPercentage: dbData.completion_percentage || 0,
        aiEnabled: dbData.metadata?.aiEnabled || false,
        pulledData: dbData.metadata?.pulledData || {}
      },
      _aiSuggestions: {},
      _chartData: {},
      
      // Map database columns back to form sections
      personal_information: dbData.personal_circumstances || {},
      financial_situation: dbData.financial_situation || {},
      objectives: dbData.investment_objectives || {},
      risk_assessment: dbData.risk_assessment || {},
      knowledge_experience: dbData.knowledge_experience || {},
      contact_details: dbData.contact_details || {},
      existing_arrangements: dbData.existing_arrangements || {},
      vulnerability_assessment: dbData.vulnerability || {},
      regulatory_compliance: dbData.regulatory || {},
      costs_charges: dbData.costs_charges || {},
      recommendation: dbData.recommendations || {}
    }
  }
  
  /**
   * Save draft to assessment_drafts table (for auto-save)
   */
  async saveDraft(formData: SuitabilityFormData): Promise<void> {
    try {
      const draftData = {
        client_id: this.clientId,
        assessment_type: 'suitability',
        draft_data: formData,
        metadata: {
          lastSaved: new Date().toISOString(),
          completionPercentage: this.calculateCompletionPercentage(formData),
          version: formData._metadata?.version || '1.0'
        },
        updated_at: new Date().toISOString()
      }
      
      const { error } = await this.supabase
        .from('assessment_drafts')
        .upsert(draftData, {
          onConflict: 'client_id,assessment_type'
        })
      
      if (error) throw error
    } catch (error) {
      console.error('Error saving draft:', error)
      // Don't throw - drafts failing shouldn't break the app
    }
  }
  
  /**
   * Load draft from assessment_drafts table
   */
  async loadDraft(): Promise<SuitabilityFormData | null> {
    try {
      const { data, error } = await this.supabase
        .from('assessment_drafts')
        .select('*')
        .eq('client_id', this.clientId)
        .eq('assessment_type', 'suitability')
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null
        }
        throw error
      }
      
      return data?.draft_data || null
    } catch (error) {
      console.error('Error loading draft:', error)
      return null
    }
  }
  
  /**
   * Clear draft after successful save
   */
  async clearDraft(): Promise<void> {
    try {
      await this.supabase
        .from('assessment_drafts')
        .delete()
        .eq('client_id', this.clientId)
        .eq('assessment_type', 'suitability')
    } catch (error) {
      console.error('Error clearing draft:', error)
    }
  }
  
  /**
   * Mark assessment as complete
   */
  async markAsComplete(assessmentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('suitability_assessments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_percentage: 100
        })
        .eq('id', assessmentId)
      
      if (error) throw error
    } catch (error) {
      console.error('Error marking as complete:', error)
      throw new Error('Failed to mark assessment as complete')
    }
  }
  
  /**
   * Calculate completion percentage
   */
  private calculateCompletionPercentage(formData: SuitabilityFormData): number {
    const sections = [
      'personal_information',
      'contact_details',
      'financial_situation',
      'objectives',
      'risk_assessment',
      'knowledge_experience',
      'existing_arrangements',
      'vulnerability_assessment',
      'regulatory_compliance',
      'costs_charges',
      'recommendation'
    ]
    
    let completedSections = 0
    
    sections.forEach(section => {
      const sectionData = formData[section as keyof SuitabilityFormData]
      if (sectionData && typeof sectionData === 'object') {
        const values = Object.values(sectionData)
        if (values.some(v => v !== null && v !== undefined && v !== '')) {
          completedSections++
        }
      }
    })
    
    return Math.round((completedSections / sections.length) * 100)
  }
  
  /**
   * Calculate completion status
   */
  private calculateCompletionStatus(formData: SuitabilityFormData): string {
    const percentage = this.calculateCompletionPercentage(formData)
    
    if (percentage === 100) return 'completed'
    if (percentage > 50) return 'in_progress'
    if (percentage > 0) return 'started'
    return 'not_started'
  }
  
  /**
   * Generate PDF report
   */
  async generateReport(assessmentId: string): Promise<Blob> {
    try {
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'suitability_assessment',
          assessmentId,
          clientId: this.clientId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      
      return await response.blob()
    } catch (error) {
      console.error('Error generating report:', error)
      throw new Error('Failed to generate PDF report')
    }
  }
}

// Export the class as default as well for compatibility
export default SuitabilityDataService
