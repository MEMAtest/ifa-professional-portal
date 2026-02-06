-- ================================================================
-- Custom E-Signature System Migration
-- Replaces OpenSign dependency with internal signing flow
-- ================================================================

-- Add new columns to signature_requests for custom signing flow
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signing_token UUID DEFAULT gen_random_uuid();
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signing_token_expires_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signing_token_used BOOLEAN DEFAULT false;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signature_image_path TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signature_ip_address TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signature_user_agent TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signer_consent_given BOOLEAN DEFAULT false;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signer_consent_timestamp TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS original_document_hash TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signed_document_hash TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signed_document_path TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signing_method TEXT DEFAULT 'internal';

-- Create unique index on signing token for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_requests_signing_token
  ON signature_requests(signing_token) WHERE signing_token IS NOT NULL;

-- Index for finding pending requests by token expiry
CREATE INDEX IF NOT EXISTS idx_signature_requests_token_expiry
  ON signature_requests(signing_token_expires_at) WHERE signing_token_used = false;

-- ================================================================
-- Signature Audit Log Table
-- Tracks all events for compliance and legal validity
-- ================================================================

CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by signature request
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_request_id
  ON signature_audit_log(signature_request_id);

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_event_type
  ON signature_audit_log(event_type);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_timestamp
  ON signature_audit_log(event_timestamp);

-- ================================================================
-- RLS Policies for signature_audit_log
-- ================================================================

ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;

-- Select policy - users can view audit logs for their firm's signature requests
CREATE POLICY "Users can view audit logs for their firm's signature requests"
  ON signature_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM signature_requests sr
      WHERE sr.id = signature_audit_log.signature_request_id
      AND sr.firm_id = (auth.jwt()->>'firm_id')::uuid
    )
  );

-- Insert policy - service role only (no direct user inserts)
-- Audit logs are created by the system, not by users directly

-- No UPDATE or DELETE policies - audit logs are immutable for compliance

-- ================================================================
-- Function to log signature events
-- ================================================================

CREATE OR REPLACE FUNCTION log_signature_event(
  p_signature_request_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO signature_audit_log (
    signature_request_id,
    event_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_signature_request_id,
    p_event_type,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ================================================================
-- Function to validate signing token
-- ================================================================

CREATE OR REPLACE FUNCTION validate_signing_token(p_token UUID)
RETURNS TABLE (
  valid BOOLEAN,
  signature_request_id UUID,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Find the signature request
  SELECT * INTO v_request
  FROM signature_requests
  WHERE signing_token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      NULL::UUID,
      'INVALID_TOKEN'::TEXT,
      'The signing link is invalid.'::TEXT;
    RETURN;
  END IF;

  -- Check if already used
  IF v_request.signing_token_used THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_request.id::UUID,
      'ALREADY_SIGNED'::TEXT,
      'This document has already been signed.'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_request.signing_token_expires_at IS NOT NULL
     AND v_request.signing_token_expires_at < NOW() THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_request.id::UUID,
      'EXPIRED'::TEXT,
      'The signing link has expired. Please contact your advisor for a new link.'::TEXT;
    RETURN;
  END IF;

  -- Check request status
  IF v_request.status IN ('completed', 'signed', 'declined', 'expired') THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_request.id::UUID,
      'INVALID_STATUS'::TEXT,
      'This signature request is no longer active.'::TEXT;
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT
    true::BOOLEAN,
    v_request.id::UUID,
    NULL::TEXT,
    NULL::TEXT;
END;
$$;

-- ================================================================
-- Grant execute permissions
-- ================================================================

GRANT EXECUTE ON FUNCTION log_signature_event TO service_role;
GRANT EXECUTE ON FUNCTION validate_signing_token TO anon, authenticated, service_role;
