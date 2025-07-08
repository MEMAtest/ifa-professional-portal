-- ===================================================================
-- QUICK CLIENT AI DATABASE SETUP
-- Run this script to quickly set up the Client AI database
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- CREATE ESSENTIAL TABLES ONLY
-- ===================================================================

-- 1. Firm Profiles (Essential for Client AI)
CREATE TABLE IF NOT EXISTS firm_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID NOT NULL UNIQUE,
    firm_name VARCHAR(255) NOT NULL,
    primary_sectors JSONB DEFAULT '[]'::jsonb,
    firm_size VARCHAR(50) DEFAULT 'Medium',
    client_ref_prefix VARCHAR(10) DEFAULT 'CLI',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Client Reference Sequences
CREATE TABLE IF NOT EXISTS client_ref_sequences (
    firm_id UUID PRIMARY KEY REFERENCES firm_profiles(firm_id) ON DELETE CASCADE,
    current_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT 'CLI',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Main Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    advisor_id UUID NOT NULL,
    firm_id UUID NOT NULL,
    client_ref VARCHAR(50) NOT NULL,
    personal_details JSONB NOT NULL DEFAULT '{}',
    contact_info JSONB NOT NULL DEFAULT '{}',
    financial_profile JSONB NOT NULL DEFAULT '{}',
    vulnerability_assessment JSONB NOT NULL DEFAULT '{"isVulnerable": false}',
    risk_profile JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'prospect',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(firm_id, client_ref),
    CONSTRAINT valid_status CHECK (status IN ('prospect', 'active', 'review_due', 'inactive', 'archived'))
);

-- 4. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB NOT NULL DEFAULT '{}',
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Client Reviews
CREATE TABLE IF NOT EXISTS client_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    review_type VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    completed_date DATE,
    review_summary TEXT,
    changes_made JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    next_review_date DATE,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_by UUID NOT NULL,
    completed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_review_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue'))
);

-- 6. Client Communications
CREATE TABLE IF NOT EXISTS client_communications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    communication_type VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    summary TEXT NOT NULL,
    communication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    requires_followup BOOLEAN DEFAULT false,
    followup_date DATE,
    followup_completed BOOLEAN DEFAULT false,
    document_id UUID,
    assessment_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_communication_type CHECK (
        communication_type IN ('email', 'phone', 'meeting', 'letter', 'video_call', 'text', 'other')
    )
);

-- ===================================================================
-- CREATE ESSENTIAL INDEXES
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_clients_advisor_id ON clients(advisor_id);
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_client_ref ON clients(client_ref);
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients(updated_at);

CREATE INDEX IF NOT EXISTS idx_client_reviews_client_id ON client_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_due_date ON client_reviews(due_date);
CREATE INDEX IF NOT EXISTS idx_client_reviews_status ON client_reviews(status);

CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_date ON client_communications(communication_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ===================================================================
-- CREATE ESSENTIAL FUNCTIONS
-- ===================================================================

-- Function to generate client references
CREATE OR REPLACE FUNCTION get_next_client_reference(p_firm_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_current_number INTEGER;
    v_new_number INTEGER;
    v_reference TEXT;
BEGIN
    -- Get or create sequence record
    INSERT INTO client_ref_sequences (firm_id, current_number, prefix)
    VALUES (p_firm_id, 0, 'CLI')
    ON CONFLICT (firm_id) DO NOTHING;
    
    -- Get current values
    SELECT current_number, prefix INTO v_current_number, v_prefix
    FROM client_ref_sequences
    WHERE firm_id = p_firm_id;
    
    -- Increment number
    v_new_number := v_current_number + 1;
    
    -- Update sequence
    UPDATE client_ref_sequences 
    SET current_number = v_new_number, updated_at = NOW()
    WHERE firm_id = p_firm_id;
    
    -- Generate reference
    v_reference := v_prefix || LPAD(v_new_number::TEXT, 4, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- CREATE TRIGGERS
-- ===================================================================

-- Update triggers
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_reviews_updated_at ON client_reviews;
CREATE TRIGGER update_client_reviews_updated_at 
    BEFORE UPDATE ON client_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE OR REPLACE FUNCTION log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, client_id, action, resource, resource_id, details, old_values, new_values)
    VALUES (
        COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        'client',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_client_changes ON clients;
CREATE TRIGGER audit_client_changes
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION log_client_changes();

-- ===================================================================
-- INSERT DEFAULT DATA
-- ===================================================================

-- Create default firm profile
INSERT INTO firm_profiles (
    firm_id, 
    firm_name, 
    primary_sectors, 
    firm_size,
    client_ref_prefix
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, 
    'Default IFA Firm', 
    '["Investment Management", "Retirement Planning"]'::jsonb, 
    'Medium',
    'CLI'
) ON CONFLICT (firm_id) DO UPDATE SET
    firm_name = EXCLUDED.firm_name,
    primary_sectors = EXCLUDED.primary_sectors;

-- Initialize client reference sequence
INSERT INTO client_ref_sequences (firm_id, current_number, prefix) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 0, 'CLI')
ON CONFLICT (firm_id) DO NOTHING;

-- ===================================================================
-- VERIFICATION AND OUTPUT
-- ===================================================================

-- Test the client reference function
SELECT get_next_client_reference('00000000-0000-0000-0000-000000000001'::uuid) as test_client_ref;

-- Show table counts
SELECT 
    'Setup Complete' as status,
    (SELECT COUNT(*) FROM firm_profiles) as firm_profiles,
    (SELECT COUNT(*) FROM client_ref_sequences) as sequences,
    (SELECT COUNT(*) FROM clients) as clients,
    (SELECT COUNT(*) FROM audit_logs) as audit_logs;

-- Show available functions
SELECT proname as function_name 
FROM pg_proc 
WHERE proname IN ('get_next_client_reference', 'update_updated_at_column', 'log_client_changes');

RAISE NOTICE 'Client AI Database Setup Complete!';
RAISE NOTICE 'Default firm ID: 00000000-0000-0000-0000-000000000001';
RAISE NOTICE 'Next client reference will be: CLI0001';