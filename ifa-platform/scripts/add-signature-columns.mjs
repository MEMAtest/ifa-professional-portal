// Script to add missing columns to signature_requests table
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

async function addColumns() {
  console.log('🔧 Adding missing columns to signature_requests table...')

  // First, let's check current table structure by trying to select
  const { data: existing, error: checkError } = await supabase
    .from('signature_requests')
    .select('*')
    .limit(1)

  if (checkError) {
    console.log('Current error:', checkError.message)
  } else {
    console.log('Current columns:', existing ? Object.keys(existing[0] || {}) : 'empty table')
  }

  // Try to use rpc to run SQL if available, otherwise we need manual intervention
  // Supabase doesn't allow direct SQL execution via API without a custom function

  // Alternative: Try inserting with all expected columns to see which fail
  const testData = {
    status: 'pending',
    recipient_name: 'Test',
    recipient_email: 'test@test.com',
    client_id: null,
    document_id: null
  }

  console.log('\n📝 Testing insert with expected columns...')
  const { data: insertResult, error: insertError } = await supabase
    .from('signature_requests')
    .insert(testData)
    .select()

  if (insertError) {
    console.log('❌ Insert error:', insertError.message)
    console.log('\n⚠️  The table needs these columns added manually in Supabase SQL Editor:')
    console.log(`
ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS recipient_name TEXT;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS recipient_email TEXT;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS document_id TEXT;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
`)
  } else {
    console.log('✅ Insert successful! Table has correct schema.')
    console.log('Inserted record:', insertResult)

    // Clean up test record
    if (insertResult && insertResult[0]) {
      await supabase
        .from('signature_requests')
        .delete()
        .eq('id', insertResult[0].id)
      console.log('🧹 Cleaned up test record')
    }
  }
}

addColumns().catch(console.error)
