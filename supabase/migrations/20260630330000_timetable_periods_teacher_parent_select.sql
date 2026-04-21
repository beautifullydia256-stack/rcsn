-- Allow teachers, parents, and other school users to read periods for their school.
-- Previously only school creator (schools.admin_id) matched the ALL policy, so teachers saw empty timetables
-- while admins saw data in Timetable Designer (timetable_periods).

CREATE POLICY "timetable_periods_select_school_scope"
ON public.timetable_periods
FOR SELECT
TO authenticated
USING (
  school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL)
  OR school_id IN (SELECT s.school_id FROM public.schools s WHERE s.admin_id = (SELECT auth.uid()))
  OR teacher_id IN (
    SELECT t.teacher_id
    FROM public.teachers t
    INNER JOIN public.users u ON u.user_id = (SELECT auth.uid())
      AND lower(trim(coalesce(t.email, ''))) = lower(trim(coalesce(u.email, '')))
      AND t.school_id = timetable_periods.school_id
  )
);

COMMENT ON POLICY "timetable_periods_select_school_scope" ON public.timetable_periods IS
  'School members can view timetable periods for their school; admins retain full access via existing policy.';
