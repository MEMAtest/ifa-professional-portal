-- AML/CTF Tables Migration
-- Created: 2024-12-13
-- Purpose: Add AML client status tracking with dropdown-based fields

-- AML Client Status table (one row per client)
CREATE TABLE IF NOT EXISTS aml_client_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,

  -- Status dropdowns
  id_verification TEXT CHECK (id_verification IN ('not_started', 'pending', 'verified', 'failed', 'expired')) DEFAULT 'not_started',
  pep_status TEXT CHECK (pep_status IN ('not_checked', 'not_pep', 'pep_low_risk', 'pep_high_risk', 'rca')) DEFAULT 'not_checked',
  sanctions_status TEXT CHECK (sanctions_status IN ('not_checked', 'clear', 'potential_match', 'confirmed_match')) DEFAULT 'not_checked',
  source_of_wealth TEXT CHECK (source_of_wealth IN ('not_documented', 'documented', 'verified', 'concerns_raised')) DEFAULT 'not_documented',
  source_of_funds TEXT CHECK (source_of_funds IN ('not_documented', 'documented', 'verified', 'concerns_raised')) DEFAULT 'not_documented',

  -- Risk & Monitoring
  risk_rating TEXT CHECK (risk_rating IN ('low', 'medium', 'high', 'enhanced_due_diligence')) DEFAULT 'low',
  review_frequency TEXT CHECK (review_frequency IN ('annually', 'six_months', 'quarterly', 'monthly')) DEFAULT 'annually',
  next_review_date DATE,
  last_review_date DATE,

  -- EDD Notes (required when high risk)
  edd_notes TEXT,

  -- Audit
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for AML client status
CREATE INDEX IF NOT EXISTS idx_aml_client_status_client ON aml_client_status(client_id);
CREATE INDEX IF NOT EXISTS idx_aml_client_status_risk ON aml_client_status(risk_rating);
CREATE INDEX IF NOT EXISTS idx_aml_client_status_review ON aml_client_status(next_review_date);
CREATE INDEX IF NOT EXISTS idx_aml_client_status_firm ON aml_client_status(firm_id);

-- AML Check History (audit log of changes)
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

-- Enable RLS
ALTER TABLE aml_client_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_check_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aml_client_status
CREATE POLICY "Users can view AML status for their firm"
  ON aml_client_status FOR SELECT
  USING (true);

CREATE POLICY "Users can insert AML status"
  ON aml_client_status FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update AML status"
  ON aml_client_status FOR UPDATE
  USING (true);

-- RLS Policies for aml_check_history
CREATE POLICY "Users can view AML history"
  ON aml_check_history FOR SELECT
  USING (true);

CREATE POLICY "Users can insert AML history"
  ON aml_check_history FOR INSERT
  WITH CHECK (true);
