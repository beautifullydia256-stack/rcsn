-- FINAL FIX: Completely replace the register_school_admin_with_referral function
-- This addresses the ON CONFLICT error by removing all problematic clauses

-- Drop the function first to ensure clean replacement
DROP FUNCTION IF EXISTS public.register_school_admin_with_referral(
  uuid, text, text, text, text, text, text, uuid
);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.register_school_admin_with_referral(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_phone text,
  p_school_name text,
  p_school_location text,
  p_school_type text,
  p_referral_code_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_user_exists boolean;
  v_ref record;
  v_affiliate_id uuid;
  v_aff_status text;
BEGIN
  -- Check if user already exists
  SELECT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) INTO v_user_exists;

  IF v_user_exists THEN
    SELECT school_id INTO v_school_id FROM users WHERE user_id = p_user_id;

    IF v_school_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', p_user_id,
        'message', 'User and school already exist'
      );
    END IF;
  END IF;

  -- Lock and validate the referral code
  SELECT
    rc.id,
    rc.affiliate_id,
    rc.is_active,
    rc.expires_at,
    rc.max_uses,
    rc.use_count,
    rc.type
  INTO v_ref
  FROM referral_codes rc
  WHERE rc.id = p_referral_code_id
  FOR UPDATE;

  IF v_ref.id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  -- Get affiliate status if needed (separate query to avoid record field issues)
  IF v_ref.affiliate_id IS NOT NULL THEN
    SELECT status INTO v_aff_status
    FROM affiliates
    WHERE affiliate_id = v_ref.affiliate_id;
  ELSE
    v_aff_status := NULL;
  END IF;

  -- Validate referral code
  IF NOT v_ref.is_active THEN
    RAISE EXCEPTION 'Inactive referral code';
  END IF;

  IF v_ref.expires_at IS NOT NULL AND v_ref.expires_at < now() THEN
    RAISE EXCEPTION 'Expired referral code';
  END IF;

  IF v_ref.max_uses IS NOT NULL AND v_ref.use_count >= v_ref.max_uses THEN
    RAISE EXCEPTION 'Referral code usage limit reached';
  END IF;

  -- Validate affiliate referral
  IF v_ref.type = 'AFFILIATE' THEN
    IF v_ref.affiliate_id IS NULL OR v_aff_status IS DISTINCT FROM 'ACTIVE' THEN
      RAISE EXCEPTION 'Invalid affiliate referral';
    END IF;
  ELSIF v_ref.type = 'ADMIN' THEN
    IF v_ref.affiliate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid admin referral';
    END IF;
  END IF;

  v_affiliate_id := v_ref.affiliate_id;

  -- Handle existing user case
  IF v_user_exists THEN
    v_school_id := gen_random_uuid();

    INSERT INTO schools (
      school_id,
      name,
      location,
      type,
      admin_id,
      subscription_plan,
      student_count,
      referral_code_id,
      affiliate_id
    ) VALUES (
      v_school_id,
      p_school_name,
      p_school_location,
      p_school_type,
      p_user_id,
      'Free (0-20)',
      0,
      p_referral_code_id,
      v_affiliate_id
    );

    UPDATE users
    SET school_id = v_school_id
    WHERE user_id = p_user_id;

    UPDATE referral_codes SET use_count = use_count + 1 WHERE id = p_referral_code_id;

    RETURN json_build_object(
      'success', true,
      'school_id', v_school_id,
      'admin_id', p_user_id,
      'message', 'School created and linked to existing user'
    );
  END IF;

  -- Create new school and user
  v_school_id := gen_random_uuid();

  INSERT INTO schools (
    school_id,
    name,
    location,
    type,
    admin_id,
    subscription_plan,
    student_count,
    referral_code_id,
    affiliate_id
  ) VALUES (
    v_school_id,
    p_school_name,
    p_school_location,
    p_school_type,
    NULL,
    'Free (0-20)',
    0,
    p_referral_code_id,
    v_affiliate_id
  );

  -- Handle user record creation/update without ON CONFLICT
  IF EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
    UPDATE users SET
      school_id = v_school_id,
      role = 'admin',
      email = p_email,
      name = p_name,
      phone = p_phone
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO users (
      user_id,
      role,
      email,
      password_hash,
      school_id,
      name,
      phone
    ) VALUES (
      p_user_id,
      'admin',
      p_email,
      '',
      v_school_id,
      p_name,
      p_phone
    );
  END IF;

  -- Update school with admin_id
  UPDATE schools
  SET admin_id = p_user_id
  WHERE school_id = v_school_id;

  -- Verify records were created
  IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND school_id = v_school_id) THEN
    RAISE EXCEPTION 'Failed to create user record with school_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id) THEN
    RAISE EXCEPTION 'Failed to create school record with admin_id';
  END IF;

  -- Try to create default exam sets (optional)
  BEGIN
    PERFORM insert_default_exam_sets_all_terms(v_school_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default exam sets for school %: %', v_school_id, SQLERRM;
  END;

  -- Increment referral usage
  UPDATE referral_codes SET use_count = use_count + 1 WHERE id = p_referral_code_id;

  RETURN json_build_object(
    'success', true,
    'school_id', v_school_id,
    'admin_id', p_user_id,
    'message', 'School and admin created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'register_school_admin_with_referral error: %', SQLERRM;
    -- Clean up on error
    IF v_school_id IS NOT NULL THEN
      DELETE FROM schools WHERE school_id = v_school_id AND (admin_id IS NULL OR admin_id = p_user_id);
    END IF;
    RAISE;
END;
$$;

-- Grant proper permissions
REVOKE ALL ON FUNCTION public.register_school_admin_with_referral(
  uuid, text, text, text, text, text, text, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_school_admin_with_referral(
  uuid, text, text, text, text, text, text, uuid
) TO service_role;