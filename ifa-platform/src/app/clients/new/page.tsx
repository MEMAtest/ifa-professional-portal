// ===================================================================
// src/app/clients/new/page.tsx - ENHANCED WITH INTEGRATION
// Creates client with automatic scenario creation and workflow initiation
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import ClientForm from '@/components/clients/ClientForm';
// INTEGRATION: Import integrated services instead of regular service
import { integratedClientService } from '@/services/integratedClientService';
import { realDocumentService } from '@/services/realIntegratedServices';
import type { ClientFormData } from '@/types/client';
import { Card, CardContent } from '@/components/ui/Card';
import clientLogger from '@/lib/logging/clientLogger';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

// ===================================================================
// INTERFACES
// ===================================================================

interface WorkflowStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description?: string;
}

// ===================================================================
// MAIN COMPONENT WITH INTEGRATION
// ===================================================================

export default function NewClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // INTEGRATION: Add workflow progress tracking
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showWorkflowProgress, setShowWorkflowProgress] = useState(false);

  // ===================================================================
  // INTEGRATION: Enhanced save handler with automated workflows
  // ===================================================================
  const handleSave = async (formData: ClientFormData) => {
    setIsSubmitting(true);
    setShowWorkflowProgress(true);
    
    // Initialize workflow steps
    const steps: WorkflowStep[] = [
      {
        id: 'create-client',
        label: 'Creating client profile',
        status: 'in-progress',
        description: 'Saving client information'
      },
      {
        id: 'create-scenario',
        label: 'Setting up cash flow scenario',
        status: 'pending',
        description: 'Creating default financial projection'
      },
      {
        id: 'schedule-assessment',
        label: 'Scheduling initial assessment',
        status: 'pending',
        description: 'Adding to pending actions'
      },
      {
        id: 'init-workflow',
        label: 'Initializing document workflow',
        status: 'pending',
        description: 'Preparing onboarding documents'
      }
    ];
    
    setWorkflowSteps(steps);
    
    try {
      // Step 1: Create client using integrated service
      updateWorkflowStep('create-client', 'in-progress');
      
      // INTEGRATION: Use integrated client service for enhanced creation
      const newClient = await integratedClientService.createClient(formData);
      
      updateWorkflowStep('create-client', 'completed');
      
      // The integrated service automatically:
      // - Creates default cash flow scenario
      // - Schedules initial assessment
      // - Creates pending actions
      
      // Update workflow UI to show automatic processes
      updateWorkflowStep('create-scenario', 'completed');
      updateWorkflowStep('schedule-assessment', 'completed');
      
      // Step 2: Initialize document workflow (optional enhancement)
      try {
        updateWorkflowStep('init-workflow', 'in-progress');
        
        // INTEGRATION: Create onboarding workflow
        await realDocumentService.createClientWorkflow(newClient.id, 'onboarding');
        
        updateWorkflowStep('init-workflow', 'completed');
      } catch (error) {
        clientLogger.error('Workflow initialization failed:', error);
        // Non-critical error - don't fail the entire process
        updateWorkflowStep('init-workflow', 'error');
      }
      
      // Add delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success toast
      toast({
        title: 'Client Created Successfully',
        description: `${formData.personalDetails.firstName} ${formData.personalDetails.lastName} has been added to your client list`,
        variant: 'default'
      });
      
      // Show workflow completion toast
      toast({
        title: 'Setup Complete',
        description: 'Default scenario created and assessment scheduled',
        variant: 'default'
      });
      
      // Navigate to the new client's detail page
      // Using replace to prevent back navigation to create form
      router.replace(`/clients/${newClient.id}?welcome=true`);
      
    } catch (error) {
      clientLogger.error('Error creating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create client';
      
      // Update workflow to show error
      updateWorkflowStep('create-client', 'error');
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Hide workflow progress on error
      setTimeout(() => setShowWorkflowProgress(false), 2000);
      
      throw error; // Re-throw to let form handle loading state
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to update workflow step status
  const updateWorkflowStep = (stepId: string, status: WorkflowStep['status']) => {
    setWorkflowSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const handleCancel = () => {
    // Check if there's unsaved data (handled by ClientForm's dirty check)
    router.push('/clients');
  };

  // Get icon for workflow step
  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
        <p className="text-gray-600 mt-2">
          Create a new client profile with complete information
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* INTEGRATION: Workflow Progress Indicator */}
        {showWorkflowProgress && workflowSteps.length > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-blue-900">Setting up client profile...</h3>
              <div className="space-y-2">
                {workflowSteps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        step.status === 'completed' ? 'text-green-700' :
                        step.status === 'error' ? 'text-red-700' :
                        step.status === 'in-progress' ? 'text-blue-700' :
                        'text-gray-600'
                      }`}>
                        {step.label}
                      </p>
                      {step.description && (
                        <p className="text-sm text-gray-600">{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Client Form - Already has auto-save integration */}
        <ClientForm
          onSave={handleSave}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}

// ===================================================================
// INTEGRATION DOCUMENTATION FOR FUTURE AI
// ===================================================================

/*
INTEGRATION SUMMARY:
1. Uses integratedClientService instead of regular clientService
2. Automatically creates default cash flow scenario
3. Schedules initial assessment as pending action
4. Optionally creates onboarding document workflow
5. Shows progress of all automated steps
6. All original functionality preserved

AUTOMATED WORKFLOWS ON CLIENT CREATION:
1. Client profile saved to database
2. Default "Base Case" scenario created
3. Initial assessment scheduled (pending action)
4. Client agreement task created (pending action)
5. Onboarding workflow initiated (if enabled)

NAVIGATION FLOW:
- Success: Redirects to client detail page with welcome parameter
- Error: Stays on form with error message
- Cancel: Returns to client list

KEY IMPROVEMENTS:
- Visual workflow progress tracking
- Multiple automation steps in single action
- Better error handling for partial failures
- Enhanced success feedback

FUTURE ENHANCEMENTS:
1. Add option to skip automated workflows
2. Allow customization of default scenario parameters
3. Send welcome email to client
4. Assign to specific advisor
5. Create calendar event for initial meeting

TESTING:
1. Create new client → Verify all steps complete
2. Check client detail page → Verify scenario exists
3. Check pending actions → Verify assessment scheduled
4. Check documents → Verify workflow created
5. Test error handling → Disconnect network mid-save
*/
