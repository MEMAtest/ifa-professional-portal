-- Migration: Add client_product_holdings table
-- Purpose: Link actual products/funds to services for each client
-- Date: December 2025

-- ================================================================
-- CLIENT PRODUCT HOLDINGS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS client_product_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,  -- References service from serviceCatalog (e.g., 'retirement_planning')

  -- Product details
  product_name TEXT NOT NULL,
  product_provider TEXT,
  product_type TEXT,  -- Fund, Pension, ISA, Bond, GIA, SIPP, etc.
  product_reference TEXT,  -- Provider reference number

  -- Valuation
  current_value DECIMAL(15,2),
  purchase_value DECIMAL(15,2),
  last_valued_date DATE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'encashed', 'matured')),
  acquisition_date DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_holdings_client ON client_product_holdings(client_id);
CREATE INDEX IF NOT EXISTS idx_product_holdings_firm ON client_product_holdings(firm_id);
CREATE INDEX IF NOT EXISTS idx_product_holdings_service ON client_product_holdings(service_id);

-- Enable RLS
ALTER TABLE client_product_holdings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view holdings for their firm" ON client_product_holdings
  FOR SELECT
  USING (
    firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_product_holdings.client_id
      AND c.firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert holdings for their firm" ON client_product_holdings
  FOR INSERT
  WITH CHECK (
    firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_product_holdings.client_id
      AND c.firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update holdings for their firm" ON client_product_holdings
  FOR UPDATE
  USING (
    firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_product_holdings.client_id
      AND c.firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete holdings for their firm" ON client_product_holdings
  FOR DELETE
  USING (
    firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_product_holdings.client_id
      AND c.firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_client_product_holdings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_product_holdings_updated_at
  BEFORE UPDATE ON client_product_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_client_product_holdings_updated_at();

-- ================================================================
-- PRODUCT TYPES REFERENCE
-- ================================================================
-- Common product types for UK IFAs:
-- - SIPP (Self-Invested Personal Pension)
-- - ISA (Individual Savings Account)
-- - GIA (General Investment Account)
-- - Workplace Pension
-- - Final Salary Pension
-- - Annuity
-- - Investment Bond
-- - Offshore Bond
-- - Trust
-- - VCT (Venture Capital Trust)
-- - EIS (Enterprise Investment Scheme)
-- - SEIS (Seed Enterprise Investment Scheme)

-- ================================================================
-- INSTRUCTIONS
-- ================================================================
-- Run this migration in Supabase SQL Editor:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this script
-- 3. Click "Run"
--
-- The table allows:
-- - Multiple products linked to each client
-- - Products associated with specific services
-- - Valuation tracking over time
-- - Status tracking (active, transferred, encashed)
