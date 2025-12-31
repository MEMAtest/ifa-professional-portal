-- ================================================================
-- MISSING TABLES MIGRATION - December 2025
-- Run this in Supabase SQL Editor to fix 406 errors
-- https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql/new
-- ================================================================

-- 1. CLIENT SERVICES TABLE (for Services & Products tab)
-- ================================================================
CREATE TABLE IF NOT EXISTS client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  services_selected JSONB DEFAULT '[]',
  target_market_checks JSONB DEFAULT '{}',
  suitability_justification TEXT,
  platform_selected TEXT,
  platform_justification JSONB DEFAULT '{}',
  decumulation_strategy TEXT CHECK (decumulation_strategy IS NULL OR decumulation_strategy IN ('ad_hoc', 'regular', 'natural_yield', 'hybrid')),
  decumulation_justification TEXT,
  sustainability_assessment JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_services_select" ON client_services;
  DROP POLICY IF EXISTS "client_services_insert" ON client_services;
  DROP POLICY IF EXISTS "client_services_update" ON client_services;
  DROP POLICY IF EXISTS "client_services_delete" ON client_services;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "client_services_select" ON client_services FOR SELECT USING (true);
CREATE POLICY "client_services_insert" ON client_services FOR INSERT WITH CHECK (true);
CREATE POLICY "client_services_update" ON client_services FOR UPDATE USING (true);
CREATE POLICY "client_services_delete" ON client_services FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON client_services(client_id);


-- 2. CLIENT WORKFLOWS TABLE (for workflow tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS client_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  workflow_status TEXT DEFAULT 'in_progress' CHECK (workflow_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'updated')),
  workflow_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_workflows_select" ON client_workflows;
  DROP POLICY IF EXISTS "client_workflows_insert" ON client_workflows;
  DROP POLICY IF EXISTS "client_workflows_update" ON client_workflows;
  DROP POLICY IF EXISTS "client_workflows_delete" ON client_workflows;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "client_workflows_select" ON client_workflows FOR SELECT USING (true);
CREATE POLICY "client_workflows_insert" ON client_workflows FOR INSERT WITH CHECK (true);
CREATE POLICY "client_workflows_update" ON client_workflows FOR UPDATE USING (true);
CREATE POLICY "client_workflows_delete" ON client_workflows FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_workflows_client_id ON client_workflows(client_id);
CREATE INDEX IF NOT EXISTS idx_client_workflows_status ON client_workflows(workflow_status);


-- 3. CONSUMER DUTY ASSESSMENTS TABLE (for Consumer Duty feature)
-- ================================================================
CREATE TABLE IF NOT EXISTS consumer_duty_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,

  -- Outcome scores and statuses
  products_services_score INTEGER DEFAULT 0,
  products_services_status TEXT DEFAULT 'not_assessed',
  price_value_score INTEGER DEFAULT 0,
  price_value_status TEXT DEFAULT 'not_assessed',
  consumer_understanding_score INTEGER DEFAULT 0,
  consumer_understanding_status TEXT DEFAULT 'not_assessed',
  consumer_support_score INTEGER DEFAULT 0,
  consumer_support_status TEXT DEFAULT 'not_assessed',

  -- Overall
  overall_score INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'not_assessed',

  -- Assessment details
  answers JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- Audit
  assessed_by UUID,
  assessed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consumer_duty_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "consumer_duty_assessments_select" ON consumer_duty_assessments;
  DROP POLICY IF EXISTS "consumer_duty_assessments_insert" ON consumer_duty_assessments;
  DROP POLICY IF EXISTS "consumer_duty_assessments_update" ON consumer_duty_assessments;
  DROP POLICY IF EXISTS "consumer_duty_assessments_delete" ON consumer_duty_assessments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "consumer_duty_assessments_select" ON consumer_duty_assessments FOR SELECT USING (true);
CREATE POLICY "consumer_duty_assessments_insert" ON consumer_duty_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "consumer_duty_assessments_update" ON consumer_duty_assessments FOR UPDATE USING (true);
CREATE POLICY "consumer_duty_assessments_delete" ON consumer_duty_assessments FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consumer_duty_assessments_client_id ON consumer_duty_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_consumer_duty_assessments_status ON consumer_duty_assessments(status);


-- 4. CONSUMER DUTY STATUS TABLE (simplified status tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS consumer_duty_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,

  -- Status per outcome
  products_services_status TEXT DEFAULT 'not_assessed',
  price_value_status TEXT DEFAULT 'not_assessed',
  consumer_understanding_status TEXT DEFAULT 'not_assessed',
  consumer_support_status TEXT DEFAULT 'not_assessed',
  overall_status TEXT DEFAULT 'not_assessed',

  -- Assessment data
  assessment_data JSONB DEFAULT '{}',
  last_assessment_date TIMESTAMPTZ,
  assessed_by UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consumer_duty_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "consumer_duty_status_select" ON consumer_duty_status;
  DROP POLICY IF EXISTS "consumer_duty_status_insert" ON consumer_duty_status;
  DROP POLICY IF EXISTS "consumer_duty_status_update" ON consumer_duty_status;
  DROP POLICY IF EXISTS "consumer_duty_status_delete" ON consumer_duty_status;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "consumer_duty_status_select" ON consumer_duty_status FOR SELECT USING (true);
CREATE POLICY "consumer_duty_status_insert" ON consumer_duty_status FOR INSERT WITH CHECK (true);
CREATE POLICY "consumer_duty_status_update" ON consumer_duty_status FOR UPDATE USING (true);
CREATE POLICY "consumer_duty_status_delete" ON consumer_duty_status FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consumer_duty_status_client_id ON consumer_duty_status(client_id);


-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
SELECT 'Tables created successfully!' AS status;

-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('client_services', 'client_workflows', 'consumer_duty_assessments', 'consumer_duty_status')
ORDER BY table_name;
