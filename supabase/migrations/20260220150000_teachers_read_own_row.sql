-- Allow teachers to SELECT their own row from public.teachers.
-- Required for: teacher dashboard (lookup by school_id + email), and for
-- teacher_class_subjects RLS (teachers_read_own_assignments joins users -> teachers).

DROP POLICY IF EXISTS "teachers_read_own_row" ON public.teachers;

CREATE POLICY "teachers_read_own_row" ON public.teachers
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.users WHERE user_id = auth.uid() LIMIT 1) = 'teacher'
    AND school_id = (SELECT school_id FROM public.users WHERE user_id = auth.uid() LIMIT 1)
    AND LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = auth.uid() LIMIT 1)))
  );

COMMENT ON POLICY "teachers_read_own_row" ON public.teachers IS
  'Let teacher users read their own teachers row so dashboard and teacher_class_subjects RLS work.';
