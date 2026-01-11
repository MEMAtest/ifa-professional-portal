-- =====================================================
-- Migration: Fix SECURITY DEFINER Functions
-- Purpose: Add permission checks to prevent unauthorized access
-- =====================================================

-- Drop and recreate functions with proper permission checks

-- Function to atomically check and allocate a seat
-- Now validates caller belongs to the firm
CREATE OR REPLACE FUNCTION allocate_firm_seat(
  p_firm_id UUID,
  p_user_id UUID,
  p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm_settings JSONB;
  v_max_seats INT;
  v_current_active INT;
  v_current_pending INT;
  v_total_used INT;
  v_caller_firm_id UUID;
BEGIN
  -- SECURITY: Verify caller belongs to the firm (via invitation)
  -- The invitation must exist and belong to this firm
  SELECT firm_id INTO v_caller_firm_id
  FROM user_invitations
  WHERE id = p_invitation_id
    AND firm_id = p_firm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Invalid invitation or firm mismatch'
    );
  END IF;

  -- Lock the firm row to prevent concurrent modifications
  SELECT settings INTO v_firm_settings
  FROM firms
  WHERE id = p_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FIRM_NOT_FOUND',
      'message', 'Firm not found'
    );
  END IF;

  -- Get max seats from settings (default to 3 if not set)
  v_max_seats := COALESCE((v_firm_settings->'billing'->>'maxSeats')::INT, 3);

  -- Count current active users (excluding the new user being created)
  SELECT COUNT(*) INTO v_current_active
  FROM profiles
  WHERE firm_id = p_firm_id
    AND status != 'deactivated'
    AND id != p_user_id;

  -- Count pending invitations (excluding the one being accepted)
  SELECT COUNT(*) INTO v_current_pending
  FROM user_invitations
  WHERE firm_id = p_firm_id
    AND accepted_at IS NULL
    AND expires_at > NOW()
    AND id != p_invitation_id;

  v_total_used := v_current_active + v_current_pending;

  -- Check if adding this user would exceed the limit
  IF v_current_active >= v_max_seats THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SEAT_LIMIT_REACHED',
      'message', format('Seat limit reached. Your firm has %s seats available.', v_max_seats),
      'currentSeats', v_current_active,
      'maxSeats', v_max_seats
    );
  END IF;

  -- Update seat count in firm settings
  UPDATE firms
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{billing,currentSeats}',
    to_jsonb(v_current_active + 1)
  )
  WHERE id = p_firm_id;

  RETURN jsonb_build_object(
    'success', true,
    'currentSeats', v_current_active + 1,
    'maxSeats', v_max_seats
  );
END;
$$;

-- Function to atomically mark invitation as accepted
-- Now validates the token matches
CREATE OR REPLACE FUNCTION accept_invitation(
  p_invitation_id UUID,
  p_hashed_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Lock and fetch the invitation
  -- SECURITY: Require both ID and token to match (prevents enumeration)
  SELECT id, email, role, firm_id, expires_at, accepted_at, token
  INTO v_invitation
  FROM user_invitations
  WHERE id = p_invitation_id
    AND token = p_hashed_token
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Don't reveal if ID exists but token is wrong
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_TOKEN',
      'message', 'Invalid invitation token'
    );
  END IF;

  -- Check if already accepted
  IF v_invitation.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_ACCEPTED',
      'message', 'This invitation has already been accepted'
    );
  END IF;

  -- Check if expired
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EXPIRED',
      'message', 'This invitation has expired'
    );
  END IF;

  -- Mark as accepted
  UPDATE user_invitations
  SET accepted_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'firmId', v_invitation.firm_id
  );
END;
$$;

-- Function for atomic new user invitation with seat check
-- Now validates caller is an admin of the firm
CREATE OR REPLACE FUNCTION create_invitation_with_seat_check(
  p_firm_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_invited_by UUID,
  p_hashed_token TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_firm_settings JSONB;
  v_max_seats INT;
  v_current_active INT;
  v_current_pending INT;
  v_total_used INT;
  v_invitation_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY: Verify caller (p_invited_by) is an admin of this firm
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = p_invited_by
    AND firm_id = p_firm_id
    AND status = 'active';

  IF NOT FOUND OR v_caller_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Only firm admins can send invitations'
    );
  END IF;

  -- Lock the firm row to prevent concurrent modifications
  SELECT settings INTO v_firm_settings
  FROM firms
  WHERE id = p_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'FIRM_NOT_FOUND',
      'message', 'Firm not found'
    );
  END IF;

  -- Get max seats from settings (default to 3 if not set)
  v_max_seats := COALESCE((v_firm_settings->'billing'->>'maxSeats')::INT, 3);

  -- Count current active users
  SELECT COUNT(*) INTO v_current_active
  FROM profiles
  WHERE firm_id = p_firm_id
    AND status != 'deactivated';

  -- Count pending invitations
  SELECT COUNT(*) INTO v_current_pending
  FROM user_invitations
  WHERE firm_id = p_firm_id
    AND accepted_at IS NULL
    AND expires_at > NOW();

  v_total_used := v_current_active + v_current_pending;

  -- Check if we have room for another invitation
  IF v_total_used >= v_max_seats THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SEAT_LIMIT_REACHED',
      'message', format('Seat limit reached. Your firm has %s seats. Contact support to upgrade.', v_max_seats),
      'currentSeats', v_total_used,
      'maxSeats', v_max_seats
    );
  END IF;

  -- Check for existing pending invitation
  SELECT id INTO v_invitation_id
  FROM user_invitations
  WHERE firm_id = p_firm_id
    AND LOWER(email) = LOWER(p_email)
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_EXISTS',
      'message', 'An invitation is already pending for this email'
    );
  END IF;

  -- Create the invitation
  INSERT INTO user_invitations (
    firm_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) VALUES (
    p_firm_id,
    LOWER(p_email),
    p_role,
    p_invited_by,
    p_hashed_token,
    p_expires_at
  )
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitationId', v_invitation_id,
    'currentSeats', v_total_used + 1,
    'maxSeats', v_max_seats
  );
END;
$$;

-- Ensure functions have appropriate permissions
REVOKE ALL ON FUNCTION allocate_firm_seat FROM PUBLIC;
REVOKE ALL ON FUNCTION accept_invitation FROM PUBLIC;
REVOKE ALL ON FUNCTION create_invitation_with_seat_check FROM PUBLIC;

GRANT EXECUTE ON FUNCTION allocate_firm_seat TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation_with_seat_check TO authenticated;

-- Also grant to service_role for server-side operations
GRANT EXECUTE ON FUNCTION allocate_firm_seat TO service_role;
GRANT EXECUTE ON FUNCTION accept_invitation TO service_role;
GRANT EXECUTE ON FUNCTION create_invitation_with_seat_check TO service_role;

COMMENT ON FUNCTION allocate_firm_seat IS 'Atomically allocates a seat for a new user with proper locking and permission checks';
COMMENT ON FUNCTION accept_invitation IS 'Atomically marks an invitation as accepted with race condition protection';
COMMENT ON FUNCTION create_invitation_with_seat_check IS 'Creates an invitation with atomic seat limit checking and admin verification';
