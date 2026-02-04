// src/components/clients/ClientForm.tsx
// ===================================================================
// NUCLEAR OPTION - COMPLETE IMPLEMENTATION
// No form tags, manual save button, bulletproof
// ===================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useClientIntegration } from '@/lib/hooks/useClientIntegration';
import { AlertCircle, CheckCircle, Save, X, ChevronRight, ChevronLeft } from 'lucide-react';
import clientLogger from '@/lib/logging/clientLogger';
import { ClientFormStepContent } from '@/components/clients/form/ClientFormStepContent';
import { useClientFormState } from '@/components/clients/form/hooks/useClientFormState';
import {
  TOTAL_STEPS,
  formSteps
} from '@/components/clients/form/constants';
import {
  transformFormDataToClient
} from '@/components/clients/form/utils';
import type {
  Client,
  ClientFormData,
} from '@/types/client';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

interface ClientFormProps {
  client?: Client;
  onSave?: (client: ClientFormData) => Promise<void>;
  onSubmit?: (client: Client) => void;
  onCancel: () => void;
  loading?: boolean;
  isSubmitting?: boolean;
  errors?: Record<string, string>;
}

// ===================================================================
// MAIN COMPONENT - NUCLEAR OPTION IMPLEMENTATION
// ===================================================================

export default function ClientForm({
  client,
  onSave,
  onSubmit,
  onCancel,
  loading = false,
  isSubmitting = false,
  errors = {}
}: ClientFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const { saveDraft, hasDraft, clearDraft } = useClientIntegration({
    clientId: client?.id,
    autoSave: true
  });

  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  
  const {
    formData,
    setFormData,
    validationErrors,
    currentStep,
    isFormDirty,
    isDraftLoaded,
    setIsDraftLoaded,
    handleNextStep,
    handlePrevStep,
    handleStepClick,
    updatePersonalDetails,
    updateContactInfo,
    updateFinancialProfile,
    updateVulnerabilityAssessment,
    toggleVulnerabilityList,
    updateRiskProfile,
    updateStatus
  } = useClientFormState(client);
  const [isSaving, setIsSaving] = useState(false);

  // ===================================================================
  // NUCLEAR OPTION: MANUAL SAVE HANDLER
  // ===================================================================
  
  const handleManualSave = useCallback(async () => {
    // Must be on step 5
    if (currentStep !== 5) {
      toast({
        title: 'Cannot Save Yet',
        description: `Please complete all steps. Currently on step ${currentStep} of 5.`,
        variant: 'destructive'
      });
      return;
    }

    // Validate
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all errors before saving',
        variant: 'destructive'
      });
      return;
    }

    // Confirm save
    const confirmed = window.confirm(
      client 
        ? 'Are you ready to update this client?' 
        : 'Are you ready to create this client?'
    );
    
    if (!confirmed) return;

    setIsSaving(true);

    try {
      if (onSave) {
        await onSave(formData);
      } else if (onSubmit) {
        const clientData = transformFormDataToClient(formData, client);
        onSubmit(clientData);
      }

      // Clear draft on success
      if (client?.id && clearDraft) {
        await clearDraft();
      }

      toast({
        title: 'Success! 🎉',
        description: client ? 'Client updated successfully' : 'Client created successfully',
        variant: 'default'
      });

      // Delay redirect to show success message
      setTimeout(() => {
        if (client?.id) {
          router.push(`/clients/${client.id}`);
        } else {
          router.push('/clients');
        }
      }, 1500);
      
    } catch (error) {
      clientLogger.error('❌ Save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save client',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, validationErrors, formData, client, onSave, onSubmit, toast, router, clearDraft]);

  // ===================================================================
  // DRAFT MANAGEMENT
  // ===================================================================

  const draftManager = useMemo(() => ({
    save: (data: ClientFormData) => {
      if (saveDraft && typeof saveDraft === 'function') {
        saveDraft(data);
      }
    },
    loadDraft: async (type: string, id: string): Promise<ClientFormData | null> => {
      return null;
    }
  }), [saveDraft]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (client?.id && !isDraftLoaded) {
        try {
          const draft = await draftManager.loadDraft('client', client.id);
          if (draft) {
            setFormData(draft);
            setIsDraftLoaded(true);
            toast({
              title: 'Draft Restored',
              description: 'Continuing from your last saved draft',
              variant: 'default'
            });
          }
        } catch (error) {
          clientLogger.error('Error loading draft:', error);
        }
      }
    };
    loadDraft();
  }, [client?.id, draftManager, isDraftLoaded, setFormData, setIsDraftLoaded, toast]);

  // Auto-save drafts
  useEffect(() => {
    if (formData && isFormDirty && !isSaving) {
      draftManager.save(formData);
    }
  }, [draftManager, formData, isFormDirty, isSaving]);

  const handleCancel = useCallback(() => {
    if (isFormDirty) {
      const confirmMessage = 'You have unsaved changes. Are you sure you want to cancel?';
      if (window.confirm(confirmMessage)) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [isFormDirty, onCancel]);

  // ===================================================================
  // MAIN RENDER - NUCLEAR OPTION WITH NO FORM TAGS
  // ===================================================================
  
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {client ? 'Edit Client' : 'New Client'}
          </h1>
          <p className="text-gray-600 mt-1">
            {client ? 'Update client information' : 'Create a new client profile'}
          </p>
        </div>
        
        <div className="flex items-center flex-wrap gap-3">
          {hasDraft && (
            <Badge variant="secondary" className="text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 inline-block animate-pulse"></span>
              Draft Saved
            </Badge>
          )}
          <span className="text-sm text-gray-500">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Simplified Progress Steps */}
      {/* Simplified Progress Steps */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 mb-6">
  {formSteps.map((step, index) => (
    <div
      key={step.id}
      className={`flex items-center ${
        index !== formSteps.length - 1 ? 'flex-1 min-w-[160px]' : 'min-w-[140px]'
      }`}
    >
      <div
        onClick={() => handleStepClick(step.id)}
        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 cursor-pointer transition-all ${
          currentStep === step.id
            ? 'border-blue-500 bg-blue-500 text-white'
            : currentStep > step.id
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
        }`}
        title={step.title}
      >
        {currentStep > step.id ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="text-sm font-medium">{step.id}</span>
        )}
      </div>
      <div className="hidden sm:block ml-2 mr-4">
        <p className={`text-xs font-medium ${
          currentStep === step.id ? 'text-blue-600' : 
          currentStep > step.id ? 'text-green-600' : 'text-gray-400'
        }`}>
          {step.title}
        </p>
        <p className="text-xs text-gray-400">
          {step.description}
        </p>
      </div>
      {index !== formSteps.length - 1 && (
        <div className={`hidden sm:block flex-1 h-0.5 ${
          currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
        }`} />
      )}
    </div>
  ))}
</div>

      {/* ✅ NUCLEAR OPTION: NO FORM TAG - JUST DIV */}
      <div className="space-y-6">
        <ClientFormStepContent
          currentStep={currentStep}
          formData={formData}
          hasDraft={hasDraft}
          onUpdatePersonalDetails={updatePersonalDetails}
          onUpdateStatus={updateStatus}
          onUpdateContactInfo={updateContactInfo}
          onUpdateFinancialProfile={updateFinancialProfile}
          onUpdateVulnerabilityAssessment={updateVulnerabilityAssessment}
          onToggleVulnerabilityList={toggleVulnerabilityList}
          onUpdateRiskProfile={updateRiskProfile}
        />
      </div>

      {/* ✅ NAVIGATION WITH SAVE ALWAYS AVAILABLE */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading || isSaving}
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </Button>
          
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              disabled={loading || isSaving}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 sm:justify-end">
          {/* Save Draft Button - Available on all steps */}
          {currentStep < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                // Save draft
                if (saveDraft) {
                  saveDraft(formData);
                  toast({
                    title: 'Draft Saved',
                    description: 'Your progress has been saved',
                    variant: 'default'
                  });
                }
              }}
              disabled={loading || isSaving || !isFormDirty}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </Button>
          )}
          
          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={loading || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center space-x-2 w-full sm:w-auto"
            >
              <span>Continue to {formSteps[currentStep]?.title || 'Next Step'}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving || validationErrors.length > 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center space-x-2 w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>{client ? 'Update Client' : 'Create Client'}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================================================================
// MOCK SAVEDRAFT FOR COMPATIBILITY
// ===================================================================

export const saveDraft = {
  loadDraft: async (type: string, id: string): Promise<ClientFormData | null> => {
    return null;
  }
};
