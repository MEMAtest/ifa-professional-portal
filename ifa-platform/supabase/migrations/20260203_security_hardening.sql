-- ================================================================
-- Security hardening: firm scoping, JWT claims, platform admin
-- Date: 2026-02-03
-- ================================================================

BEGIN;

-- 1) Add platform admin flag to profiles
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- 2) Update JWT hook to include firm_id, app_role, and platform admin flag
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  profile_record RECORD;
  user_id_text TEXT;
BEGIN
  claims := event->'claims';
  user_id_text := event->>'user_id';

  IF user_id_text IS NULL OR user_id_text = '' THEN
    RETURN event;
  END IF;

  BEGIN
    SELECT firm_id, role, is_platform_admin INTO profile_record
    FROM profiles
    WHERE id = user_id_text::UUID;

    IF NOT FOUND THEN
      RETURN event;
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN event;
    WHEN OTHERS THEN
      RETURN event;
  END;

  IF profile_record.firm_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(profile_record.firm_id::TEXT));
  END IF;

  IF profile_record.role IS NOT NULL THEN
    -- IMPORTANT: keep the PostgREST role claim intact; store app role separately
    claims := jsonb_set(claims, '{app_role}', to_jsonb(profile_record.role));
  END IF;

  IF profile_record.is_platform_admin IS NOT NULL THEN
    claims := jsonb_set(claims, '{is_platform_admin}', to_jsonb(profile_record.is_platform_admin));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- 3) Fix get_my_firm_id to use JWT claims first (avoids profiles RLS loop)
CREATE OR REPLACE FUNCTION public.get_my_firm_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  firm_id_text TEXT;
BEGIN
  firm_id_text := NULLIF(auth.jwt() ->> 'firm_id', '');
  IF firm_id_text IS NOT NULL THEN
    BEGIN
      RETURN firm_id_text::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NULL;
    END;
  END IF;

  SELECT firm_id INTO firm_id_text FROM profiles WHERE id = auth.uid();
  IF firm_id_text IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN firm_id_text::UUID;
END;
$$;

-- 4) Add firm_id to AML + Consumer Duty status tables and backfill
ALTER TABLE IF EXISTS aml_client_status
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
UPDATE aml_client_status a
SET firm_id = c.firm_id
FROM clients c
WHERE a.client_id = c.id
  AND a.firm_id IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM aml_client_status WHERE firm_id IS NULL) THEN
    ALTER TABLE IF EXISTS aml_client_status ALTER COLUMN firm_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aml_client_status_firm_id ON aml_client_status(firm_id);

ALTER TABLE IF EXISTS aml_check_history
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
UPDATE aml_check_history h
SET firm_id = a.firm_id
FROM aml_client_status a
WHERE h.aml_client_status_id = a.id
  AND h.firm_id IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM aml_check_history WHERE firm_id IS NULL) THEN
    ALTER TABLE IF EXISTS aml_check_history ALTER COLUMN firm_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aml_check_history_firm_id ON aml_check_history(firm_id);

ALTER TABLE IF EXISTS consumer_duty_status
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
UPDATE consumer_duty_status s
SET firm_id = c.firm_id
FROM clients c
WHERE s.client_id = c.id
  AND s.firm_id IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM consumer_duty_status WHERE firm_id IS NULL) THEN
    ALTER TABLE IF EXISTS consumer_duty_status ALTER COLUMN firm_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_consumer_duty_status_firm_id ON consumer_duty_status(firm_id);

-- 5) Backfill firm_id for assessments where needed (tables may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consumer_duty_assessments') THEN
    EXECUTE 'UPDATE consumer_duty_assessments cda SET firm_id = c.firm_id FROM clients c WHERE cda.client_id = c.id AND cda.firm_id IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vulnerability_assessments') THEN
    EXECUTE 'UPDATE vulnerability_assessments va SET firm_id = c.firm_id FROM clients c WHERE va.client_id = c.id AND va.firm_id IS NULL';
  END IF;
END $$;

-- 5b) Add firm_id to assessment_shares (tokened access) and backfill
ALTER TABLE IF EXISTS assessment_shares
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_shares') THEN
    EXECUTE 'UPDATE assessment_shares s SET firm_id = c.firm_id FROM clients c WHERE s.client_id = c.id AND s.firm_id IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_assessment_shares_firm_id ON assessment_shares(firm_id)';
  END IF;
END $$;

-- 6) Tighten RLS policies (replace permissive USING (true))
-- Align legacy review statuses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_reviews') THEN
    EXECUTE 'UPDATE client_reviews SET status = ''scheduled'' WHERE status = ''pending''';
  END IF;
END $$;

-- Communications
ALTER TABLE IF EXISTS communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "communications_select" ON communications;
DROP POLICY IF EXISTS "communications_insert" ON communications;
DROP POLICY IF EXISTS "communications_update" ON communications;
DROP POLICY IF EXISTS "communications_delete" ON communications;
DROP POLICY IF EXISTS "allow_all_communications" ON communications;
CREATE POLICY "communications_select" ON communications FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "communications_insert" ON communications FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "communications_update" ON communications FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "communications_delete" ON communications FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Client services
ALTER TABLE IF EXISTS client_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_services_select" ON client_services;
DROP POLICY IF EXISTS "client_services_insert" ON client_services;
DROP POLICY IF EXISTS "client_services_update" ON client_services;
DROP POLICY IF EXISTS "client_services_delete" ON client_services;
DROP POLICY IF EXISTS "allow_all_select" ON client_services;
DROP POLICY IF EXISTS "allow_all_insert" ON client_services;
DROP POLICY IF EXISTS "allow_all_update" ON client_services;
DROP POLICY IF EXISTS "allow_all_delete" ON client_services;
CREATE POLICY "client_services_select" ON client_services FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "client_services_insert" ON client_services FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "client_services_update" ON client_services FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "client_services_delete" ON client_services FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Complaint register
ALTER TABLE IF EXISTS complaint_register ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "complaints_select" ON complaint_register;
DROP POLICY IF EXISTS "complaints_insert" ON complaint_register;
DROP POLICY IF EXISTS "complaints_update" ON complaint_register;
DROP POLICY IF EXISTS "complaints_delete" ON complaint_register;
CREATE POLICY "complaints_select" ON complaint_register FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "complaints_insert" ON complaint_register FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "complaints_update" ON complaint_register FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "complaints_delete" ON complaint_register FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Breach register
ALTER TABLE IF EXISTS breach_register ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "breaches_select" ON breach_register;
DROP POLICY IF EXISTS "breaches_insert" ON breach_register;
DROP POLICY IF EXISTS "breaches_update" ON breach_register;
DROP POLICY IF EXISTS "breaches_delete" ON breach_register;
CREATE POLICY "breaches_select" ON breach_register FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "breaches_insert" ON breach_register FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "breaches_update" ON breach_register FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "breaches_delete" ON breach_register FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Vulnerability register
ALTER TABLE IF EXISTS vulnerability_register ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vulnerability_select" ON vulnerability_register;
DROP POLICY IF EXISTS "vulnerability_insert" ON vulnerability_register;
DROP POLICY IF EXISTS "vulnerability_update" ON vulnerability_register;
DROP POLICY IF EXISTS "vulnerability_delete" ON vulnerability_register;
CREATE POLICY "vulnerability_select" ON vulnerability_register FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "vulnerability_insert" ON vulnerability_register FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "vulnerability_update" ON vulnerability_register FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "vulnerability_delete" ON vulnerability_register FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Compliance rules (allow global rules with firm_id IS NULL)
ALTER TABLE IF EXISTS compliance_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rules_select" ON compliance_rules;
DROP POLICY IF EXISTS "rules_insert" ON compliance_rules;
DROP POLICY IF EXISTS "rules_update" ON compliance_rules;
DROP POLICY IF EXISTS "rules_delete" ON compliance_rules;
CREATE POLICY "rules_select" ON compliance_rules FOR SELECT
  USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);
CREATE POLICY "rules_insert" ON compliance_rules FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "rules_update" ON compliance_rules FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "rules_delete" ON compliance_rules FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Vulnerability assessments (table may not exist)
ALTER TABLE IF EXISTS vulnerability_assessments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vulnerability_assessments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "allow_all_vuln" ON vulnerability_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "vuln_assessments_select" ON vulnerability_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "vuln_assessments_insert" ON vulnerability_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "vuln_assessments_update" ON vulnerability_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "vuln_assessments_delete" ON vulnerability_assessments';
    EXECUTE 'CREATE POLICY "vuln_assessments_select" ON vulnerability_assessments FOR SELECT USING (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "vuln_assessments_insert" ON vulnerability_assessments FOR INSERT WITH CHECK (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "vuln_assessments_update" ON vulnerability_assessments FOR UPDATE USING (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "vuln_assessments_delete" ON vulnerability_assessments FOR DELETE USING (firm_id = public.get_my_firm_id())';
  END IF;
END $$;

-- Consumer duty assessments (table may not exist)
ALTER TABLE IF EXISTS consumer_duty_assessments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consumer_duty_assessments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "allow_all_cd" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "cd_assessments_select" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "cd_assessments_insert" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "cd_assessments_update" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "cd_assessments_delete" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "consumer_duty_assessments_select" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "consumer_duty_assessments_insert" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "consumer_duty_assessments_update" ON consumer_duty_assessments';
    EXECUTE 'DROP POLICY IF EXISTS "consumer_duty_assessments_delete" ON consumer_duty_assessments';
    EXECUTE 'CREATE POLICY "consumer_duty_assessments_select" ON consumer_duty_assessments FOR SELECT USING (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "consumer_duty_assessments_insert" ON consumer_duty_assessments FOR INSERT WITH CHECK (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "consumer_duty_assessments_update" ON consumer_duty_assessments FOR UPDATE USING (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "consumer_duty_assessments_delete" ON consumer_duty_assessments FOR DELETE USING (firm_id = public.get_my_firm_id())';
  END IF;
END $$;

-- Consumer duty status
ALTER TABLE IF EXISTS consumer_duty_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all consumer_duty_status" ON consumer_duty_status;
DROP POLICY IF EXISTS "consumer_duty_status_select" ON consumer_duty_status;
DROP POLICY IF EXISTS "consumer_duty_status_insert" ON consumer_duty_status;
DROP POLICY IF EXISTS "consumer_duty_status_update" ON consumer_duty_status;
DROP POLICY IF EXISTS "consumer_duty_status_delete" ON consumer_duty_status;
CREATE POLICY "consumer_duty_status_select" ON consumer_duty_status FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "consumer_duty_status_insert" ON consumer_duty_status FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "consumer_duty_status_update" ON consumer_duty_status FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "consumer_duty_status_delete" ON consumer_duty_status FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- AML tables
ALTER TABLE IF EXISTS aml_client_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all aml_client_status" ON aml_client_status;
DROP POLICY IF EXISTS "aml_client_status_select" ON aml_client_status;
DROP POLICY IF EXISTS "aml_client_status_insert" ON aml_client_status;
DROP POLICY IF EXISTS "aml_client_status_update" ON aml_client_status;
DROP POLICY IF EXISTS "aml_client_status_delete" ON aml_client_status;
CREATE POLICY "aml_client_status_select" ON aml_client_status FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "aml_client_status_insert" ON aml_client_status FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "aml_client_status_update" ON aml_client_status FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "aml_client_status_delete" ON aml_client_status FOR DELETE
  USING (firm_id = public.get_my_firm_id());

ALTER TABLE IF EXISTS aml_check_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all aml_check_history" ON aml_check_history;
DROP POLICY IF EXISTS "aml_check_history_select" ON aml_check_history;
DROP POLICY IF EXISTS "aml_check_history_insert" ON aml_check_history;
DROP POLICY IF EXISTS "aml_check_history_update" ON aml_check_history;
DROP POLICY IF EXISTS "aml_check_history_delete" ON aml_check_history;
CREATE POLICY "aml_check_history_select" ON aml_check_history FOR SELECT
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "aml_check_history_insert" ON aml_check_history FOR INSERT
  WITH CHECK (firm_id = public.get_my_firm_id());
CREATE POLICY "aml_check_history_update" ON aml_check_history FOR UPDATE
  USING (firm_id = public.get_my_firm_id());
CREATE POLICY "aml_check_history_delete" ON aml_check_history FOR DELETE
  USING (firm_id = public.get_my_firm_id());

-- Assessment shares (keep token access controlled; firm scoping for internal access)
ALTER TABLE IF EXISTS assessment_shares ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_shares') THEN
    EXECUTE 'DROP POLICY IF EXISTS "assessment_shares_select" ON assessment_shares';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_shares_insert" ON assessment_shares';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_shares_update" ON assessment_shares';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_shares_delete" ON assessment_shares';
    EXECUTE 'CREATE POLICY "assessment_shares_select" ON assessment_shares FOR SELECT USING (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "assessment_shares_insert" ON assessment_shares FOR INSERT WITH CHECK (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "assessment_shares_update" ON assessment_shares FOR UPDATE USING (firm_id = public.get_my_firm_id())';
    EXECUTE 'CREATE POLICY "assessment_shares_delete" ON assessment_shares FOR DELETE USING (firm_id = public.get_my_firm_id())';
  END IF;
END $$;

COMMIT;
