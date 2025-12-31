-- STEP 1: Create communications table ONLY
-- Run this first, then run the next steps

CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  firm_id UUID,
  type TEXT DEFAULT 'note',
  subject TEXT,
  content TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER,
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  status TEXT DEFAULT 'completed',
  attachments JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_communications" ON communications FOR ALL USING (true) WITH CHECK (true);

SELECT 'Communications table created!' as result;
