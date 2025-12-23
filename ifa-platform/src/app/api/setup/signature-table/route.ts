// ================================================================
// Setup API - Create signature_requests table
// POST /api/setup/signature-table
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  log.info('Setting up signature_requests table')

  try {
    // Use service role key for table creation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service role key not configured'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if table exists by trying to query it
    const { error: checkError } = await supabase
      .from('signature_requests')
      .select('id')
      .limit(1)

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists',
        tableExists: true
      })
    }

    // Table doesn't exist, we need to create it
    // Since we can't run raw SQL directly, we'll use Supabase's approach
    // The table needs to be created via Supabase Dashboard or migrations

    // For now, let's provide the SQL that needs to be run
    const createTableSQL = `
-- Run this in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signature_requests_client_id ON signature_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_opensign_id ON signature_requests(opensign_document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at ON signature_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view all signature requests" ON signature_requests
  FOR SELECT USING (true);

CREATE POLICY "Users can insert signature requests" ON signature_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update signature requests" ON signature_requests
  FOR UPDATE USING (true);
`

    return NextResponse.json({
      success: false,
      tableExists: false,
      message: 'Table needs to be created. Please run the SQL below in Supabase Dashboard > SQL Editor',
      sql: createTableSQL,
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Click on "SQL Editor" in the left sidebar',
        '3. Click "New Query"',
        '4. Paste the SQL from the "sql" field above',
        '5. Click "Run"',
        '6. Refresh this page'
      ]
    })

  } catch (error) {
    log.error('Setup error', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Just check if table exists
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('signature_requests')
      .select('id')
      .limit(1)

    return NextResponse.json({
      tableExists: !error,
      error: error?.message
    })
  } catch (error) {
    return NextResponse.json({
      tableExists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
