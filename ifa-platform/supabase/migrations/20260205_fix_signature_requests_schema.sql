-- Ensure signature_requests table exists with required columns

CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  document_id TEXT,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  docuseal_status TEXT,
  docuseal_submission_id TEXT,
  docuseal_template_id TEXT,
  message TEXT,
  subject TEXT,
  signed_document_path TEXT,
  client_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing table (safe, idempotent)
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS firm_id UUID;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS recipient_role TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS docuseal_status TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS docuseal_submission_id TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS docuseal_template_id TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signed_document_path TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS client_ref TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_requests_client_id ON signature_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_firm_id ON signature_requests(firm_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at ON signature_requests(created_at DESC);

-- Ensure RLS is enabled (policies are managed in existing migrations)
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
