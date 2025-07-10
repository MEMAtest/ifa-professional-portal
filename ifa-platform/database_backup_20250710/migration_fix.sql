-- ===================================================================
-- CLIENT AI DATABASE MIGRATION FIX
-- Resolves the firm_profile table error and ensures proper setup
-- ===================================================================

-- ===================================================================
-- 1. CREATE MISSING TABLES IN CORRECT ORDER
-- ===================================================================

-- First, ensure we have the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create firm_profiles table (this was missing)
CREATE TABLE IF NOT EXISTS firm_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID NOT NULL UNIQUE,
    firm_name VARCHAR(255) NOT NULL,
    primary_sectors JSONB DEFAULT '[]'::jsonb,
    firm_size VARCHAR(50) DEFAULT 'Medium',
    fca_reference VARCHAR(100),
    regulatory_status VARCHAR(100) DEFAULT 'Authorised',
    permissions JSONB DEFAULT '[]'::jsonb,
    business_address JSONB,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website_url VARCHAR(255),
    client_ref_prefix VARCHAR(10) DEFAULT 'CLI',
    default_review_frequency INTEGER DEFAULT 12,
    vulnerability_review_frequency INTEGER DEFAULT 6,
    consumer_duty_enabled BOOLEAN DEFAULT true,
    auto_vulnerability_alerts BOOLEAN DEFAULT true,
    mandatory_annual_reviews BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create firm_users table
CREATE TABLE IF NOT EXISTS firm_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID NOT NULL REFERENCES firm_profiles(firm_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'advisor',
    permissions JSONB DEFAULT '[]'::jsonb,
    client_access_level VARCHAR(50) DEFAULT 'own',
    can_create_clients BOOLEAN DEFAULT true,
    can_edit_clients BOOLEAN DEFAULT true,
    can_delete_clients BOOLEAN DEFAULT false,
    can_view_audit_logs BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(firm_id, user_id)
);

-- Create client reference sequences table
CREATE TABLE IF NOT EXISTS client_ref_sequences (
    firm_id UUID PRIMARY KEY REFERENCES firm_profiles(firm_id) ON DELETE CASCADE,
    current_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT 'CLI',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system settings table
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
-- 2. ADD MISSING INDEXES
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_firm_profiles_firm_id ON firm_profiles(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_firm_id ON firm_users(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_user_id ON firm_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_ref_sequences_firm_id ON client_ref_sequences(firm_id);

-- ===================================================================
-- 3. ADD MISSING TRIGGERS
-- ===================================================================

DROP TRIGGER IF EXISTS update_firm_profiles_updated_at ON firm_profiles;
CREATE TRIGGER update_firm_profiles_updated_at 
    BEFORE UPDATE ON firm_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_firm_users_updated_at ON firm_users;
CREATE TRIGGER update_firm_users_updated_at 
    BEFORE UPDATE ON firm_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- 4. CREATE THE CLIENT REFERENCE FUNCTION
-- ===================================================================

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
-- 5. SETUP ROW LEVEL SECURITY
-- ===================================================================

-- Enable RLS on new tables
ALTER TABLE firm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ref_sequences ENABLE ROW LEVEL SECURITY;

-- Create policies for firm_profiles
DROP POLICY IF EXISTS "Users can view own firm profile" ON firm_profiles;
CREATE POLICY "Users can view own firm profile" ON firm_profiles
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

DROP POLICY IF EXISTS "Admins can update own firm profile" ON firm_profiles;
CREATE POLICY "Admins can update own firm profile" ON firm_profiles
    FOR UPDATE USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- Create policies for firm_users
DROP POLICY IF EXISTS "Users can view own firm users" ON firm_users;
CREATE POLICY "Users can view own firm users" ON firm_users
    FOR SELECT USING (
        firm_id = (auth.jwt() ->> 'firm_id')::uuid
    );

-- ===================================================================
-- 6. INSERT DEFAULT DATA
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

-- ===================================================================
-- 7. VERIFICATION QUERIES
-- ===================================================================

-- Verify all tables exist
DO $$
DECLARE
    missing_tables TEXT[];
    table_name TEXT;
    required_tables TEXT[] := ARRAY[
        'firm_profiles', 
        'firm_users', 
        'client_ref_sequences', 
        'system_settings',
        'clients',
        'client_relationships',
        'client_reviews',
        'client_communications',
        'client_documents',
        'client_assessments',
        'audit_logs'
    ];
BEGIN
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_name AND table_schema = 'public'
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables exist';
    END IF;
END $$;

-- Verify the function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_next_client_reference') THEN
        RAISE NOTICE 'Function get_next_client_reference exists';
    ELSE
        RAISE NOTICE 'WARNING: Function get_next_client_reference is missing';
    END IF;
END $$;

-- Verify default data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM firm_profiles WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) THEN
        RAISE NOTICE 'Default firm profile exists';
    ELSE
        RAISE NOTICE 'WARNING: Default firm profile is missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'default_client_status') THEN
        RAISE NOTICE 'System settings configured';
    ELSE
        RAISE NOTICE 'WARNING: System settings are missing';
    END IF;
END $$;

-- Show summary
SELECT 
    'Database Migration Complete' as status,
    (SELECT COUNT(*) FROM firm_profiles) as firm_profiles_count,
    (SELECT COUNT(*) FROM system_settings) as system_settings_count,
    (SELECT COUNT(*) FROM clients) as clients_count;