-- =====================================================
-- Migration: Fix Hardcoded Seat Limit
-- Purpose: Change default maxSeats from 3 to 1 in database functions
-- This fixes the issue where seat limits were hardcoded to 3 instead of
-- being derived from the firm's Stripe subscription.
-- =====================================================

-- Function to atomically check and allocate a seat
-- Returns: JSON with success status and message
CREATE OR REPLACE FUNCTION allocate_firm_seat(
  p_firm_id UUID,
  p_user_id UUID,
  p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_firm_settings JSONB;
  v_max_seats INT;
  v_current_active INT;
  v_current_pending INT;
  v_total_used INT;
BEGIN
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

  -- Get max seats from settings (default to 1 if not set)
  -- maxSeats should come from Stripe subscription, 1 is the minimum default
  v_max_seats := COALESCE((v_firm_settings->'billing'->>'maxSeats')::INT, 1);

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
  -- We allow the acceptance since the invitation was already counted
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

-- Function to create invitation with atomic seat check
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
AS $$
DECLARE
  v_firm_settings JSONB;
  v_max_seats INT;
  v_current_active INT;
  v_current_pending INT;
  v_total_used INT;
  v_invitation_id UUID;
  v_existing_invitation_id UUID;
BEGIN
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

  -- Get max seats from settings (default to 1 if not set)
  -- maxSeats should come from Stripe subscription, 1 is the minimum default
  v_max_seats := COALESCE((v_firm_settings->'billing'->>'maxSeats')::INT, 1);

  -- Check for existing pending invitation for this email
  SELECT id INTO v_existing_invitation_id
  FROM user_invitations
  WHERE firm_id = p_firm_id
    AND email = p_email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  IF v_existing_invitation_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_EXISTS',
      'message', 'An invitation already exists for this email'
    );
  END IF;

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

  -- Check seat limit before creating invitation
  IF v_total_used >= v_max_seats THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SEAT_LIMIT_REACHED',
      'message', format('Seat limit reached. Your firm has %s seats available.', v_max_seats),
      'currentSeats', v_total_used,
      'maxSeats', v_max_seats
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
    p_email,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION allocate_firm_seat(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation_with_seat_check(UUID, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
