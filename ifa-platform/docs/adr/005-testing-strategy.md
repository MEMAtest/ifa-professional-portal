# ADR-005: Testing Strategy

## Status
Accepted

## Context
The suitability/assessment module had minimal test coverage (~5%). Critical business logic for risk assessment, CFL calculation, and suitability scoring was untested. This created risk for:
- Regressions during refactoring
- Undetected edge case bugs (divide by zero, negative values)
- Compliance violations from incorrect calculations

## Decision
Implemented comprehensive test suite using Node.js built-in test runner with TypeScript support.

### 1. Test Configuration
```javascript
// package.json
"test": "node --test --loader ./scripts/ts-loader.mjs tests/*.test.ts"
```

### 2. Test Files Created
| File | Tests | Coverage |
|------|-------|----------|
| `tests/scoring-service.test.ts` | 24 | Risk profile, vulnerability, suitability |
| `tests/error-handling.test.ts` | 36 | All error classes and utilities |
| `tests/cfl-calculation.test.ts` | 38 | CFL factors, warnings, reconciliation |
| `tests/suitability-report.test.ts` | 16 | PDF generation, model building |

### 3. Test Categories

#### Unit Tests
- All scoring algorithms
- CFL factor calculations
- Error class behavior
- Validation functions

#### Edge Cases
- Zero/negative values
- Division by zero scenarios
- Large numbers (1e12+)
- Missing/incomplete data

#### Integration Tests (via existing tests)
- PDF report generation
- Model building with real data structures

### 4. Test Structure
```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('ComponentName', () => {
  describe('methodName', () => {
    it('expected behavior description', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

## Consequences

### Positive
- 114 tests covering critical business logic
- Safe refactoring with regression detection
- Documentation of expected behavior
- Confidence in edge case handling

### Negative
- Additional maintenance for test files
- Custom TypeScript loader needed for ESM

## Test Results Summary
```
tests 114
suites 35
pass 114
fail 0
duration_ms ~1200
```

## Implementation Notes
- Tests import directly from `@/` path aliases
- No external test framework dependencies
- Tests run in parallel for performance
- Use `npm test` to run full suite
