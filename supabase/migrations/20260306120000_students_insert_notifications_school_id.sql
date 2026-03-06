-- Fix Add Student 403 and Notifications 400
-- 1. Students: allow INSERT/UPDATE/DELETE for users linked to the school (same school_id in users).
--    Only "students accountant select" existed; INSERT was denied → 403.
-- 2. Notifications: app queries by school_id but table had no school_id → 400.
--    Add school_id column and policy so school users can SELECT notifications for their school.

-- =============================================================================
-- 1. STUDENTS — INSERT, UPDATE, DELETE for school-linked users
-- =============================================================================
CREATE POLICY "students_school_insert" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

CREATE POLICY "students_school_update" ON public.students
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

CREATE POLICY "students_school_delete" ON public.students
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

COMMENT ON POLICY "students_school_insert" ON public.students IS
  'Allow users (admin, etc.) to insert students for a school they are linked to in users.';
COMMENT ON POLICY "students_school_update" ON public.students IS
  'Allow school-linked users to update students in their school.';
COMMENT ON POLICY "students_school_delete" ON public.students IS
  'Allow school-linked users to delete students in their school.';

-- =============================================================================
-- 2. NOTIFICATIONS — add school_id and allow school-scoped SELECT
-- =============================================================================
-- Add school_id if missing (app uses it for admin dashboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN school_id UUID REFERENCES public.schools(school_id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.notifications(school_id);
  END IF;
END $$;

-- Allow SELECT by school_id for users linked to that school (keeps existing user_id policy for personal notifications)
DROP POLICY IF EXISTS "notifications_school_select" ON public.notifications;
CREATE POLICY "notifications_school_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (school_id IS NOT NULL AND school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    ))
    OR user_id = (SELECT auth.uid())
  );

-- Allow INSERT with school_id for school-linked users (e.g. admin announcements)
DROP POLICY IF EXISTS "notifications_school_insert" ON public.notifications;
CREATE POLICY "notifications_school_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IS NULL
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL
    )
  );
