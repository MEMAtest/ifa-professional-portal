// src/app/assessments/suitability/useSuitabilityAssessment.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { supabase } from '@/lib/supabase';
import AssessmentDocumentIntegration from '@/services/AssessmentDocumentIntegration';

type FormData = {
  [section: string]: {
    [field: string]: any;
  };
};

export function useSuitabilityAssessment(clientId: string | null) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // Load existing assessment or create new
  useEffect(() => {
    if (clientId) {
      loadOrCreateAssessment();
    }
  }, [clientId]);

  const loadOrCreateAssessment = async () => {
    try {
      // Check for existing assessment
      const { data: existing } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'in_progress')
        .single();

      if (existing) {
        setAssessmentId(existing.id);
        setFormData(existing.assessment_data || {});
      } else {
        // Create new assessment
        const { data: newAssessment } = await supabase
          .from('suitability_assessments')
          .insert({
            client_id: clientId,
            status: 'in_progress',
            assessment_data: {},
            completion_percentage: 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (newAssessment) {
          setAssessmentId(newAssessment.id);
        }
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assessment',
        variant: 'destructive'
      });
    }
  };

  // Custom save function for auto-save
  const saveAssessmentData = useCallback(async (data: any) => {
    if (!assessmentId) return;

    const completionPercentage = calculateCompletionPercentage(data);
    
    const { error } = await supabase
      .from('suitability_assessments')
      .update({
        assessment_data: data,
        completion_percentage: completionPercentage,
        last_updated: new Date().toISOString()
      })
      .eq('id', assessmentId);

    if (error) throw error;
  }, [assessmentId]);

  // Use auto-save hook
  const { isSaving, lastSaved, hasUnsavedChanges } = useAutoSave(
    formData,
    assessmentId,
    {
      tableName: 'suitability_assessments',
      onSave: saveAssessmentData,
      debounceMs: 2000,
      enabled: !!assessmentId
    }
  );

  // Update form field
  const updateField = useCallback((section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  }, []);

  // Complete assessment
  const completeAssessment = async () => {
    if (!assessmentId || !clientId) return;

    try {
      // Validate required fields
      const validationErrors = validateAssessment(formData);
      if (validationErrors.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Please complete all required fields: ${validationErrors.join(', ')}`,
          variant: 'destructive'
        });
        return;
      }

      // Update assessment status
      const { error } = await supabase
        .from('suitability_assessments')
        .update({
          assessment_data: formData,
          status: 'completed',
          completion_percentage: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (error) throw error;

      // Trigger document generation and other integrations
      await AssessmentDocumentIntegration.onAssessmentCompleted({
        clientId,
        assessmentType: 'suitability',
        assessmentId,
        data: formData
      });

      toast({
        title: 'Success',
        description: 'Assessment completed and documents are being generated',
      });

      // Redirect to client profile
      router.push(`/clients/${clientId}?tab=documents`);
      
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete assessment',
        variant: 'destructive'
      });
    }
  };

  // Calculate completion percentage
  const calculateCompletionPercentage = (data: any): number => {
    const sections = [
      'client_details',
      'objectives',
      'financial_situation',
      'knowledge_experience',
      'risk_assessment'
    ];
    
    let completedSections = 0;
    sections.forEach(section => {
      if (data[section] && Object.keys(data[section]).length > 0) {
        completedSections++;
      }
    });
    
    return Math.round((completedSections / sections.length) * 100);
  };

  // Validate assessment
  const validateAssessment = (data: any): string[] => {
    const errors: string[] = [];
    
    // Check required sections
    if (!data.client_details?.client_name) errors.push('Client name');
    if (!data.objectives?.primary_objective) errors.push('Investment objectives');
    if (!data.risk_assessment?.attitude_to_risk) errors.push('Risk assessment');
    
    return errors;
  };

  return {
    formData,
    updateField,
    completeAssessment,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    isComplete
  };
}