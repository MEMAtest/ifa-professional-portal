-- ===================================================================
-- IFA PROFESSIONAL PORTAL - CLIENT AI DATABASE SCHEMA
-- Complete Supabase schema for Client AI Phase 2
-- Integrates with Foundation AI platform
-- ===================================================================

-- Enable Row Level Security and necessary extensions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- CLIENT MANAGEMENT TABLES
-- ===================================================================

-- Main Clients Table
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Foundation AI Integration
    advisor_id UUID NOT NULL, -- Links to Foundation AI auth system
    firm_id UUID NOT NULL, -- Multi-tenant support via Foundation AI
    
    -- Client Reference
    client_ref VARCHAR(50) NOT NULL, -- Human-readable client reference (e.g., "CLI001")
    
    -- Personal Details
    personal_details JSONB NOT NULL DEFAULT '{
        "title": "",
        "firstName": "",
        "lastName": "",
        "dateOfBirth": "",
        "nationality": "",
        "maritalStatus": "",
        "dependents": 0,
        "employmentStatus": "",
        "occupation": ""
    }'::jsonb,
    
    -- Contact Information
    contact_info JSONB NOT NULL DEFAULT '{
        "email": "",
        "phone": "",
        "mobile": "",
        "address": {
            "line1": "",
            "line2": "",
            "city": "",
            "county": "",
            "postcode": "",
            "country": "UK"
        },
        "preferredContact": "email",
        "communicationPreferences": {
            "marketing": false,
            "newsletters": false,
            "smsUpdates": false
        }
    }'::jsonb,
    
    -- Financial Profile
    financial_profile JSONB NOT NULL DEFAULT '{
        "annualIncome": 0,
        "netWorth": 0,
        "liquidAssets": 0,
        "monthlyExpenses": 0,
        "existingInvestments": [],
        "investmentObjectives": [],
        "investmentTimeframe": "",
        "pensionArrangements": [],
        "insurancePolicies": []
    }'::jsonb,
    
    -- Vulnerability Assessment (Consumer Duty)
    vulnerability_assessment JSONB NOT NULL DEFAULT '{
        "isVulnerable": false,
        "vulnerabilityFactors": [],
        "supportNeeds": [],
        "communicationAdjustments": [],
        "lastAssessed": null,
        "assessmentNotes": ""
    }'::jsonb,
    
    -- Risk Profile
    risk_profile JSONB NOT NULL DEFAULT '{
        "riskTolerance": "Moderate",
        "riskCapacity": "Medium",
        "attitudeToRisk": 5,
        "capacityForLoss": "Medium",
        "knowledgeExperience": "Basic",
        "lastAssessment": null,
        "assessmentHistory": []
    }'::jsonb,
    
    -- Status and Lifecycle
    status VARCHAR(50) DEFAULT 'prospect', -- prospect, active, review_due, inactive, archived
    
    -- Audit and Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(firm_id, client_ref), -- Ensure unique client reference within firm
    CONSTRAINT valid_status CHECK (status IN ('prospect', 'active', 'review_due', 'inactive', 'archived'))
);

-- Client Relationships (Family members, joint accounts, etc.)
CREATE TABLE client_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    primary_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    related_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL, -- spouse, partner, child, parent, joint_account, etc.
    relationship_details JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate relationships
    UNIQUE(primary_client_id, related_client_id, relationship_type)
);

-- Annual Reviews and Key Dates
CREATE TABLE client_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Review Details
    review_type VARCHAR(100) NOT NULL, -- annual, interim, portfolio, risk_assessment
    due_date DATE NOT NULL,
    completed_date DATE,
    
    -- Review Content
    review_summary TEXT,
    changes_made JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    next_review_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, overdue
    
    -- Audit
    created_by UUID NOT NULL,
    completed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_review_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue'))
);

-- Client Communications Log
CREATE TABLE client_communications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Communication Details
    communication_type VARCHAR(100) NOT NULL, -- email, phone, meeting, letter, video_call
    subject VARCHAR(255),
    summary TEXT NOT NULL,
    communication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Follow-up
    requires_followup BOOLEAN DEFAULT false,
    followup_date DATE,
    followup_completed BOOLEAN DEFAULT false,
    
    -- Integration Points
    document_id UUID, -- Links to Document AI when available
    assessment_id UUID, -- Links to Assessment AI when available
    
    -- Audit
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_communication_type CHECK (
        communication_type IN ('email', 'phone', 'meeting', 'letter', 'video_call', 'text', 'other')
    )
);

-- Client Documents Junction (For Document AI Integration)
CREATE TABLE client_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    document_id UUID NOT NULL, -- References documents table in Document AI
    
    -- Document Relationship
    document_type VARCHAR(100), -- suitability_report, annual_review, client_agreement, etc.
    is_primary BOOLEAN DEFAULT false, -- Is this the primary document of this type
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, archived, superseded
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Assessments Junction (For Assessment AI Integration)
CREATE TABLE client_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL, -- References assessments table in Assessment AI
    
    -- Assessment Details
    assessment_type VARCHAR(100) NOT NULL, -- suitability, risk_profile, vulnerability, annual_review
    assessment_date DATE NOT NULL,
    assessment_score INTEGER,
    
    -- Results Summary
    risk_level VARCHAR(50), -- Low, Medium, High
    suitability_result TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed', -- draft, completed, superseded
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log for Client Changes
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- What changed
    user_id UUID NOT NULL, -- Foundation AI user ID
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- create, update, delete, view, export
    resource VARCHAR(100) NOT NULL, -- client, review, communication, assessment
    resource_id UUID,
    
    -- Change Details
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Clients table indexes
CREATE INDEX idx_clients_advisor_id ON clients(advisor_id);
CREATE INDEX idx_clients_firm_id ON clients(firm_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_client_ref ON clients(client_ref);
CREATE INDEX idx_clients_updated_at ON clients(updated_at);

-- Full-text search on client names and details
CREATE INDEX idx_clients_personal_details_gin ON clients USING gin(personal_details);
CREATE INDEX idx_clients_contact_info_gin ON clients USING gin(contact_info);

-- Reviews indexes
CREATE INDEX idx_client_reviews_client_id ON client_reviews(client_id);
CREATE INDEX idx_client_reviews_due_date ON client_reviews(due_date);
CREATE INDEX idx_client_reviews_status ON client_reviews(status);

-- Communications indexes
CREATE INDEX idx_client_communications_client_id ON client_communications(client_id);
CREATE INDEX idx_client_communications_date ON client_communications(communication_date);
CREATE INDEX idx_client_communications_type ON client_communications(communication_type);

-- Relationships indexes
CREATE INDEX idx_client_relationships_primary ON client_relationships(primary_client_id);
CREATE INDEX idx_client_relationships_related ON client_relationships(related_client_id);

-- Integration indexes
CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_client_documents_document_id ON client_documents(document_id);
CREATE INDEX idx_client_assessments_client_id ON client_assessments(client_id);
CREATE INDEX idx_client_assessments_assessment_id ON client_assessments(assessment_id);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for clients table (firm-level isolation)
CREATE POLICY "Users can view own firm's clients" ON clients
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid OR
        advisor_id = auth.uid()
    );

CREATE POLICY "Users can insert clients for own firm" ON clients
    FOR INSERT WITH CHECK (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid AND
        advisor_id = auth.uid()
    );

CREATE POLICY "Users can update own firm's clients" ON clients
    FOR UPDATE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid OR
        advisor_id = auth.uid()
    );

-- Similar policies for other tables...
-- (Additional RLS policies would be created for each table)

-- ===================================================================
-- MIGRATION FROM EXISTING IFA_FORMS DATA
-- ===================================================================

-- Migration function to move existing client data
CREATE OR REPLACE FUNCTION migrate_legacy_clients()
RETURNS void AS $$
BEGIN
    -- This function would migrate data from the existing ifa_forms table
    -- Implementation would be specific to the current data structure
    
    INSERT INTO clients (advisor_id, firm_id, client_ref, personal_details, contact_info, financial_profile, status)
    SELECT 
        advisor_id,
        firm_id,
        client_reference,
        jsonb_build_object(
            'firstName', first_name,
            'lastName', last_name,
            'dateOfBirth', date_of_birth
        ),
        jsonb_build_object(
            'email', email,
            'phone', phone,
            'address', address_info
        ),
        jsonb_build_object(
            'annualIncome', annual_income,
            'investmentObjectives', investment_objectives
        ),
        'active'
    FROM ifa_forms 
    WHERE migrated IS NOT TRUE;
    
    -- Mark original records as migrated
    UPDATE ifa_forms SET migrated = true WHERE migrated IS NOT TRUE;
    
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ===================================================================

-- Function to calculate client risk score
CREATE OR REPLACE FUNCTION calculate_client_risk_score(client_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    risk_score INTEGER := 0;
    client_data RECORD;
BEGIN
    SELECT * INTO client_data FROM clients WHERE id = client_uuid;
    
    -- Risk calculation logic based on client profile
    -- This would integrate with Assessment AI when available
    
    RETURN COALESCE(risk_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if client review is overdue
CREATE OR REPLACE FUNCTION update_overdue_reviews()
RETURNS void AS $$
BEGIN
    UPDATE client_reviews 
    SET status = 'overdue'
    WHERE due_date < CURRENT_DATE 
    AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS FOR AUTOMATION
-- ===================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_reviews_updated_at 
    BEFORE UPDATE ON client_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for automatic audit logging
CREATE OR REPLACE FUNCTION log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, client_id, action, resource, resource_id, details, old_values, new_values)
    VALUES (
        auth.uid(),
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

CREATE TRIGGER audit_client_changes
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION log_client_changes();

-- ===================================================================
-- FIRM MANAGEMENT TABLES (Foundation AI Integration)
-- ===================================================================

-- Firm Profiles (integrates with Foundation AI firm management)
CREATE TABLE IF NOT EXISTS firm_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID NOT NULL UNIQUE, -- Links to Foundation AI firm system
    firm_name VARCHAR(255) NOT NULL,
    
    -- Business Details
    primary_sectors JSONB DEFAULT '[]'::jsonb,
    firm_size VARCHAR(50) DEFAULT 'Medium', -- Small, Medium, Large, Enterprise
    
    -- Regulatory Information
    fca_reference VARCHAR(100),
    regulatory_status VARCHAR(100) DEFAULT 'Authorised',
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Contact Information
    business_address JSONB,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website_url VARCHAR(255),
    
    -- Preferences and Settings
    client_ref_prefix VARCHAR(10) DEFAULT 'CLI',
    default_review_frequency INTEGER DEFAULT 12, -- months
    vulnerability_review_frequency INTEGER DEFAULT 6, -- months
    
    -- Compliance Settings
    consumer_duty_enabled BOOLEAN DEFAULT true,
    auto_vulnerability_alerts BOOLEAN DEFAULT true,
    mandatory_annual_reviews BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Firm Users (links Foundation AI users to firm settings)
CREATE TABLE IF NOT EXISTS firm_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID NOT NULL REFERENCES firm_profiles(firm_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Foundation AI user ID
    
    -- Role and Permissions
    role VARCHAR(100) NOT NULL DEFAULT 'advisor', -- admin, senior_advisor, advisor, junior_advisor, read_only
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Client Access
    client_access_level VARCHAR(50) DEFAULT 'own', -- all, own, team, read_only
    can_create_clients BOOLEAN DEFAULT true,
    can_edit_clients BOOLEAN DEFAULT true,
    can_delete_clients BOOLEAN DEFAULT false,
    can_view_audit_logs BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(firm_id, user_id)
);

-- ===================================================================
-- SYSTEM CONFIGURATION TABLES
-- ===================================================================

-- Client Reference Sequences (per firm)
CREATE TABLE IF NOT EXISTS client_ref_sequences (
    firm_id UUID PRIMARY KEY REFERENCES firm_profiles(firm_id) ON DELETE CASCADE,
    current_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT 'CLI',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_system_setting BOOLEAN DEFAULT false,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- ADDITIONAL INDEXES
-- ===================================================================

-- Firm profile indexes
CREATE INDEX IF NOT EXISTS idx_firm_profiles_firm_id ON firm_profiles(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_firm_id ON firm_users(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_user_id ON firm_users(user_id);

-- Client reference sequence index
CREATE INDEX IF NOT EXISTS idx_client_ref_sequences_firm_id ON client_ref_sequences(firm_id);

-- ===================================================================
-- UPDATED TRIGGERS
-- ===================================================================

-- Update firm profiles updated_at
CREATE TRIGGER update_firm_profiles_updated_at 
    BEFORE UPDATE ON firm_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_firm_users_updated_at 
    BEFORE UPDATE ON firm_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- FUNCTIONS FOR CLIENT REFERENCE GENERATION
-- ===================================================================

-- Function to get next client reference number
CREATE OR REPLACE FUNCTION get_next_client_reference(p_firm_id UUID)
RETURNS TEXT AS $
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
$ LANGUAGE plpgsql;

-- ===================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ===================================================================

-- Enable RLS
ALTER TABLE firm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ref_sequences ENABLE ROW LEVEL SECURITY;

-- Policies for firm_profiles (users can only see their own firm)
CREATE POLICY "Users can view own firm profile" ON firm_profiles
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

CREATE POLICY "Admins can update own firm profile" ON firm_profiles
    FOR UPDATE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid AND
        EXISTS (
            SELECT 1 FROM firm_users 
            WHERE user_id = auth.uid() 
            AND firm_id = firm_profiles.firm_id 
            AND role IN ('admin', 'senior_advisor')
        )
    );

-- Policies for firm_users
CREATE POLICY "Users can view own firm users" ON firm_users
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- ===================================================================
-- INITIAL DATA SEEDING
-- ===================================================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, is_system_setting) VALUES
('default_client_status', '"prospect"', 'Default status for new clients', true),
('vulnerability_review_frequency', '6', 'Default vulnerability review frequency in months', true),
('annual_review_frequency', '12', 'Default annual review frequency in months', true),
('supported_risk_levels', '["Conservative", "Moderate", "Balanced", "Growth", "Aggressive"]', 'Supported risk tolerance levels', true),
('vulnerability_factors', '["Age (over 65 or under 18)", "Health conditions", "Financial resilience issues", "Recent life events", "Capability concerns", "Digital exclusion"]', 'Standard vulnerability factors', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create a default firm profile for development/testing
INSERT INTO firm_profiles (
    firm_id, 
    firm_name, 
    primary_sectors, 
    firm_size,
    fca_reference,
    regulatory_status,
    client_ref_prefix,
    consumer_duty_enabled
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, 
    'Default IFA Firm', 
    '["Investment Management", "Retirement Planning", "Wealth Management"]'::jsonb, 
    'Medium',
    'DEV123456',
    'Authorised',
    'CLI',
    true
) ON CONFLICT (firm_id) DO NOTHING;

-- Initialize client reference sequence for default firm
INSERT INTO client_ref_sequences (firm_id, current_number, prefix) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 0, 'CLI')
ON CONFLICT (firm_id) DO NOTHING;