// Script to create signature_requests table
// Run with: npx ts-node scripts/create-signature-table.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://maandodhonjolrmcxivo.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createSignatureRequestsTable() {
  console.log('Creating signature_requests table...')

  // First check if table exists
  const { data: existingTable, error: checkError } = await supabase
    .from('signature_requests')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('Table already exists!')
    return
  }

  // Create table via raw SQL (requires service role)
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS signature_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id TEXT,
        client_id UUID REFERENCES clients(id),
        template_id UUID,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'completed', 'expired', 'declined', 'cancelled')),
        opensign_document_id TEXT,
        signers JSONB DEFAULT '[]'::jsonb,
        submission_data JSONB,
        opensign_metadata JSONB,
        sent_at TIMESTAMPTZ,
        viewed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_signature_requests_client_id ON signature_requests(client_id);
      CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
      CREATE INDEX IF NOT EXISTS idx_signature_requests_opensign_id ON signature_requests(opensign_document_id);
    `
  })

  if (error) {
    console.error('Error creating table:', error)
    // Try alternative approach
    console.log('Trying alternative approach...')
  } else {
    console.log('Table created successfully!')
  }
}

createSignatureRequestsTable()
