-- ================================================================
-- Drop legacy permissive assessment_shares policies + anon grants
-- Date: 2026-02-04
-- ================================================================

BEGIN;

-- Remove legacy policy names that may have been created outside migrations
-- Wrapped in DO block because DROP POLICY fails if the table doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_shares') THEN
    EXECUTE 'DROP POLICY IF EXISTS "shares_select" ON assessment_shares';
    EXECUTE 'DROP POLICY IF EXISTS "shares_insert" ON assessment_shares';
    EXECUTE 'DROP POLICY IF EXISTS "shares_update" ON assessment_shares';
    EXECUTE 'DROP POLICY IF EXISTS "shares_delete" ON assessment_shares';
    EXECUTE 'REVOKE ALL ON assessment_shares FROM anon';
    EXECUTE 'REVOKE ALL ON assessment_shares FROM public';
  END IF;
END $$;

COMMIT;
