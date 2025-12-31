'use client';

import React from 'react';
import { ContactInformationStep } from '@/components/clients/form/steps/ContactInformationStep';
import { FinancialProfileStep } from '@/components/clients/form/steps/FinancialProfileStep';
import { PersonalDetailsStep } from '@/components/clients/form/steps/PersonalDetailsStep';
import { RiskProfileStep } from '@/components/clients/form/steps/RiskProfileStep';
import { VulnerabilityAssessmentStep } from '@/components/clients/form/steps/VulnerabilityAssessmentStep';
import type {
  ClientFormData,
  PersonalDetails,
  ContactInfo,
  FinancialProfile,
  VulnerabilityAssessment,
  RiskProfile,
  ClientStatus
} from '@/types/client';

type ClientFormStepContentProps = {
  currentStep: number;
  formData: ClientFormData;
  hasDraft: boolean;
  onUpdatePersonalDetails: (updates: Partial<PersonalDetails>) => void;
  onUpdateStatus: (status: ClientStatus) => void;
  onUpdateContactInfo: (updates: Partial<ContactInfo>) => void;
  onUpdateFinancialProfile: (updates: Partial<FinancialProfile>) => void;
  onUpdateVulnerabilityAssessment: (updates: Partial<VulnerabilityAssessment>) => void;
  onToggleVulnerabilityList: (
    field: 'vulnerabilityFactors' | 'supportNeeds' | 'communicationAdjustments',
    value: string
  ) => void;
  onUpdateRiskProfile: (updates: Partial<RiskProfile>) => void;
};

export const ClientFormStepContent = ({
  currentStep,
  formData,
  hasDraft,
  onUpdatePersonalDetails,
  onUpdateStatus,
  onUpdateContactInfo,
  onUpdateFinancialProfile,
  onUpdateVulnerabilityAssessment,
  onToggleVulnerabilityList,
  onUpdateRiskProfile
}: ClientFormStepContentProps) => {
  switch (currentStep) {
    case 1:
      return (
        <PersonalDetailsStep
          formData={formData}
          hasDraft={hasDraft}
          onUpdatePersonalDetails={onUpdatePersonalDetails}
          onUpdateStatus={onUpdateStatus}
        />
      );
    case 2:
      return (
        <ContactInformationStep
          formData={formData}
          onUpdateContactInfo={onUpdateContactInfo}
        />
      );
    case 3:
      return (
        <FinancialProfileStep
          formData={formData}
          onUpdateFinancialProfile={onUpdateFinancialProfile}
        />
      );
    case 4:
      return (
        <VulnerabilityAssessmentStep
          formData={formData}
          onUpdateVulnerabilityAssessment={onUpdateVulnerabilityAssessment}
          onToggleList={onToggleVulnerabilityList}
        />
      );
    case 5:
      return (
        <RiskProfileStep
          formData={formData}
          onUpdateRiskProfile={onUpdateRiskProfile}
        />
      );
    default:
      console.error(`Invalid step: ${currentStep}`);
      return (
        <PersonalDetailsStep
          formData={formData}
          hasDraft={hasDraft}
          onUpdatePersonalDetails={onUpdatePersonalDetails}
          onUpdateStatus={onUpdateStatus}
        />
      );
  }
};
