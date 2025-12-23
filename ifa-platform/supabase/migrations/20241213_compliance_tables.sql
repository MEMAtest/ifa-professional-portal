-- =====================================================
-- COMPLIANCE TABLES MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. AML/CTF CLIENT STATUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS aml_client_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  
  -- Status dropdowns
  id_verification TEXT DEFAULT 'not_started' 
    CHECK (id_verification IN ('not_started', 'pending', 'verified', 'failed', 'expired')),
  pep_status TEXT DEFAULT 'not_checked'
    CHECK (pep_status IN ('not_checked', 'not_pep', 'pep_low_risk', 'pep_high_risk', 'rca')),
  sanctions_status TEXT DEFAULT 'not_checked'
    CHECK (sanctions_status IN ('not_checked', 'clear', 'potential_match', 'confirmed_match')),
  source_of_wealth TEXT DEFAULT 'not_documented'
    CHECK (source_of_wealth IN ('not_documented', 'documented', 'verified', 'concerns_raised')),
  source_of_funds TEXT DEFAULT 'not_documented'
    CHECK (source_of_funds IN ('not_documented', 'documented', 'verified', 'concerns_raised')),
  
  -- Risk & Monitoring
  risk_rating TEXT DEFAULT 'low'
    CHECK (risk_rating IN ('low', 'medium', 'high', 'enhanced_due_diligence')),
  review_frequency TEXT DEFAULT 'annually'
    CHECK (review_frequency IN ('annually', 'six_months', 'quarterly', 'monthly')),
  next_review_date DATE,
  last_review_date DATE,
  
  -- EDD Notes
  edd_notes TEXT,
  
  -- Audit
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for AML
CREATE INDEX IF NOT EXISTS idx_aml_client_status_client ON aml_client_status(client_id);
CREATE INDEX IF NOT EXISTS idx_aml_client_status_risk ON aml_client_status(risk_rating);
CREATE INDEX IF NOT EXISTS idx_aml_client_status_review ON aml_client_status(next_review_date);

-- =====================================================
-- 2. AML CHECK HISTORY (AUDIT LOG)
-- =====================================================

CREATE TABLE IF NOT EXISTS aml_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aml_client_status_id UUID REFERENCES aml_client_status(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aml_history_status ON aml_check_history(aml_client_status_id);
CREATE INDEX IF NOT EXISTS idx_aml_history_date ON aml_check_history(changed_at);

-- =====================================================
-- 3. CONSUMER DUTY STATUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS consumer_duty_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  
  -- Products & Services Outcome
  products_services_status TEXT DEFAULT 'not_assessed'
    CHECK (products_services_status IN ('not_assessed', 'compliant', 'partially_compliant', 'non_compliant', 'under_review')),
  products_services_evidence TEXT,
  products_services_last_review DATE,
  
  -- Price & Value Outcome  
  price_value_status TEXT DEFAULT 'not_assessed'
    CHECK (price_value_status IN ('not_assessed', 'compliant', 'partially_compliant', 'non_compliant', 'under_review')),
  price_value_evidence TEXT,
  price_value_last_review DATE,
  
  -- Consumer Understanding Outcome
  consumer_understanding_status TEXT DEFAULT 'not_assessed'
    CHECK (consumer_understanding_status IN ('not_assessed', 'compliant', 'partially_compliant', 'non_compliant', 'under_review')),
  consumer_understanding_evidence TEXT,
  consumer_understanding_last_review DATE,
  
  -- Consumer Support Outcome
  consumer_support_status TEXT DEFAULT 'not_assessed'
    CHECK (consumer_support_status IN ('not_assessed', 'compliant', 'partially_compliant', 'non_compliant', 'under_review')),
  consumer_support_evidence TEXT,
  consumer_support_last_review DATE,
  
  -- Overall Status
  overall_status TEXT DEFAULT 'not_assessed'
    CHECK (overall_status IN ('not_assessed', 'fully_compliant', 'mostly_compliant', 'needs_attention', 'non_compliant')),
  next_review_date DATE,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Consumer Duty
CREATE INDEX IF NOT EXISTS idx_consumer_duty_client ON consumer_duty_status(client_id);
CREATE INDEX IF NOT EXISTS idx_consumer_duty_overall ON consumer_duty_status(overall_status);
CREATE INDEX IF NOT EXISTS idx_consumer_duty_review ON consumer_duty_status(next_review_date);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE aml_client_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_check_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_duty_status ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES (Allow all for simplicity)
-- =====================================================

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Allow all aml_client_status" ON aml_client_status;
DROP POLICY IF EXISTS "Allow all aml_check_history" ON aml_check_history;
DROP POLICY IF EXISTS "Allow all consumer_duty_status" ON consumer_duty_status;

-- Create policies
CREATE POLICY "Allow all aml_client_status" ON aml_client_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all aml_check_history" ON aml_check_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all consumer_duty_status" ON consumer_duty_status FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
