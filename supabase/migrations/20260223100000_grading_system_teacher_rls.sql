-- Grading System: allow teachers (and head_teacher, owner, admin) to manage their school's grading scale.
-- So the Teacher Grading System page can copy default scale and do full CRUD on grading_scale for their school.
-- Default scale (school_id IS NULL) remains read-only; only rows with school_id = user's school can be modified.

-- Drop the existing modify policy (admin-only)
DROP POLICY IF EXISTS "grading_scale_modify" ON public.grading_scale;

-- New policy: any authenticated user in the school with role admin, owner, head_teacher, or teacher
-- can INSERT, UPDATE, DELETE rows where school_id = their school (never the default scale).
CREATE POLICY "grading_scale_modify"
  ON public.grading_scale
  FOR ALL
  TO authenticated
  USING (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.role IN ('admin', 'owner', 'head_teacher', 'teacher')
    )
  )
  WITH CHECK (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.role IN ('admin', 'owner', 'head_teacher', 'teacher')
    )
  );

COMMENT ON POLICY "grading_scale_modify" ON public.grading_scale IS
  'Teachers and admins can add/edit/delete their school''s grading scale (school_id set). Default scale (school_id NULL) is read-only.';
