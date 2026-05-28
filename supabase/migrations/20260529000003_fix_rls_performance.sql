-- Fix Supabase performance advisor warnings:
--
-- 1. auth_rls_initplan on timetable_fixed_periods (both policies):
--    auth.uid() was called bare — PostgreSQL re-evaluates it for every row.
--    Fix: wrap with (SELECT auth.uid()) so it runs once as an InitPlan.
--
-- 2. multiple_permissive_policies on timetable_fixed_periods:
--    FOR ALL admin policy also creates a SELECT permission, producing two
--    permissive SELECT policies alongside the member read policy.
--    Fix: replace FOR ALL with explicit FOR INSERT / UPDATE / DELETE policies.
--
-- 3. multiple_permissive_policies on library:
--    allow_anon_select_library duplicates library_select (which is already
--    granted to PUBLIC, covering anon + authenticated).
--    Fix: drop the redundant policy.

-- ============================================================
-- timetable_fixed_periods
-- ============================================================

DROP POLICY IF EXISTS "school_members_read_timetable_fixed_periods"
  ON public.timetable_fixed_periods;
DROP POLICY IF EXISTS "school_admin_write_timetable_fixed_periods"
  ON public.timetable_fixed_periods;

-- Single SELECT policy — all school members can read their school's periods.
CREATE POLICY "school_members_read_timetable_fixed_periods"
  ON public.timetable_fixed_periods FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Admins/owners can insert new periods.
CREATE POLICY "school_admin_insert_timetable_fixed_periods"
  ON public.timetable_fixed_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'owner')
    )
  );

-- Admins/owners can update existing periods.
CREATE POLICY "school_admin_update_timetable_fixed_periods"
  ON public.timetable_fixed_periods FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'owner')
    )
  );

-- Admins/owners can delete periods.
CREATE POLICY "school_admin_delete_timetable_fixed_periods"
  ON public.timetable_fixed_periods FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM public.users
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- library
-- ============================================================

-- allow_anon_select_library (roles: anon, authenticated, qual: true) is
-- identical to library_select (roles: public, qual: true). Drop the duplicate.
DROP POLICY IF EXISTS "allow_anon_select_library" ON public.library;
