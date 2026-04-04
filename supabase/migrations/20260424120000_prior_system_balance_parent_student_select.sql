-- Parents and students need SELECT on their own prior-system rows (not only school_staff by school_id).

DROP POLICY IF EXISTS "prior_system_balance_entries_parent_select"
  ON public.prior_system_balance_entries;

CREATE POLICY "prior_system_balance_entries_parent_select"
  ON public.prior_system_balance_entries FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT p.student_id FROM public.parents p
      WHERE p.parent_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "prior_system_balance_entries_student_select"
  ON public.prior_system_balance_entries;

CREATE POLICY "prior_system_balance_entries_student_select"
  ON public.prior_system_balance_entries FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT u.student_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.student_id IS NOT NULL
    )
  );
