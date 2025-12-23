// Script to recreate signature_requests table with proper schema
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function recreateTable() {
  console.log('🔧 Attempting to fix signature_requests table...')

  // First, check what columns exist by trying a simple query
  console.log('\n1️⃣ Checking current table structure...')

  const { data: checkData, error: checkError } = await supabase
    .from('signature_requests')
    .select('*')
    .limit(0)

  if (checkError) {
    console.log('Table check error:', checkError.message)
  }

  // Try to delete all rows (if any) and then recreate via REST
  console.log('\n2️⃣ Clearing any existing data...')
  const { error: deleteError } = await supabase
    .from('signature_requests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

  if (deleteError) {
    console.log('Delete error (might be fine):', deleteError.message)
  } else {
    console.log('✅ Cleared existing data')
  }

  // The problem is the table exists but with wrong columns
  // We can't ALTER via REST API, but let's see if we can use row-level operations
  // to work around this by creating a workaround service

  console.log('\n⚠️  MANUAL STEP REQUIRED:')
  console.log('='.repeat(60))
  console.log('\nThe signature_requests table needs to be recreated.')
  console.log('Please run this SQL in Supabase Dashboard > SQL Editor:\n')

  const sql = `
-- First, drop the existing table (it has wrong schema)
DROP TABLE IF EXISTS signature_requests CASCADE;

-- Create the table with correct schema
CREATE TABLE signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  document_id TEXT,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'completed', 'expired', 'declined', 'cancelled')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_signature_requests_client_id ON signature_requests(client_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_created_at ON signature_requests(created_at DESC);

-- Enable RLS
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now
CREATE POLICY "Allow all operations on signature_requests" ON signature_requests
  FOR ALL USING (true) WITH CHECK (true);
`

  console.log(sql)
  console.log('\n' + '='.repeat(60))
}

recreateTable().catch(console.error)
