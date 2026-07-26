-- =============================================================================
-- Convert SECURITY DEFINER client functions → SECURITY INVOKER
-- and add write-RLS policies that make the conversion possible.
-- =============================================================================
-- Companion to migration 20260726000002_comprehensive_rpc_grants_and_security.sql
-- That migration granted EXECUTE and added auth guards; this one converts each
-- function to SECURITY INVOKER so Supabase's
-- "authenticated_security_definer_function_executable" WARN advisories are
-- cleared for all client-callable functions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. published_student_reports: add INSERT / UPDATE / DELETE policies for
--    school staff so the publishing functions work without SECURITY DEFINER.
--    The existing SELECT policy (published_student_reports_select_consolidated)
--    is left untouched.  We do NOT use a single ALL policy — that would add a
--    second SELECT policy and trigger the "multiple_permissive_policies"
--    performance WARN (matters at 50 k+ concurrent users).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='published_student_reports' AND policyname='published_student_reports_insert_school_staff') THEN
    EXECUTE $p$CREATE POLICY published_student_reports_insert_school_staff ON public.published_student_reports AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (published_reports_user_is_school_staff(school_id))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='published_student_reports' AND policyname='published_student_reports_update_school_staff') THEN
    EXECUTE $p$CREATE POLICY published_student_reports_update_school_staff ON public.published_student_reports AS PERMISSIVE FOR UPDATE TO authenticated USING (published_reports_user_is_school_staff(school_id)) WITH CHECK (published_reports_user_is_school_staff(school_id))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='published_student_reports' AND policyname='published_student_reports_delete_school_staff') THEN
    EXECUTE $p$CREATE POLICY published_student_reports_delete_school_staff ON public.published_student_reports AS PERMISSIVE FOR DELETE TO authenticated USING (published_reports_user_is_school_staff(school_id))$p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. classes: add INSERT policy for school members.
--    ensure_class_id_for_publish inserts new class rows when publishing a
--    report for a class that doesn't exist yet.  After removing the function's
--    SET row_security TO 'off' we need an INSERT policy to replace it.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='classes' AND policyname='classes_insert_school_staff') THEN
    EXECUTE $p$CREATE POLICY classes_insert_school_staff ON public.classes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL))$p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. ALTER FUNCTION … SECURITY INVOKER
--    All these functions validate auth.uid() / role / school inside their
--    bodies and the tables they touch now have matching RLS policies, so
--    running as the calling user (SECURITY INVOKER) is both correct and safe.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.insert_pdf_render_session(text, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.get_login_activity_stats() SECURITY INVOKER;
ALTER FUNCTION public.get_owner_revenue_metrics() SECURITY INVOKER;
ALTER FUNCTION public.lock_report_snapshot(uuid) SECURITY INVOKER;
ALTER FUNCTION public.ensure_class_id_for_publish(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.ensure_class_id_for_publish(uuid, text) RESET row_security;
ALTER FUNCTION public.owner_restore_soft_deleted_student(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.save_student_olevel_subjects(uuid, text[]) SECURITY INVOKER;
ALTER FUNCTION public.undo_student_import_batch(uuid) SECURITY INVOKER;
ALTER FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) SECURITY INVOKER;
ALTER FUNCTION public.teacher_upsert_exam_result_alevel(uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.teacher_upsert_exam_result_alevel(uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.teacher_upsert_exam_result_secondary(uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.teacher_upsert_exam_result_secondary(uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text, text, text, text) SECURITY INVOKER;
