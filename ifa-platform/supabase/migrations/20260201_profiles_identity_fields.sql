-- ================================================================
-- Profiles Identity Fields
-- Migration: 20260201_profiles_identity_fields.sql
-- Adds email/full_name to profiles for API joins
-- ================================================================

-- Add missing columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Backfill email from auth.users (if available)
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- Backfill full_name from first/last name
UPDATE profiles
SET full_name = NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), '')
WHERE full_name IS NULL OR full_name = '';

-- Optional index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ================================================================
-- End migration
-- ================================================================
