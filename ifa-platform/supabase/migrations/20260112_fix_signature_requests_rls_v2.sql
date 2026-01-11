-- ================================================================
-- FIX SIGNATURE REQUESTS RLS POLICY v2
-- Issue: Previous INSERT policy had OR EXISTS clause that allowed bypass
-- Fix: Simplified to JWT-only check, added complete RLS policies
-- ================================================================

-- Step 1: Drop all existing signature_requests policies
DROP POLICY IF EXISTS "Users can create signature requests" ON signature_requests;
DROP POLICY IF EXISTS "Users can create signature requests in their firm" ON signature_requests;
DROP POLICY IF EXISTS "Users can delete their own signature requests" ON signature_requests;
DROP POLICY IF EXISTS "Users can delete signature requests in their firm" ON signature_requests;
DROP POLICY IF EXISTS "Users can view signature requests in their firm" ON signature_requests;
DROP POLICY IF EXISTS "Users can update signature requests in their firm" ON signature_requests;

-- Step 2: Create proper RLS policies (JWT only - no OR clause)

-- SELECT policy
CREATE POLICY "Users can view signature requests in their firm" ON signature_requests
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- INSERT policy (SECURITY: Only allow inserts where firm_id matches JWT claim)
CREATE POLICY "Users can create signature requests in their firm" ON signature_requests
    FOR INSERT WITH CHECK (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- UPDATE policy
CREATE POLICY "Users can update signature requests in their firm" ON signature_requests
    FOR UPDATE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- DELETE policy
CREATE POLICY "Users can delete signature requests in their firm" ON signature_requests
    FOR DELETE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- Step 3: Add NOT NULL constraint to firm_id (prevents inserts without firm_id)
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

-- Step 4: Ensure RLS is enabled
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
