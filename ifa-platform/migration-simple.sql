-- SIMPLE MIGRATION - Run each section separately if needed
-- Copy and paste into Supabase SQL Editor

-- ============================================
-- STEP 1: Create communications table
-- ============================================
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID,
  type TEXT DEFAULT 'note',
  subject TEXT,
  content TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER,
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  status TEXT DEFAULT 'completed',
  attachments JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_communications" ON communications FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 2: Add status column to documents
-- ============================================
ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'draft';

-- ============================================
-- STEP 3: Create vulnerability_assessments table
-- ============================================
CREATE TABLE vulnerability_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID,
  is_vulnerable BOOLEAN DEFAULT false,
  vulnerability_factors JSONB DEFAULT '[]',
  health_factors JSONB DEFAULT '{}',
  life_events_factors JSONB DEFAULT '{}',
  resilience_factors JSONB DEFAULT '{}',
  capability_factors JSONB DEFAULT '{}',
  overall_risk_level TEXT DEFAULT 'low',
  support_measures JSONB DEFAULT '[]',
  notes TEXT,
  assessed_by UUID,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vulnerability_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_vuln" ON vulnerability_assessments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 4: Create consumer_duty_assessments table
-- ============================================
CREATE TABLE consumer_duty_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID,
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
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  assessed_by UUID,
  assessed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consumer_duty_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cd" ON consumer_duty_assessments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DONE
-- ============================================
SELECT 'Migration complete!' as result;
