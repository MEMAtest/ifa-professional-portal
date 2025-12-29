import type { ReactNode } from 'react';
import type { ClientStatus } from '@/types/client';

export interface FormStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  icon?: ReactNode;
}

export const TOTAL_STEPS = 5;

export const formSteps: FormStep[] = [
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

export const CLIENT_STATUS_OPTIONS: Array<{ value: ClientStatus; label: string }> = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'review_due', label: 'Review Due' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' }
];

export const VULNERABILITY_FACTORS = [
  { id: 'health', label: 'Health or disability' },
  { id: 'life_events', label: 'Recent life events or bereavement' },
  { id: 'financial', label: 'Financial resilience concerns' },
  { id: 'capability', label: 'Low financial capability or confidence' },
  { id: 'language', label: 'Language or communication barriers' },
  { id: 'digital', label: 'Low digital confidence' }
];

export const SUPPORT_NEEDS = [
  { id: 'extra_time', label: 'Extra time to make decisions' },
  { id: 'third_party', label: 'Support from family or trusted contact' },
  { id: 'large_print', label: 'Large print or accessible format' },
  { id: 'follow_up', label: 'Follow-up call after meetings' },
  { id: 'simplified', label: 'Simplified explanations' }
];

export const COMMUNICATION_ADJUSTMENTS = [
  { id: 'written_summary', label: 'Written summary after advice' },
  { id: 'preferred_channel', label: 'Preferred channel only' },
  { id: 'meeting_companion', label: 'Allow companion in meetings' },
  { id: 'pace', label: 'Slower meeting pace' }
];
