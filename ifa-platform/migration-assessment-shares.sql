-- Migration: Create assessment_shares table for client assessment sharing
-- This enables clients to complete ATR, CFL, and Investor Persona assessments via secure links

CREATE TABLE IF NOT EXISTS assessment_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('atr', 'cfl', 'investor_persona')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id UUID,
  firm_id UUID,
  client_email VARCHAR(255),
  client_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'started', 'completed', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  response_data JSONB,
  access_count INTEGER DEFAULT 0,
  max_access_count INTEGER DEFAULT 10,
  password_hash VARCHAR(255),
  custom_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_shares_token ON assessment_shares(token);
CREATE INDEX IF NOT EXISTS idx_assessment_shares_client ON assessment_shares(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_shares_advisor ON assessment_shares(advisor_id);
CREATE INDEX IF NOT EXISTS idx_assessment_shares_status ON assessment_shares(status);
CREATE INDEX IF NOT EXISTS idx_assessment_shares_expires ON assessment_shares(expires_at);

-- RLS Policies
ALTER TABLE assessment_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "shares_select" ON assessment_shares;
DROP POLICY IF EXISTS "shares_insert" ON assessment_shares;
DROP POLICY IF EXISTS "shares_update" ON assessment_shares;
DROP POLICY IF EXISTS "shares_delete" ON assessment_shares;

-- Create permissive policies
CREATE POLICY "shares_select" ON assessment_shares FOR SELECT USING (true);
CREATE POLICY "shares_insert" ON assessment_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "shares_update" ON assessment_shares FOR UPDATE USING (true);
CREATE POLICY "shares_delete" ON assessment_shares FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON assessment_shares TO anon;
GRANT ALL ON assessment_shares TO authenticated;

SELECT 'assessment_shares table created successfully!' as status;
