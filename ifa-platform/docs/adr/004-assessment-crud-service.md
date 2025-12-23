# ADR-004: Shared Assessment CRUD Service

## Status
Accepted

## Context
The ATR and CFL API routes had ~500+ lines of duplicate code for:
- Fetching latest assessment for a client
- Creating new assessments with proper versioning
- Updating existing assessments
- Deleting assessments
- Managing `is_current` flag across versions
- Validation helpers

This violated DRY principles and made maintenance difficult.

## Decision
Created `AssessmentCRUDService` (`src/services/assessment/AssessmentCRUDService.ts`) to centralize shared operations:

### 1. Service Architecture
```typescript
export class AssessmentCRUDService {
  constructor(
    private supabase: SupabaseClient,
    private assessmentType: AssessmentType  // 'atr' | 'cfl'
  ) {}
}
```

### 2. Core Methods
| Method | Description |
|--------|-------------|
| `getLatestForClient(clientId)` | Get current assessment + version count |
| `getLatestVersionNumber(clientId)` | Get highest version number |
| `create(data)` | Create with auto-versioning |
| `update(assessmentId, data)` | Update existing assessment |
| `delete(assessmentId)` | Remove assessment |
| `getHistory(clientId)` | Get all versions for client |
| `getClientIdForAssessment(id)` | Lookup client for access control |

### 3. Automatic Version Management
- `create()` automatically:
  1. Gets latest version number
  2. Marks previous versions as `is_current: false`
  3. Inserts new record with incremented version
  4. Sets `is_current: true`

### 4. Validation Helpers
```typescript
export function validateScore(score: unknown, fieldName: string): void
export function validateLevel(level: unknown, fieldName: string): void
export function validatePercentage(value: unknown, fieldName: string): void
```

### 5. Factory Function
```typescript
export function createAssessmentService(
  supabase: SupabaseClient,
  type: AssessmentType
): AssessmentCRUDService
```

## Consequences

### Positive
- Eliminated ~500 lines of duplicate code
- Consistent versioning behavior across ATR/CFL
- Centralized error handling
- Type-safe with proper interfaces
- Easy to add new assessment types

### Negative
- Slightly more abstraction
- Routes need to instantiate service

## Implementation Notes
- Service uses structured logging via `@/lib/errors`
- Returns `ServiceResult<T>` for consistent response handling
- Table names derived from assessment type
- Can be extended to support additional assessment types
