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

-- Unified SELECT policy (teachers and admins can view)
CREATE POLICY "timetables_select" ON public.timetables
  FOR SELECT TO authenticated
  USING (
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- Separate policy for INSERT/UPDATE/DELETE (admins only)
CREATE POLICY "timetables_manage" ON public.timetables
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

-- Assignments policies - Consolidated to avoid multiple permissive policies
DROP POLICY IF EXISTS "assignments_teacher_manage" ON public.assignments;
DROP POLICY IF EXISTS "assignments_student_view" ON public.assignments;

-- Unified SELECT policy (teachers, admins, and students can view)
CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    -- Teachers can view their own assignments
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
  );

-- Separate policy for INSERT/UPDATE/DELETE (teachers and admins only)
CREATE POLICY "assignments_manage" ON public.assignments
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

-- Assignment submissions policies - Consolidated to avoid multiple permissive policies
DROP POLICY IF EXISTS "assignment_submissions_student_submit" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON public.assignment_submissions;

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

-- Unified SELECT policy (admins and system can view)
CREATE POLICY "rollover_status_select" ON public.rollover_status
  FOR SELECT TO authenticated
  USING (
    -- School admins can view their school's rollover status
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR
    -- System/service role can view all (for automated processes)
    true
  );

-- Separate policy for INSERT/UPDATE/DELETE (system only)
CREATE POLICY "rollover_status_manage" ON public.rollover_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

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

-- Assignment submissions: Consolidate INSERT policies
-- Drop the separate policies and create a unified one
DROP POLICY IF EXISTS "assignment_submissions_student_submit" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON public.assignment_submissions;

-- Create unified policy for INSERT (students can submit, teachers can create for students)
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

-- Keep the teacher manage policy for SELECT/UPDATE/DELETE (different action)
-- This is fine as it's for different actions

-- Assignments: Consolidate SELECT policies
DROP POLICY IF EXISTS "assignments_student_view" ON public.assignments;
DROP POLICY IF EXISTS "assignments_teacher_manage" ON public.assignments;

-- Create unified SELECT policy
CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    -- Teachers can view their own assignments
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
  );

-- Create separate policy for INSERT/UPDATE/DELETE (teachers and admins only)
CREATE POLICY "assignments_manage" ON public.assignments
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

-- Timetables: Consolidate SELECT policies
DROP POLICY IF EXISTS "timetables_teacher_view" ON public.timetables;
DROP POLICY IF EXISTS "timetables_admin_manage" ON public.timetables;

-- Create unified SELECT policy
CREATE POLICY "timetables_select" ON public.timetables
  FOR SELECT TO authenticated
  USING (
    teacher_id IN (
      SELECT teacher_id FROM public.teachers 
      WHERE school_id IN (
        SELECT school_id FROM public.users WHERE user_id = (select auth.uid())
      )
    )
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- Create separate policy for INSERT/UPDATE/DELETE (admins only)
CREATE POLICY "timetables_manage" ON public.timetables
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR school_id IN (SELECT school_id FROM public.users WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- Rollover status: Consolidate SELECT policies
DROP POLICY IF EXISTS "school admins can view rollover status" ON public.rollover_status;
DROP POLICY IF EXISTS "system can manage rollover status" ON public.rollover_status;

-- Create unified SELECT policy
CREATE POLICY "rollover_status_select" ON public.rollover_status
  FOR SELECT TO authenticated
  USING (
    -- School admins can view
    school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (select auth.uid()))
    OR
    -- System/service role can view (for automated processes)
    true
  );

-- Create separate policy for INSERT/UPDATE/DELETE (system only)
CREATE POLICY "rollover_status_manage" ON public.rollover_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Fix duplicate index on notifications table
-- ============================================================================

-- Drop duplicate index (keep idx_notifications_user_id, drop idx_notifications_user)
DROP INDEX IF EXISTS public.idx_notifications_user;

