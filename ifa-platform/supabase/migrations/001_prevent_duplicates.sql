-- Migration: Add duplicate prevention to suitability_assessments
-- Date: 2024-09-02

BEGIN;

-- Step 1: Add is_active column to track current assessment
ALTER TABLE suitability_assessments
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Ensure all existing records are marked as active
UPDATE suitability_assessments 
SET is_active = true 
WHERE is_active IS NULL;

-- Step 3: Create unique constraint to prevent multiple active assessments
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_assessment_per_client 
ON suitability_assessments(client_id) 
WHERE is_active = true;

-- Step 4: Add created_by and updated_by for audit trail
ALTER TABLE suitability_assessments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Step 5: Add check constraint to ensure data integrity
ALTER TABLE suitability_assessments
ADD CONSTRAINT check_completion_percentage CHECK (
  completion_percentage >= 0 AND completion_percentage <= 100
);

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS idx_suitability_active_client 
ON suitability_assessments(client_id, is_active, updated_at DESC);

COMMIT;