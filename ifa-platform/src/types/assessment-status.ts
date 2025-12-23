// =====================================================
// FILE: src/types/assessment-status.ts
// PURPOSE: Centralized status types for all assessments
// This file is the single source of truth for status values
// =====================================================

/**
 * Assessment lifecycle status
 * Used across all assessment types (suitability, ATR, CFL, etc.)
 */
export type AssessmentStatus =
  | 'not_started'  // Assessment has not been started yet
  | 'draft'        // Initial state, saved as draft but not actively working
  | 'in_progress'  // User actively working on assessment
  | 'completed'    // All required fields filled, ready for review
  | 'submitted'    // Formally submitted for compliance review
  | 'archived'     // Historical record, no longer active

/**
 * Save operation status for UI feedback
 */
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/**
 * Progress tracking status (for dashboard)
 */
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_review'

// =====================================================
// STATUS TRANSITION RULES
// =====================================================

/**
 * Valid status transitions
 * Prevents invalid state changes (e.g., archived -> draft)
 */
export const VALID_TRANSITIONS: Record<AssessmentStatus, AssessmentStatus[]> = {
  not_started: ['draft', 'in_progress'],
  draft: ['in_progress', 'archived'],
  in_progress: ['completed', 'draft', 'archived'],
  completed: ['submitted', 'in_progress', 'archived'],
  submitted: ['archived'],
  archived: [] // Terminal state - no transitions allowed
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: AssessmentStatus, to: AssessmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Get next valid statuses from current status
 */
export function getNextValidStatuses(current: AssessmentStatus): AssessmentStatus[] {
  return VALID_TRANSITIONS[current] || []
}

// =====================================================
// STATUS HELPERS
// =====================================================

/**
 * Check if assessment can be edited
 */
export function isEditable(status: AssessmentStatus): boolean {
  return status === 'not_started' || status === 'draft' || status === 'in_progress'
}

/**
 * Check if assessment is in a terminal state
 */
export function isTerminal(status: AssessmentStatus): boolean {
  return status === 'archived'
}

/**
 * Check if assessment has been submitted
 */
export function isSubmitted(status: AssessmentStatus): boolean {
  return status === 'submitted' || status === 'archived'
}

/**
 * Get display label for status
 */
export function getStatusLabel(status: AssessmentStatus): string {
  const labels: Record<AssessmentStatus, string> = {
    not_started: 'Not Started',
    draft: 'Draft',
    in_progress: 'In Progress',
    completed: 'Completed',
    submitted: 'Submitted',
    archived: 'Archived'
  }
  return labels[status] || status
}

/**
 * Get status color for UI (Tailwind classes)
 */
export function getStatusColor(status: AssessmentStatus): string {
  const colors: Record<AssessmentStatus, string> = {
    not_started: 'bg-gray-50 text-gray-500',
    draft: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    submitted: 'bg-purple-100 text-purple-800',
    archived: 'bg-gray-200 text-gray-600'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// =====================================================
// LEGACY STATUS MAPPING
// =====================================================

/**
 * Map legacy status values to new standardized values
 * Used during migration and for backward compatibility
 */
export function normalizeLegacyStatus(legacyStatus: string): AssessmentStatus {
  const mapping: Record<string, AssessmentStatus> = {
    // Standard values (no change)
    'not_started': 'not_started',
    'draft': 'draft',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'submitted': 'submitted',
    'archived': 'archived',

    // Legacy values to normalize
    'complete': 'completed',           // Old typo/variant
    'submitted_partial': 'in_progress', // Partial submission = still in progress
    'pending': 'in_progress',          // Pending = in progress
    'active': 'in_progress',           // Active = in progress
    'final': 'submitted',              // Final = submitted
    'closed': 'archived',              // Closed = archived
    'review_needed': 'completed',      // Review needed = completed but needs attention
    'needs_review': 'completed'        // Needs review = completed but needs attention
  }

  return mapping[legacyStatus.toLowerCase()] || 'not_started'
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard to check if a string is a valid AssessmentStatus
 */
export function isAssessmentStatus(value: string): value is AssessmentStatus {
  return ['not_started', 'draft', 'in_progress', 'completed', 'submitted', 'archived'].includes(value)
}

/**
 * Type guard to check if a string is a valid SaveStatus
 */
export function isSaveStatus(value: string): value is SaveStatus {
  return ['idle', 'pending', 'saving', 'saved', 'error'].includes(value)
}

/**
 * Type guard to check if a string is a valid ProgressStatus
 */
export function isProgressStatus(value: string): value is ProgressStatus {
  return ['not_started', 'in_progress', 'completed', 'needs_review'].includes(value)
}
