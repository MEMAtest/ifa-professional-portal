-- ================================================================
-- Migration: RLS Policies for Assessment and Document Tables
-- Date: 2025-01-10
-- Purpose: Add firm-scoped RLS policies for tables missed in prior migrations:
--   1. suitability_assessments
--   2. atr_assessments
--   3. cfl_assessments
--   4. persona_assessments / investor_persona_assessments
--   5. assessment_progress
--   6. assessment_history
--   7. documents
--   8. activity_log
--   9. client_communications
--
-- FIXES from code review:
--   - Added WITH CHECK clauses to all UPDATE policies
--   - Fixed NULL handling in OR clauses
--   - Added missing DELETE policies
--   - Improved backfill to handle orphaned records safely
--   - Added performance indexes
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 0: CREATE PERFORMANCE INDEXES
-- These indexes are needed for the subquery-based policies to perform well
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_clients_id_firm ON clients(id, firm_id);
CREATE INDEX IF NOT EXISTS idx_suitability_assessments_client ON suitability_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_atr_assessments_client ON atr_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_cfl_assessments_client ON cfl_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_persona_assessments_client ON persona_assessments(client_id);

-- ================================================================
-- STEP 1: SUITABILITY_ASSESSMENTS RLS
-- Access via client's firm_id
-- ================================================================

-- Enable RLS if not already enabled
ALTER TABLE suitability_assessments ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Allow all suitability_assessments" ON suitability_assessments;
DROP POLICY IF EXISTS "Enable read access for all users" ON suitability_assessments;
DROP POLICY IF EXISTS "Users can view suitability assessments" ON suitability_assessments;
DROP POLICY IF EXISTS "Users can view suitability assessments in their firm" ON suitability_assessments;
DROP POLICY IF EXISTS "Users can insert suitability assessments for clients in their firm" ON suitability_assessments;
DROP POLICY IF EXISTS "Users can update suitability assessments in their firm" ON suitability_assessments;
DROP POLICY IF EXISTS "Supervisors can delete suitability assessments in their firm" ON suitability_assessments;

-- Create firm-scoped policies
CREATE POLICY "Users can view suitability assessments in their firm"
ON suitability_assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = suitability_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert suitability assessments for clients in their firm"
ON suitability_assessments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = suitability_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

-- UPDATE requires both USING and WITH CHECK to prevent moving records between firms
CREATE POLICY "Users can update suitability assessments in their firm"
ON suitability_assessments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = suitability_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = suitability_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete suitability assessments in their firm"
ON suitability_assessments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = suitability_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- ================================================================
-- STEP 2: ATR_ASSESSMENTS RLS
-- ================================================================

ALTER TABLE atr_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all atr_assessments" ON atr_assessments;
DROP POLICY IF EXISTS "Enable read access for all users" ON atr_assessments;
DROP POLICY IF EXISTS "Users can view ATR assessments in their firm" ON atr_assessments;
DROP POLICY IF EXISTS "Users can insert ATR assessments for clients in their firm" ON atr_assessments;
DROP POLICY IF EXISTS "Users can update ATR assessments in their firm" ON atr_assessments;
DROP POLICY IF EXISTS "Supervisors can delete ATR assessments in their firm" ON atr_assessments;

CREATE POLICY "Users can view ATR assessments in their firm"
ON atr_assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = atr_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert ATR assessments for clients in their firm"
ON atr_assessments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = atr_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can update ATR assessments in their firm"
ON atr_assessments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = atr_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = atr_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete ATR assessments in their firm"
ON atr_assessments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = atr_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- ================================================================
-- STEP 3: CFL_ASSESSMENTS RLS
-- ================================================================

ALTER TABLE cfl_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all cfl_assessments" ON cfl_assessments;
DROP POLICY IF EXISTS "Enable read access for all users" ON cfl_assessments;
DROP POLICY IF EXISTS "Users can view CFL assessments in their firm" ON cfl_assessments;
DROP POLICY IF EXISTS "Users can insert CFL assessments for clients in their firm" ON cfl_assessments;
DROP POLICY IF EXISTS "Users can update CFL assessments in their firm" ON cfl_assessments;
DROP POLICY IF EXISTS "Supervisors can delete CFL assessments in their firm" ON cfl_assessments;

CREATE POLICY "Users can view CFL assessments in their firm"
ON cfl_assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = cfl_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert CFL assessments for clients in their firm"
ON cfl_assessments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = cfl_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can update CFL assessments in their firm"
ON cfl_assessments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = cfl_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = cfl_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete CFL assessments in their firm"
ON cfl_assessments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = cfl_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- ================================================================
-- STEP 4: PERSONA_ASSESSMENTS RLS
-- ================================================================

ALTER TABLE persona_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all persona_assessments" ON persona_assessments;
DROP POLICY IF EXISTS "Enable read access for all users" ON persona_assessments;
DROP POLICY IF EXISTS "Users can view persona assessments in their firm" ON persona_assessments;
DROP POLICY IF EXISTS "Users can insert persona assessments for clients in their firm" ON persona_assessments;
DROP POLICY IF EXISTS "Users can update persona assessments in their firm" ON persona_assessments;
DROP POLICY IF EXISTS "Supervisors can delete persona assessments in their firm" ON persona_assessments;

CREATE POLICY "Users can view persona assessments in their firm"
ON persona_assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = persona_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert persona assessments for clients in their firm"
ON persona_assessments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = persona_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can update persona assessments in their firm"
ON persona_assessments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = persona_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = persona_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete persona assessments in their firm"
ON persona_assessments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = persona_assessments.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- ================================================================
-- STEP 5: DOCUMENTS RLS
-- Documents have firm_id column
-- ================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all documents" ON documents;
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can view documents in their firm" ON documents;
DROP POLICY IF EXISTS "Users can insert documents in their firm" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their firm" ON documents;
DROP POLICY IF EXISTS "Supervisors can delete documents in their firm" ON documents;

CREATE POLICY "Users can view documents in their firm"
ON documents FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert documents in their firm"
ON documents FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

-- UPDATE with WITH CHECK to prevent changing firm_id
CREATE POLICY "Users can update documents in their firm"
ON documents FOR UPDATE
USING (firm_id = public.get_my_firm_id())
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Supervisors can delete documents in their firm"
ON documents FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- ================================================================
-- STEP 6: ACTIVITY_LOG RLS
-- Add firm_id column if not exists, then add policies
-- ================================================================

-- Add firm_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_log' AND column_name = 'firm_id'
  ) THEN
    ALTER TABLE activity_log ADD COLUMN firm_id UUID REFERENCES firms(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_firm ON activity_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_client ON activity_log(client_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all activity_log" ON activity_log;
DROP POLICY IF EXISTS "Enable read access for all users" ON activity_log;
DROP POLICY IF EXISTS "Users can view activity log in their firm" ON activity_log;
DROP POLICY IF EXISTS "Users can insert activity log in their firm" ON activity_log;
DROP POLICY IF EXISTS "Supervisors can update activity log in their firm" ON activity_log;
DROP POLICY IF EXISTS "Admins can delete activity log in their firm" ON activity_log;

-- Activity log: require at least one valid firm_id path (fixed NULL handling)
CREATE POLICY "Users can view activity log in their firm"
ON activity_log FOR SELECT
USING (
  (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = activity_log.client_id
    AND c.firm_id = public.get_my_firm_id()
  ))
);

CREATE POLICY "Users can insert activity log in their firm"
ON activity_log FOR INSERT
WITH CHECK (
  (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = activity_log.client_id
    AND c.firm_id = public.get_my_firm_id()
  ))
);

-- Activity logs are typically immutable, but allow update for supervisors
CREATE POLICY "Supervisors can update activity log in their firm"
ON activity_log FOR UPDATE
USING (
  ((firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = activity_log.client_id
    AND c.firm_id = public.get_my_firm_id()
  )))
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = activity_log.client_id
    AND c.firm_id = public.get_my_firm_id()
  ))
);

-- Admins can delete activity logs (for GDPR compliance)
CREATE POLICY "Admins can delete activity log in their firm"
ON activity_log FOR DELETE
USING (
  ((firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = activity_log.client_id
    AND c.firm_id = public.get_my_firm_id()
  )))
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ================================================================
-- STEP 7: ASSESSMENT_PROGRESS RLS (if table exists)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_progress') THEN
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_assessment_progress_client ON assessment_progress(client_id);

    ALTER TABLE assessment_progress ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow all assessment_progress" ON assessment_progress;
    DROP POLICY IF EXISTS "Users can view assessment progress in their firm" ON assessment_progress;
    DROP POLICY IF EXISTS "Users can insert assessment progress for clients in their firm" ON assessment_progress;
    DROP POLICY IF EXISTS "Users can update assessment progress in their firm" ON assessment_progress;
    DROP POLICY IF EXISTS "Supervisors can delete assessment progress in their firm" ON assessment_progress;

    -- Create firm-scoped policies via client relationship
    CREATE POLICY "Users can view assessment progress in their firm"
    ON assessment_progress FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_progress.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Users can insert assessment progress for clients in their firm"
    ON assessment_progress FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_progress.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Users can update assessment progress in their firm"
    ON assessment_progress FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_progress.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_progress.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Supervisors can delete assessment progress in their firm"
    ON assessment_progress FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_progress.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'supervisor')
      )
    );
  END IF;
END $$;

-- ================================================================
-- STEP 8: ASSESSMENT_HISTORY RLS (if table exists)
-- Assessment history is immutable audit log
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_history') THEN
    CREATE INDEX IF NOT EXISTS idx_assessment_history_client ON assessment_history(client_id);

    ALTER TABLE assessment_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all assessment_history" ON assessment_history;
    DROP POLICY IF EXISTS "Users can view assessment history in their firm" ON assessment_history;
    DROP POLICY IF EXISTS "Users can insert assessment history for clients in their firm" ON assessment_history;
    DROP POLICY IF EXISTS "Prevent updates to assessment history" ON assessment_history;
    DROP POLICY IF EXISTS "Admins can delete assessment history in their firm" ON assessment_history;

    CREATE POLICY "Users can view assessment history in their firm"
    ON assessment_history FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_history.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Users can insert assessment history for clients in their firm"
    ON assessment_history FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_history.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    -- Assessment history is immutable - deny all updates
    CREATE POLICY "Prevent updates to assessment history"
    ON assessment_history FOR UPDATE
    USING (false);

    -- Only admins can delete (GDPR compliance)
    CREATE POLICY "Admins can delete assessment history in their firm"
    ON assessment_history FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = assessment_history.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
      )
    );
  END IF;
END $$;

-- ================================================================
-- STEP 9: CLIENT_COMMUNICATIONS RLS (if table exists)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_communications') THEN
    -- Add firm_id if doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client_communications' AND column_name = 'firm_id'
    ) THEN
      ALTER TABLE client_communications ADD COLUMN firm_id UUID REFERENCES firms(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_client_communications_firm ON client_communications(firm_id);
    CREATE INDEX IF NOT EXISTS idx_client_communications_client ON client_communications(client_id);

    ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all client_communications" ON client_communications;
    DROP POLICY IF EXISTS "Users can view communications in their firm" ON client_communications;
    DROP POLICY IF EXISTS "Users can insert communications in their firm" ON client_communications;
    DROP POLICY IF EXISTS "Users can update communications in their firm" ON client_communications;
    DROP POLICY IF EXISTS "Supervisors can delete communications in their firm" ON client_communications;

    -- Fixed NULL handling
    CREATE POLICY "Users can view communications in their firm"
    ON client_communications FOR SELECT
    USING (
      (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_communications.client_id
        AND c.firm_id = public.get_my_firm_id()
      ))
    );

    CREATE POLICY "Users can insert communications in their firm"
    ON client_communications FOR INSERT
    WITH CHECK (
      (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_communications.client_id
        AND c.firm_id = public.get_my_firm_id()
      ))
    );

    CREATE POLICY "Users can update communications in their firm"
    ON client_communications FOR UPDATE
    USING (
      (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_communications.client_id
        AND c.firm_id = public.get_my_firm_id()
      ))
    )
    WITH CHECK (
      (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_communications.client_id
        AND c.firm_id = public.get_my_firm_id()
      ))
    );

    CREATE POLICY "Supervisors can delete communications in their firm"
    ON client_communications FOR DELETE
    USING (
      ((firm_id IS NOT NULL AND firm_id = public.get_my_firm_id())
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_communications.client_id
        AND c.firm_id = public.get_my_firm_id()
      )))
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'supervisor')
      )
    );
  END IF;
END $$;

-- ================================================================
-- STEP 10: INVESTOR_PERSONA_ASSESSMENTS RLS (alias table if exists)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_persona_assessments') THEN
    CREATE INDEX IF NOT EXISTS idx_investor_persona_assessments_client ON investor_persona_assessments(client_id);

    ALTER TABLE investor_persona_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all investor_persona_assessments" ON investor_persona_assessments;
    DROP POLICY IF EXISTS "Users can view investor persona assessments in their firm" ON investor_persona_assessments;
    DROP POLICY IF EXISTS "Users can insert investor persona assessments for clients in their firm" ON investor_persona_assessments;
    DROP POLICY IF EXISTS "Users can update investor persona assessments in their firm" ON investor_persona_assessments;
    DROP POLICY IF EXISTS "Supervisors can delete investor persona assessments in their firm" ON investor_persona_assessments;

    CREATE POLICY "Users can view investor persona assessments in their firm"
    ON investor_persona_assessments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = investor_persona_assessments.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Users can insert investor persona assessments for clients in their firm"
    ON investor_persona_assessments FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = investor_persona_assessments.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Users can update investor persona assessments in their firm"
    ON investor_persona_assessments FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = investor_persona_assessments.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = investor_persona_assessments.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
    );

    CREATE POLICY "Supervisors can delete investor persona assessments in their firm"
    ON investor_persona_assessments FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = investor_persona_assessments.client_id
        AND c.firm_id = public.get_my_firm_id()
      )
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'supervisor')
      )
    );
  END IF;
END $$;

-- ================================================================
-- STEP 11: Backfill firm_id for activity_log (safe handling of orphans)
-- ================================================================

DO $$
DECLARE
  default_firm UUID;
  orphan_count INTEGER;
BEGIN
  -- Get default firm
  SELECT id INTO default_firm FROM firms ORDER BY created_at ASC LIMIT 1;

  IF default_firm IS NOT NULL THEN
    -- First, update records that have a valid client_id
    UPDATE activity_log al
    SET firm_id = (SELECT c.firm_id FROM clients c WHERE c.id = al.client_id)
    WHERE al.firm_id IS NULL
      AND al.client_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM clients c WHERE c.id = al.client_id);

    -- Count orphaned records (no client_id or client deleted)
    SELECT COUNT(*) INTO orphan_count
    FROM activity_log
    WHERE firm_id IS NULL;

    IF orphan_count > 0 THEN
      -- Log warning about orphaned records
      RAISE WARNING 'Found % orphaned activity_log records without valid client. Assigning to default firm for now.', orphan_count;

      -- Assign orphaned records to default firm (they need manual review)
      UPDATE activity_log
      SET firm_id = default_firm
      WHERE firm_id IS NULL;
    END IF;

    RAISE NOTICE 'Backfilled activity_log firm_id';
  END IF;
END $$;

-- ================================================================
-- STEP 12: Backfill firm_id for client_communications (if exists)
-- ================================================================

DO $$
DECLARE
  default_firm UUID;
  orphan_count INTEGER;
BEGIN
  SELECT id INTO default_firm FROM firms ORDER BY created_at ASC LIMIT 1;

  IF default_firm IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'client_communications'
  ) THEN
    -- Update records with valid client_id
    UPDATE client_communications cc
    SET firm_id = (SELECT c.firm_id FROM clients c WHERE c.id = cc.client_id)
    WHERE cc.firm_id IS NULL
      AND cc.client_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM clients c WHERE c.id = cc.client_id);

    -- Count and handle orphans
    SELECT COUNT(*) INTO orphan_count
    FROM client_communications
    WHERE firm_id IS NULL;

    IF orphan_count > 0 THEN
      RAISE WARNING 'Found % orphaned client_communications records. Assigning to default firm.', orphan_count;
      UPDATE client_communications SET firm_id = default_firm WHERE firm_id IS NULL;
    END IF;

    RAISE NOTICE 'Backfilled client_communications firm_id';
  END IF;
END $$;

-- ================================================================
-- STEP 13: Validation - Ensure all expected tables have RLS enabled
-- ================================================================

DO $$
DECLARE
  tables_without_rls TEXT[];
  tbl TEXT;
BEGIN
  -- Check core assessment tables
  SELECT ARRAY_AGG(t.tablename)
  INTO tables_without_rls
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'suitability_assessments', 'atr_assessments', 'cfl_assessments',
      'persona_assessments', 'documents', 'activity_log'
    )
    AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false);

  IF tables_without_rls IS NOT NULL AND array_length(tables_without_rls, 1) > 0 THEN
    FOREACH tbl IN ARRAY tables_without_rls
    LOOP
      RAISE WARNING 'Table % does not have RLS enabled!', tbl;
    END LOOP;
  ELSE
    RAISE NOTICE 'All core tables have RLS enabled successfully!';
  END IF;
END $$;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- After running this migration:
-- 1. All assessment tables are protected by firm-scoped RLS
-- 2. Documents table is protected
-- 3. Activity log has firm_id and RLS
-- 4. Client communications has firm_id and RLS
-- 5. All UPDATE policies have WITH CHECK clauses
-- 6. Performance indexes are created
-- 7. Orphaned records are logged and handled

COMMIT;
