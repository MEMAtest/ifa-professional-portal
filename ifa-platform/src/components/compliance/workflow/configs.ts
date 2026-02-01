import type { WorkflowConfig, WorkflowSourceType } from './types'

export const WORKFLOW_CONFIGS: Record<WorkflowSourceType, WorkflowConfig> = {
  complaint: {
    stages: [
      { id: 'open', label: 'Open', color: '#3b82f6' },
      { id: 'investigating', label: 'Investigating', color: '#f59e0b' },
      { id: 'resolved', label: 'Resolved', color: '#22c55e' },
      { id: 'escalated', label: 'Escalated', color: '#ef4444' },
      { id: 'closed', label: 'Closed', color: '#6b7280' },
    ],
    cardFields: ['reference_number', 'category', 'complaint_date', 'fca_reportable'],
  },
  breach: {
    stages: [
      { id: 'open', label: 'Open', color: '#ef4444' },
      { id: 'investigating', label: 'Investigating', color: '#f59e0b' },
      { id: 'remediated', label: 'Remediated', color: '#3b82f6' },
      { id: 'closed', label: 'Closed', color: '#6b7280' },
    ],
    cardFields: ['breach_date', 'severity', 'affected_clients'],
  },
  vulnerability: {
    stages: [
      { id: 'active', label: 'Identified', color: '#ef4444' },
      { id: 'monitoring', label: 'Monitored', color: '#f59e0b' },
      { id: 'resolved', label: 'Resolved', color: '#22c55e' },
    ],
    cardFields: ['vulnerability_type', 'severity', 'next_review_date'],
  },
  file_review: {
    stages: [
      { id: 'pending', label: 'Pending', color: '#6b7280' },
      { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
      { id: 'approved', label: 'Approved', color: '#22c55e' },
      { id: 'rejected', label: 'Rejected', color: '#ef4444' },
      { id: 'escalated', label: 'Escalated', color: '#f59e0b' },
    ],
    cardFields: ['review_type', 'risk_rating', 'due_date', 'adviser_name'],
  },
  aml_check: {
    stages: [
      { id: 'not_started', label: 'Not Started', color: '#6b7280' },
      { id: 'pending', label: 'Pending', color: '#f59e0b' },
      { id: 'verified', label: 'Verified', color: '#22c55e' },
      { id: 'failed', label: 'Failed', color: '#ef4444' },
      { id: 'expired', label: 'Expired', color: '#dc2626' },
    ],
    cardFields: ['risk_rating', 'pep_status', 'next_review_date'],
  },
  consumer_duty: {
    stages: [
      { id: 'not_assessed', label: 'Not Assessed', color: '#6b7280' },
      { id: 'fully_compliant', label: 'Fully Compliant', color: '#22c55e' },
      { id: 'mostly_compliant', label: 'Mostly Compliant', color: '#10b981' },
      { id: 'needs_attention', label: 'Needs Attention', color: '#f59e0b' },
      { id: 'non_compliant', label: 'Non-Compliant', color: '#ef4444' },
    ],
    cardFields: ['overall_status', 'next_review_date'],
  },
  risk_assessment: {
    stages: [
      { id: 'overdue', label: 'Overdue', color: '#ef4444' },
      { id: 'due_soon', label: 'Due Soon', color: '#f59e0b' },
      { id: 'current', label: 'Current', color: '#3b82f6' },
      { id: 'recent', label: 'Recent', color: '#22c55e' },
    ],
    cardFields: ['risk_score', 'risk_tolerance', 'last_assessment_date'],
  },
}

export const SECTION_BADGES: Record<WorkflowSourceType, { label: string; className: string }> = {
  complaint: { label: 'Complaints', className: 'bg-rose-100 text-rose-700' },
  breach: { label: 'Breaches', className: 'bg-amber-100 text-amber-700' },
  file_review: { label: 'QA Reviews', className: 'bg-sky-100 text-sky-700' },
  aml_check: { label: 'AML/CTF', className: 'bg-violet-100 text-violet-700' },
  consumer_duty: { label: 'Consumer Duty', className: 'bg-emerald-100 text-emerald-700' },
  vulnerability: { label: 'Vulnerability', className: 'bg-pink-100 text-pink-700' },
  risk_assessment: { label: 'Risk', className: 'bg-indigo-100 text-indigo-700' },
}
