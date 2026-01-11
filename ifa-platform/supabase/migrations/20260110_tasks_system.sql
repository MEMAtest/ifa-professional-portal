-- ============================================
-- Tasks & Workflows System
-- Migration: 20260110_tasks_system.sql
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Relationships (optional)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES suitability_assessments(id) ON DELETE SET NULL,

  -- Dates
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Workflow features
  requires_sign_off BOOLEAN NOT NULL DEFAULT false,
  signed_off_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,

  -- Recurrence
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT, -- RRULE format (e.g., 'FREQ=WEEKLY;BYDAY=MO')
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_firm_id ON tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_firm_status_due ON tasks(firm_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Tasks: Users can see tasks in their firm
DROP POLICY IF EXISTS "Users can view tasks in their firm" ON tasks;
CREATE POLICY "Users can view tasks in their firm"
ON tasks FOR SELECT
USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

-- Tasks: Users can create tasks in their firm
DROP POLICY IF EXISTS "Users can create tasks in their firm" ON tasks;
CREATE POLICY "Users can create tasks in their firm"
ON tasks FOR INSERT
WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

-- Tasks: Users can update tasks in their firm
DROP POLICY IF EXISTS "Users can update tasks in their firm" ON tasks;
CREATE POLICY "Users can update tasks in their firm"
ON tasks FOR UPDATE
USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

-- Tasks: Users can delete tasks in their firm
DROP POLICY IF EXISTS "Users can delete tasks in their firm" ON tasks;
CREATE POLICY "Users can delete tasks in their firm"
ON tasks FOR DELETE
USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);

-- Task Comments: Users can view comments on tasks they can see
DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
CREATE POLICY "Users can view task comments"
ON task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
    AND t.firm_id = (auth.jwt() ->> 'firm_id')::uuid
  )
);

-- Task Comments: Users can create comments on tasks they can see
DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;
CREATE POLICY "Users can create task comments"
ON task_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
    AND t.firm_id = (auth.jwt() ->> 'firm_id')::uuid
  )
);

-- Task Comments: Users can update their own comments
DROP POLICY IF EXISTS "Users can update own task comments" ON task_comments;
CREATE POLICY "Users can update own task comments"
ON task_comments FOR UPDATE
USING (user_id = auth.uid());

-- Task Comments: Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own task comments" ON task_comments;
CREATE POLICY "Users can delete own task comments"
ON task_comments FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- UPDATE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

DROP TRIGGER IF EXISTS task_comments_updated_at_trigger ON task_comments;
CREATE TRIGGER task_comments_updated_at_trigger
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Tasks with related info (for list views)
CREATE OR REPLACE VIEW tasks_with_details AS
SELECT
  t.*,
  c.personal_details->>'firstName' as client_first_name,
  c.personal_details->>'lastName' as client_last_name,
  c.client_ref,
  p_assigned.first_name as assigned_to_first_name,
  p_assigned.last_name as assigned_to_last_name,
  p_assigned.email as assigned_to_email,
  p_assigner.first_name as assigned_by_first_name,
  p_assigner.last_name as assigned_by_last_name,
  (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) as comment_count
FROM tasks t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN profiles p_assigned ON t.assigned_to = p_assigned.id
LEFT JOIN profiles p_assigner ON t.assigned_by = p_assigner.id;

-- View: Task counts by status per user (for dashboard)
CREATE OR REPLACE VIEW user_task_summary AS
SELECT
  p.id as user_id,
  p.firm_id,
  COUNT(*) FILTER (WHERE t.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '7 days') as completed_this_week,
  COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled')) as overdue_count,
  COUNT(*) FILTER (WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND t.status NOT IN ('completed', 'cancelled')) as due_this_week
FROM profiles p
LEFT JOIN tasks t ON t.assigned_to = p.id
GROUP BY p.id, p.firm_id;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE tasks IS 'Tasks and workflow items for firm users';
COMMENT ON TABLE task_comments IS 'Comments/notes on tasks';
COMMENT ON COLUMN tasks.type IS 'Task category: general, review, compliance, client_follow_up, deadline, meeting';
COMMENT ON COLUMN tasks.status IS 'Current status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN tasks.recurrence_rule IS 'RRULE format for recurring tasks (RFC 5545)';
COMMENT ON COLUMN tasks.metadata IS 'Additional task data (template info, custom fields, etc.)';
