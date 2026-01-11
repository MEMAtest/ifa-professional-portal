-- ================================================================
-- Migration: Backfill firm_id for Existing Data
-- Date: 2025-01-10
-- Purpose: Populate firm_id for all existing records
--
-- IMPORTANT: Run this AFTER 20250109_firm_security.sql
-- This ensures existing data is visible after RLS is enforced
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Ensure at least one firm exists (create default if needed)
-- ================================================================

INSERT INTO firms (id, name, fca_number, settings, subscription_tier)
SELECT
  gen_random_uuid(),
  'Default Firm',
  'DEFAULT',
  jsonb_build_object(
    'branding', jsonb_build_object(
      'primaryColor', '#2563eb',
      'secondaryColor', '#1e40af'
    ),
    'compliance', jsonb_build_object(
      'tr241Enabled', true,
      'consumerDutyEnabled', true,
      'autoReviewReminders', true,
      'reviewFrequencyMonths', 12
    ),
    'features', jsonb_build_object(
      'cashFlowModeling', true,
      'aiInsights', true,
      'advancedAnalytics', true
    ),
    'billing', jsonb_build_object(
      'maxSeats', 10,
      'currentSeats', 0,
      'billingEmail', ''
    )
  ),
  'professional'
WHERE NOT EXISTS (SELECT 1 FROM firms LIMIT 1);

-- ================================================================
-- STEP 2: Create a function to get the default firm ID
-- ================================================================

CREATE OR REPLACE FUNCTION get_default_firm_id()
RETURNS UUID AS $$
DECLARE
  default_firm UUID;
BEGIN
  SELECT id INTO default_firm FROM firms ORDER BY created_at ASC LIMIT 1;
  RETURN default_firm;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 3: Backfill profiles.firm_id
-- Set to the default firm for all profiles without a firm
-- ================================================================

UPDATE profiles
SET firm_id = get_default_firm_id()
WHERE firm_id IS NULL;

-- Log how many profiles were updated
DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % profiles with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 4: Backfill clients.firm_id
-- Try to get firm_id from the advisor's profile first
-- Otherwise use the default firm
-- ================================================================

UPDATE clients c
SET firm_id = COALESCE(
  (SELECT p.firm_id FROM profiles p WHERE p.id = c.advisor_id),
  get_default_firm_id()
)
WHERE c.firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % clients with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 5: Backfill file_reviews.firm_id
-- Get firm_id from the reviewer's profile
-- ================================================================

UPDATE file_reviews fr
SET firm_id = COALESCE(
  (SELECT p.firm_id FROM profiles p WHERE p.id = fr.reviewer_id),
  get_default_firm_id()
)
WHERE fr.firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % file_reviews with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 6: Backfill complaint_register.firm_id
-- Get firm_id from the related client if available
-- ================================================================

UPDATE complaint_register cr
SET firm_id = COALESCE(
  (SELECT c.firm_id FROM clients c WHERE c.id = cr.client_id),
  get_default_firm_id()
)
WHERE cr.firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % complaint_register with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 7: Backfill breach_register.firm_id
-- ================================================================

UPDATE breach_register
SET firm_id = get_default_firm_id()
WHERE firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % breach_register with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 8: Backfill vulnerability_register.firm_id
-- Get firm_id from the related client if available
-- ================================================================

UPDATE vulnerability_register vr
SET firm_id = COALESCE(
  (SELECT c.firm_id FROM clients c WHERE c.id = vr.client_id),
  get_default_firm_id()
)
WHERE vr.firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % vulnerability_register with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 9: Backfill compliance_rules.firm_id
-- Global rules stay NULL, firm-specific rules get the default firm
-- (We'll leave NULL ones as global rules)
-- ================================================================

-- Only update rules that seem firm-specific (not global templates)
-- Skip this step if you want to keep existing NULL as global rules

-- ================================================================
-- STEP 10: Backfill client_services.firm_id
-- Get firm_id from the related client
-- ================================================================

UPDATE client_services cs
SET firm_id = COALESCE(
  (SELECT c.firm_id FROM clients c WHERE c.id = cs.client_id),
  get_default_firm_id()
)
WHERE cs.firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % client_services with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 11: Backfill notifications.firm_id
-- Get firm_id from the user's profile
-- ================================================================

UPDATE notifications n
SET firm_id = COALESCE(
  (SELECT p.firm_id FROM profiles p WHERE p.id = n.user_id),
  get_default_firm_id()
)
WHERE n.firm_id IS NULL;

DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % notifications with firm_id', count_updated;
END $$;

-- ================================================================
-- STEP 12: Update firm seat counts
-- Count active profiles per firm
-- ================================================================

UPDATE firms f
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{billing,currentSeats}',
  (
    SELECT COALESCE(COUNT(*)::text, '0')::jsonb
    FROM profiles p
    WHERE p.firm_id = f.id
  )
);

-- ================================================================
-- STEP 13: Verification - Check for any remaining NULL firm_ids
-- ================================================================

DO $$
DECLARE
  null_profiles INTEGER;
  null_clients INTEGER;
  null_file_reviews INTEGER;
  null_complaints INTEGER;
  null_breaches INTEGER;
  null_vulnerabilities INTEGER;
  null_client_services INTEGER;
  null_notifications INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_profiles FROM profiles WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_clients FROM clients WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_file_reviews FROM file_reviews WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_complaints FROM complaint_register WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_breaches FROM breach_register WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_vulnerabilities FROM vulnerability_register WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_client_services FROM client_services WHERE firm_id IS NULL;
  SELECT COUNT(*) INTO null_notifications FROM notifications WHERE firm_id IS NULL;

  RAISE NOTICE '=== Verification ===';
  RAISE NOTICE 'Profiles with NULL firm_id: %', null_profiles;
  RAISE NOTICE 'Clients with NULL firm_id: %', null_clients;
  RAISE NOTICE 'File reviews with NULL firm_id: %', null_file_reviews;
  RAISE NOTICE 'Complaints with NULL firm_id: %', null_complaints;
  RAISE NOTICE 'Breaches with NULL firm_id: %', null_breaches;
  RAISE NOTICE 'Vulnerabilities with NULL firm_id: %', null_vulnerabilities;
  RAISE NOTICE 'Client services with NULL firm_id: %', null_client_services;
  RAISE NOTICE 'Notifications with NULL firm_id: %', null_notifications;

  IF null_profiles > 0 OR null_clients > 0 THEN
    RAISE WARNING 'Some records still have NULL firm_id - review manually';
  ELSE
    RAISE NOTICE 'All critical tables have firm_id populated!';
  END IF;
END $$;

-- ================================================================
-- STEP 14: Clean up the helper function
-- ================================================================

DROP FUNCTION IF EXISTS get_default_firm_id();

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- After running this migration:
-- 1. All existing data should have firm_id populated
-- 2. RLS policies will now filter data correctly
-- 3. Users can only see data from their own firm

COMMIT;
