-- Fix students RLS so Billing (and other accountant flows) can load students.
-- 1. Use (SELECT auth.uid()) for consistent evaluation (avoid initplan issues).
-- 2. Allow SELECT for any school the user is linked to in public.users (not only role = 'accountant'),
--    so the same schoolId from profile always sees students regardless of which role row was returned.

DROP POLICY IF EXISTS "students accountant select" ON public.students;

CREATE POLICY "students accountant select" ON public.students
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

COMMENT ON POLICY "students accountant select" ON public.students IS
  'Allow users (e.g. accountant, admin, teacher) to read students for any school they are linked to in users.';
