# Cash Flow Modeling - Math Notes

This document summarizes the core assumptions and formulas used in the cash flow, Monte Carlo, and stress-testing calculations.

## Cash Flow Projection Engine

Source of truth: `src/lib/cashflow/projectionEngine.ts`

### Timeline (per projection year)
1) Apply pension contributions (pre-retirement only).
2) Apply nominal returns to asset buckets.
3) Apply planned pension drawdown (retirement only, 4% of pension pot).
4) Cover any remaining shortfall using cash, then investments, then pension.
5) Invest any surplus into the investment portfolio.

### Income
- Employment income: `currentIncome` inflated by scenario inflation until retirement.
- State pension: `statePensionAmount` inflated after state pension age.
- Other income: `otherIncome` inflated each year.
- Pension income: pension withdrawals (planned 4% plus any extra to cover shortfall).
- Investment income: withdrawals from cash + investments to cover shortfall.

### Expenses
If detailed expenses are provided, they are used directly:
- `essentialExpenses`, `lifestyleExpenses`, `discretionaryExpenses`, each inflated annually.

If not provided, `currentExpenses` is split 60% / 30% / 10% and inflated annually.

### Returns
Portfolio real return is allocation-weighted:
- `realPortfolioReturn = w_eq * realEquityReturn + w_bd * realBondReturn + w_cash * realCashReturn`
- `alternativeAllocation` is treated as equity weight.
- Nominal return for a year = real return + inflation for that year.

### Surplus / Deficit
`annualSurplusDeficit = totalIncome - totalExpenses - pensionContribution`
- If positive, surplus is added to investments.
- If negative and assets are insufficient, the deficit remains negative (unfunded).

### Sustainability Ratio
`sustainabilityRatio = baseIncome / totalExpenses`
Where baseIncome excludes withdrawals (employment + state pension + other income).

## Monte Carlo

Source of truth engine: `src/lib/monte-carlo/engine.ts`  
API entry point: `src/app/api/monte-carlo/simulate/route.ts`

### Inputs (from scenario)
- Initial wealth = cash + investments + pension pot.
- Time horizon = `projectionYears`.
- Withdrawal amount = `retirementIncomeTarget` (or `currentExpenses`) minus guaranteed income (state pension + other income).
- Inflation = `inflationRate` (converted to decimal).
- Expected returns = real return + inflation (converted to decimal), per asset class.
- Allocation = scenario allocation, normalized to sum to 1.

### Simulation Logic
Each year:
- Generate correlated asset returns.
- Apply portfolio return to wealth.
- Withdraw inflation-adjusted amount.
- Track success, final wealth, drawdown, and depletion year.

## Stress Testing

Source of truth: `src/services/StressTestingEngine.ts`

### Stress Application
- Market crash and sector shocks are applied as an initial portfolio shock based on allocation weights.
- Inflation shocks increase inflation and expenses and reduce real returns.
- Personal crisis scenarios adjust income/expenses and (where relevant) asset values.

### Simulation
Stress tests run the unified Monte Carlo engine using the stressed scenario inputs.

## Known Limitations
- No explicit tax modeling.
- No dynamic withdrawal rules beyond the pension drawdown and deficit coverage.
- No explicit modeling of mortgage or debt amortization (currently not in projection engine).
