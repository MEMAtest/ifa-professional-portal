'use client';

import { useCallback, useEffect, useState } from 'react';
import { normalizeIsoCountryCode } from '@/lib/isoCountries';
import { deepMerge, getEmptyFormData } from '@/components/clients/form/utils';
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
import { validateClientData } from '@/types/client';
import { TOTAL_STEPS } from '@/components/clients/form/constants';

type ClientFormState = {
  formData: ClientFormData;
  setFormData: (data: ClientFormData) => void;
  validationErrors: ValidationError[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isFormDirty: boolean;
  setIsFormDirty: (dirty: boolean) => void;
  isDraftLoaded: boolean;
  setIsDraftLoaded: (loaded: boolean) => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleStepClick: (stepId: number) => void;
  updatePersonalDetails: (updates: Partial<PersonalDetails>) => void;
  updateContactInfo: (updates: Partial<ContactInfo>) => void;
  updateFinancialProfile: (updates: Partial<FinancialProfile>) => void;
  updateVulnerabilityAssessment: (updates: Partial<VulnerabilityAssessment>) => void;
  toggleVulnerabilityList: (
    field: 'vulnerabilityFactors' | 'supportNeeds' | 'communicationAdjustments',
    value: string
  ) => void;
  updateRiskProfile: (updates: Partial<RiskProfile>) => void;
  updateStatus: (status: ClientStatus) => void;
};

export const useClientFormState = (client?: Client): ClientFormState => {
  const [formData, setFormData] = useState<ClientFormData>(() => {
    const defaultData = getEmptyFormData();

    if (client) {
      const normalizedPersonalDetails = {
        ...(client.personalDetails || {}),
        nationality: normalizeIsoCountryCode(client.personalDetails?.nationality)
      };

      return {
        personalDetails: deepMerge(defaultData.personalDetails, normalizedPersonalDetails),
        contactInfo: deepMerge(defaultData.contactInfo, client.contactInfo || {}),
        financialProfile: deepMerge(defaultData.financialProfile, client.financialProfile || {}),
        vulnerabilityAssessment: deepMerge(
          defaultData.vulnerabilityAssessment || {},
          client.vulnerabilityAssessment || {}
        ),
        riskProfile: deepMerge(defaultData.riskProfile || {}, client.riskProfile || {}),
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

  const updateFormData = useCallback((updates: Partial<ClientFormData>) => {
    setFormData((prev) => {
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

  const toggleVulnerabilityList = useCallback(
    (
      field: 'vulnerabilityFactors' | 'supportNeeds' | 'communicationAdjustments',
      value: string
    ) => {
      const existing = formData.vulnerabilityAssessment?.[field] || [];
      const next = existing.includes(value)
        ? existing.filter((item: string) => item !== value)
        : [...existing, value];

      updateVulnerabilityAssessment({ [field]: next } as Partial<VulnerabilityAssessment>);
    },
    [formData.vulnerabilityAssessment, updateVulnerabilityAssessment]
  );

  const updateRiskProfile = useCallback((updates: Partial<RiskProfile>) => {
    updateFormData({
      riskProfile: deepMerge(formData.riskProfile || {}, updates)
    });
  }, [formData.riskProfile, updateFormData]);

  const updateStatus = useCallback((status: ClientStatus) => {
    updateFormData({ status });
  }, [updateFormData]);

  const handleNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((stepId: number) => {
    if (stepId <= currentStep || stepId === currentStep + 1) {
      setCurrentStep(stepId);
    }
  }, [currentStep]);

  useEffect(() => {
    if (formData) {
      const errors = validateClientData(formData);
      setValidationErrors(errors);
    }
  }, [formData]);

  return {
    formData,
    setFormData,
    validationErrors,
    currentStep,
    setCurrentStep,
    isFormDirty,
    setIsFormDirty,
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
  };
};
