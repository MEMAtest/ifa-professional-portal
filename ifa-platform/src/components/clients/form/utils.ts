import { DEFAULT_NATIONALITY_CODE, normalizeIsoCountryCode } from '@/lib/isoCountries';
import type { Client, ClientFormData } from '@/types/client';

export function parseNumericValue(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
}

export function parseBooleanValue(value: any, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value > 0;
  return defaultValue;
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  if (!source) return target;

  const result = { ...target } as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined && sourceValue !== null) {
        (result as any)[key] = sourceValue;
      }
    }
  }

  return result;
}

export function getEmptyFormData(): ClientFormData {
  const now = new Date().toISOString();

  return {
    personalDetails: {
      title: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'prefer_not_to_say',
      nationality: DEFAULT_NATIONALITY_CODE,
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

export function transformFormDataToClient(formData: ClientFormData, existingClient?: Client): Client {
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
      nationality: normalizeIsoCountryCode(formData.personalDetails.nationality),
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
      reviewDate:
        formData.vulnerabilityAssessment?.reviewDate ??
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
