-- Scope report_snapshots and generated_reports SELECT for parents and students.
-- Replaces school-wide access for those roles so parents only see linked children and students only own rows.

DROP POLICY IF EXISTS "Users can view snapshots for their school" ON public.report_snapshots;
DROP POLICY IF EXISTS "Staff can view report snapshots for their school" ON public.report_snapshots;
DROP POLICY IF EXISTS "Parents can view report snapshots for their children" ON public.report_snapshots;
DROP POLICY IF EXISTS "report_snapshots_select_authenticated" ON public.report_snapshots;

CREATE POLICY "report_snapshots_select_authenticated"
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
    OR EXISTS (
      SELECT 1
      FROM public.generated_reports gr
      INNER JOIN public.parents p
        ON p.student_id = gr.student_id
        AND p.parent_id = (SELECT auth.uid())
        AND p.school_id = report_snapshots.school_id
      WHERE gr.snapshot_id = report_snapshots.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.generated_reports gr
      INNER JOIN public.users u
        ON u.user_id = (SELECT auth.uid())
        AND u.student_id = gr.student_id
      WHERE gr.snapshot_id = report_snapshots.id
    )
  );

DROP POLICY IF EXISTS "Users can view generated reports for their school" ON public.generated_reports;
DROP POLICY IF EXISTS "Staff can view generated reports for their school" ON public.generated_reports;
DROP POLICY IF EXISTS "Parents can view generated reports for linked students" ON public.generated_reports;
DROP POLICY IF EXISTS "generated_reports_select_authenticated" ON public.generated_reports;

CREATE POLICY "generated_reports_select_authenticated"
  ON public.generated_reports
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT p.student_id
      FROM public.parents p
      WHERE p.parent_id = (SELECT auth.uid())
    )
    OR student_id IN (
      SELECT u.student_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.student_id IS NOT NULL
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id IS NOT NULL
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
      AND snapshot_id IN (
        SELECT rs.id
        FROM public.report_snapshots rs
        WHERE rs.school_id IN (
          SELECT u2.school_id
          FROM public.users u2
          WHERE u2.user_id = (SELECT auth.uid())
        )
      )
    )
  );
