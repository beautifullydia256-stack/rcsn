-- Fix Supabase linter: rls_enabled_no_policy
--
-- 1) assignment_submissions: policies were recreated in 20250104_optimize_rls_policies_performance.sql
--    then dropped again at end of that file (lines 227-230) without replacement.
-- 2) whatsapp_bot_sessions: RLS was enabled in 20260118220000 with no policies. The webhook uses
--    service_role (getSupabaseAdmin), which bypasses RLS. These policies block anon/authenticated only.

DROP POLICY IF EXISTS "assignment_submissions_insert" ON public.assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON public.assignment_submissions;

CREATE POLICY "assignment_submissions_insert" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT u.student_id FROM public.users u WHERE u.user_id = (select auth.uid())
    )
    OR assignment_id IN (
      SELECT a.id
      FROM public.assignments a
      WHERE a.teacher_id IN (
        SELECT t.teacher_id
        FROM public.teachers t
        WHERE t.school_id IN (
          SELECT u.school_id FROM public.users u WHERE u.user_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY "assignment_submissions_teacher_manage" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (
    assignment_id IN (
      SELECT a.id
      FROM public.assignments a
      WHERE a.teacher_id IN (
        SELECT t.teacher_id
        FROM public.teachers t
        WHERE t.school_id IN (
          SELECT u.school_id FROM public.users u WHERE u.user_id = (select auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    assignment_id IN (
      SELECT a.id
      FROM public.assignments a
      WHERE a.teacher_id IN (
        SELECT t.teacher_id
        FROM public.teachers t
        WHERE t.school_id IN (
          SELECT u.school_id FROM public.users u WHERE u.user_id = (select auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "whatsapp_bot_sessions_deny_anon" ON public.whatsapp_bot_sessions;
DROP POLICY IF EXISTS "whatsapp_bot_sessions_deny_authenticated" ON public.whatsapp_bot_sessions;

CREATE POLICY "whatsapp_bot_sessions_deny_anon" ON public.whatsapp_bot_sessions
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "whatsapp_bot_sessions_deny_authenticated" ON public.whatsapp_bot_sessions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
