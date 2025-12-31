-- ================================================================
-- QUICK VERIFICATION: Check if tables were created
-- Run this in Supabase SQL Editor first
-- ================================================================

-- Check which of our required tables exist
SELECT
  table_name,
  'EXISTS ✓' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'client_services',
  'communications',
  'consumer_duty_assessments',
  'vulnerability_assessments',
  'documents'
)
ORDER BY table_name;

-- Check documents table columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
AND column_name IN ('client_id', 'document_type', 'name', 'status')
ORDER BY column_name;

-- If you see results above, tables exist. If empty, they don't exist yet.
