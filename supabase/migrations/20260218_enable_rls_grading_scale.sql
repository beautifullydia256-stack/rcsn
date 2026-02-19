-- Enable RLS on grading_scale (fixes Supabase lint: rls_disabled_in_public / 0013)
-- Table: public.grading_scale — school_id NULL = default scale; non-NULL = per-school scale.
-- Policies: SELECT = default scale + own school's scale; INSERT/UPDATE/DELETE = own school only (default scale stays read-only via API).
-- SECURITY DEFINER functions (e.g. grade calculation) bypass RLS, so triggers and backend logic are unchanged.

ALTER TABLE IF EXISTS public.grading_scale ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read default scale (school_id IS NULL) and their school's scale
CREATE POLICY "grading_scale_select"
  ON public.grading_scale
  FOR SELECT
  TO authenticated
  USING (
    school_id IS NULL
    OR school_id IN (
      SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())
    )
    OR school_id IN (
      SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid())
    )
  );

-- INSERT/UPDATE/DELETE: only school admins can manage their school's rows (not the default scale)
CREATE POLICY "grading_scale_modify"
  ON public.grading_scale
  FOR ALL
  TO authenticated
  USING (
    school_id IS NOT NULL
    AND (
      school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
      OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    school_id IS NOT NULL
    AND (
      school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
      OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid()))
    )
  );
