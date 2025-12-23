# ADR-002: Independent CFL Calculation from ATR

## Status
Accepted

## Context
Per FCA COBS 9.2 requirements, Capacity for Loss (CFL) must be assessed independently from Attitude to Risk (ATR). The previous implementation had:
- CFL calculated as a simple derivation from ATR
- No independent scoring factors for CFL
- Missing FCA-required factors like time horizon, obligations, liquidity

This created compliance risk and could lead to unsuitable investment recommendations.

## Decision
Implemented a dedicated `CFLCalculationService` (`src/services/assessment/CFLCalculationService.ts`) that:

### 1. Calculates CFL using 6 independent factors:
| Factor | Weight | Description |
|--------|--------|-------------|
| Time Horizon | 20% | Years until funds needed |
| Obligations | 20% | Debt ratio + dependents |
| Liquidity | 15% | Liquid assets / monthly expenses |
| Income Stability | 15% | Employment type + variability |
| Reserves | 15% | Emergency fund adequacy |
| Concentration | 15% | Investment as % of net worth |

### 2. Returns a comprehensive result:
```typescript
interface CFLResult {
  score: number           // 1-7 scale
  category: string        // 'Very Low' to 'Very High'
  factors: CFLFactors     // Individual factor scores
  rationale: string[]     // Human-readable explanations
  warnings: string[]      // Risk flags
  maxLossPercentage: number  // Maximum acceptable loss
  confidenceLevel: number    // Data completeness %
}
```

### 3. Provides ATR reconciliation:
```typescript
reconcileWithATR(cflScore: number, atrScore: number): {
  aligned: boolean
  finalRecommendation: number  // Always uses lower value
  reconciliationNote: string
  requiresAction: boolean      // True if education needed
}
```

## Consequences

### Positive
- FCA COBS 9.2 compliant CFL assessment
- Clear separation of concerns (ATR = willingness, CFL = ability)
- Documented rationale for each assessment
- Automatic warnings for risk factors
- ATR/CFL reconciliation with action flags

### Negative
- More complex assessment process
- Requires additional client data collection
- May require client education when ATR/CFL misaligned

## Implementation Notes
- CFL score always takes precedence over ATR when lower
- Warnings generated for: insufficient emergency fund, high concentration, short time horizon
- Confidence level indicates data completeness (100% = all fields populated)
- Combined risk warnings flagged when multiple factors are low
