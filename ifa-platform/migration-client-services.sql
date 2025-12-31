-- ================================================================
-- CLIENT SERVICES TABLE MIGRATION
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql/new
-- ================================================================

-- Create client_services table (referenced by ServiceSelection, ActivityTab, PlatformJustification, DecumulationStrategy)
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

-- Enable RLS
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for now)
CREATE POLICY "client_services_select" ON client_services FOR SELECT USING (true);
CREATE POLICY "client_services_insert" ON client_services FOR INSERT WITH CHECK (true);
CREATE POLICY "client_services_update" ON client_services FOR UPDATE USING (true);
CREATE POLICY "client_services_delete" ON client_services FOR DELETE USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_firm_id ON client_services(firm_id);

-- Done
SELECT 'client_services table created!' AS status;
