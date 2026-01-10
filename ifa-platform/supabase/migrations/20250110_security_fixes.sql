-- ================================================================
-- Migration: Security Fixes from Code Review
-- Date: 2025-01-10
-- Fixes:
--   1. get_firm_user_emails() - Add authorization check
--   2. get_my_firm_id() - Change from VOLATILE to STABLE for performance
-- ================================================================

BEGIN;

-- ================================================================
-- FIX 1: get_firm_user_emails() Authorization Check
-- Ensures users can only query emails for their own firm
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_firm_user_emails(firm_uuid UUID)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return results if caller belongs to the requested firm
  SELECT
    au.id as user_id,
    au.email::TEXT as email
  FROM auth.users au
  INNER JOIN profiles p ON p.id = au.id
  WHERE p.firm_id = firm_uuid
    AND firm_uuid = public.get_my_firm_id();  -- Authorization check
$$;

COMMENT ON FUNCTION public.get_firm_user_emails(UUID) IS
  'Returns user emails for a firm. Authorization: caller must belong to the requested firm.';

-- ================================================================
-- FIX 2: get_my_firm_id() - STABLE for Performance
-- auth.uid() is STABLE within a transaction, so this can be too
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_firm_id()
RETURNS UUID
LANGUAGE sql
STABLE  -- Changed from VOLATILE - auth.uid() is STABLE within a transaction
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_firm_id() IS
  'Returns the firm_id of the currently authenticated user. STABLE for query optimization.';

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
  func_volatility CHAR;
BEGIN
  -- Verify get_my_firm_id is now STABLE
  SELECT p.provolatile INTO func_volatility
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_my_firm_id';

  IF func_volatility = 's' THEN
    RAISE NOTICE 'get_my_firm_id() is now STABLE (s) - correct';
  ELSE
    RAISE WARNING 'get_my_firm_id() volatility is %, expected s (STABLE)', func_volatility;
  END IF;
END $$;

COMMIT;
