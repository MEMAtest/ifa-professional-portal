-- ================================================================
-- Migration: Platform billing config (owner admin)
-- Date: 2025-01-12
-- Purpose: Store Stripe price IDs and seat price in a single config row
-- ================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS platform_billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_base_price_12m_id TEXT,
  stripe_base_price_24m_id TEXT,
  stripe_base_price_36m_id TEXT,
  stripe_seat_price_id TEXT,
  seat_price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_billing_config_singleton
  ON platform_billing_config ((TRUE));

ALTER TABLE platform_billing_config ENABLE ROW LEVEL SECURITY;

COMMIT;
