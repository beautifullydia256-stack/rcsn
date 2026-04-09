-- report_snapshots: replace single SELECT policy with three permissive policies.
-- Staff policy matches school only (no join to generated_reports).
-- Avoids RLS cross-table recursion that can surface as PostgREST 500 on
-- GET /report_snapshots?select=id&school_id=eq.<uuid>

DROP POLICY IF EXISTS "report_snapshots_select_authenticated" ON public.report_snapshots;

CREATE POLICY "report_snapshots_select_staff_school"
  ON public.report_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.school_id = report_snapshots.school_id
        AND lower(trim(u.role::text)) IN (
          'admin',
          'accountant',
          'teacher',
          'head_teacher',
          'owner',
          'librarian',
          'lab_technician',
          'clinician'
        )
    )
  );

CREATE POLICY "report_snapshots_select_parent_child"
  ON public.report_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.generated_reports gr
      INNER JOIN public.parents p
        ON p.student_id = gr.student_id
        AND p.parent_id = (SELECT auth.uid())
        AND p.school_id = report_snapshots.school_id
      WHERE gr.snapshot_id = report_snapshots.id
    )
  );

CREATE POLICY "report_snapshots_select_student_own"
  ON public.report_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.generated_reports gr
      INNER JOIN public.users u
        ON u.user_id = (SELECT auth.uid())
        AND u.student_id = gr.student_id
      WHERE gr.snapshot_id = report_snapshots.id
    )
  );
