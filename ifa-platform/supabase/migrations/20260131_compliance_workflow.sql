-- ================================================================
-- Compliance Workflow Enhancements
-- Migration: 20260131_compliance_workflow.sql
-- ================================================================

-- ============================================
-- 1) Link tasks to compliance sources
-- ============================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- Enforce allowed source types (nullable)
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_source_type_check
  CHECK (
    source_type IS NULL OR
    source_type IN (
      'complaint',
      'breach',
      'vulnerability',
      'file_review',
      'aml_check',
      'consumer_duty',
      'risk_assessment'
    )
  );

CREATE INDEX IF NOT EXISTS idx_tasks_source_type_id ON tasks(source_type, source_id);

-- ============================================
-- 2) Add workflow ownership + priority to registers
-- ============================================
ALTER TABLE complaint_register
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE complaint_register
  DROP CONSTRAINT IF EXISTS complaint_register_priority_check;
ALTER TABLE complaint_register
  ADD CONSTRAINT complaint_register_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaint_register(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaint_register(priority);

ALTER TABLE breach_register
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE breach_register
  DROP CONSTRAINT IF EXISTS breach_register_priority_check;
ALTER TABLE breach_register
  ADD CONSTRAINT breach_register_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_breaches_assigned_to ON breach_register(assigned_to);
CREATE INDEX IF NOT EXISTS idx_breaches_priority ON breach_register(priority);

ALTER TABLE vulnerability_register
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE vulnerability_register
  DROP CONSTRAINT IF EXISTS vulnerability_register_priority_check;
ALTER TABLE vulnerability_register
  ADD CONSTRAINT vulnerability_register_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_vulnerability_assigned_to ON vulnerability_register(assigned_to);
CREATE INDEX IF NOT EXISTS idx_vulnerability_priority ON vulnerability_register(priority);

-- ============================================
-- 3) Compliance comments table
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE compliance_comments
  DROP CONSTRAINT IF EXISTS compliance_comments_source_type_check;
ALTER TABLE compliance_comments
  ADD CONSTRAINT compliance_comments_source_type_check
  CHECK (
    source_type IN (
      'complaint',
      'breach',
      'vulnerability',
      'file_review',
      'aml_check',
      'consumer_duty',
      'risk_assessment'
    )
  );

CREATE INDEX IF NOT EXISTS idx_compliance_comments_source ON compliance_comments(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_compliance_comments_user ON compliance_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_comments_firm ON compliance_comments(firm_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_compliance_comments_updated_at ON compliance_comments;
CREATE TRIGGER update_compliance_comments_updated_at
  BEFORE UPDATE ON compliance_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE compliance_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view compliance comments in their firm" ON compliance_comments;
CREATE POLICY "Users can view compliance comments in their firm"
ON compliance_comments FOR SELECT
USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

DROP POLICY IF EXISTS "Users can insert compliance comments in their firm" ON compliance_comments;
CREATE POLICY "Users can insert compliance comments in their firm"
ON compliance_comments FOR INSERT
WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

DROP POLICY IF EXISTS "Users can update compliance comments in their firm" ON compliance_comments;
CREATE POLICY "Users can update compliance comments in their firm"
ON compliance_comments FOR UPDATE
USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

DROP POLICY IF EXISTS "Users can delete compliance comments in their firm" ON compliance_comments;
CREATE POLICY "Users can delete compliance comments in their firm"
ON compliance_comments FOR DELETE
USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

-- ============================================
-- 4) View: compliance_comments_with_user
-- ============================================
CREATE OR REPLACE VIEW compliance_comments_with_user AS
SELECT
  cc.*,
  p.first_name AS user_first_name,
  p.last_name AS user_last_name,
  p.avatar_url AS user_avatar_url
FROM compliance_comments cc
LEFT JOIN profiles p ON p.id = cc.user_id;

-- ================================================================
-- End migration
-- ================================================================
