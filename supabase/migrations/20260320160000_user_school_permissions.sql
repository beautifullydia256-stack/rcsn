-- Delegated permissions: admin/owner/head_teacher can grant capabilities (e.g. teacher enrols students, teacher acts as accountant).
-- Replaces permissive students_school_* policies with role + permission checks.

-- 1) Table
CREATE TABLE IF NOT EXISTS public.user_school_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_school_permissions_unique UNIQUE (user_id, school_id, permission_key),
  CONSTRAINT user_school_permissions_key_check CHECK (
    permission_key IN ('students.manage', 'accounting.full')
  )
);

CREATE INDEX IF NOT EXISTS idx_user_school_permissions_user ON public.user_school_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_school_permissions_school ON public.user_school_permissions (school_id);

COMMENT ON TABLE public.user_school_permissions IS
  'Extra capabilities granted by school admins; primary role stays in public.users.role.';

-- 2) Helpers (SECURITY INVOKER: RLS on user_school_permissions applies to the caller)
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$$;

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
  v_school UUID;
BEGIN
  SELECT u.role, u.school_id INTO v_role, v_school FROM public.users u WHERE u.user_id = v_uid LIMIT 1;
  IF v_school IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_role IN ('admin', 'owner', 'head_teacher', 'accountant') THEN
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

CREATE OR REPLACE FUNCTION public.current_user_can_access_accounting()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_role TEXT;
  v_school UUID;
BEGIN
  SELECT u.role, u.school_id INTO v_role, v_school FROM public.users u WHERE u.user_id = v_uid LIMIT 1;
  IF v_school IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_role = 'accountant' THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_school_permissions p
    WHERE p.user_id = v_uid
      AND p.school_id = v_school
      AND p.permission_key = 'accounting.full'
  );
END;
$$;

-- 3) RLS on user_school_permissions
ALTER TABLE public.user_school_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_school_permissions_select_own" ON public.user_school_permissions;
CREATE POLICY "user_school_permissions_select_own"
  ON public.user_school_permissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  );

DROP POLICY IF EXISTS "user_school_permissions_insert_admin" ON public.user_school_permissions;
CREATE POLICY "user_school_permissions_insert_admin"
  ON public.user_school_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
    AND EXISTS (
      SELECT 1
      FROM public.users t
      WHERE t.user_id = user_id
        AND t.school_id = school_id
    )
  );

DROP POLICY IF EXISTS "user_school_permissions_delete_admin" ON public.user_school_permissions;
CREATE POLICY "user_school_permissions_delete_admin"
  ON public.user_school_permissions
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  );

-- 4) Tighten students INSERT/UPDATE/DELETE (replace broad school-linked policies)
DROP POLICY IF EXISTS "students_school_insert" ON public.students;
DROP POLICY IF EXISTS "students_school_update" ON public.students;
DROP POLICY IF EXISTS "students_school_delete" ON public.students;

CREATE POLICY "students_school_insert" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND public.current_user_can_manage_students()
  );

CREATE POLICY "students_school_update" ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_can_manage_students()
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND public.current_user_can_manage_students()
  );

CREATE POLICY "students_school_delete" ON public.students
  FOR DELETE
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_can_manage_students()
  );

COMMENT ON POLICY "students_school_insert" ON public.students IS
  'Admin/owner/head_teacher/accountant, or delegated students.manage permission.';

-- 5) Delegated accounting.full: finance write paths (teacher-as-accountant) — same school only
DROP POLICY IF EXISTS "student_payments_delegated_accounting" ON public.student_payments;
DROP POLICY IF EXISTS "student_balances_delegated_accounting_select" ON public.student_balances;
DROP POLICY IF EXISTS "student_balances_delegated_accounting_insert" ON public.student_balances;
DROP POLICY IF EXISTS "student_balances_delegated_accounting_update" ON public.student_balances;
DROP POLICY IF EXISTS "school_expenses_delegated_select" ON public.school_expenses;
DROP POLICY IF EXISTS "school_expenses_delegated_insert" ON public.school_expenses;
DROP POLICY IF EXISTS "classes_delegated_accounting_select" ON public.classes;

CREATE POLICY "student_payments_delegated_accounting" ON public.student_payments
  FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = student_payments.school_id
        AND p.permission_key = 'accounting.full'
    )
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = student_payments.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

CREATE POLICY "student_balances_delegated_accounting_select" ON public.student_balances
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = student_balances.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

CREATE POLICY "student_balances_delegated_accounting_insert" ON public.student_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = student_balances.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

CREATE POLICY "student_balances_delegated_accounting_update" ON public.student_balances
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = student_balances.school_id
        AND p.permission_key = 'accounting.full'
    )
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = student_balances.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

CREATE POLICY "school_expenses_delegated_select" ON public.school_expenses
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = school_expenses.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

CREATE POLICY "school_expenses_delegated_insert" ON public.school_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = school_expenses.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

CREATE POLICY "classes_delegated_accounting_select" ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = classes.school_id
        AND p.permission_key = 'accounting.full'
    )
  );

-- Optional one-time backfill if teachers lost student INSERT after deploy (run manually in SQL editor if needed):
-- INSERT INTO public.user_school_permissions (user_id, school_id, permission_key)
-- SELECT u.user_id, u.school_id, 'students.manage'
-- FROM public.users u
-- WHERE u.role = 'teacher' AND u.school_id IS NOT NULL
-- ON CONFLICT DO NOTHING;
