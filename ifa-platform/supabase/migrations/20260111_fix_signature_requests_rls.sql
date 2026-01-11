-- ================================================================
-- FIX SIGNATURE REQUESTS RLS POLICY
-- Issue: Line 111 of 20241228_opensign_signature_integration.sql has
--        "FOR INSERT WITH CHECK (true)" which is permissive
-- Fix: Add firm_id column and proper RLS check
-- ================================================================

-- Step 1: Add firm_id column to signature_requests if not exists
ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);

-- Step 2: Backfill firm_id from profiles (skipped - no direct user reference)
-- The trigger will set firm_id for new records going forward
-- For existing records without firm_id, set to the first firm (if any)
UPDATE signature_requests sr
SET firm_id = (SELECT id FROM firms ORDER BY created_at LIMIT 1)
WHERE sr.firm_id IS NULL;

-- Step 3: Create index for firm_id lookups
CREATE INDEX IF NOT EXISTS idx_signature_requests_firm_id
ON signature_requests(firm_id);

-- Step 4: Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Users can create signature requests" ON signature_requests;

-- Step 5: Create proper INSERT policy with firm_id check (JWT only - no OR clause)
-- SECURITY: Only allow inserts where firm_id matches the user's JWT claim
CREATE POLICY "Users can create signature requests in their firm" ON signature_requests
    FOR INSERT WITH CHECK (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- Step 6: Update DELETE policy to include firm check (JWT only)
DROP POLICY IF EXISTS "Users can delete their own signature requests" ON signature_requests;
CREATE POLICY "Users can delete signature requests in their firm" ON signature_requests
    FOR DELETE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- Step 6b: Add SELECT policy for reading signature requests
DROP POLICY IF EXISTS "Users can view signature requests in their firm" ON signature_requests;
CREATE POLICY "Users can view signature requests in their firm" ON signature_requests
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- Step 6c: Add UPDATE policy for updating signature requests
DROP POLICY IF EXISTS "Users can update signature requests in their firm" ON signature_requests;
CREATE POLICY "Users can update signature requests in their firm" ON signature_requests
    FOR UPDATE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- Step 7: Create trigger to auto-set firm_id on insert
CREATE OR REPLACE FUNCTION set_signature_request_firm_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If firm_id not set, try to get it from the user's profile
    IF NEW.firm_id IS NULL THEN
        SELECT firm_id INTO NEW.firm_id
        FROM profiles
        WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_signature_request_firm_id ON signature_requests;
CREATE TRIGGER trigger_set_signature_request_firm_id
    BEFORE INSERT ON signature_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_signature_request_firm_id();

COMMENT ON COLUMN signature_requests.firm_id IS 'Firm ID for multi-tenant isolation';

-- Step 8: Add NOT NULL constraint to firm_id (after backfill ensures all records have firm_id)
-- This prevents future inserts without firm_id
DO $$
BEGIN
    -- Only add constraint if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'signature_requests'
        AND column_name = 'firm_id'
        AND is_nullable = 'NO'
    ) THEN
        -- First verify no NULL values exist
        IF NOT EXISTS (SELECT 1 FROM signature_requests WHERE firm_id IS NULL) THEN
            ALTER TABLE signature_requests ALTER COLUMN firm_id SET NOT NULL;
        ELSE
            RAISE NOTICE 'Cannot add NOT NULL constraint: some signature_requests have NULL firm_id';
        END IF;
    END IF;
END $$;
