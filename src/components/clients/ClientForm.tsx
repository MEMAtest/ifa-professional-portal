// ===================================================================
// src/components/clients/ClientForm.tsx - FINAL PRODUCTION VERSION
// ===================================================================

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

// ✅ FIXED: Helper function to convert ClientFormData to Client
function convertFormDataToClient(formData: ClientFormData, existingClient?: Client): Client {
  const now = new Date().toISOString();
  
  return {
    id: existingClient?.id || `client-${Date.now()}`,
    createdAt: existingClient?.createdAt || now,
    updatedAt: now,
    advisorId: existingClient?.advisorId || null,
    firmId: existingClient?.firmId || null,
    clientRef: formData.clientRef || existingClient?.clientRef,
    personalDetails: formData.personalDetails,
    contactInfo: formData.contactInfo,
    
    // ✅ FIXED: Convert Partial<FinancialProfile> to complete FinancialProfile
    financialProfile: {
      annualIncome: formData.financialProfile?.annualIncome || 0,
      netWorth: formData.financialProfile?.netWorth || 0,
      liquidAssets: formData.financialProfile?.liquidAssets || 0,
      monthlyExpenses: formData.financialProfile?.monthlyExpenses || 0,
      investmentTimeframe: formData.financialProfile?.investmentTimeframe || '',
      investmentObjectives: formData.financialProfile?.investmentObjectives || [],
      existingInvestments: formData.financialProfile?.existingInvestments || [],
      pensionArrangements: formData.financialProfile?.pensionArrangements || [],
      insurancePolicies: formData.financialProfile?.insurancePolicies || []
    },
    
    // ✅ FIXED: Convert Partial<VulnerabilityAssessment> to complete VulnerabilityAssessment
    vulnerabilityAssessment: {
      is_vulnerable: formData.vulnerabilityAssessment?.is_vulnerable || false,
      vulnerabilityFactors: formData.vulnerabilityAssessment?.vulnerabilityFactors || [],
      supportNeeds: formData.vulnerabilityAssessment?.supportNeeds || [],
      assessmentNotes: formData.vulnerabilityAssessment?.assessmentNotes || '',
      assessmentDate: formData.vulnerabilityAssessment?.assessmentDate || now,
      reviewDate: formData.vulnerabilityAssessment?.reviewDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      assessorId: formData.vulnerabilityAssessment?.assessorId || '',
      communicationAdjustments: formData.vulnerabilityAssessment?.communicationAdjustments || [],
      lastAssessed: formData.vulnerabilityAssessment?.lastAssessed || undefined
    },
    
    // ✅ FIXED: Convert Partial<RiskProfile> to complete RiskProfile
    riskProfile: {
      riskTolerance: formData.riskProfile?.riskTolerance || '',
      riskCapacity: formData.riskProfile?.riskCapacity || '',
      attitudeToRisk: formData.riskProfile?.attitudeToRisk || 5,
      capacityForLoss: formData.riskProfile?.capacityForLoss || '',
      knowledgeExperience: formData.riskProfile?.knowledgeExperience || '',
      lastAssessment: formData.riskProfile?.lastAssessment || now,
      assessmentScore: formData.riskProfile?.assessmentScore,
      questionnaire: formData.riskProfile?.questionnaire,
      assessmentHistory: formData.riskProfile?.assessmentHistory || []
    },
    
    status: formData.status || 'prospect'
  };
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

  // ✅ FIXED: Safe initialization with proper type handling
  const [formData, setFormData] = useState<ClientFormData>(() => {
    if (client) {
      return {
        personalDetails: client.personalDetails,
        contactInfo: client.contactInfo,
        financialProfile: client.financialProfile,
        vulnerabilityAssessment: client.vulnerabilityAssessment,
        riskProfile: client.riskProfile,
        status: client.status,
        clientRef: client.clientRef
      };
    }
    return getDefaultClientFormData();
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Form validation
  useEffect(() => {
    const errors = validateClientData(formData);
    setValidationErrors(errors);
  }, [formData]);

  // ✅ FIXED: Handle form submission with proper type conversion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        // ✅ FIXED: Use the converter function to safely create Client
        const updatedClient = convertFormDataToClient(formData, client);
        onSubmit(updatedClient);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to save client data',
        variant: 'destructive'
      });
    }
  };

  // Update form data handlers
  const updatePersonalDetails = (updates: Partial<PersonalDetails>) => {
    setFormData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, ...updates }
    }));
  };

  const updateContactInfo = (updates: Partial<ContactInfo>) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: { ...prev.contactInfo, ...updates }
    }));
  };

  const updateFinancialProfile = (updates: Partial<FinancialProfile>) => {
    setFormData(prev => ({
      ...prev,
      financialProfile: { ...prev.financialProfile, ...updates }
    }));
  };

  const updateRiskProfile = (updates: Partial<RiskProfile>) => {
    setFormData(prev => ({
      ...prev,
      riskProfile: { ...prev.riskProfile, ...updates }
    }));
  };

  const updateVulnerabilityAssessment = (updates: Partial<VulnerabilityAssessment>) => {
    setFormData(prev => ({
      ...prev,
      vulnerabilityAssessment: { ...prev.vulnerabilityAssessment, ...updates }
    }));
  };

  // Navigation helpers
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`flex items-center ${step < totalSteps ? 'flex-1' : ''}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === currentStep
                ? 'bg-blue-600 text-white'
                : step < currentStep
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {step < currentStep ? '✓' : step}
          </div>
          {step < totalSteps && (
            <div
              className={`flex-1 h-1 mx-2 ${
                step < currentStep ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderPersonalDetailsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={formData.personalDetails.title}
            onChange={(e) => updatePersonalDetails({ title: e.target.value })}
            placeholder="Mr, Mrs, Dr, etc."
          />
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
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={formData.personalDetails.maritalStatus}
            onChange={(e) => updatePersonalDetails({ maritalStatus: e.target.value as any })}
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
            onChange={(e) => updatePersonalDetails({ employmentStatus: e.target.value as any })}
          >
            <option value="employed">Employed</option>
            <option value="self_employed">Self Employed</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Unemployed</option>
            <option value="student">Student</option>
            <option value="other">Other</option>
          </select>
          <Input
            label="Occupation"
            value={formData.personalDetails.occupation}
            onChange={(e) => updatePersonalDetails({ occupation: e.target.value })}
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
            value={formData.contactInfo.address.line1}
            onChange={(e) => updateContactInfo({
              address: { ...formData.contactInfo.address, line1: e.target.value }
            })}
          />
          <Input
            label="Address Line 2"
            value={formData.contactInfo.address.line2 || ''}
            onChange={(e) => updateContactInfo({
              address: { ...formData.contactInfo.address, line2: e.target.value }
            })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.contactInfo.address.city}
              onChange={(e) => updateContactInfo({
                address: { ...formData.contactInfo.address, city: e.target.value }
              })}
            />
            <Input
              label="County"
              value={formData.contactInfo.address.county}
              onChange={(e) => updateContactInfo({
                address: { ...formData.contactInfo.address, county: e.target.value }
              })}
            />
            <Input
              label="Postcode"
              value={formData.contactInfo.address.postcode}
              onChange={(e) => updateContactInfo({
                address: { ...formData.contactInfo.address, postcode: e.target.value }
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

  const renderRiskProfileStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Risk Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Risk Tolerance</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.riskProfile?.riskTolerance || ''}
              onChange={(e) => updateRiskProfile({ riskTolerance: e.target.value })}
            >
              <option value="">Select risk tolerance</option>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Risk Capacity</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.riskProfile?.riskCapacity || ''}
              onChange={(e) => updateRiskProfile({ riskCapacity: e.target.value })}
            >
              <option value="">Select risk capacity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <Input
            label="Attitude to Risk (1-10)"
            type="number"
            min="1"
            max="10"
            value={formData.riskProfile?.attitudeToRisk || 0}
            onChange={(e) => updateRiskProfile({ attitudeToRisk: parseInt(e.target.value) || 0 })}
          />
          
          <Input
            label="Knowledge & Experience"
            value={formData.riskProfile?.knowledgeExperience || ''}
            onChange={(e) => updateRiskProfile({ knowledgeExperience: e.target.value })}
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
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_vulnerable"
              checked={formData.vulnerabilityAssessment?.is_vulnerable || false}
              onChange={(e) => updateVulnerabilityAssessment({ is_vulnerable: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_vulnerable" className="text-sm font-medium">
              Client is considered vulnerable
            </label>
          </div>
          
          <div>
            <label className="text-sm font-medium">Assessment Notes</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={formData.vulnerabilityAssessment?.assessmentNotes || ''}
              onChange={(e) => updateVulnerabilityAssessment({ assessmentNotes: e.target.value })}
              placeholder="Enter vulnerability assessment notes..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStepIndicator()}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {currentStep === 1 && renderPersonalDetailsStep()}
        {currentStep === 2 && renderContactInfoStep()}
        {currentStep === 3 && renderFinancialProfileStep()}
        {currentStep === 4 && renderRiskProfileStep()}
        {currentStep === 5 && renderVulnerabilityStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            
            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                loading={loading || isSubmitting}
                disabled={loading || isSubmitting || validationErrors.length > 0}
              >
                {loading || isSubmitting ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
              </Button>
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