# IFA Platform - Issue Fix Plan

## Overview
This document outlines the plan to fix all identified issues on the IFA Professional Portal platform.

---

## Phase 1: Security Fixes (Critical)
**Estimated: 30 minutes**

### 1.1 Remove Hardcoded API Key
- **File:** `src/app/api/notifications/send-email/route.ts:10`
- **Issue:** Resend API key hardcoded as fallback
- **Fix:** Remove fallback, require env variable, add validation
- **Risk:** High - exposed credentials in git history

### 1.2 Audit Environment Variables
- **File:** `.env.local`
- **Action:** Verify `.env.local` is in `.gitignore` (confirmed OK)
- **Action:** Document required env variables in `.env.example`

---

## Phase 2: Core Functionality Fixes (High Priority)
**Estimated: 2-3 hours**

### 2.1 Dynamic Advisor/Firm Names
- **Files:**
  - `src/services/CashFlowReportService.ts:133-134`
  - `src/services/ATRReportService.ts`
  - `src/services/StressTestReportService.ts:227-228`
  - `src/lib/pdf/PDFGenerator.tsx`
- **Issue:** Hardcoded `'Professional Advisor'` and `'Financial Advisory Services'`
- **Fix:**
  1. Create `AdvisorContextService` to fetch advisor/firm from auth
  2. Pass advisor info through report generation chain
  3. Fallback to hardcoded only if auth unavailable

### 2.2 Template ID Validation
- **File:** `src/services/CashFlowReportService.ts:345`
- **Issue:** Hardcoded UUID `431bb8f9-a82b-4b9a-81b8-73ea32acdd20`
- **Fix:**
  1. Create template lookup by type instead of hardcoded ID
  2. Add validation before report generation
  3. Return helpful error if template missing

### 2.3 Email Service Production Mode
- **File:** `.env.local` and email service
- **Issue:** `EMAIL_TEST_MODE=true` blocks real emails
- **Fix:**
  1. Add environment-based detection (production vs development)
  2. Add admin toggle for email sending
  3. Add email queue/retry logic

---

## Phase 3: Feature Completion (Medium Priority)
**Estimated: 4-6 hours**

### 3.1 Excel Export Implementation
- **File:** `src/services/EnhancedCashFlowReportService.ts:1221-1225`
- **Issue:** Throws "Excel format not yet implemented"
- **Fix:**
  1. Use existing `xlsx` package (already in dependencies)
  2. Create `ExcelGenerator` service
  3. Map report data to spreadsheet format

### 3.2 PowerPoint Export Implementation
- **File:** `src/services/EnhancedCashFlowReportService.ts`
- **Issue:** Not implemented
- **Fix:**
  1. Add `pptxgenjs` package
  2. Create `PowerPointGenerator` service
  3. Design slide templates for reports

### 3.3 OpenSign Integration
- **File:** `src/services/realIntegratedServices.ts:247`
- **Issue:** Document signing incomplete
- **Fix:**
  1. Complete OpenSign API integration
  2. Add webhook handlers for signature events
  3. Update document status on signature completion

### 3.4 Auth Context Integration
- **File:** `src/app/api/assessments/history/[clientId]/route.ts:67`
- **Issue:** Auth not implemented in API routes
- **Fix:**
  1. Add auth middleware to protected routes
  2. Extract user/advisor info from session
  3. Filter data by advisor permissions

---

## Phase 4: Database Schema (Medium Priority)
**Estimated: 1-2 hours**

### 4.1 Verify/Create Required Tables
- **Tables to verify:**
  - `generated_documents`
  - `signature_requests`
  - `client_workflows`
  - `assessment_progress`
  - `report_metadata`

- **Actions:**
  1. Create migration script to check/create tables
  2. Add foreign key constraints
  3. Add indexes for common queries

### 4.2 Template Seeding
- **Action:** Ensure default templates exist in `document_templates` table
- **Templates needed:**
  - Cash Flow Analysis (ID: 431bb8f9-a82b-4b9a-81b8-73ea32acdd20)
  - ATR Assessment
  - Suitability Report
  - Annual Review

---

## Phase 5: Error Handling & Code Quality (Low Priority)
**Estimated: 2-3 hours**

### 5.1 Standardize Error Handling
- **Issue:** Inconsistent patterns (empty arrays, null, throws)
- **Fix:**
  1. Create `ServiceResult<T>` type for all service returns
  2. Standardize error responses
  3. Add error logging service

### 5.2 Clean Up TODO Comments
- **Issue:** 28+ TODO comments indicating unfinished work
- **Fix:**
  1. Audit all TODOs
  2. Convert critical TODOs to GitHub issues
  3. Remove or implement minor TODOs

### 5.3 Fix TypeScript Errors
- **Issue:** Test files missing Jest types
- **Fix:**
  1. Install `@types/jest`
  2. Update tsconfig to include test types
  3. Fix remaining type errors

---

## Phase 6: Testing & Documentation (Ongoing)
**Estimated: 2-3 hours**

### 6.1 Add Integration Tests
- PDF generation tests
- Email service tests
- Report generation tests

### 6.2 Update Documentation
- API documentation
- Environment setup guide
- Deployment checklist

---

## Implementation Order

```
Week 1:
├── Phase 1: Security Fixes (Day 1)
├── Phase 2.1: Dynamic Advisor Names (Day 1-2)
├── Phase 2.2: Template Validation (Day 2)
└── Phase 2.3: Email Service (Day 2)

Week 2:
├── Phase 3.1: Excel Export (Day 3)
├── Phase 3.2: PowerPoint Export (Day 3-4)
├── Phase 3.3: OpenSign Integration (Day 4)
└── Phase 3.4: Auth Context (Day 5)

Week 3:
├── Phase 4: Database Schema (Day 6)
├── Phase 5: Error Handling (Day 7)
└── Phase 6: Testing & Docs (Day 8)
```

---

## Quick Wins (Can Do Now)

1. Remove hardcoded API key (~5 min)
2. Add `.env.example` file (~10 min)
3. Install `@types/jest` (~2 min)
4. Create template lookup function (~15 min)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/notifications/send-email/route.ts` | Remove hardcoded API key |
| `src/services/CashFlowReportService.ts` | Dynamic advisor, template lookup |
| `src/services/ATRReportService.ts` | Dynamic advisor |
| `src/services/EnhancedCashFlowReportService.ts` | Excel/PowerPoint implementation |
| `src/services/realIntegratedServices.ts` | OpenSign completion |
| `src/lib/pdf/PDFGenerator.tsx` | Accept advisor context |
| `src/services/utils/ReportUtils.ts` | Standardize error handling |
| `package.json` | Add @types/jest, pptxgenjs |
| Multiple API routes | Add auth middleware |

---

## Success Criteria

- [ ] No hardcoded credentials in tracked code
- [ ] Reports generate with real advisor/firm names
- [ ] Emails send in production
- [ ] Excel export works
- [ ] All database tables exist
- [ ] TypeScript compiles without errors
- [ ] All critical TODOs resolved
