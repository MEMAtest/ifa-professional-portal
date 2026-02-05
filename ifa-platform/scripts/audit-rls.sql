-- ================================================================
-- RLS Audit Script (Read-only)
-- PURPOSE: Verify tenant isolation and policy hygiene
-- ================================================================

-- 1) Find any permissive policies (USING true)
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true';

-- 2) Find anon grants on application tables (only allow if explicitly intended)
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'public')
  AND table_name IN (
    'clients',
    'documents',
    'file_reviews',
    'client_services',
    'complaint_register',
    'breach_register',
    'vulnerability_register',
    'compliance_rules',
    'assessment_shares',
    'aml_client_status',
    'aml_check_history',
    'consumer_duty_status',
    'consumer_duty_assessments',
    'monte_carlo_results',
    'cash_flow_scenarios',
    'suitability_assessments',
    'assessment_drafts',
    'signature_requests'
  );

-- 3) Check firm_id NOT NULL on critical tables
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'firm_id'
  AND table_name IN (
    'documents',
    'file_reviews',
    'client_services',
    'complaint_register',
    'breach_register',
    'vulnerability_register',
    'compliance_rules',
    'assessment_shares',
    'aml_client_status',
    'aml_check_history',
    'consumer_duty_status',
    'consumer_duty_assessments',
    'monte_carlo_results',
    'cash_flow_scenarios'
  );

-- 4) Verify RLS enabled on application tables
SELECT relname AS table, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
  'clients',
  'documents',
  'file_reviews',
  'client_services',
  'complaint_register',
  'breach_register',
  'vulnerability_register',
  'compliance_rules',
  'assessment_shares',
  'aml_client_status',
  'aml_check_history',
  'consumer_duty_status',
  'consumer_duty_assessments',
  'monte_carlo_results',
  'cash_flow_scenarios',
  'suitability_assessments',
  'assessment_drafts',
  'signature_requests'
);
