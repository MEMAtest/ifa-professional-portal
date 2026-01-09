-- Migration: Fix Critical RLS Issues (without GRANT/REVOKE)
-- Run individual statements without transaction

-- STEP 1: IMPROVED JWT HOOK WITH ERROR HANDLING
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
    RAISE WARNING '[JWT Hook] Missing user_id in event';
    RETURN event;
  END IF;

  BEGIN
    SELECT firm_id, role INTO profile_record
    FROM profiles
    WHERE id = user_id_text::UUID;

    IF NOT FOUND THEN
      RAISE WARNING '[JWT Hook] Profile not found for user %', user_id_text;
      RETURN event;
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE WARNING '[JWT Hook] Invalid UUID format: %', user_id_text;
      RETURN event;
    WHEN OTHERS THEN
      RAISE WARNING '[JWT Hook] Error fetching profile: %', SQLERRM;
      RETURN event;
  END;

  IF profile_record.firm_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(profile_record.firm_id::TEXT));
  ELSE
    RAISE WARNING '[JWT Hook] User % has no firm_id assigned', user_id_text;
  END IF;

  IF profile_record.role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(profile_record.role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- STEP 2: FIX get_my_firm_id TO BE VOLATILE
CREATE OR REPLACE FUNCTION public.get_my_firm_id()
RETURNS UUID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid();
$$;

-- STEP 3: RPC FUNCTION TO FETCH USER EMAILS
CREATE OR REPLACE FUNCTION public.get_firm_user_emails(firm_uuid UUID)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id as user_id,
    au.email::TEXT as email
  FROM auth.users au
  INNER JOIN profiles p ON p.id = au.id
  WHERE p.firm_id = firm_uuid;
$$;

-- STEP 4: FIX CLIENTS TABLE
DROP POLICY IF EXISTS "Users can view clients in their firm" ON clients;
DROP POLICY IF EXISTS "Users can insert clients in their firm" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their firm" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their firm" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients in their firm" ON clients;

CREATE POLICY "Users can view clients in their firm"
ON clients FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert clients in their firm"
ON clients FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update clients in their firm"
ON clients FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Admins can delete clients in their firm"
ON clients FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 5: FIX PROFILES TABLE
DROP POLICY IF EXISTS "Users can view profiles in their firm" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in their firm" ON profiles;

CREATE POLICY "Users can view profiles in their firm"
ON profiles FOR SELECT
USING (firm_id = public.get_my_firm_id() OR id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can delete profiles in their firm"
ON profiles FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
  AND id != auth.uid()
);

-- STEP 6: FIX FILE_REVIEWS TABLE
DROP POLICY IF EXISTS "Users can view file reviews in their firm" ON file_reviews;
DROP POLICY IF EXISTS "Users can insert file reviews in their firm" ON file_reviews;
DROP POLICY IF EXISTS "Users can update file reviews in their firm" ON file_reviews;
DROP POLICY IF EXISTS "Supervisors can delete file reviews in their firm" ON file_reviews;

CREATE POLICY "Users can view file reviews in their firm"
ON file_reviews FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert file reviews in their firm"
ON file_reviews FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update file reviews in their firm"
ON file_reviews FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Supervisors can delete file reviews in their firm"
ON file_reviews FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 7: FIX COMPLAINT_REGISTER TABLE
DROP POLICY IF EXISTS "Users can view complaints in their firm" ON complaint_register;
DROP POLICY IF EXISTS "Users can insert complaints in their firm" ON complaint_register;
DROP POLICY IF EXISTS "Users can update complaints in their firm" ON complaint_register;
DROP POLICY IF EXISTS "Supervisors can delete complaints in their firm" ON complaint_register;

CREATE POLICY "Users can view complaints in their firm"
ON complaint_register FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert complaints in their firm"
ON complaint_register FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update complaints in their firm"
ON complaint_register FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Supervisors can delete complaints in their firm"
ON complaint_register FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 8: FIX BREACH_REGISTER TABLE
DROP POLICY IF EXISTS "Users can view breaches in their firm" ON breach_register;
DROP POLICY IF EXISTS "Users can insert breaches in their firm" ON breach_register;
DROP POLICY IF EXISTS "Users can update breaches in their firm" ON breach_register;
DROP POLICY IF EXISTS "Supervisors can delete breaches in their firm" ON breach_register;

CREATE POLICY "Users can view breaches in their firm"
ON breach_register FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert breaches in their firm"
ON breach_register FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update breaches in their firm"
ON breach_register FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Supervisors can delete breaches in their firm"
ON breach_register FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 9: FIX VULNERABILITY_REGISTER TABLE
DROP POLICY IF EXISTS "Users can view vulnerabilities in their firm" ON vulnerability_register;
DROP POLICY IF EXISTS "Users can insert vulnerabilities in their firm" ON vulnerability_register;
DROP POLICY IF EXISTS "Users can update vulnerabilities in their firm" ON vulnerability_register;
DROP POLICY IF EXISTS "Supervisors can delete vulnerabilities in their firm" ON vulnerability_register;

CREATE POLICY "Users can view vulnerabilities in their firm"
ON vulnerability_register FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert vulnerabilities in their firm"
ON vulnerability_register FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update vulnerabilities in their firm"
ON vulnerability_register FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Supervisors can delete vulnerabilities in their firm"
ON vulnerability_register FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 10: FIX CLIENT_SERVICES TABLE
DROP POLICY IF EXISTS "Users can view client services in their firm" ON client_services;
DROP POLICY IF EXISTS "Users can insert client services in their firm" ON client_services;
DROP POLICY IF EXISTS "Users can update client services in their firm" ON client_services;
DROP POLICY IF EXISTS "Supervisors can delete client services in their firm" ON client_services;

CREATE POLICY "Users can view client services in their firm"
ON client_services FOR SELECT
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can insert client services in their firm"
ON client_services FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update client services in their firm"
ON client_services FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Supervisors can delete client services in their firm"
ON client_services FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 11: FIX AML_CLIENT_STATUS TABLE
DROP POLICY IF EXISTS "Users can view AML status for clients in their firm" ON aml_client_status;
DROP POLICY IF EXISTS "Users can insert AML status for clients in their firm" ON aml_client_status;
DROP POLICY IF EXISTS "Users can update AML status for clients in their firm" ON aml_client_status;
DROP POLICY IF EXISTS "Supervisors can delete AML status for clients in their firm" ON aml_client_status;

CREATE POLICY "Users can view AML status for clients in their firm"
ON aml_client_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert AML status for clients in their firm"
ON aml_client_status FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can update AML status for clients in their firm"
ON aml_client_status FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete AML status for clients in their firm"
ON aml_client_status FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = aml_client_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 12: FIX AML_CHECK_HISTORY TABLE
DROP POLICY IF EXISTS "Users can view AML history for clients in their firm" ON aml_check_history;
DROP POLICY IF EXISTS "Users can insert AML history for clients in their firm" ON aml_check_history;
DROP POLICY IF EXISTS "Supervisors can delete AML history" ON aml_check_history;

CREATE POLICY "Users can view AML history for clients in their firm"
ON aml_check_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM aml_client_status acs
    JOIN clients c ON c.id = acs.client_id
    WHERE acs.id = aml_check_history.aml_client_status_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert AML history for clients in their firm"
ON aml_check_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM aml_client_status acs
    JOIN clients c ON c.id = acs.client_id
    WHERE acs.id = aml_check_history.aml_client_status_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete AML history"
ON aml_check_history FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM aml_client_status acs
    JOIN clients c ON c.id = acs.client_id
    WHERE acs.id = aml_check_history.aml_client_status_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 13: FIX CONSUMER_DUTY_STATUS TABLE
DROP POLICY IF EXISTS "Users can view consumer duty status for clients in their firm" ON consumer_duty_status;
DROP POLICY IF EXISTS "Users can insert consumer duty status for clients in their firm" ON consumer_duty_status;
DROP POLICY IF EXISTS "Users can update consumer duty status for clients in their firm" ON consumer_duty_status;
DROP POLICY IF EXISTS "Supervisors can delete consumer duty status" ON consumer_duty_status;

CREATE POLICY "Users can view consumer duty status for clients in their firm"
ON consumer_duty_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can insert consumer duty status for clients in their firm"
ON consumer_duty_status FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Users can update consumer duty status for clients in their firm"
ON consumer_duty_status FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
);

CREATE POLICY "Supervisors can delete consumer duty status"
ON consumer_duty_status FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consumer_duty_status.client_id
    AND c.firm_id = public.get_my_firm_id()
  )
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'supervisor')
  )
);

-- STEP 14: FIX COMPLIANCE_RULES TABLE
DROP POLICY IF EXISTS "Users can view compliance rules in their firm" ON compliance_rules;
DROP POLICY IF EXISTS "Users can view compliance rules" ON compliance_rules;
DROP POLICY IF EXISTS "Users can insert compliance rules in their firm" ON compliance_rules;
DROP POLICY IF EXISTS "Users can update compliance rules in their firm" ON compliance_rules;
DROP POLICY IF EXISTS "Admins can delete compliance rules in their firm" ON compliance_rules;

CREATE POLICY "Users can view compliance rules"
ON compliance_rules FOR SELECT
USING (firm_id = public.get_my_firm_id() OR firm_id IS NULL);

CREATE POLICY "Users can insert compliance rules in their firm"
ON compliance_rules FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update compliance rules in their firm"
ON compliance_rules FOR UPDATE
USING (firm_id = public.get_my_firm_id());

CREATE POLICY "Admins can delete compliance rules in their firm"
ON compliance_rules FOR DELETE
USING (
  firm_id = public.get_my_firm_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- STEP 15: FIX NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view notifications in their firm" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications in their firm" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications in their firm" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view notifications in their firm"
ON notifications FOR SELECT
USING (firm_id = public.get_my_firm_id() OR user_id = auth.uid());

CREATE POLICY "Users can insert notifications in their firm"
ON notifications FOR INSERT
WITH CHECK (firm_id = public.get_my_firm_id());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid() OR firm_id = public.get_my_firm_id());

CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (user_id = auth.uid());
