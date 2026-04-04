-- public.users.role is often title-cased in the UI; RPC used exact lowercase match and returned FALSE for e.g. "Admin".
-- Align with app normalizeManagerRole: lower, trim, spaces -> underscores.

CREATE OR REPLACE FUNCTION public.current_user_can_manage_students()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_role TEXT;
  v_role_norm TEXT;
  v_school UUID;
BEGIN
  SELECT u.role, u.school_id INTO v_role, v_school FROM public.users u WHERE u.user_id = v_uid LIMIT 1;
  IF v_school IS NULL THEN
    RETURN FALSE;
  END IF;
  v_role_norm := lower(regexp_replace(trim(COALESCE(v_role, '')), '\s+', '_', 'g'));
  IF v_role_norm IN ('admin', 'owner', 'head_teacher', 'accountant') THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_school_permissions p
    WHERE p.user_id = v_uid
      AND p.school_id = v_school
      AND p.permission_key = 'students.manage'
  );
END;
$$;

COMMENT ON FUNCTION public.current_user_can_manage_students() IS
  'True if caller may manage students/parent links: admin/owner/head_teacher/accountant (role normalized) or students.manage permission.';
