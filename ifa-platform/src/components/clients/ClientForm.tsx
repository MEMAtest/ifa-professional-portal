// src/components/clients/ClientForm.tsx
// ✅ DEFINITIVE VERSION - All functionality preserved + Enter key fix

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type {
  Client,
  ClientFormData,
  PersonalDetails,
  ContactInfo,
  FinancialProfile,
  VulnerabilityAssessment,
  RiskProfile,
  ClientStatus,
  ValidationError
} from '@/types/client';
import {
  getDefaultClientFormData,
  validateClientData,
} from '@/types/client';

interface ClientFormProps {
  client?: Client;
  onSave?: (client: ClientFormData) => Promise<void>;
  onSubmit?: (client: Client) => void;
  onCancel: () => void;
  loading?: boolean;
  isSubmitting?: boolean;
  errors?: Record<string, string>;
}

// Safe default values with complete structure
const getEmptyFormData = (): ClientFormData => ({
  personalDetails: {
    title: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
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
    assessmentDate: new Date().toISOString(),
    reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    assessorId: '',
    communicationAdjustments: []
  },
  riskProfile: {
    riskTolerance: '',
    riskCapacity: '',
    attitudeToRisk: 5,
    capacityForLoss: '',
    knowledgeExperience: '',
    lastAssessment: new Date().toISOString(),
    assessmentScore: undefined,
    questionnaire: undefined,
    assessmentHistory: []
  },
  status: 'prospect'
});

// Helper function to convert ClientFormData to Client with proper types
function convertFormDataToClient(formData: ClientFormData, existingClient?: Client): Client {
  const now = new Date().toISOString();
  
  const financialProfile: FinancialProfile = {
    annualIncome: formData.financialProfile?.annualIncome ?? 0,
    netWorth: formData.financialProfile?.netWorth ?? 0,
    liquidAssets: formData.financialProfile?.liquidAssets ?? 0,
    monthlyExpenses: formData.financialProfile?.monthlyExpenses ?? 0,
    investmentTimeframe: formData.financialProfile?.investmentTimeframe ?? '',
    investmentObjectives: formData.financialProfile?.investmentObjectives ?? [],
    existingInvestments: formData.financialProfile?.existingInvestments ?? [],
    pensionArrangements: formData.financialProfile?.pensionArrangements ?? [],
    insurancePolicies: formData.financialProfile?.insurancePolicies ?? []
  };

  const vulnerabilityAssessment: VulnerabilityAssessment = {
    is_vulnerable: formData.vulnerabilityAssessment?.is_vulnerable ?? false,
    vulnerabilityFactors: formData.vulnerabilityAssessment?.vulnerabilityFactors ?? [],
    supportNeeds: formData.vulnerabilityAssessment?.supportNeeds ?? [],
    assessmentNotes: formData.vulnerabilityAssessment?.assessmentNotes ?? '',
    assessmentDate: formData.vulnerabilityAssessment?.assessmentDate ?? now,
    reviewDate: formData.vulnerabilityAssessment?.reviewDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    assessorId: formData.vulnerabilityAssessment?.assessorId ?? '',
    communicationAdjustments: formData.vulnerabilityAssessment?.communicationAdjustments ?? [],
    lastAssessed: formData.vulnerabilityAssessment?.lastAssessed
  };

  const riskProfile: RiskProfile = {
    riskTolerance: formData.riskProfile?.riskTolerance ?? '',
    riskCapacity: formData.riskProfile?.riskCapacity ?? '',
    attitudeToRisk: formData.riskProfile?.attitudeToRisk ?? 5,
    capacityForLoss: formData.riskProfile?.capacityForLoss ?? '',
    knowledgeExperience: formData.riskProfile?.knowledgeExperience ?? '',
    lastAssessment: formData.riskProfile?.lastAssessment ?? now,
    assessmentScore: formData.riskProfile?.assessmentScore,
    questionnaire: formData.riskProfile?.questionnaire,
    assessmentHistory: formData.riskProfile?.assessmentHistory ?? []
  };
  
  return {
    id: existingClient?.id || `client-${Date.now()}`,
    createdAt: existingClient?.createdAt || now,
    updatedAt: now,
    advisorId: existingClient?.advisorId || null,
    firmId: existingClient?.firmId || null,
    clientRef: formData.clientRef || existingClient?.clientRef,
    personalDetails: formData.personalDetails,
    contactInfo: formData.contactInfo,
    financialProfile,
    vulnerabilityAssessment,
    riskProfile,
    status: formData.status || 'prospect'
  };
}

// Type-safe deep merge function
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;
  
  (Object.keys(source) as Array<keyof T>).forEach(key => {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    if (sourceValue === undefined || sourceValue === null) {
      return;
    }
    
    if (typeof sourceValue === 'object' && !Array.isArray(sourceValue) && sourceValue !== null) {
      (result as any)[key] = deepMerge(targetValue as any || {}, sourceValue as any);
    } else {
      (result as any)[key] = sourceValue;
    }
  });
  
  return result;
}

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

  // Initialize with complete structure and proper null checks
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
        clientRef: client.clientRef
      };
    }
    
    return defaultData;
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Form validation
  useEffect(() => {
    const errors = validateClientData(formData);
    setValidationErrors(errors);
  }, [formData]);

  // ✅ CRITICAL FIX: Handle Enter key to prevent auto-submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key === 'Enter') {
    // Allow Enter in textareas for line breaks
    if (e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    // Prevent default for ALL Enter key presses
    e.preventDefault();
      
      // Prevent form submission on Enter key
      e.preventDefault();
      
      // If we're not on the last step, move to next step
      if (currentStep < totalSteps) {
        nextStep();
      }
    }
  };

  // Handle form submission - FIXED with stopPropagation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (onSave) {
        await onSave(formData);
      } else if (onSubmit && client) {
        const updatedClient = convertFormDataToClient(formData, client);
        onSubmit(updatedClient);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to save client',
        variant: 'destructive'
      });
    }
  };

  // Safe update functions that preserve structure
  const updatePersonalDetails = (updates: Partial<PersonalDetails>) => {
    setFormData(prev => ({
      ...prev,
      personalDetails: deepMerge(prev.personalDetails, updates)
    }));
  };

  const updateContactInfo = (updates: Partial<ContactInfo>) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: deepMerge(prev.contactInfo, updates)
    }));
  };

  const updateFinancialProfile = (updates: Partial<FinancialProfile>) => {
    setFormData(prev => ({
      ...prev,
      financialProfile: deepMerge(prev.financialProfile || {}, updates)
    }));
  };

  const updateVulnerabilityAssessment = (updates: Partial<VulnerabilityAssessment>) => {
    setFormData(prev => ({
      ...prev,
      vulnerabilityAssessment: deepMerge(prev.vulnerabilityAssessment || {}, updates)
    }));
  };

  const updateRiskProfile = (updates: Partial<RiskProfile>) => {
    setFormData(prev => ({
      ...prev,
      riskProfile: deepMerge(prev.riskProfile || {}, updates)
    }));
  };

  const updateStatus = (status: ClientStatus) => {
    setFormData(prev => ({
      ...prev,
      status
    }));
  };

  // Step navigation - FIXED to prevent auto-advance
  const nextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render steps
  const renderPersonalDetailsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={formData.personalDetails.title}
            onChange={(e) => updatePersonalDetails({ title: e.target.value })}
          >
            <option value="">Select Title</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Miss">Miss</option>
            <option value="Ms">Ms</option>
            <option value="Dr">Dr</option>
          </select>
          <Input
            label="First Name *"
            value={formData.personalDetails.firstName}
            onChange={(e) => updatePersonalDetails({ firstName: e.target.value })}
            required
            error={errors['personalDetails.firstName']}
          />
          <Input
            label="Last Name *"
            value={formData.personalDetails.lastName}
            onChange={(e) => updatePersonalDetails({ lastName: e.target.value })}
            required
            error={errors['personalDetails.lastName']}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date of Birth"
            type="date"
            value={formData.personalDetails.dateOfBirth}
            onChange={(e) => updatePersonalDetails({ dateOfBirth: e.target.value })}
          />
          <Input
            label="Nationality"
            value={formData.personalDetails.nationality}
            onChange={(e) => updatePersonalDetails({ nationality: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={formData.personalDetails.maritalStatus}
            onChange={(e) => updatePersonalDetails({ 
              maritalStatus: e.target.value as PersonalDetails['maritalStatus'] 
            })}
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="civil_partnership">Civil Partnership</option>
            <option value="other">Other</option>
          </select>
          <Input
            label="Number of Dependents"
            type="number"
            value={formData.personalDetails.dependents}
            onChange={(e) => updatePersonalDetails({ dependents: parseInt(e.target.value) || 0 })}
          />
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={formData.personalDetails.employmentStatus}
            onChange={(e) => updatePersonalDetails({ 
              employmentStatus: e.target.value as PersonalDetails['employmentStatus'] 
            })}
          >
            <option value="employed">Employed</option>
            <option value="self_employed">Self-Employed</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Unemployed</option>
            <option value="student">Student</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Occupation"
            value={formData.personalDetails.occupation}
            onChange={(e) => updatePersonalDetails({ occupation: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium">Client Status</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.status}
              onChange={(e) => updateStatus(e.target.value as ClientStatus)}
            >
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="review_due">Review Due</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
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
          <Input
            label="Email Address *"
            type="email"
            value={formData.contactInfo.email}
            onChange={(e) => updateContactInfo({ email: e.target.value })}
            required
            error={errors['contactInfo.email']}
          />
          <Input
            label="Phone Number"
            value={formData.contactInfo.phone || ''}
            onChange={(e) => updateContactInfo({ phone: e.target.value })}
          />
          <Input
            label="Mobile Number"
            value={formData.contactInfo.mobile || ''}
            onChange={(e) => updateContactInfo({ mobile: e.target.value })}
          />
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={formData.contactInfo.preferredContact}
            onChange={(e) => updateContactInfo({ preferredContact: e.target.value as any })}
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="mobile">Mobile</option>
            <option value="post">Post</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Address</h4>
          <Input
            label="Address Line 1"
            value={formData.contactInfo.address?.line1 || ''}
            onChange={(e) => updateContactInfo({
              address: { 
                ...formData.contactInfo.address, 
                line1: e.target.value 
              }
            })}
          />
          <Input
            label="Address Line 2"
            value={formData.contactInfo.address?.line2 || ''}
            onChange={(e) => updateContactInfo({
              address: { 
                ...formData.contactInfo.address, 
                line2: e.target.value 
              }
            })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.contactInfo.address?.city || ''}
              onChange={(e) => updateContactInfo({
                address: { 
                  ...formData.contactInfo.address, 
                  city: e.target.value 
                }
              })}
            />
            <Input
              label="County"
              value={formData.contactInfo.address?.county || ''}
              onChange={(e) => updateContactInfo({
                address: { 
                  ...formData.contactInfo.address, 
                  county: e.target.value 
                }
              })}
            />
            <Input
              label="Postcode"
              value={formData.contactInfo.address?.postcode || ''}
              onChange={(e) => updateContactInfo({
                address: { 
                  ...formData.contactInfo.address, 
                  postcode: e.target.value 
                }
              })}
            />
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
          <Input
            label="Annual Income (£)"
            type="number"
            value={formData.financialProfile?.annualIncome || 0}
            onChange={(e) => updateFinancialProfile({ annualIncome: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Net Worth (£)"
            type="number"
            value={formData.financialProfile?.netWorth || 0}
            onChange={(e) => updateFinancialProfile({ netWorth: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Liquid Assets (£)"
            type="number"
            value={formData.financialProfile?.liquidAssets || 0}
            onChange={(e) => updateFinancialProfile({ liquidAssets: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Monthly Expenses (£)"
            type="number"
            value={formData.financialProfile?.monthlyExpenses || 0}
            onChange={(e) => updateFinancialProfile({ monthlyExpenses: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderVulnerabilityStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Vulnerability Assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_vulnerable"
            checked={formData.vulnerabilityAssessment?.is_vulnerable || false}
            onChange={(e) => updateVulnerabilityAssessment({ is_vulnerable: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_vulnerable" className="text-sm font-medium">
            Client has vulnerability factors
          </label>
        </div>

        {formData.vulnerabilityAssessment?.is_vulnerable && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Vulnerability Factors</label>
              <div className="mt-2 space-y-2">
                {['Health', 'Age', 'Financial', 'Life Events', 'Other'].map(factor => (
                  <label key={factor} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.vulnerabilityAssessment?.vulnerabilityFactors?.includes(factor) || false}
                      onChange={(e) => {
                        const factors = formData.vulnerabilityAssessment?.vulnerabilityFactors || [];
                        if (e.target.checked) {
                          updateVulnerabilityAssessment({ 
                            vulnerabilityFactors: [...factors, factor] 
                          });
                        } else {
                          updateVulnerabilityAssessment({ 
                            vulnerabilityFactors: factors.filter(f => f !== factor) 
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{factor}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Assessment Notes</label>
              <textarea
                value={formData.vulnerabilityAssessment?.assessmentNotes || ''}
                onChange={(e) => updateVulnerabilityAssessment({ assessmentNotes: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={4}
                placeholder="Enter any additional notes about the client's vulnerability..."
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Replace the renderRiskProfileStep function in ClientForm.tsx with this version:

// In ClientForm.tsx, replace the entire renderRiskProfileStep function with this:

const renderRiskProfileStep = () => {
  // Prevent Enter key on ALL form elements in this step
  const handleSelectKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleRangeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Risk Tolerance</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.riskProfile?.riskTolerance || ''}
              onChange={(e) => updateRiskProfile({ riskTolerance: e.target.value })}
              onKeyDown={handleSelectKeyDown}
            >
              <option value="">Select Risk Tolerance</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Risk Capacity</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.riskProfile?.riskCapacity || ''}
              onChange={(e) => updateRiskProfile({ riskCapacity: e.target.value })}
              onKeyDown={handleSelectKeyDown}
            >
              <option value="">Select Risk Capacity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Capacity for Loss</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.riskProfile?.capacityForLoss || ''}
              onChange={(e) => updateRiskProfile({ capacityForLoss: e.target.value })}
              onKeyDown={handleSelectKeyDown}
            >
              <option value="">Select Capacity for Loss</option>
              <option value="none">None</option>
              <option value="limited">Limited</option>
              <option value="moderate">Moderate</option>
              <option value="substantial">Substantial</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Knowledge & Experience</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.riskProfile?.knowledgeExperience || ''}
              onChange={(e) => updateRiskProfile({ knowledgeExperience: e.target.value })}
              onKeyDown={handleSelectKeyDown}
            >
              <option value="">Select Level</option>
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="moderate">Moderate</option>
              <option value="extensive">Extensive</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Attitude to Risk (1-10)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.riskProfile?.attitudeToRisk || 5}
            onChange={(e) => updateRiskProfile({ attitudeToRisk: parseInt(e.target.value) })}
            onKeyDown={handleRangeKeyDown}
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 - Very Cautious</span>
            <span>5 - Balanced</span>
            <span>10 - Very Adventurous</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-2xl font-bold">{formData.riskProfile?.attitudeToRisk || 5}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalDetailsStep();
      case 2:
        return renderContactInfoStep();
      case 3:
        return renderFinancialProfileStep();
      case 4:
        return renderVulnerabilityStep();
      case 5:
        return renderRiskProfileStep();
      default:
        return renderPersonalDetailsStep();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[...Array(totalSteps)].map((_, index) => (
            <div
              key={index}
              className={`flex-1 ${index < totalSteps - 1 ? 'relative' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep > index + 1 ? 'bg-green-600 text-white' : 
                    currentStep === index + 1 ? 'bg-blue-600 text-white' : 
                    'bg-gray-200 text-gray-600'}`}
              >
                {index + 1}
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={`absolute top-5 left-10 -right-10 h-0.5 
                    ${currentStep > index + 1 ? 'bg-green-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-600">Personal</span>
          <span className="text-xs text-gray-600">Contact</span>
          <span className="text-xs text-gray-600">Financial</span>
          <span className="text-xs text-gray-600">Vulnerability</span>
          <span className="text-xs text-gray-600">Risk</span>
        </div>
      </div>

      {/* ✅ CRITICAL FIX: Add onKeyDown to prevent Enter key auto-submission */}
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
        {renderCurrentStep()}
        
        {/* Navigation buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <input
                type="button"
                value="Previous"
                onClick={() => prevStep()}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              />
            )}
          </div>
          
          <div className="space-x-2">
            <input
              type="button"
              value="Cancel"
              onClick={() => onCancel()}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
            />
            
            {currentStep < totalSteps ? (
              <input
                type="button"
                value="Next"
                onClick={() => nextStep()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              />
            ) : (
              <input
                type="submit"
                value={loading || isSubmitting ? 'Saving...' : 'Save Client'}
                disabled={loading || isSubmitting || validationErrors.length > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}