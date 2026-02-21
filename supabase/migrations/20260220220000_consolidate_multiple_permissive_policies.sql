-- Fix linter: Multiple Permissive Policies — one SELECT policy per table for role authenticated.
-- 1. global_terms: split global_terms_manage so SELECT has only global_terms_select.
-- 2. students: drop students_school_scoped, keep students accountant select (single SELECT).
-- 3. teachers: merge optimized_authenticated_access + teachers_read_own_row into one SELECT policy.

-- =============================================================================
-- 1. GLOBAL_TERMS — one SELECT policy (global_terms_select); owner manage = INSERT/UPDATE/DELETE only
-- =============================================================================
DROP POLICY IF EXISTS "global_terms_manage" ON public.global_terms;

CREATE POLICY "global_terms_manage_insert" ON public.global_terms
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM public.users WHERE user_id = (SELECT auth.uid())) = 'owner');

CREATE POLICY "global_terms_manage_update" ON public.global_terms
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM public.users WHERE user_id = (SELECT auth.uid())) = 'owner')
  WITH CHECK ((SELECT role FROM public.users WHERE user_id = (SELECT auth.uid())) = 'owner');

CREATE POLICY "global_terms_manage_delete" ON public.global_terms
  FOR DELETE TO authenticated
  USING ((SELECT role FROM public.users WHERE user_id = (SELECT auth.uid())) = 'owner');

-- global_terms_select (FOR SELECT, USING true) already exists — no change. Result: one SELECT policy.

-- =============================================================================
-- 2. STUDENTS — drop duplicate SELECT policy so only "students accountant select" remains
-- =============================================================================
DROP POLICY IF EXISTS "students_school_scoped" ON public.students;

-- =============================================================================
-- 3. TEACHERS — single SELECT policy: school-scoped OR teacher own row
-- =============================================================================
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.teachers;
DROP POLICY IF EXISTS "teachers_read_own_row" ON public.teachers;

CREATE POLICY "teachers_select" ON public.teachers
  FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) AND school_id IS NOT NULL)
    OR (
      (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'teacher'
      AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
      AND LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)))
    )
  );

COMMENT ON POLICY "teachers_select" ON public.teachers IS
  'Single SELECT: users can read teachers in their school, or teachers can read their own row.';
