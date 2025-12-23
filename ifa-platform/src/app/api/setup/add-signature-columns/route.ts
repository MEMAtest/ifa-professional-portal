// ================================================================
// Setup API - Add missing columns to signature_requests table
// POST /api/setup/add-signature-columns
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  log.info('Adding missing columns to signature_requests table')

  try {
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

    // SQL to add missing columns
    const alterTableSQL = `
-- Add missing columns to signature_requests table
-- Run this in Supabase SQL Editor:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signature_requests_client_id ON signature_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
`

    return NextResponse.json({
      success: false,
      tableExists: true,
      needsColumns: true,
      message: 'Table exists but needs columns. Please run the SQL below in Supabase Dashboard > SQL Editor',
      sql: alterTableSQL,
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Click on "SQL Editor" in the left sidebar',
        '3. Click "New Query"',
        '4. Paste the SQL from the "sql" field above',
        '5. Click "Run"',
        '6. Refresh the signatures page'
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
  return POST(request)
}
