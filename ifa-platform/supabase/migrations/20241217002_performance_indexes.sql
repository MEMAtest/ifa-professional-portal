-- =====================================================
-- Migration: Add performance indexes and constraints
-- Date: 2024-12-17
-- Purpose: Phase C - Database performance optimization
-- =====================================================

BEGIN;

-- =====================================================
-- CLIENTS TABLE INDEXES
-- =====================================================

-- Index for searching clients by advisor
CREATE INDEX IF NOT EXISTS idx_clients_advisor_id
ON clients(advisor_id);

-- Index for searching clients by firm
CREATE INDEX IF NOT EXISTS idx_clients_firm_id
ON clients(firm_id);

-- Index for client status filtering
CREATE INDEX IF NOT EXISTS idx_clients_status
ON clients(status) WHERE status IS NOT NULL;

-- Index for client search (created_at for sorting)
CREATE INDEX IF NOT EXISTS idx_clients_created_at
ON clients(created_at DESC);

-- =====================================================
-- ASSESSMENT_PROGRESS TABLE INDEXES
-- =====================================================

-- Unique constraint: one progress record per client+type
-- This prevents duplicate ON CONFLICT errors
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_progress_client_type
ON assessment_progress(client_id, assessment_type);

-- Index for fetching progress by client
CREATE INDEX IF NOT EXISTS idx_assessment_progress_client
ON assessment_progress(client_id);

-- =====================================================
-- SUITABILITY_ASSESSMENTS TABLE INDEXES
-- =====================================================

-- Index for finding current version quickly
CREATE INDEX IF NOT EXISTS idx_suitability_client_current
ON suitability_assessments(client_id, is_current, version_number)
WHERE is_current = true;

-- Index for version history queries
CREATE INDEX IF NOT EXISTS idx_suitability_client_version
ON suitability_assessments(client_id, version_number DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_suitability_status
ON suitability_assessments(status);

-- =====================================================
-- ASSESSMENT_SHARES TABLE INDEXES
-- =====================================================

-- Index for token lookups (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_assessment_shares_token
ON assessment_shares(token);

-- Index for advisor's shares list
CREATE INDEX IF NOT EXISTS idx_assessment_shares_advisor
ON assessment_shares(advisor_id, created_at DESC);

-- Index for client's shares
CREATE INDEX IF NOT EXISTS idx_assessment_shares_client
ON assessment_shares(client_id);

-- Index for expired shares cleanup
CREATE INDEX IF NOT EXISTS idx_assessment_shares_expires
ON assessment_shares(expires_at)
WHERE status = 'pending';

-- =====================================================
-- SIGNATURE_REQUESTS TABLE INDEXES
-- =====================================================

-- Index for client signature lookups
CREATE INDEX IF NOT EXISTS idx_signature_requests_client
ON signature_requests(client_id, created_at DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_signature_requests_status
ON signature_requests(status);

-- =====================================================
-- ATR_ASSESSMENTS TABLE INDEXES
-- =====================================================

-- Index for client ATR lookups
CREATE INDEX IF NOT EXISTS idx_atr_assessments_client
ON atr_assessments(client_id);

-- =====================================================
-- CFL_ASSESSMENTS TABLE INDEXES
-- =====================================================

-- Index for client CFL lookups
CREATE INDEX IF NOT EXISTS idx_cfl_assessments_client
ON cfl_assessments(client_id);

-- =====================================================
-- INVESTOR_PERSONA_ASSESSMENTS TABLE INDEXES
-- =====================================================

-- Index for client persona lookups
CREATE INDEX IF NOT EXISTS idx_investor_persona_client
ON investor_persona_assessments(client_id);

-- =====================================================
-- AUDIT_LOGS TABLE INDEXES
-- =====================================================

-- Index for audit queries by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

-- Index for audit queries by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id, created_at DESC);

-- Index for time-based audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON audit_logs(created_at DESC);

-- =====================================================
-- DOCUMENTS TABLE INDEXES (if exists)
-- =====================================================

-- Note: Only create if documents table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)';
  END IF;
END $$;

COMMIT;
