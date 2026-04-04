-- Linter: multiple permissive SELECT policies for role authenticated (performance WARN).
-- Merge into one SELECT each; split former FOR ALL school policy into INSERT/UPDATE/DELETE only
-- so we do not re-introduce duplicate SELECT evaluation.

-- Shared predicate: school staff / delegated accounting / school-scoped user / school admin.
-- (Matches student_balances_authenticated in 20260415100000.)

-- =============================================================================
-- 1) public.parents — single SELECT; staff writes separate
-- =============================================================================
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.parents;
DROP POLICY IF EXISTS "parents_self_select_own_links" ON public.parents;

CREATE POLICY "parents_authenticated_select" ON public.parents
  FOR SELECT TO authenticated
  USING (
    (
      parents.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = parents.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR parents.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR parents.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
    OR parents.parent_id = (SELECT auth.uid())
    OR (
      parents.school_id IS NOT NULL
      AND parents.email IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id IS NOT NULL
          AND u.school_id = parents.school_id
          AND u.email IS NOT NULL
          AND lower(trim(both from u.email)) = lower(trim(both from parents.email))
      )
    )
  );

CREATE POLICY "parents_school_staff_insert" ON public.parents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "parents_school_staff_update" ON public.parents
  FOR UPDATE TO authenticated
  USING (
    (
      parents.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = parents.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR parents.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR parents.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (
      parents.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = parents.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR parents.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR parents.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "parents_school_staff_delete" ON public.parents
  FOR DELETE TO authenticated
  USING (
    (
      parents.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = parents.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR parents.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR parents.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "parents_authenticated_select" ON public.parents IS
  'Single SELECT: school staff, parents own links (parent_id or email match), for RLS subqueries and balances.';

-- =============================================================================
-- 2) public.prior_system_balance_entries — single SELECT; staff writes separate
-- =============================================================================
DROP POLICY IF EXISTS "prior_system_balance_entries_school_users" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_parent_select" ON public.prior_system_balance_entries;
DROP POLICY IF EXISTS "prior_system_balance_entries_student_select" ON public.prior_system_balance_entries;

CREATE POLICY "prior_system_balance_entries_authenticated_select" ON public.prior_system_balance_entries
  FOR SELECT TO authenticated
  USING (
    (
      prior_system_balance_entries.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = prior_system_balance_entries.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
    OR prior_system_balance_entries.student_id IN (
      SELECT p.student_id FROM public.parents p
      WHERE p.parent_id = (SELECT auth.uid())
    )
    OR prior_system_balance_entries.student_id IN (
      SELECT u.student_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.student_id IS NOT NULL
    )
  );

CREATE POLICY "prior_system_balance_entries_school_staff_insert" ON public.prior_system_balance_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "prior_system_balance_entries_school_staff_update" ON public.prior_system_balance_entries
  FOR UPDATE TO authenticated
  USING (
    (
      prior_system_balance_entries.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = prior_system_balance_entries.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (
      prior_system_balance_entries.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = prior_system_balance_entries.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "prior_system_balance_entries_school_staff_delete" ON public.prior_system_balance_entries
  FOR DELETE TO authenticated
  USING (
    (
      prior_system_balance_entries.school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.user_school_permissions perm
        WHERE perm.user_id = (SELECT auth.uid())
          AND perm.school_id = prior_system_balance_entries.school_id
          AND perm.permission_key = 'accounting.full'
      )
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
    OR prior_system_balance_entries.school_id IN (
      SELECT s.school_id FROM public.schools s
      WHERE s.admin_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "prior_system_balance_entries_authenticated_select" ON public.prior_system_balance_entries IS
  'Single SELECT: school staff, linked parents, own student — same visibility as before merge.';
