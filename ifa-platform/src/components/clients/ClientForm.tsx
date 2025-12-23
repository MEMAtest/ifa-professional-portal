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
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useClientIntegration } from '@/lib/hooks/useClientIntegration';
import { AlertCircle, CheckCircle, Save, X, ChevronRight, ChevronLeft } from 'lucide-react';
import type {
  Client,
  ClientFormData,
  PersonalDetails,
  ContactInfo,
  FinancialProfile,
  VulnerabilityAssessment,
  RiskProfile,
  ClientStatus,
  ValidationError,
  Address
} from '@/types/client';
import {
  getDefaultClientFormData,
  validateClientData,
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

interface FormStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  icon?: React.ReactNode;
}

// ===================================================================
// CONSTANTS
// ===================================================================

const TOTAL_STEPS = 5;

const formSteps: FormStep[] = [
  {
    id: 1,
    title: 'Personal Details',
    description: 'Basic personal information',
    fields: ['firstName', 'lastName', 'dateOfBirth', 'occupation']
  },
  {
    id: 2,
    title: 'Contact Information',
    description: 'Contact details and address',
    fields: ['email', 'phone', 'address']
  },
  {
    id: 3,
    title: 'Financial Profile',
    description: 'Financial circumstances',
    fields: ['annualIncome', 'netWorth', 'monthlyExpenses']
  },
  {
    id: 4,
    title: 'Vulnerability Assessment',
    description: 'Consumer duty compliance',
    fields: ['is_vulnerable']
  },
  {
    id: 5,
    title: 'Risk Profile',
    description: 'Risk tolerance and capacity',
    fields: ['riskTolerance', 'attitudeToRisk']
  }
];

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function parseNumericValue(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
}

function parseBooleanValue(value: any, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value > 0;
  return defaultValue;
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  if (!source) return target;
  
  const result = { ...target } as T;
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
          targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        (result as any)[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined && sourceValue !== null) {
        (result as any)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

function getEmptyFormData(): ClientFormData {
  const now = new Date().toISOString();
  
  return {
    personalDetails: {
      title: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'prefer_not_to_say',
      nationality: 'British',
      maritalStatus: 'single',
      dependents: 0,
      employmentStatus: 'employed',
      occupation: ''
    },
    contactInfo: {
      email: '',
      phone: '',
      mobile: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom'
      },
      preferredContact: 'email',
      communicationPreferences: {
        marketing: false,
        newsletters: false,
        smsUpdates: false
      }
    },
    financialProfile: {
      annualIncome: 0,
      netWorth: 0,
      liquidAssets: 0,
      monthlyExpenses: 0,
      investmentTimeframe: '',
      investmentObjectives: [],
      existingInvestments: [],
      pensionArrangements: [],
      insurancePolicies: []
    },
    vulnerabilityAssessment: {
      is_vulnerable: false,
      vulnerabilityFactors: [],
      supportNeeds: [],
      assessmentNotes: '',
      assessmentDate: now,
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      assessorId: ''
    },
    riskProfile: {
      riskTolerance: '',
      riskCapacity: '',
      attitudeToRisk: 5,
      capacityForLoss: '',
      knowledgeExperience: '',
      lastAssessment: now
    },
    status: 'prospect'
  };
}

function transformFormDataToClient(formData: ClientFormData, existingClient?: Client): Client {
  const now = new Date().toISOString();
  
  return {
    id: existingClient?.id || `client-${Date.now()}`,
    createdAt: existingClient?.createdAt || now,
    updatedAt: now,
    advisorId: existingClient?.advisorId || null,
    firmId: existingClient?.firmId || null,
    clientRef: formData.clientRef || existingClient?.clientRef || `CLI-${Date.now()}`,
    personalDetails: {
      title: formData.personalDetails.title || '',
      firstName: formData.personalDetails.firstName || '',
      lastName: formData.personalDetails.lastName || '',
      dateOfBirth: formData.personalDetails.dateOfBirth || '',
      nationality: formData.personalDetails.nationality || 'British',
      maritalStatus: formData.personalDetails.maritalStatus || 'single',
      dependents: formData.personalDetails.dependents || 0,
      employmentStatus: formData.personalDetails.employmentStatus || 'employed',
      occupation: formData.personalDetails.occupation || ''
    },
    contactInfo: {
      email: formData.contactInfo.email || '',
      phone: formData.contactInfo.phone || '',
      mobile: formData.contactInfo.mobile || '',
      address: {
        line1: formData.contactInfo.address?.line1 || '',
        line2: formData.contactInfo.address?.line2 || '',
        city: formData.contactInfo.address?.city || '',
        county: formData.contactInfo.address?.county || '',
        postcode: formData.contactInfo.address?.postcode || '',
        country: formData.contactInfo.address?.country || 'United Kingdom'
      },
      preferredContact: formData.contactInfo.preferredContact || 'email',
      communicationPreferences: formData.contactInfo.communicationPreferences || {
        marketing: false,
        newsletters: false,
        smsUpdates: false
      }
    },
    financialProfile: {
      annualIncome: formData.financialProfile?.annualIncome ?? 0,
      netWorth: formData.financialProfile?.netWorth ?? 0,
      liquidAssets: formData.financialProfile?.liquidAssets ?? 0,
      monthlyExpenses: formData.financialProfile?.monthlyExpenses ?? 0,
      investmentTimeframe: formData.financialProfile?.investmentTimeframe ?? '',
      investmentObjectives: formData.financialProfile?.investmentObjectives ?? [],
      existingInvestments: formData.financialProfile?.existingInvestments ?? [],
      pensionArrangements: formData.financialProfile?.pensionArrangements ?? [],
      insurancePolicies: formData.financialProfile?.insurancePolicies ?? []
    },
    vulnerabilityAssessment: {
      is_vulnerable: formData.vulnerabilityAssessment?.is_vulnerable ?? false,
      vulnerabilityFactors: formData.vulnerabilityAssessment?.vulnerabilityFactors ?? [],
      supportNeeds: formData.vulnerabilityAssessment?.supportNeeds ?? [],
      assessmentNotes: formData.vulnerabilityAssessment?.assessmentNotes ?? '',
      assessmentDate: formData.vulnerabilityAssessment?.assessmentDate ?? now,
      reviewDate: formData.vulnerabilityAssessment?.reviewDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      assessorId: formData.vulnerabilityAssessment?.assessorId ?? '',
      communicationAdjustments: formData.vulnerabilityAssessment?.communicationAdjustments ?? [],
      lastAssessed: formData.vulnerabilityAssessment?.lastAssessed
    },
    riskProfile: {
      riskTolerance: formData.riskProfile?.riskTolerance ?? '',
      riskCapacity: formData.riskProfile?.riskCapacity ?? '',
      attitudeToRisk: formData.riskProfile?.attitudeToRisk ?? 5,
      capacityForLoss: formData.riskProfile?.capacityForLoss ?? '',
      knowledgeExperience: formData.riskProfile?.knowledgeExperience ?? '',
      lastAssessment: formData.riskProfile?.lastAssessment ?? now,
      assessmentScore: formData.riskProfile?.assessmentScore,
      questionnaire: formData.riskProfile?.questionnaire,
      assessmentHistory: formData.riskProfile?.assessmentHistory ?? []
    },
    status: formData.status || 'prospect',
    notes: formData.notes
  };
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
  
  const [formData, setFormData] = useState<ClientFormData>(() => {
    const defaultData = getEmptyFormData();
    
    if (client) {
      return {
        personalDetails: deepMerge(defaultData.personalDetails, client.personalDetails || {}),
        contactInfo: deepMerge(defaultData.contactInfo, client.contactInfo || {}),
        financialProfile: deepMerge(defaultData.financialProfile, client.financialProfile || {}),
        vulnerabilityAssessment: deepMerge(
          defaultData.vulnerabilityAssessment || {}, 
          client.vulnerabilityAssessment || {}
        ),
        riskProfile: deepMerge(
          defaultData.riskProfile || {}, 
          client.riskProfile || {}
        ),
        status: client.status || 'prospect',
        clientRef: client.clientRef,
        notes: client.notes
      };
    }
    
    return defaultData;
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ===================================================================
  // NUCLEAR OPTION: MANUAL SAVE HANDLER
  // ===================================================================
  
  const handleManualSave = useCallback(async () => {
    console.log('🚀 Manual save initiated on step', currentStep);
    
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
      console.log('💾 Saving client data...');
      
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
      console.error('❌ Save error:', error);
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

  const draftManager = {
    save: (data: any) => {
      if (saveDraft && typeof saveDraft === 'function') {
        saveDraft(data);
      }
    },
    loadDraft: async (type: string, id: string): Promise<ClientFormData | null> => {
      return null;
    }
  };

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
          console.error('Error loading draft:', error);
        }
      }
    };
    loadDraft();
  }, [client?.id, isDraftLoaded, toast]);

  // Auto-save drafts
  useEffect(() => {
    if (formData && isFormDirty && !isSaving) {
      draftManager.save(formData);
    }
  }, [formData, isFormDirty, isSaving]);

  // Validation
  useEffect(() => {
    if (formData) {
      const errors = validateClientData(formData);
      setValidationErrors(errors);
    }
  }, [formData]);

  // ===================================================================
  // NAVIGATION HANDLERS
  // ===================================================================

  const handleNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      console.log(`➡️ Moving from step ${currentStep} to step ${currentStep + 1}`);
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      console.log(`⬅️ Moving from step ${currentStep} to step ${currentStep - 1}`);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((stepId: number) => {
    if (stepId <= currentStep || stepId === currentStep + 1) {
      console.log(`🔢 Direct navigation to step ${stepId}`);
      setCurrentStep(stepId);
    }
  }, [currentStep]);

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
  // UPDATE HANDLERS
  // ===================================================================

  const updateFormData = useCallback((updates: Partial<ClientFormData>) => {
    setFormData(prev => {
      const newData = deepMerge(prev, updates);
      setIsFormDirty(true);
      return newData;
    });
  }, []);

  const updatePersonalDetails = useCallback((updates: Partial<PersonalDetails>) => {
    updateFormData({
      personalDetails: deepMerge(formData.personalDetails, updates)
    });
  }, [formData.personalDetails, updateFormData]);

  const updateContactInfo = useCallback((updates: Partial<ContactInfo>) => {
    updateFormData({
      contactInfo: deepMerge(formData.contactInfo, updates)
    });
  }, [formData.contactInfo, updateFormData]);

  const updateFinancialProfile = useCallback((updates: Partial<FinancialProfile>) => {
    updateFormData({
      financialProfile: deepMerge(formData.financialProfile || {}, updates)
    });
  }, [formData.financialProfile, updateFormData]);

  const updateVulnerabilityAssessment = useCallback((updates: Partial<VulnerabilityAssessment>) => {
    updateFormData({
      vulnerabilityAssessment: deepMerge(formData.vulnerabilityAssessment || {}, updates)
    });
  }, [formData.vulnerabilityAssessment, updateFormData]);

  const updateRiskProfile = useCallback((updates: Partial<RiskProfile>) => {
    updateFormData({
      riskProfile: deepMerge(formData.riskProfile || {}, updates)
    });
  }, [formData.riskProfile, updateFormData]);

  const updateStatus = useCallback((status: ClientStatus) => {
    updateFormData({ status });
  }, [updateFormData]);

  // ===================================================================
  // RENDER FUNCTIONS FOR EACH STEP
  // ===================================================================
  
  const renderPersonalDetailsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Personal Details
          {hasDraft && (
            <Badge variant="secondary" className="text-xs">
              Draft Available
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <select
              value={formData.personalDetails.title}
              onChange={(e) => updatePersonalDetails({ title: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
              <option value="Rev">Rev</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.personalDetails.firstName}
              onChange={(e) => updatePersonalDetails({ firstName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="First name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.personalDetails.lastName}
              onChange={(e) => updatePersonalDetails({ lastName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              value={formData.personalDetails.dateOfBirth}
              onChange={(e) => updatePersonalDetails({ dateOfBirth: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
            <input
              type="text"
              value={formData.personalDetails.nationality}
              onChange={(e) => updatePersonalDetails({ nationality: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="British"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.personalDetails.gender || 'prefer_not_to_say'}
              onChange={(e) => updatePersonalDetails({
                gender: e.target.value as PersonalDetails['gender']
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
            <select
              value={formData.personalDetails.maritalStatus}
              onChange={(e) => updatePersonalDetails({
                maritalStatus: e.target.value as PersonalDetails['maritalStatus']
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="civil_partnership">Civil Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Dependents</label>
            <input
              type="number"
              min="0"
              value={formData.personalDetails.dependents}
              onChange={(e) => updatePersonalDetails({ dependents: parseInt(e.target.value) || 0 })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
            <select
              value={formData.personalDetails.employmentStatus}
              onChange={(e) => updatePersonalDetails({
                employmentStatus: e.target.value as PersonalDetails['employmentStatus']
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="employed">Employed</option>
              <option value="self_employed">Self-Employed</option>
              <option value="retired">Retired</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
          <input
            type="text"
            value={formData.personalDetails.occupation}
            onChange={(e) => updatePersonalDetails({ occupation: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Current job title"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderContactInfoStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={formData.contactInfo.email}
              onChange={(e) => updateContactInfo({ email: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="client@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.contactInfo.phone || ''}
              onChange={(e) => updateContactInfo({ phone: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="01234 567890"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              value={formData.contactInfo.mobile || ''}
              onChange={(e) => updateContactInfo({ mobile: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="07700 900123"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
            <select
              value={formData.contactInfo.preferredContact}
              onChange={(e) => updateContactInfo({ preferredContact: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="mobile">Mobile</option>
              <option value="post">Post</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Address</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
            <input
              type="text"
              value={formData.contactInfo.address?.line1 || ''}
              onChange={(e) => updateContactInfo({
                address: { 
                  line1: e.target.value,
                  line2: formData.contactInfo.address?.line2 || '',
                  city: formData.contactInfo.address?.city || '',
                  county: formData.contactInfo.address?.county || '',
                  postcode: formData.contactInfo.address?.postcode || '',
                  country: formData.contactInfo.address?.country || 'United Kingdom'
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Street address"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
            <input
              type="text"
              value={formData.contactInfo.address?.line2 || ''}
              onChange={(e) => updateContactInfo({
                address: { 
                  line1: formData.contactInfo.address?.line1 || '',
                  line2: e.target.value,
                  city: formData.contactInfo.address?.city || '',
                  county: formData.contactInfo.address?.county || '',
                  postcode: formData.contactInfo.address?.postcode || '',
                  country: formData.contactInfo.address?.country || 'United Kingdom'
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.contactInfo.address?.city || ''}
                onChange={(e) => updateContactInfo({
                  address: { 
                    line1: formData.contactInfo.address?.line1 || '',
                    line2: formData.contactInfo.address?.line2 || '',
                    city: e.target.value,
                    county: formData.contactInfo.address?.county || '',
                    postcode: formData.contactInfo.address?.postcode || '',
                    country: formData.contactInfo.address?.country || 'United Kingdom'
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input
                type="text"
                value={formData.contactInfo.address?.county || ''}
                onChange={(e) => updateContactInfo({
                  address: { 
                    line1: formData.contactInfo.address?.line1 || '',
                    line2: formData.contactInfo.address?.line2 || '',
                    city: formData.contactInfo.address?.city || '',
                    county: e.target.value,
                    postcode: formData.contactInfo.address?.postcode || '',
                    country: formData.contactInfo.address?.country || 'United Kingdom'
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="County/State"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input
                type="text"
                value={formData.contactInfo.address?.postcode || ''}
                onChange={(e) => updateContactInfo({
                  address: { 
                    line1: formData.contactInfo.address?.line1 || '',
                    line2: formData.contactInfo.address?.line2 || '',
                    city: formData.contactInfo.address?.city || '',
                    county: formData.contactInfo.address?.county || '',
                    postcode: e.target.value.toUpperCase(),
                    country: formData.contactInfo.address?.country || 'United Kingdom'
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SW1A 1AA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={formData.contactInfo.address?.country || 'United Kingdom'}
              onChange={(e) => updateContactInfo({
                address: { 
                  line1: formData.contactInfo.address?.line1 || '',
                  line2: formData.contactInfo.address?.line2 || '',
                  city: formData.contactInfo.address?.city || '',
                  county: formData.contactInfo.address?.county || '',
                  postcode: formData.contactInfo.address?.postcode || '',
                  country: e.target.value
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="United Kingdom"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Communication Preferences</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contactInfo.communicationPreferences?.marketing || false}
                onChange={(e) => updateContactInfo({
                  communicationPreferences: {
                    marketing: e.target.checked,
                    newsletters: formData.contactInfo.communicationPreferences?.newsletters || false,
                    smsUpdates: formData.contactInfo.communicationPreferences?.smsUpdates || false
                  }
                })}
                className="mr-2"
              />
              Marketing communications
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contactInfo.communicationPreferences?.newsletters || false}
                onChange={(e) => updateContactInfo({
                  communicationPreferences: {
                    marketing: formData.contactInfo.communicationPreferences?.marketing || false,
                    newsletters: e.target.checked,
                    smsUpdates: formData.contactInfo.communicationPreferences?.smsUpdates || false
                  }
                })}
                className="mr-2"
              />
              Newsletter subscriptions
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contactInfo.communicationPreferences?.smsUpdates || false}
                onChange={(e) => updateContactInfo({
                  communicationPreferences: {
                    marketing: formData.contactInfo.communicationPreferences?.marketing || false,
                    newsletters: formData.contactInfo.communicationPreferences?.newsletters || false,
                    smsUpdates: e.target.checked
                  }
                })}
                className="mr-2"
              />
              SMS updates
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFinancialProfileStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Financial Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income (£)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.financialProfile?.annualIncome || ''}
              onChange={(e) => updateFinancialProfile({ 
                annualIncome: parseNumericValue(e.target.value) 
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="50000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Net Worth (£)</label>
            <input
              type="number"
              min="0"
              step="10000"
              value={formData.financialProfile?.netWorth || ''}
              onChange={(e) => updateFinancialProfile({ 
                netWorth: parseNumericValue(e.target.value) 
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="100000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Liquid Assets (£)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.financialProfile?.liquidAssets || ''}
              onChange={(e) => updateFinancialProfile({ 
                liquidAssets: parseNumericValue(e.target.value) 
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="25000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Expenses (£)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.financialProfile?.monthlyExpenses || ''}
              onChange={(e) => updateFinancialProfile({ 
                monthlyExpenses: parseNumericValue(e.target.value) 
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="3000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Investment Timeframe</label>
          <select
            value={formData.financialProfile?.investmentTimeframe || ''}
            onChange={(e) => updateFinancialProfile({ investmentTimeframe: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select timeframe</option>
            <option value="short_term">Short term (1-3 years)</option>
            <option value="medium_term">Medium term (3-7 years)</option>
            <option value="long_term">Long term (7+ years)</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );

  const renderVulnerabilityAssessmentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Vulnerability Assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This assessment helps us comply with the Consumer Duty regulations and ensure appropriate support is provided.
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.vulnerabilityAssessment?.is_vulnerable || false}
              onChange={(e) => updateVulnerabilityAssessment({ is_vulnerable: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Client may be considered vulnerable
            </span>
          </label>
        </div>

        {formData.vulnerabilityAssessment?.is_vulnerable && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Notes</label>
              <textarea
                rows={4}
                value={formData.vulnerabilityAssessment?.assessmentNotes || ''}
                onChange={(e) => updateVulnerabilityAssessment({ assessmentNotes: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe any vulnerability factors and support needs..."
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderRiskProfileStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Risk Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Risk assessment questionnaires will be completed separately. This section is for reference only.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Tolerance</label>
            <select
              value={formData.riskProfile?.riskTolerance || ''}
              onChange={(e) => updateRiskProfile({ riskTolerance: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Not yet assessed</option>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge & Experience</label>
            <select
              value={formData.riskProfile?.knowledgeExperience || ''}
              onChange={(e) => updateRiskProfile({ knowledgeExperience: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Not yet assessed</option>
              <option value="basic">Basic</option>
              <option value="informed">Informed</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attitude to Risk (1-10): {formData.riskProfile?.attitudeToRisk || 5}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.riskProfile?.attitudeToRisk || 5}
            onChange={(e) => updateRiskProfile({ attitudeToRisk: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Very Low Risk</span>
            <span>Very High Risk</span>
          </div>
        </div>

        {/* ✅ NUCLEAR OPTION: PROMINENT SAVE SECTION ON STEP 5 */}
        {currentStep === 5 && (
          <div className="mt-8 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">Ready to Save?</h3>
                <p className="text-sm text-green-700 mt-1">
                  You've completed all required information. Click the button to save this client.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleManualSave}
                disabled={isSaving || validationErrors.length > 0}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-medium flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Client</span>
                  </>
                )}
              </Button>
            </div>
            {validationErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                <p className="text-sm text-red-800">
                  Please fix validation errors before saving.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalDetailsStep();
      case 2:
        return renderContactInfoStep();
      case 3:
        return renderFinancialProfileStep();
      case 4:
        return renderVulnerabilityAssessmentStep();
      case 5:
        return renderRiskProfileStep();
      default:
        console.error(`Invalid step: ${currentStep}`);
        return renderPersonalDetailsStep();
    }
  };

  // ===================================================================
  // MAIN RENDER - NUCLEAR OPTION WITH NO FORM TAGS
  // ===================================================================
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {client ? 'Edit Client' : 'New Client'}
          </h1>
          <p className="text-gray-600 mt-1">
            {client ? 'Update client information' : 'Create a new client profile'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
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
<div className="flex items-center justify-between mb-6">
  {formSteps.map((step, index) => (
    <div
      key={step.id}
      className={`flex items-center ${
        index !== formSteps.length - 1 ? 'flex-1' : ''
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
        <div className={`flex-1 h-0.5 ${
          currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
        }`} />
      )}
    </div>
  ))}
</div>

      {/* ✅ NUCLEAR OPTION: NO FORM TAG - JUST DIV */}
      <div className="space-y-6">
        {renderCurrentStep()}
      </div>

      {/* ✅ NAVIGATION WITH SAVE ALWAYS AVAILABLE */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex space-x-3">
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

        <div className="flex items-center space-x-3">
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center space-x-2"
            >
              <span>Continue to {formSteps[currentStep]?.title || 'Next Step'}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving || validationErrors.length > 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center space-x-2"
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