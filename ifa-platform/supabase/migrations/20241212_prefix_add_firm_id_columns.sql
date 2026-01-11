-- ================================================================
-- PRE-FIX: Add missing firm_id columns to existing tables
-- This runs before other migrations to ensure columns exist
-- ================================================================

-- Add firm_id to aml_client_status if table exists but column doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aml_client_status')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aml_client_status' AND column_name = 'firm_id') THEN
        ALTER TABLE aml_client_status ADD COLUMN firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    END IF;
END $$;
