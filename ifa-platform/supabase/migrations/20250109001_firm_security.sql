-- ================================================================
-- Migration: Firm Security - JWT Hook & RLS Policies
-- Date: 2025-01-09
-- Purpose: Fix multi-tenancy security by:
--   1. Adding JWT hook to inject firm_id into tokens
--   2. Fixing RLS policies to actually check firm_id
--   3. Creating user_invitations table
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: JWT HOOK FOR FIRM_ID
-- This function injects firm_id and role into JWT claims
-- ================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  profile_record RECORD;
BEGIN
  claims := event->'claims';

  -- Get user's firm_id and role from profiles
  SELECT firm_id, role INTO profile_record
  FROM profiles
  WHERE id = (event->>'user_id')::UUID;

  -- Inject firm_id into claims if found
  IF profile_record.firm_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(profile_record.firm_id::TEXT));
  END IF;

  -- Inject role into claims if found
  IF profile_record.role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(profile_record.role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to supabase_auth_admin (required for auth hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- ================================================================
-- STEP 2: HELPER FUNCTION TO GET CURRENT USER'S FIRM_ID
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_firm_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid();
$$;

-- ================================================================
-- STEP 3: FIX RLS POLICIES - CLIENTS TABLE
-- ================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clients;
DROP POLICY IF EXISTS "Enable update for users based on email" ON clients;
DROP POLICY IF EXISTS "Users can view their clients" ON clients;
DROP POLICY IF EXISTS "Allow all" ON clients;

-- Create firm-scoped policies
CREATE POLICY "Users can view clients in their firm"
ON clients FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert clients in their firm"
ON clients FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can update clients in their firm"
ON clients FOR UPDATE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can delete clients in their firm"
ON clients FOR DELETE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

-- ================================================================
-- STEP 4: FIX RLS POLICIES - PROFILES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all" ON profiles;

-- Users can see all colleagues in their firm
CREATE POLICY "Users can view profiles in their firm"
ON profiles FOR SELECT
USING (firm_id = public.get_my_firm_id() OR id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- ================================================================
-- STEP 5: FIX RLS POLICIES - FILE_REVIEWS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view file reviews for their firm" ON file_reviews;
DROP POLICY IF EXISTS "Users can insert file reviews" ON file_reviews;
DROP POLICY IF EXISTS "Users can update file reviews" ON file_reviews;

CREATE POLICY "Users can view file reviews in their firm"
ON file_reviews FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert file reviews in their firm"
ON file_reviews FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can update file reviews in their firm"
ON file_reviews FOR UPDATE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

-- ================================================================
-- STEP 6: FIX RLS POLICIES - COMPLAINT_REGISTER TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view complaints for their firm" ON complaint_register;
DROP POLICY IF EXISTS "Users can insert complaints" ON complaint_register;
DROP POLICY IF EXISTS "Users can update complaints" ON complaint_register;

CREATE POLICY "Users can view complaints in their firm"
ON complaint_register FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert complaints in their firm"
ON complaint_register FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can update complaints in their firm"
ON complaint_register FOR UPDATE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

-- ================================================================
-- STEP 7: FIX RLS POLICIES - BREACH_REGISTER TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view breaches for their firm" ON breach_register;
DROP POLICY IF EXISTS "Users can insert breaches" ON breach_register;
DROP POLICY IF EXISTS "Users can update breaches" ON breach_register;

CREATE POLICY "Users can view breaches in their firm"
ON breach_register FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert breaches in their firm"
ON breach_register FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can update breaches in their firm"
ON breach_register FOR UPDATE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

-- ================================================================
-- STEP 8: FIX RLS POLICIES - VULNERABILITY_REGISTER TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view vulnerabilities for their firm" ON vulnerability_register;
DROP POLICY IF EXISTS "Users can insert vulnerabilities" ON vulnerability_register;
DROP POLICY IF EXISTS "Users can update vulnerabilities" ON vulnerability_register;

CREATE POLICY "Users can view vulnerabilities in their firm"
ON vulnerability_register FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert vulnerabilities in their firm"
ON vulnerability_register FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can update vulnerabilities in their firm"
ON vulnerability_register FOR UPDATE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

-- ================================================================
-- STEP 9: FIX RLS POLICIES - COMPLIANCE_RULES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view compliance rules for their firm" ON compliance_rules;
DROP POLICY IF EXISTS "Users can insert compliance rules" ON compliance_rules;
DROP POLICY IF EXISTS "Users can update compliance rules" ON compliance_rules;

-- Users can see their firm's rules OR global rules (firm_id IS NULL)
CREATE POLICY "Users can view compliance rules in their firm"
ON compliance_rules FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert compliance rules in their firm"
ON compliance_rules FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update compliance rules in their firm"
ON compliance_rules FOR UPDATE
USING (firm_id = public.get_my_firm_id());

-- ================================================================
-- STEP 10: FIX RLS POLICIES - CLIENT_SERVICES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can view client services for their firm" ON client_services;
DROP POLICY IF EXISTS "Users can insert client services" ON client_services;
DROP POLICY IF EXISTS "Users can update client services" ON client_services;

CREATE POLICY "Users can view client services in their firm"
ON client_services FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert client services in their firm"
ON client_services FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can update client services in their firm"
ON client_services FOR UPDATE
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

-- ================================================================
-- STEP 11: FIX RLS POLICIES - AML_CLIENT_STATUS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Allow all aml_client_status" ON aml_client_status;

-- AML status is accessed via client, so check client's firm_id
CREATE POLICY "Users can view AML status for clients in their firm"
ON aml_client_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

CREATE POLICY "Users can insert AML status for clients in their firm"
ON aml_client_status FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

CREATE POLICY "Users can update AML status for clients in their firm"
ON aml_client_status FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

-- ================================================================
-- STEP 12: FIX RLS POLICIES - AML_CHECK_HISTORY TABLE
-- ================================================================

DROP POLICY IF EXISTS "Allow all aml_check_history" ON aml_check_history;

CREATE POLICY "Users can view AML history for clients in their firm"
ON aml_check_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM aml_client_status acs
    JOIN clients c ON c.id = acs.client_id
    WHERE acs.id = aml_check_history.aml_client_status_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

CREATE POLICY "Users can insert AML history for clients in their firm"
ON aml_check_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM aml_client_status acs
    JOIN clients c ON c.id = acs.client_id
    WHERE acs.id = aml_check_history.aml_client_status_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

-- ================================================================
-- STEP 13: FIX RLS POLICIES - CONSUMER_DUTY_STATUS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Allow all consumer_duty_status" ON consumer_duty_status;

CREATE POLICY "Users can view consumer duty status for clients in their firm"
ON consumer_duty_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

CREATE POLICY "Users can insert consumer duty status for clients in their firm"
ON consumer_duty_status FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

CREATE POLICY "Users can update consumer duty status for clients in their firm"
ON consumer_duty_status FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND (c.firm_id = public.get_my_firm_id() OR c.firm_id IS NULL)
  )
);

-- ================================================================
-- STEP 14: CREATE USER_INVITATIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'advisor' CHECK (role IN ('advisor', 'supervisor', 'admin')),
  invited_by UUID REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_firm ON user_invitations(firm_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations for their firm
CREATE POLICY "Admins can view invitations for their firm"
ON user_invitations FOR SELECT
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can insert invitations for their firm"
ON user_invitations FOR INSERT
WITH CHECK (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can update invitations for their firm"
ON user_invitations FOR UPDATE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can delete invitations for their firm"
ON user_invitations FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ================================================================
-- STEP 15: ADD STATUS COLUMN TO PROFILES (for user state tracking)
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active'
      CHECK (status IN ('active', 'invited', 'deactivated'));
  END IF;
END $$;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- NOTE: After running this migration, you must:
-- 1. Enable the JWT hook in Supabase Dashboard > Auth > Hooks
--    Hook name: custom_access_token_hook
--    Function: public.custom_access_token_hook
-- 2. Force all users to re-login to get new JWT with firm_id

COMMIT;
