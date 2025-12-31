-- ================================================================
-- COMPLIANCE HUB MIGRATION
-- Copy and paste this into Supabase SQL Editor
-- https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql/new
-- ================================================================

-- 1. FILE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS file_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  adviser_id UUID,
  reviewer_id UUID,
  review_type TEXT CHECK (review_type IN ('new_business', 'annual_review', 'complaint', 'ad_hoc')) NOT NULL DEFAULT 'new_business',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'escalated')) DEFAULT 'pending',
  checklist JSONB DEFAULT '{}',
  findings TEXT,
  risk_rating TEXT CHECK (risk_rating IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COMPLAINT REGISTER TABLE
CREATE TABLE IF NOT EXISTS complaint_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  reference_number TEXT,
  complaint_date DATE NOT NULL,
  received_via TEXT CHECK (received_via IN ('email', 'phone', 'letter', 'in_person', 'other')) DEFAULT 'email',
  category TEXT CHECK (category IN ('service', 'advice', 'product', 'fees', 'communication', 'other')) DEFAULT 'other',
  description TEXT NOT NULL,
  root_cause TEXT,
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'escalated', 'closed')) DEFAULT 'open',
  resolution TEXT,
  resolution_date DATE,
  redress_amount DECIMAL(12,2) DEFAULT 0,
  lessons_learned TEXT,
  fca_reportable BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BREACH REGISTER TABLE
CREATE TABLE IF NOT EXISTS breach_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  reference_number TEXT,
  breach_date DATE NOT NULL,
  discovered_date DATE NOT NULL,
  category TEXT CHECK (category IN ('regulatory', 'procedural', 'data', 'financial', 'conduct', 'other')) DEFAULT 'other',
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')) NOT NULL DEFAULT 'minor',
  description TEXT NOT NULL,
  root_cause TEXT,
  affected_clients INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('open', 'investigating', 'remediated', 'closed')) DEFAULT 'open',
  remediation_actions TEXT,
  remediation_date DATE,
  fca_notified BOOLEAN DEFAULT FALSE,
  fca_notification_date DATE,
  lessons_learned TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VULNERABILITY REGISTER TABLE
CREATE TABLE IF NOT EXISTS vulnerability_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vulnerability_type TEXT CHECK (vulnerability_type IN ('health', 'life_events', 'resilience', 'capability')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) NOT NULL DEFAULT 'low',
  description TEXT,
  support_measures TEXT,
  review_frequency TEXT CHECK (review_frequency IN ('monthly', 'quarterly', 'annually')) DEFAULT 'quarterly',
  next_review_date DATE,
  status TEXT CHECK (status IN ('active', 'monitoring', 'resolved')) DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMPLIANCE RULES TABLE
CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('review_frequency', 'qa_threshold', 'risk_trigger', 'notification')) NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLIENT SERVICES TABLE
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

-- 7. ENABLE RLS
ALTER TABLE file_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES
CREATE POLICY "file_reviews_select" ON file_reviews FOR SELECT USING (true);
CREATE POLICY "file_reviews_insert" ON file_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "file_reviews_update" ON file_reviews FOR UPDATE USING (true);

CREATE POLICY "complaints_select" ON complaint_register FOR SELECT USING (true);
CREATE POLICY "complaints_insert" ON complaint_register FOR INSERT WITH CHECK (true);
CREATE POLICY "complaints_update" ON complaint_register FOR UPDATE USING (true);

CREATE POLICY "breaches_select" ON breach_register FOR SELECT USING (true);
CREATE POLICY "breaches_insert" ON breach_register FOR INSERT WITH CHECK (true);
CREATE POLICY "breaches_update" ON breach_register FOR UPDATE USING (true);

CREATE POLICY "vulnerability_select" ON vulnerability_register FOR SELECT USING (true);
CREATE POLICY "vulnerability_insert" ON vulnerability_register FOR INSERT WITH CHECK (true);
CREATE POLICY "vulnerability_update" ON vulnerability_register FOR UPDATE USING (true);

CREATE POLICY "rules_select" ON compliance_rules FOR SELECT USING (true);
CREATE POLICY "rules_insert" ON compliance_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "rules_update" ON compliance_rules FOR UPDATE USING (true);

CREATE POLICY "services_select" ON client_services FOR SELECT USING (true);
CREATE POLICY "services_insert" ON client_services FOR INSERT WITH CHECK (true);
CREATE POLICY "services_update" ON client_services FOR UPDATE USING (true);

-- 9. INSERT DEFAULT RULES
INSERT INTO compliance_rules (firm_id, rule_name, rule_type, configuration, is_active)
VALUES
  (NULL, 'New Business Review Rate', 'qa_threshold', '{"percentage": 100, "description": "Review 100% of new business in first year"}', true),
  (NULL, 'Ongoing File Review Rate', 'qa_threshold', '{"percentage": 25, "description": "Review 25% of ongoing client files annually"}', true),
  (NULL, 'High Risk Client Review', 'review_frequency', '{"frequency": "quarterly", "description": "High risk clients reviewed quarterly"}', true),
  (NULL, 'Overdue Review Alert', 'notification', '{"days_before": 7, "recipients": ["compliance_officer"], "description": "Alert 7 days before review due date"}', true),
  (NULL, 'Complaint Escalation', 'risk_trigger', '{"auto_escalate_days": 28, "description": "Auto-escalate complaints not resolved within 28 days"}', true)
ON CONFLICT DO NOTHING;

-- DONE!
SELECT 'Migration complete!' AS status;
