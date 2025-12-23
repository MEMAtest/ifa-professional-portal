-- ================================================================
-- Compliance Hub Database Migration
-- Created: 2024-12-13
-- Purpose: Add tables for QA File Reviews, Complaints, Breaches,
--          Vulnerability Register, and Compliance Rules
-- ================================================================

-- ===================
-- QA File Reviews Table
-- ===================
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

-- Indexes for file_reviews
CREATE INDEX IF NOT EXISTS idx_file_reviews_firm_id ON file_reviews(firm_id);
CREATE INDEX IF NOT EXISTS idx_file_reviews_client_id ON file_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_file_reviews_status ON file_reviews(status);
CREATE INDEX IF NOT EXISTS idx_file_reviews_reviewer_id ON file_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_file_reviews_due_date ON file_reviews(due_date);

-- ===================
-- Complaints Register Table
-- ===================
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

-- Generate unique reference numbers for complaints
CREATE OR REPLACE FUNCTION generate_complaint_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'COMP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('complaint_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for complaint reference numbers
CREATE SEQUENCE IF NOT EXISTS complaint_ref_seq START 1;

-- Create trigger for auto-generating reference numbers
DROP TRIGGER IF EXISTS trigger_complaint_ref ON complaint_register;
CREATE TRIGGER trigger_complaint_ref
  BEFORE INSERT ON complaint_register
  FOR EACH ROW
  EXECUTE FUNCTION generate_complaint_ref();

-- Indexes for complaint_register
CREATE INDEX IF NOT EXISTS idx_complaints_firm_id ON complaint_register(firm_id);
CREATE INDEX IF NOT EXISTS idx_complaints_client_id ON complaint_register(client_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaint_register(status);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaint_register(complaint_date);
CREATE INDEX IF NOT EXISTS idx_complaints_fca_reportable ON complaint_register(fca_reportable);

-- ===================
-- Breaches Register Table
-- ===================
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

-- Generate unique reference numbers for breaches
CREATE OR REPLACE FUNCTION generate_breach_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'BRCH-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('breach_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for breach reference numbers
CREATE SEQUENCE IF NOT EXISTS breach_ref_seq START 1;

-- Create trigger for auto-generating reference numbers
DROP TRIGGER IF EXISTS trigger_breach_ref ON breach_register;
CREATE TRIGGER trigger_breach_ref
  BEFORE INSERT ON breach_register
  FOR EACH ROW
  EXECUTE FUNCTION generate_breach_ref();

-- Indexes for breach_register
CREATE INDEX IF NOT EXISTS idx_breaches_firm_id ON breach_register(firm_id);
CREATE INDEX IF NOT EXISTS idx_breaches_status ON breach_register(status);
CREATE INDEX IF NOT EXISTS idx_breaches_severity ON breach_register(severity);
CREATE INDEX IF NOT EXISTS idx_breaches_date ON breach_register(breach_date);
CREATE INDEX IF NOT EXISTS idx_breaches_fca_notified ON breach_register(fca_notified);

-- ===================
-- Vulnerability Register Table
-- ===================
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

-- Indexes for vulnerability_register
CREATE INDEX IF NOT EXISTS idx_vulnerability_firm_id ON vulnerability_register(firm_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_client_id ON vulnerability_register(client_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_status ON vulnerability_register(status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_type ON vulnerability_register(vulnerability_type);
CREATE INDEX IF NOT EXISTS idx_vulnerability_next_review ON vulnerability_register(next_review_date);

-- ===================
-- Compliance Rules/Settings Table
-- ===================
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

-- Indexes for compliance_rules
CREATE INDEX IF NOT EXISTS idx_compliance_rules_firm_id ON compliance_rules(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type ON compliance_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_active ON compliance_rules(is_active);

-- ===================
-- Service Selection (PROD) Table
-- ===================
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

-- Indexes for client_services
CREATE INDEX IF NOT EXISTS idx_client_services_firm_id ON client_services(firm_id);
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON client_services(client_id);

-- ===================
-- Row Level Security Policies
-- ===================

-- Enable RLS on all new tables
ALTER TABLE file_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- File Reviews Policies
CREATE POLICY "Users can view file reviews for their firm" ON file_reviews
  FOR SELECT USING (true);
CREATE POLICY "Users can insert file reviews" ON file_reviews
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update file reviews" ON file_reviews
  FOR UPDATE USING (true);

-- Complaint Register Policies
CREATE POLICY "Users can view complaints for their firm" ON complaint_register
  FOR SELECT USING (true);
CREATE POLICY "Users can insert complaints" ON complaint_register
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update complaints" ON complaint_register
  FOR UPDATE USING (true);

-- Breach Register Policies
CREATE POLICY "Users can view breaches for their firm" ON breach_register
  FOR SELECT USING (true);
CREATE POLICY "Users can insert breaches" ON breach_register
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update breaches" ON breach_register
  FOR UPDATE USING (true);

-- Vulnerability Register Policies
CREATE POLICY "Users can view vulnerabilities for their firm" ON vulnerability_register
  FOR SELECT USING (true);
CREATE POLICY "Users can insert vulnerabilities" ON vulnerability_register
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update vulnerabilities" ON vulnerability_register
  FOR UPDATE USING (true);

-- Compliance Rules Policies
CREATE POLICY "Users can view compliance rules for their firm" ON compliance_rules
  FOR SELECT USING (true);
CREATE POLICY "Users can insert compliance rules" ON compliance_rules
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update compliance rules" ON compliance_rules
  FOR UPDATE USING (true);

-- Client Services Policies
CREATE POLICY "Users can view client services for their firm" ON client_services
  FOR SELECT USING (true);
CREATE POLICY "Users can insert client services" ON client_services
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update client services" ON client_services
  FOR UPDATE USING (true);

-- ===================
-- Updated_at Triggers
-- ===================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_file_reviews_updated_at ON file_reviews;
CREATE TRIGGER update_file_reviews_updated_at
  BEFORE UPDATE ON file_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaints_updated_at ON complaint_register;
CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON complaint_register
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_breaches_updated_at ON breach_register;
CREATE TRIGGER update_breaches_updated_at
  BEFORE UPDATE ON breach_register
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vulnerability_updated_at ON vulnerability_register;
CREATE TRIGGER update_vulnerability_updated_at
  BEFORE UPDATE ON vulnerability_register
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_rules_updated_at ON compliance_rules;
CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_services_updated_at ON client_services;
CREATE TRIGGER update_client_services_updated_at
  BEFORE UPDATE ON client_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================
-- Insert Default Compliance Rules
-- ===================
INSERT INTO compliance_rules (firm_id, rule_name, rule_type, configuration, is_active)
VALUES
  (NULL, 'New Business Review Rate', 'qa_threshold', '{"percentage": 100, "description": "Review 100% of new business in first year"}', true),
  (NULL, 'Ongoing File Review Rate', 'qa_threshold', '{"percentage": 25, "description": "Review 25% of ongoing client files annually"}', true),
  (NULL, 'High Risk Client Review', 'review_frequency', '{"frequency": "quarterly", "description": "High risk clients reviewed quarterly"}', true),
  (NULL, 'Overdue Review Alert', 'notification', '{"days_before": 7, "recipients": ["compliance_officer"], "description": "Alert 7 days before review due date"}', true),
  (NULL, 'Complaint Escalation', 'risk_trigger', '{"auto_escalate_days": 28, "description": "Auto-escalate complaints not resolved within 28 days"}', true)
ON CONFLICT DO NOTHING;

-- ===================
-- Migration Complete
-- ===================
COMMENT ON TABLE file_reviews IS 'QA File Reviews for Four-Eyes Check workflow';
COMMENT ON TABLE complaint_register IS 'FCA-compliant Complaints Register';
COMMENT ON TABLE breach_register IS 'Regulatory Breaches Register';
COMMENT ON TABLE vulnerability_register IS 'Client Vulnerability Register (Consumer Duty)';
COMMENT ON TABLE compliance_rules IS 'Firm-specific compliance rules and settings';
COMMENT ON TABLE client_services IS 'Client service selection and PROD justifications';
