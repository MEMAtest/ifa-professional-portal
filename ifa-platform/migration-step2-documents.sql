-- STEP 2: Add status column to documents table

ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'draft';

SELECT 'Documents status column added!' as result;
