# Suitability Assessment System - Audit Findings Report

**Date:** December 2024
**Scope:** Suitability Assessment, Conditional Logic, Reports
**Status:** Review & Audit Complete

---

## Executive Summary

Audited three interconnected systems in the IFA Professional Portal. Found **12 issues** across data integrity, conditional logic, and reports. Most issues are medium severity relating to edge cases and type safety.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 6 |
| Low | 2 |

---

## Part 1: Data Integrity Findings

### Issue 1: DB Column Naming Inconsistency
- **File**: `src/lib/suitability/mappers.ts:53-89`
- **Severity**: Medium
- **Category**: Data Integrity

**Description:**
Database columns use different naming than form sections, creating confusion and potential mapping errors:

| Database Column | Form Section |
|-----------------|--------------|
| `personal_circumstances` | `personal_information` |
| `investment_objectives` | `objectives` |
| `vulnerability` | `vulnerability_assessment` |
| `regulatory` | `regulatory_compliance` |
| `recommendations` | `recommendation` |

**Impact:** Developers may incorrectly assume column names match section IDs.

**Recommendation:** Add documentation mapping or consider database migration to align names.

---

### Issue 2: Sections Stored in Metadata JSON Blob
- **File**: `src/lib/suitability/mappers.ts:69-73`
- **Severity**: Medium
- **Category**: Data Integrity

**Description:**
Several important sections are stored inside the `metadata` JSONB column rather than dedicated columns:
- `partner_information`
- `suitability_declaration`
- `documentation`
- `options_considered`
- `disadvantages_risks`
- `ongoing_service`

**Impact:**
- Cannot query these fields directly in SQL
- Data could be lost if metadata blob is truncated
- No schema validation at database level

**Recommendation:** Consider migrating critical sections to dedicated columns.

---

### Issue 3: Type Safety Gap with Index Signature
- **File**: `src/types/suitability/index.ts:410-411`
- **Severity**: Low
- **Category**: Code Quality

**Description:**
`SuitabilityFormData` interface has `[key: string]: any` index signature, bypassing TypeScript's type safety.

```typescript
// Line 411
[key: string]: any
```

**Impact:** Runtime errors from typos or incorrect field access won't be caught at compile time.

**Recommendation:** Use the provided `getSectionData()` helper function and remove index signature in future refactor.

---

### Issue 4: Required Field Validation Edge Case
- **File**: `src/lib/suitability/requiredFields.ts:26-30`
- **Severity**: Medium
- **Category**: Logic

**Description:**
Checkbox validation treats single checkboxes differently from multi-option checkboxes:

```typescript
case 'checkbox': {
  if (Array.isArray(field.options) && field.options.length > 1) {
    return !(Array.isArray(value) && value.length > 0)
  }
  return !(value === true || value === 'Yes')
}
```

**Impact:** A checkbox with exactly 1 option in `field.options` would use the second branch (expecting `true` or `'Yes'`), but the form may store it as an array.

**Recommendation:** Clarify expected format for single-option checkboxes.

---

## Part 2: Conditional Logic Findings

### Issue 5: "Widowed" Marital Status Not Handled
- **File**: `src/lib/suitability/conditionalLogic.ts:43-45`
- **Severity**: High
- **Category**: Business Logic

**Description:**
The marriage cascade rule only triggers for "Married" or "Civil Partnership":

```typescript
condition: (formData) => {
  const status = formData.personal_information?.marital_status
  return status === 'Married' || status === 'Civil Partnership'
}
```

**Impact:**
- Widowed clients don't get partner history fields
- Divorced clients don't get financial implication questions
- May miss important information for estate planning

**Recommendation:** Add rules for "Widowed" (show deceased partner info) and "Divorced" (show financial settlement info).

---

### Issue 6: DB Pension Transfer Rule Depends on Conditional Field
- **File**: `src/lib/suitability/conditionalLogic.ts:223-227`
- **Severity**: High
- **Category**: Logic

**Description:**
The `db_pension_transfer` rule (priority 6) checks `pension_scheme === 'Defined Benefit'`, but `pension_scheme` is only shown by the `employment_employed` rule (priority 5).

```typescript
condition: (formData) => {
  const personalInfo = formData.personal_information as any
  return personalInfo?.pension_scheme === 'Defined Benefit'
}
```

**Impact:** If employment status changes from "Employed" to something else, the `pension_scheme` field disappears but its value may persist, causing DB transfer fields to incorrectly show.

**Recommendation:** Add compound condition: `employment_status === 'Employed' && pension_scheme === 'Defined Benefit'`

---

### Issue 7: Employment Statuses Without Conditional Fields
- **File**: `src/lib/suitability/conditionalLogic.ts`
- **Severity**: Medium
- **Category**: Business Logic

**Description:**
Employment status options "Student" and "Not Working" have no conditional rules.

| Employment Status | Has Rule |
|-------------------|----------|
| Employed | Yes (priority 5) |
| Self-Employed | Yes (priority 8) |
| Retired | Yes (priority 10) |
| Student | No |
| Not Working | No |

**Impact:** Missing opportunity to gather relevant information (student loans, benefits income, etc.)

**Recommendation:** Add rules for Student (education funding, student loans) and Not Working (benefits, return-to-work plans).

---

### Issue 8: `hide_field` Action Type Never Used
- **File**: `src/lib/suitability/conditionalLogic.ts:24`
- **Severity**: Low
- **Category**: Code Quality

**Description:**
The `hide_field` action type is defined but never used in any of the 40+ rules.

```typescript
type: 'show_field' | 'hide_field' | 'set_value' | ...
```

**Impact:** Dead code. Fields are only shown conditionally, never explicitly hidden.

**Recommendation:** Either implement `hide_field` use cases or remove from type definition.

---

### Issue 9: PEP Field Name Inconsistency
- **File**: `src/lib/suitability/conditionalLogic.ts` (PEP rules)
- **Severity**: Medium
- **Category**: Data Integrity

**Description:**
PEP (Politically Exposed Person) checks reference two different field names:
- `politically_exposed` (in `RegulatoryCompliance` type)
- `pep` (checked in some conditional rules)

**Impact:** Could miss PEP declarations if only one field is populated.

**Recommendation:** Standardize on single field name `politically_exposed`.

---

## Part 3: Reports Findings

### Issue 10: Risk Score Parsing Limited to Single Digit
- **File**: `src/lib/suitability/mappers.ts:138-146`
- **Severity**: Critical
- **Category**: Business Logic

**Description:**
`mapAttitudeToRiskToScore()` uses string matching which could misparse scores:

```typescript
const normalized = (attitude || '').toLowerCase()
if (normalized.includes('very low')) return 2
if (normalized.includes('low')) return 4  // Would match "very low" too!
```

The order is correct (checks "very low" before "low"), but if someone adds new risk levels, the order dependency could cause bugs.

**Impact:** Risk scores could be incorrectly mapped, affecting investment recommendations.

**Recommendation:** Use exact matching or a mapping object instead of includes().

---

### Issue 11: Asset Allocation Fallback to Defaults
- **File**: `src/lib/suitability/mappers.ts:291-293`
- **Severity**: Medium
- **Category**: Data Integrity

**Description:**
If no allocation is provided, system defaults to "Balanced" portfolio allocation:

```typescript
const assetAllocation =
  allocationFromFieldsTotal > 0 ? allocationFromFields :
  parsedAllocation || defaultAllocationForPortfolio(portfolioName)
```

**Impact:** Reports could show default allocations (60/30/5/5) even when advisor hasn't specified allocation.

**Recommendation:** Show data quality warning when using defaults, or require allocation fields.

---

## Part 4: FCA Compliance Findings

### Issue 12: Vulnerable Customer Check Uses Old Field
- **File**: `src/lib/suitability/validationEngine.ts:113-121`
- **Severity**: High
- **Category**: Compliance

**Description:**
The vulnerable customer FCA rule checks `health_concerns` but the current form uses `health_conditions`:

```typescript
formData.vulnerability_assessment?.health_concerns === 'Significant'
// But type defines: health_conditions?: string
```

Also checks fields not always required:
- `support_network` (should be `support_needed`)
- `communication_preferences` (not in base fields)

**Impact:** FCA FG21/1 compliance check may pass incorrectly because it's checking wrong field names.

**Recommendation:** Update field references to match current schema:
- `health_concerns` → `health_conditions`
- `support_network` → `support_needed`

---

## Summary of Recommendations

### Immediate Actions (Critical/High)
1. **Fix vulnerable customer validation** - Update field names in `validationEngine.ts`
2. **Add "Widowed" handling** - Create conditional rule for deceased partner information
3. **Fix DB pension rule** - Add employment status check to compound condition

### Short-Term Actions (Medium)
4. Document DB column to form section mapping
5. Add Student/Not Working employment rules
6. Standardize PEP field naming
7. Add data quality warning for default allocations
8. Fix checkbox validation edge case

### Long-Term Actions (Low)
9. Consider migrating metadata sections to columns
10. Remove unused `hide_field` action type
11. Refactor away from `[key: string]: any` index signature

---

## Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/suitability/mappers.ts` | 477 | DB ↔ Form mapping |
| `src/lib/suitability/conditionalLogic.ts` | 1,474 | 40+ conditional rules |
| `src/lib/suitability/requiredFields.ts` | 112 | Required field validation |
| `src/lib/suitability/completion.ts` | 123 | Completion calculation |
| `src/lib/suitability/validationEngine.ts` | 400+ | FCA compliance validation |
| `src/types/suitability/index.ts` | 500+ | Type definitions |
| `src/config/suitability/sections.ts` | 1000+ | Section configuration |
