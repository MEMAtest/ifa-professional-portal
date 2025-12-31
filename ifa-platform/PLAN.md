# Delivery Plan (Reporting, Suitability, Reliability)

## Scope Focus
- Production-grade reporting hub (on-screen charts and PDFs)
- Suitability assessment stability and document generation
- Cashflow/Monte Carlo reliability and data integrity
- Foundation for multi-firm theming/branding (standard templates first)

## Completed Recently
- Assessment PDF charts rendered server-side with `chartjs-node-canvas`
- Risk Center queries use `created_at` (no 400s on `risk_profiles`)
- Cashflow scenario creation clamps retirement age to Supabase constraint
- Assessment progress API switched to upsert (prevents 500/PGRST116)
- Suitability form seed/guards to stop null-section crashes + redirect for `/assessments/suitability-clients`
- Reporting Hub now uses live Recharts visuals + AUM breakdown charts
- Monte Carlo report generation API + UI button now delivers downloadable PDF with charts

## Next Fixes & Enhancements
1) Suitability: harden section updates against malformed saved drafts; add minimal integration test for load/save/submit.  
2) Reporting Hub: consider PDF/CSV parity with on-screen charts and richer filters for risk/asset views.  
3) Monte Carlo: verify progress endpoint/UI show latest simulation details; surface failure messages to user.  
4) Cashflow: confirm retirement-age auto calculation across optimistic/base/pessimistic flows; add UX hint when constraint blocks inserts.  
5) Smoke tests: script to hit document APIs (assessment/suitability), cashflow scenario creation, Monte Carlo run, and Reporting Hub load.  
6) Branding/templates: prepare slot-based theming for firm logos/colours while keeping default templates consistent.

## Quick Test Checklist
- Run `npm run dev` (port 3001) and sign in.  
- Reporting Hub (`/clients/reports`): charts render; filters apply; exports still work.  
- Monte Carlo: run a simulation, ensure progress API returns 200 and UI shows percentile table.  
- Monte Carlo report: click Report in results; confirm PDF downloads/opens and document entry is created.  
- Cashflow: create scenario; verify retirement age auto-adjusts instead of failing constraint.  
- Suitability: open new assessment, switch sections, save/load draft without null errors.  
- Documents: POST to `/api/documents/generate-assessment-report` with a client id; confirm PDF contains chart images.
