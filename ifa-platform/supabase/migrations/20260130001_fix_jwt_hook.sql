-- ================================================================
-- CRITICAL FIX: JWT Hook Role Claim Override
-- ================================================================
-- The custom_access_token_hook overwrites the JWT `role` claim with
-- the application role (e.g. 'advisor'). PostgREST uses the `role`
-- claim for SET ROLE, so it tries SET ROLE advisor — which fails.
-- FIX: Store under `app_role` instead, keeping `role` as `authenticated`.
-- ================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  profile_record RECORD;
BEGIN
  claims := event->'claims';

  -- Get user's firm_id and role from profiles
  SELECT firm_id, role INTO profile_record
  FROM profiles
  WHERE id = (event->>'user_id')::UUID;

  -- Inject firm_id into claims if found
  IF profile_record.firm_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(profile_record.firm_id::TEXT));
  END IF;

  -- FIXED: Store app role under 'app_role', NOT 'role'
  -- The 'role' claim MUST remain 'authenticated' for PostgREST to work
  IF profile_record.role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_role}', to_jsonb(profile_record.role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
