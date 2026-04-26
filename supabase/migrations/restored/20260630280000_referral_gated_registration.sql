-- Referral-gated school registration: referral_codes, affiliates reconciliation, schools FKs,
-- register_school_admin_with_referral (service_role only), lock down legacy RPCs.

-- ---------------------------------------------------------------------------
-- affiliates (admin-managed + optional legacy user_id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'affiliates'
  ) THEN
    CREATE TABLE public.affiliates (
      affiliate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text,
      phone text,
      email text NOT NULL,
      status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
      user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
      payment_info text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliates_email ON public.affiliates (lower(email));
    CREATE INDEX IF NOT EXISTS idx_affiliates_status ON public.affiliates (status);
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'name'
    ) THEN
      ALTER TABLE public.affiliates ADD COLUMN name text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'phone'
    ) THEN
      ALTER TABLE public.affiliates ADD COLUMN phone text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'status'
    ) THEN
      ALTER TABLE public.affiliates ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE';
    END IF;
    BEGIN
      ALTER TABLE public.affiliates ALTER COLUMN user_id DROP NOT NULL;
    EXCEPTION
      WHEN undefined_column THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
    UPDATE public.affiliates
    SET name = COALESCE(name, NULLIF(trim(split_part(email, '@', 1)), ''), 'Affiliate')
    WHERE name IS NULL;
  END IF;
END $$;

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- referral_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('ADMIN', 'AFFILIATE')),
  affiliate_id uuid REFERENCES public.affiliates (affiliate_id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer,
  expires_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_admin_affiliate_chk CHECK (
    (type = 'ADMIN' AND affiliate_id IS NULL)
    OR (type = 'AFFILIATE' AND affiliate_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_upper_key ON public.referral_codes (upper(code));
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- schools: referral linkage
-- ---------------------------------------------------------------------------
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS referral_code_id uuid REFERENCES public.referral_codes (id) ON DELETE SET NULL;
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates (affiliate_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_schools_referral_code_id ON public.schools (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_schools_affiliate_id ON public.schools (affiliate_id);

-- ---------------------------------------------------------------------------
-- Seed default admin code (uppercase for consistent lookup)
-- ---------------------------------------------------------------------------
INSERT INTO public.referral_codes (code, type, affiliate_id, is_active)
SELECT 'INTELIGENT-DEFAULT', 'ADMIN', NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_codes WHERE upper(trim(code)) = 'INTELIGENT-DEFAULT'
);

-- Optional: backfill from legacy affiliate_codes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'affiliate_codes'
  ) THEN
    INSERT INTO public.referral_codes (code, type, affiliate_id, is_active)
    SELECT upper(trim(ac.code)), 'AFFILIATE', ac.affiliate_id, true
    FROM public.affiliate_codes ac
    INNER JOIN public.affiliates af ON af.affiliate_id = ac.affiliate_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.referral_codes rc WHERE upper(trim(rc.code)) = upper(trim(ac.code))
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- register_school_admin_with_referral: same semantics as register_school_admin_final
-- plus referral lock/validate/increment. service_role ONLY.
-- ---------------------------------------------------------------------------
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

  -- Lock the referral code first
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

  -- Get affiliate status separately if needed
  IF v_ref.affiliate_id IS NOT NULL THEN
    SELECT status INTO v_ref.aff_status
    FROM affiliates
    WHERE affiliate_id = v_ref.affiliate_id;
  ELSE
    v_ref.aff_status := NULL;
  END IF;

  -- Get affiliate status separately if needed
  IF v_ref.affiliate_id IS NOT NULL THEN
    SELECT status INTO v_aff_status
    FROM affiliates
    WHERE affiliate_id = v_ref.affiliate_id;
  ELSE
    v_aff_status := NULL;
  END IF;

  IF NOT v_ref.is_active THEN
    RAISE EXCEPTION 'Inactive referral code';
  END IF;

  IF v_ref.expires_at IS NOT NULL AND v_ref.expires_at < now() THEN
    RAISE EXCEPTION 'Expired referral code';
  END IF;

  IF v_ref.max_uses IS NOT NULL AND v_ref.use_count >= v_ref.max_uses THEN
    RAISE EXCEPTION 'Referral code usage limit reached';
  END IF;

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
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    school_id = EXCLUDED.school_id,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;

  UPDATE schools
  SET admin_id = p_user_id
  WHERE school_id = v_school_id;

  IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND school_id = v_school_id) THEN
    RAISE EXCEPTION 'Failed to create user record with school_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id) THEN
    RAISE EXCEPTION 'Failed to create school record with admin_id';
  END IF;

  BEGIN
    PERFORM insert_default_exam_sets_all_terms(v_school_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default exam sets for school %: %', v_school_id, SQLERRM;
  END;

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
    IF v_school_id IS NOT NULL THEN
      DELETE FROM schools WHERE school_id = v_school_id AND (admin_id IS NULL OR admin_id = p_user_id);
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.register_school_admin_with_referral(
  uuid, text, text, text, text, text, text, uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_school_admin_with_referral(
  uuid, text, text, text, text, text, text, uuid
) TO service_role;

-- ---------------------------------------------------------------------------
-- Lock down legacy registration RPCs (anon/authenticated bypass prevention)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.register_school_admin_final(
    uuid, text, text, text, text, text, text
  ) FROM anon;
  REVOKE EXECUTE ON FUNCTION public.register_school_admin_final(
    uuid, text, text, text, text, text, text
  ) FROM authenticated;
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.register_school_admin_final(
  uuid, text, text, text, text, text, text
) TO service_role;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.register_school_admin_final(
    uuid, text, text, text, text, text, text
  ) FROM anon;
  REVOKE EXECUTE ON FUNCTION public.register_school_admin_final(
    uuid, text, text, text, text, text, text
  ) FROM authenticated;
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.register_google_admin(
    uuid, text, text, text, text, text
  ) TO service_role;
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;