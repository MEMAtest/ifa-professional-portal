-- ================================================================
-- TARGETED FIX: Missing tables and columns
-- Run this in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- 1. CREATE COMMUNICATIONS TABLE (currently doesn't exist)
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
-- 2. ADD MISSING COLUMNS TO DOCUMENTS TABLE
-- ================================================================
-- Add name column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS name TEXT;

-- Add status column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Add document_type column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT;

-- ================================================================
-- 3. CREATE VULNERABILITY_ASSESSMENTS TABLE (if not exists)
-- ================================================================
CREATE TABLE IF NOT EXISTS vulnerability_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  is_vulnerable BOOLEAN DEFAULT false,
  vulnerability_factors JSONB DEFAULT '[]',
  health_factors JSONB DEFAULT '{}',
  life_events_factors JSONB DEFAULT '{}',
  resilience_factors JSONB DEFAULT '{}',
  capability_factors JSONB DEFAULT '{}',
  overall_risk_level TEXT CHECK (overall_risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  support_measures JSONB DEFAULT '[]',
  notes TEXT,
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
-- 4. CREATE CONSUMER_DUTY_ASSESSMENTS TABLE (if not exists)
-- ================================================================
CREATE TABLE IF NOT EXISTS consumer_duty_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  products_services_score INTEGER DEFAULT 0,
  products_services_status TEXT DEFAULT 'not_assessed',
  price_value_score INTEGER DEFAULT 0,
  price_value_status TEXT DEFAULT 'not_assessed',
  consumer_understanding_score INTEGER DEFAULT 0,
  consumer_understanding_status TEXT DEFAULT 'not_assessed',
  consumer_support_score INTEGER DEFAULT 0,
  consumer_support_status TEXT DEFAULT 'not_assessed',
  answers JSONB DEFAULT '{}',
  overall_score INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'not_assessed',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
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
-- 5. ADD MISSING COLUMNS TO CONSUMER_DUTY_STATUS TABLE
-- ================================================================
ALTER TABLE consumer_duty_status ADD COLUMN IF NOT EXISTS assessment_data JSONB DEFAULT '{}';
ALTER TABLE consumer_duty_status ADD COLUMN IF NOT EXISTS assessed_by UUID;
ALTER TABLE consumer_duty_status ADD COLUMN IF NOT EXISTS last_assessment_date TIMESTAMPTZ;

-- ================================================================
-- DONE
-- ================================================================
SELECT 'All fixes applied successfully!' AS status;
