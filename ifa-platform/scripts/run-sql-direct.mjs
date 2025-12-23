// Script to run SQL directly using Supabase Management API
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

async function runSQL() {
  console.log('🔧 Recreating signature_requests table...\n')

  const sql = `
-- Drop and recreate signature_requests table
DROP TABLE IF EXISTS signature_requests CASCADE;

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

CREATE INDEX idx_signature_requests_client_id ON signature_requests(client_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_created_at ON signature_requests(created_at DESC);

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on signature_requests" ON signature_requests
  FOR ALL USING (true) WITH CHECK (true);
`.trim()

  console.log('SQL to execute:')
  console.log(sql)
  console.log('\n' + '='.repeat(60) + '\n')

  // Try using the Supabase Management API
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

  // First, create a temporary function to execute SQL
  console.log('Attempting to create helper function...')

  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'success';
END;
$$;
`

  try {
    // Try to create the helper function first
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql: createFunctionSQL })
    })

    if (!createResponse.ok) {
      console.log('❌ Cannot create helper function via REST API')
      console.log('Status:', createResponse.status)
      const errorText = await createResponse.text()
      console.log('Response:', errorText)
      console.log('\n⚠️  Direct SQL execution not supported via REST API')
      console.log('\n📋 NEXT STEPS:')
      console.log('1. Open your browser to: https://supabase.com/dashboard/project/' + projectRef)
      console.log('2. Click "SQL Editor" in the left sidebar')
      console.log('3. Click "New Query"')
      console.log('4. Copy and paste the SQL shown above')
      console.log('5. Click "Run" button')
      return
    }

    console.log('✅ Helper function approach worked!')

    // Now use it to run our SQL
    const execResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    })

    if (execResponse.ok) {
      console.log('✅ SQL executed successfully!')
      console.log('\n🎉 Table recreated! You can now try creating a signature request.')
    } else {
      const errorText = await execResponse.text()
      console.log('❌ Failed to execute SQL:', errorText)
    }

  } catch (error) {
    console.log('❌ Error:', error.message)
    console.log('\n⚠️  Automated execution failed.')
    console.log('\n📋 MANUAL STEPS REQUIRED:')
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef)
    console.log('2. Click "SQL Editor" in the left sidebar')
    console.log('3. Click "New Query"')
    console.log('4. Paste the SQL shown above')
    console.log('5. Click "Run"')
  }
}

runSQL().catch(console.error)
