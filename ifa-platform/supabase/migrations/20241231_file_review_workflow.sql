-- ================================================================
-- Migration: File Review Maker/Checker Workflow Enhancement
-- Date: 2024-12-31
-- Description: Add columns to track adviser (maker) and reviewer (checker)
--              completion timestamps for four-eyes check workflow
-- ================================================================

-- Add workflow tracking columns to file_reviews
ALTER TABLE file_reviews
ADD COLUMN IF NOT EXISTS adviser_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewer_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS adviser_name TEXT,
ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Create index for workflow queries
CREATE INDEX IF NOT EXISTS idx_file_reviews_adviser_submitted ON file_reviews(adviser_submitted_at);
CREATE INDEX IF NOT EXISTS idx_file_reviews_reviewer_completed ON file_reviews(reviewer_completed_at);

-- Add comment explaining the workflow columns
COMMENT ON COLUMN file_reviews.adviser_submitted_at IS 'Timestamp when adviser submitted the case for review';
COMMENT ON COLUMN file_reviews.reviewer_started_at IS 'Timestamp when reviewer started their review';
COMMENT ON COLUMN file_reviews.reviewer_completed_at IS 'Timestamp when reviewer completed (approved/rejected/escalated)';
COMMENT ON COLUMN file_reviews.adviser_name IS 'Name of the adviser who submitted the case';
COMMENT ON COLUMN file_reviews.reviewer_name IS 'Name of the reviewer who completed the check';

-- ================================================================
-- Migration Complete
-- ================================================================
