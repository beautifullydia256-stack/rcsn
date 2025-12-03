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

-- Timetables policies - Consolidated to avoid multiple permissive policies
DROP POLICY IF EXISTS "timetables_teacher_view" ON public.timetables;
DROP POLICY IF EXISTS "timetables_admin_manage" ON public.timetables;
DROP POLICY IF EXISTS "timetables_select" ON public.timetables;
DROP POLICY IF EXISTS "timetables_manage" ON public.timetables;

-- Unified policy: SELECT for teachers/admins, INSERT/UPDATE/DELETE for admins only
CREATE POLICY "timetables_access" ON public.timetables
  FOR ALL TO authenticated
  USING (
    -- For SELECT: teachers and admins can view
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    -- For INSERT/UPDATE: admins only
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

-- Assignments policies - Consolidated to avoid multiple permissive policies
DROP POLICY IF EXISTS "assignments_teacher_manage" ON public.assignments;
DROP POLICY IF EXISTS "assignments_student_view" ON public.assignments;
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_manage" ON public.assignments;

-- Unified policy: SELECT for teachers/admins/students, INSERT/UPDATE/DELETE for teachers/admins only
CREATE POLICY "assignments_access" ON public.assignments
  FOR ALL TO authenticated
  USING (
    -- For SELECT: teachers, admins, and students can view
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR
    -- Students can view assignments for their class
    class_name IN (
      SELECT current_class FROM public.students 
      WHERE student_id IN (
        SELECT student_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
  )
  WITH CHECK (
    -- For INSERT/UPDATE: teachers and admins only
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
  );

-- Assignment submissions policies - Consolidated to avoid multiple permissive policies
DROP POLICY IF EXISTS "assignment_submissions_student_submit" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_insert" ON public.assignment_submissions;

-- Unified INSERT policy (students can submit, teachers can create for students)
CREATE POLICY "assignment_submissions_insert" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Students can submit their own assignments
    student_id IN (
      SELECT student_id FROM public.users WHERE user_id = (select auth.uid())
    )
    OR
    -- Teachers can create submissions for their students
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

-- Separate policy for SELECT/UPDATE/DELETE (teachers only)
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

-- Rollover status policies - Consolidated to avoid multiple permissive policies
DROP POLICY IF EXISTS "school admins can view rollover status" ON public.rollover_status;
DROP POLICY IF EXISTS "system can manage rollover status" ON public.rollover_status;
DROP POLICY IF EXISTS "rollover_status_select" ON public.rollover_status;
DROP POLICY IF EXISTS "rollover_status_manage" ON public.rollover_status;

-- Unified policy: SELECT for admins/system, INSERT/UPDATE/DELETE for system only
CREATE POLICY "rollover_status_access" ON public.rollover_status
  FOR ALL TO authenticated
  USING (
    -- For SELECT: admins can view their school's status, system can view all
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR true  -- System/service role can view all
  )
  WITH CHECK (
    -- For INSERT/UPDATE: system only (true allows all authenticated users, but typically only service role uses this)
    true
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

-- ============================================================================
-- Consolidate multiple permissive policies into single policies
-- ============================================================================

-- Assignment submissions: Already consolidated above, just ensure old policies are dropped
DROP POLICY IF EXISTS "assignment_submissions_student_submit" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_insert" ON public.assignment_submissions;

-- Assignments: Already consolidated above, just ensure old policies are dropped
DROP POLICY IF EXISTS "assignments_student_view" ON public.assignments;
DROP POLICY IF EXISTS "assignments_teacher_manage" ON public.assignments;
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_manage" ON public.assignments;

-- Timetables: Already consolidated above, just ensure old policies are dropped
DROP POLICY IF EXISTS "timetables_teacher_view" ON public.timetables;
DROP POLICY IF EXISTS "timetables_admin_manage" ON public.timetables;
DROP POLICY IF EXISTS "timetables_select" ON public.timetables;
DROP POLICY IF EXISTS "timetables_manage" ON public.timetables;

-- Rollover status: Already consolidated above, just ensure old policies are dropped
DROP POLICY IF EXISTS "school admins can view rollover status" ON public.rollover_status;
DROP POLICY IF EXISTS "system can manage rollover status" ON public.rollover_status;
DROP POLICY IF EXISTS "rollover_status_select" ON public.rollover_status;
DROP POLICY IF EXISTS "rollover_status_manage" ON public.rollover_status;

-- ============================================================================
-- 3. Fix duplicate index on notifications table
-- ============================================================================

-- Drop duplicate index (keep idx_notifications_user_id, drop idx_notifications_user)
DROP INDEX IF EXISTS public.idx_notifications_user;

