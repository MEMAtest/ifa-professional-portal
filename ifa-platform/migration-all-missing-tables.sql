-- ================================================================
-- COMPREHENSIVE DATABASE MIGRATION
-- Run this in Supabase SQL Editor to fix all missing tables
-- https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql/new
-- ================================================================

-- ================================================================
-- 1. CLIENT_SERVICES TABLE (fixes 406 errors)
-- ================================================================
CREATE TABLE IF NOT EXISTS client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  services_selected JSONB DEFAULT '[]',
  target_market_checks JSONB DEFAULT '{}',
  suitability_justification TEXT,
  platform_selected TEXT,
  platform_justification JSONB DEFAULT '{}',
  decumulation_strategy TEXT CHECK (decumulation_strategy IN ('ad_hoc', 'regular', 'natural_yield', 'hybrid')),
  decumulation_justification TEXT,
  sustainability_assessment JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firm_id, client_id)
);

ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_services_select" ON client_services;
DROP POLICY IF EXISTS "client_services_insert" ON client_services;
DROP POLICY IF EXISTS "client_services_update" ON client_services;
DROP POLICY IF EXISTS "client_services_delete" ON client_services;
CREATE POLICY "client_services_select" ON client_services FOR SELECT USING (true);
CREATE POLICY "client_services_insert" ON client_services FOR INSERT WITH CHECK (true);
CREATE POLICY "client_services_update" ON client_services FOR UPDATE USING (true);
CREATE POLICY "client_services_delete" ON client_services FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_firm_id ON client_services(firm_id);

-- ================================================================
-- 2. COMMUNICATIONS TABLE (fixes 404 errors)
-- ================================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('email', 'call', 'meeting', 'note', 'letter', 'other')) DEFAULT 'note',
  subject TEXT,
  content TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER,
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
  attachments JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "communications_select" ON communications;
DROP POLICY IF EXISTS "communications_insert" ON communications;
DROP POLICY IF EXISTS "communications_update" ON communications;
DROP POLICY IF EXISTS "communications_delete" ON communications;
CREATE POLICY "communications_select" ON communications FOR SELECT USING (true);
CREATE POLICY "communications_insert" ON communications FOR INSERT WITH CHECK (true);
CREATE POLICY "communications_update" ON communications FOR UPDATE USING (true);
CREATE POLICY "communications_delete" ON communications FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_communications_client_id ON communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_date ON communications(date DESC);

-- ================================================================
-- 3. FIX DOCUMENTS TABLE (add missing columns if needed)
-- ================================================================
-- Add client_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
  END IF;
END $$;

-- Add document_type if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN document_type TEXT;
  END IF;
END $$;

-- Add name if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'name'
  ) THEN
    ALTER TABLE documents ADD COLUMN name TEXT;
  END IF;
END $$;

-- Add status if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'status'
  ) THEN
    ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'draft';
  END IF;
END $$;

-- ================================================================
-- 4. CONSUMER_DUTY_ASSESSMENTS TABLE (for full assessment storage)
-- ================================================================
CREATE TABLE IF NOT EXISTS consumer_duty_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,

  -- Individual outcome scores
  products_services_score INTEGER DEFAULT 0,
  products_services_status TEXT DEFAULT 'not_assessed',
  price_value_score INTEGER DEFAULT 0,
  price_value_status TEXT DEFAULT 'not_assessed',
  consumer_understanding_score INTEGER DEFAULT 0,
  consumer_understanding_status TEXT DEFAULT 'not_assessed',
  consumer_support_score INTEGER DEFAULT 0,
  consumer_support_status TEXT DEFAULT 'not_assessed',

  -- Full assessment data
  answers JSONB DEFAULT '{}',
  overall_score INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'not_assessed',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- Audit trail
  version INTEGER DEFAULT 1,
  assessed_by UUID,
  assessed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consumer_duty_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cd_assessments_select" ON consumer_duty_assessments;
DROP POLICY IF EXISTS "cd_assessments_insert" ON consumer_duty_assessments;
DROP POLICY IF EXISTS "cd_assessments_update" ON consumer_duty_assessments;
DROP POLICY IF EXISTS "cd_assessments_delete" ON consumer_duty_assessments;
CREATE POLICY "cd_assessments_select" ON consumer_duty_assessments FOR SELECT USING (true);
CREATE POLICY "cd_assessments_insert" ON consumer_duty_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "cd_assessments_update" ON consumer_duty_assessments FOR UPDATE USING (true);
CREATE POLICY "cd_assessments_delete" ON consumer_duty_assessments FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_cd_assessments_client ON consumer_duty_assessments(client_id);

-- ================================================================
-- 5. FIX CONSUMER_DUTY_STATUS TABLE (add assessment_data if missing)
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consumer_duty_status' AND column_name = 'assessment_data'
  ) THEN
    ALTER TABLE consumer_duty_status ADD COLUMN assessment_data JSONB DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consumer_duty_status' AND column_name = 'assessed_by'
  ) THEN
    ALTER TABLE consumer_duty_status ADD COLUMN assessed_by UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consumer_duty_status' AND column_name = 'last_assessment_date'
  ) THEN
    ALTER TABLE consumer_duty_status ADD COLUMN last_assessment_date TIMESTAMPTZ;
  END IF;
END $$;

-- ================================================================
-- 6. VULNERABILITY_ASSESSMENTS TABLE (for vulnerability wizard)
-- ================================================================
CREATE TABLE IF NOT EXISTS vulnerability_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,

  -- Vulnerability factors
  is_vulnerable BOOLEAN DEFAULT false,
  vulnerability_factors JSONB DEFAULT '[]',
  health_factors JSONB DEFAULT '{}',
  life_events_factors JSONB DEFAULT '{}',
  resilience_factors JSONB DEFAULT '{}',
  capability_factors JSONB DEFAULT '{}',

  -- Assessment details
  overall_risk_level TEXT CHECK (overall_risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  support_measures JSONB DEFAULT '[]',
  notes TEXT,

  -- Audit trail
  assessed_by UUID,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  review_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vulnerability_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vuln_assessments_select" ON vulnerability_assessments;
DROP POLICY IF EXISTS "vuln_assessments_insert" ON vulnerability_assessments;
DROP POLICY IF EXISTS "vuln_assessments_update" ON vulnerability_assessments;
DROP POLICY IF EXISTS "vuln_assessments_delete" ON vulnerability_assessments;
CREATE POLICY "vuln_assessments_select" ON vulnerability_assessments FOR SELECT USING (true);
CREATE POLICY "vuln_assessments_insert" ON vulnerability_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "vuln_assessments_update" ON vulnerability_assessments FOR UPDATE USING (true);
CREATE POLICY "vuln_assessments_delete" ON vulnerability_assessments FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_vuln_assessments_client ON vulnerability_assessments(client_id);

-- ================================================================
-- DONE
-- ================================================================
SELECT 'All migrations completed successfully!' AS status;
