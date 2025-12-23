-- =====================================================
-- Migration: Add is_current enforcement trigger
-- Date: 2024-12-17
-- Purpose: Ensure only one assessment per client can be current
-- =====================================================

BEGIN;

-- =====================================================
-- SUITABILITY ASSESSMENTS - Single is_current per client
-- =====================================================

-- Function to enforce single is_current per client
CREATE OR REPLACE FUNCTION enforce_single_current_suitability()
RETURNS TRIGGER AS $$
BEGIN
  -- When setting a new assessment as current, unset all others for this client
  IF NEW.is_current = true THEN
    UPDATE suitability_assessments
    SET is_current = false, updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_single_current_suitability ON suitability_assessments;

-- Create trigger
CREATE TRIGGER trg_single_current_suitability
BEFORE INSERT OR UPDATE OF is_current ON suitability_assessments
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION enforce_single_current_suitability();

-- =====================================================
-- ATR ASSESSMENTS - Single current per client
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_single_current_atr()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true OR (TG_OP = 'INSERT' AND NEW.is_current IS NULL) THEN
    -- Set new record as current
    NEW.is_current := true;
    -- Unset all others
    UPDATE atr_assessments
    SET is_current = false, updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_current_atr ON atr_assessments;

CREATE TRIGGER trg_single_current_atr
BEFORE INSERT OR UPDATE OF is_current ON atr_assessments
FOR EACH ROW
EXECUTE FUNCTION enforce_single_current_atr();

-- =====================================================
-- CFL ASSESSMENTS - Single current per client
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_single_current_cfl()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true OR (TG_OP = 'INSERT' AND NEW.is_current IS NULL) THEN
    NEW.is_current := true;
    UPDATE cfl_assessments
    SET is_current = false, updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_current_cfl ON cfl_assessments;

CREATE TRIGGER trg_single_current_cfl
BEFORE INSERT OR UPDATE OF is_current ON cfl_assessments
FOR EACH ROW
EXECUTE FUNCTION enforce_single_current_cfl();

-- =====================================================
-- INVESTOR PERSONA ASSESSMENTS - Single current per client
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_single_current_persona()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true OR (TG_OP = 'INSERT' AND NEW.is_current IS NULL) THEN
    NEW.is_current := true;
    UPDATE investor_persona_assessments
    SET is_current = false, updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_current_persona ON investor_persona_assessments;

CREATE TRIGGER trg_single_current_persona
BEFORE INSERT OR UPDATE OF is_current ON investor_persona_assessments
FOR EACH ROW
EXECUTE FUNCTION enforce_single_current_persona();

-- =====================================================
-- Add is_current column if missing
-- =====================================================

-- For atr_assessments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'atr_assessments' AND column_name = 'is_current'
  ) THEN
    ALTER TABLE atr_assessments ADD COLUMN is_current BOOLEAN DEFAULT true;
  END IF;
END $$;

-- For cfl_assessments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cfl_assessments' AND column_name = 'is_current'
  ) THEN
    ALTER TABLE cfl_assessments ADD COLUMN is_current BOOLEAN DEFAULT true;
  END IF;
END $$;

-- For investor_persona_assessments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_persona_assessments' AND column_name = 'is_current'
  ) THEN
    ALTER TABLE investor_persona_assessments ADD COLUMN is_current BOOLEAN DEFAULT true;
  END IF;
END $$;

COMMIT;
