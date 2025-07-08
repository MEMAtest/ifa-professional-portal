-- IFA Platform Foundation - Seed Data
-- File: supabase/migrations/20240101000002_seed_data.sql

-- Insert default firm
INSERT INTO firms (id, name, fca_number, address) VALUES 
(
    '00000000-0000-0000-0000-000000000001', 
    'Demo Financial Advisers Ltd', 
    'FCA123456',
    jsonb_build_object(
        'line1', '123 Financial Street',
        'city', 'London',
        'postcode', 'EC1A 1BB',
        'country', 'United Kingdom'
    )
);

-- Note: User profiles will be created automatically when users sign up
-- This is handled by the authentication system