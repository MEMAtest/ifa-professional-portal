-- Migration: Add breach_affected_clients junction table
-- Purpose: Link breaches to individual affected clients
-- Date: December 2025

-- ================================================================
-- BREACH AFFECTED CLIENTS JUNCTION TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS breach_affected_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_id UUID NOT NULL REFERENCES breach_register(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  impact_description TEXT,
  notified BOOLEAN DEFAULT false,
  notified_date TIMESTAMPTZ,
  remediation_status TEXT DEFAULT 'pending' CHECK (remediation_status IN ('pending', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(breach_id, client_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_breach_affected_clients_breach ON breach_affected_clients(breach_id);
CREATE INDEX IF NOT EXISTS idx_breach_affected_clients_client ON breach_affected_clients(client_id);

-- Enable RLS
ALTER TABLE breach_affected_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view breach clients for their firm" ON breach_affected_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM breach_register br
      WHERE br.id = breach_affected_clients.breach_id
      AND br.firm_id IN (
        SELECT firm_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert breach clients for their firm" ON breach_affected_clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM breach_register br
      WHERE br.id = breach_affected_clients.breach_id
      AND br.firm_id IN (
        SELECT firm_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update breach clients for their firm" ON breach_affected_clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM breach_register br
      WHERE br.id = breach_affected_clients.breach_id
      AND br.firm_id IN (
        SELECT firm_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete breach clients for their firm" ON breach_affected_clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM breach_register br
      WHERE br.id = breach_affected_clients.breach_id
      AND br.firm_id IN (
        SELECT firm_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_breach_affected_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER breach_affected_clients_updated_at
  BEFORE UPDATE ON breach_affected_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_breach_affected_clients_updated_at();

-- ================================================================
-- INSTRUCTIONS
-- ================================================================
-- Run this migration in Supabase SQL Editor:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this script
-- 3. Click "Run"
--
-- The table allows:
-- - Multiple clients linked to a single breach
-- - Tracking notification status per client
-- - Remediation status per affected client
-- - Notes and impact description per client
