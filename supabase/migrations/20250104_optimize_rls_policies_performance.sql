-- Optimize RLS policies for better performance
-- Fixes auth_rls_initplan and multiple_permissive_policies warnings

-- ============================================================================
-- 1. Fix auth_rls_initplan warnings by wrapping auth.uid() in (select ...)
-- ============================================================================

-- Notifications policies
DROP POLICY IF EXISTS "notifications_user_view" ON public.notifications;
CREATE POLICY "notifications_user_view" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
CREATE POLICY "notifications_user_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Timetables policies
DROP POLICY IF EXISTS "timetables_teacher_view" ON public.timetables;
CREATE POLICY "timetables_teacher_view" ON public.timetables
  FOR SELECT TO authenticated
  USING (
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "timetables_admin_manage" ON public.timetables;
CREATE POLICY "timetables_admin_manage" ON public.timetables
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- Timetable periods policy
DROP POLICY IF EXISTS "school admins can manage timetable periods" ON public.timetable_periods;
CREATE POLICY "school admins can manage timetable periods" ON public.timetable_periods
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  )
  WITH CHECK (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  );

-- Assignments policies
DROP POLICY IF EXISTS "assignments_teacher_manage" ON public.assignments;
CREATE POLICY "assignments_teacher_manage" ON public.assignments
  FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  )
  WITH CHECK (
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "assignments_student_view" ON public.assignments;
CREATE POLICY "assignments_student_view" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    class_name IN (
      SELECT current_class FROM public.students 
      WHERE student_id IN (
        SELECT student_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
  );

-- Assignment submissions policies
DROP POLICY IF EXISTS "assignment_submissions_student_submit" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_student_submit" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT student_id FROM public.users WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_teacher_manage" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (
    assignment_id IN (
      SELECT id FROM public.assignments 
      WHERE teacher_id IN (
        SELECT teacher_id FROM public.teachers 
        WHERE school_id IN (
          SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM public.assignments 
      WHERE teacher_id IN (
        SELECT teacher_id FROM public.teachers 
        WHERE school_id IN (
          SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
        )
      )
    )
  );

-- Messages policies
DROP POLICY IF EXISTS "messages_user_view" ON public.messages;
CREATE POLICY "messages_user_view" ON public.messages
  FOR SELECT TO authenticated
  USING (
    recipient_id = (select auth.uid())
    OR sender_id = (select auth.uid())
    OR (
      recipient_type = 'teacher' AND recipient_id IN (
        SELECT teacher_id FROM public.teachers 
        WHERE school_id IN (
          SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "messages_user_send" ON public.messages;
CREATE POLICY "messages_user_send" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    OR (
      sender_type = 'admin' AND sender_id IN (
        SELECT user_id FROM public.users 
        WHERE role = 'admin' 
        AND school_id IN (
          SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "messages_user_update" ON public.messages;
CREATE POLICY "messages_user_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

-- Rollover status policy
DROP POLICY IF EXISTS "school admins can view rollover status" ON public.rollover_status;
CREATE POLICY "school admins can view rollover status" ON public.rollover_status
  FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  );

-- ============================================================================
-- 2. Fix multiple_permissive_policies by consolidating duplicate policies
-- ============================================================================

-- Remove duplicate policies and keep the more specific ones

-- Exam results: Remove duplicate "optimized_authenticated_access" if it exists
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.exam_results;

-- Exam sets: Remove duplicate "optimized_authenticated_access" if it exists
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.exam_sets;

-- Students: Remove duplicate "optimized_authenticated_access" if it exists
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.students;

-- Notifications: Remove duplicate "optimized_authenticated_access" if it exists
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.notifications;

-- Assignment submissions: Keep both policies but make them more specific
-- (They serve different purposes - student submit vs teacher manage)

-- Assignments: Keep both policies (student view vs teacher manage serve different purposes)

-- Timetables: Keep both policies (teacher view vs admin manage serve different purposes)

-- Rollover status: Keep both policies (admin view vs system manage serve different purposes)

-- ============================================================================
-- 3. Fix duplicate index on notifications table
-- ============================================================================

-- Drop duplicate index (keep idx_notifications_user_id, drop idx_notifications_user)
DROP INDEX IF EXISTS public.idx_notifications_user;

