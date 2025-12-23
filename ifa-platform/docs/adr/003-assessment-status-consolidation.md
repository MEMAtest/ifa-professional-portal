# ADR-003: Assessment Status Consolidation

## Status
Accepted

## Context
The assessment module had multiple status definitions scattered across files:
- `src/types/assessment.ts` - Had its own `AssessmentStatus` enum
- `src/types/assessment-status.ts` - Another status definition
- Various components with inline status strings
- Legacy statuses like `review_needed` mixed with new ones

This caused:
- Type mismatches between components
- Confusion about valid status transitions
- Difficulty maintaining consistent UI labels/colors

## Decision
Consolidated all assessment status logic into a single source of truth at `src/types/assessment-status.ts`:

### 1. Single Status Type
```typescript
export type AssessmentStatus =
  | 'not_started'  // Assessment has not been started yet
  | 'draft'        // Initial state, saved as draft
  | 'in_progress'  // User actively working
  | 'completed'    // All required fields filled
  | 'submitted'    // Formally submitted
  | 'archived'     // Historical record
```

### 2. Valid State Transitions
```typescript
export const VALID_TRANSITIONS: Record<AssessmentStatus, AssessmentStatus[]> = {
  not_started: ['draft', 'in_progress'],
  draft: ['in_progress', 'archived'],
  in_progress: ['completed', 'draft'],
  completed: ['submitted', 'in_progress'],
  submitted: ['archived'],
  archived: []
}
```

### 3. Utility Functions
- `isValidTransition(from, to)` - Check if transition is allowed
- `isEditable(status)` - Whether assessment can be edited
- `getStatusLabel(status)` - Human-readable label
- `getStatusColor(status)` - UI color for status badges
- `mapLegacyStatus(status)` - Convert old statuses to new

### 4. Legacy Support
```typescript
const LEGACY_STATUS_MAP: Record<string, AssessmentStatus> = {
  review_needed: 'in_progress',
  needs_review: 'in_progress',
  pending: 'in_progress'
}
```

## Consequences

### Positive
- Single source of truth for all status logic
- Type-safe status transitions
- Consistent UI representation
- Backward compatible with legacy data

### Negative
- Requires migration of old status values in database
- Components need updating to import from new location

## Implementation Notes
- Old `assessment.ts` now re-exports from `assessment-status.ts`
- `mapLegacyStatus()` should be used when reading from database
- New code should only use the defined `AssessmentStatus` type
- Archive status is terminal - no further transitions allowed
