-- =============================================================================
-- Comprehensive RPC grant repair + security hardening
-- =============================================================================
-- Root cause: several batch-revoke migrations
-- (step_4_revoke_anon_batch_1, step_6_revoke_authenticated_batch_2,
--  fix_7_security_definer_permissions, etc.) stripped EXECUTE from
-- `authenticated` on functions that the browser client legitimately calls.
-- This caused silent 403 errors across exam entry, reports publishing,
-- PDF generation, expense tracking, and student management.
--
-- This migration:
--   1. Converts insert_pdf_render_session to SECURITY INVOKER so the
--      Supabase security-advisor warning goes away.  The underlying table
--      (pdf_render_sessions) already has correct RLS policies.
--   2. Adds role/school auth guards to the two SECURITY DEFINER functions
--      that had none: get_owner_revenue_metrics, lock_report_snapshot.
--   3. Adds an owner-only guard to get_login_activity_stats.
--   4. GRANTs EXECUTE on all client-called functions that were missing
--      the authenticated grant.
--   5. Adds explicit server-only RLS policies to phone_reset_codes and
--      teacher_phone_change_requests so Supabase's linter sees intentional
--      access control rather than an oversight.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. insert_pdf_render_session → SECURITY INVOKER
--    The function validates school_id from auth.uid() internally.  The table
--    it writes to (pdf_render_sessions) already has:
--      INSERT policy: school_id must match calling user's school
--      SELECT policy: school_id must match calling user's school
--    SECURITY INVOKER lets those policies enforce access, eliminating the
--    "SECURITY DEFINER callable by authenticated" security-advisor warning.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_pdf_render_session(p_read_token text, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_school uuid;
  v_id uuid;
BEGIN
  SELECT u.school_id INTO v_school
  FROM public.users u
  WHERE u.user_id = (SELECT auth.uid())
    AND u.school_id IS NOT NULL
  LIMIT 1;

  IF v_school IS NULL THEN
    RAISE EXCEPTION 'No school context for this account';
  END IF;

  INSERT INTO public.pdf_render_sessions (school_id, read_token, payload)
  VALUES (v_school, p_read_token, p_payload)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

-- INVOKER means authenticated can call it and the table RLS does the rest.
-- We still grant EXECUTE explicitly so PostgREST can route the call.
GRANT EXECUTE ON FUNCTION public.insert_pdf_render_session(text, jsonb) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. get_owner_revenue_metrics — add owner-role guard
--    Was SECURITY DEFINER with no auth check: any authenticated user could
--    see platform-wide revenue totals.  Now restricted to owner role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_owner_revenue_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text;
  result json;
  current_month_revenue  numeric;
  previous_month_revenue numeric;
  growth_rate            numeric;
BEGIN
  -- Only the platform owner role may view cross-school revenue totals.
  SELECT lower(trim(u.role)) INTO v_role
  FROM public.users u
  WHERE u.user_id = v_uid;

  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO current_month_revenue
  FROM payments
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW());

  SELECT COALESCE(SUM(amount), 0) INTO previous_month_revenue
  FROM payments
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    AND created_at <  DATE_TRUNC('month', NOW());

  IF previous_month_revenue > 0 THEN
    growth_rate := ((current_month_revenue - previous_month_revenue)
                    / previous_month_revenue) * 100;
  ELSE
    growth_rate := 0;
  END IF;

  SELECT json_build_object(
    'total_revenue',       COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
    'monthly_revenue',     current_month_revenue,
    'yearly_revenue',      COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'
                                      AND created_at >= DATE_TRUNC('year', NOW())), 0),
    'revenue_growth_rate', growth_rate
  ) INTO result;

  RETURN result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_owner_revenue_metrics() TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. get_login_activity_stats — add owner-role guard
--    Currently returns hard-coded placeholder data, but should still be
--    restricted to the platform owner role to avoid leaking intent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_login_activity_stats()
RETURNS TABLE(
  total_logins_today      bigint,
  active_sessions         bigint,
  suspicious_activities   bigint,
  unique_users_today      bigint,
  failed_attempts_today   bigint,
  new_devices_today       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text;
BEGIN
  SELECT lower(trim(u.role)) INTO v_role
  FROM public.users u
  WHERE u.user_id = v_uid;

  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    156::bigint AS total_logins_today,
     23::bigint AS active_sessions,
      3::bigint AS suspicious_activities,
     89::bigint AS unique_users_today,
     12::bigint AS failed_attempts_today,
      7::bigint AS new_devices_today;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_login_activity_stats() TO authenticated;


-- ---------------------------------------------------------------------------
-- 4. lock_report_snapshot — add school ownership guard
--    Was SECURITY DEFINER with no auth check: any authenticated user who
--    guessed a snapshot UUID could lock any school's snapshot.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_report_snapshot(p_snapshot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid       uuid := auth.uid();
  v_school_id uuid;
  v_user_school uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Verify the calling user belongs to the same school as the snapshot.
  SELECT school_id INTO v_school_id
  FROM public.report_snapshots
  WHERE id = p_snapshot_id;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found or already locked';
  END IF;

  SELECT u.school_id INTO v_user_school
  FROM public.users u
  WHERE u.user_id = v_uid;

  IF v_user_school IS DISTINCT FROM v_school_id THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.report_snapshots
  SET status = 'locked', locked_at = NOW()
  WHERE id = p_snapshot_id AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot not found or already locked';
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.lock_report_snapshot(uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- 5. GRANT EXECUTE on client-called SECURITY DEFINER functions that already
--    have proper auth.uid() / school validation inside their bodies.
-- ---------------------------------------------------------------------------

-- Report publishing (all check published_reports_user_is_school_staff internally)
GRANT EXECUTE ON FUNCTION public.ensure_class_id_for_publish(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) TO authenticated;

-- Student management (checks auth.uid() + role/school inside)
GRANT EXECUTE ON FUNCTION public.owner_restore_soft_deleted_student(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_olevel_subjects(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_student_import_batch(uuid) TO authenticated;

-- Exam entry — teacher functions (use exam_set_teacher_entry_guard_message internally)
GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_alevel(uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_alevel(uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text, text, text, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 6. GRANT EXECUTE on client-called SECURITY INVOKER functions that were
--    missing the authenticated grant (not SECURITY DEFINER, so RLS applies).
-- ---------------------------------------------------------------------------

-- Teacher primary exam entry (non-secdef, controlled by RLS on exam_results)
GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_primary(uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, jsonb, text) TO authenticated;

-- Expense reference generation (non-secdef)
-- sig: (p_school_id uuid, p_expense_date text, p_category_name text)
GRANT EXECUTE ON FUNCTION public.generate_expense_reference(uuid, text, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 7. RLS policies for server-only tables
--    Both tables have RLS enabled but zero policies — Supabase's linter flags
--    this as a possible oversight.  These tables are accessed exclusively by
--    server-side API handlers using the service_role key (which bypasses RLS).
--    The explicit RESTRICT policy below documents that intent and silences the
--    linter without changing the actual access control behaviour.
-- ---------------------------------------------------------------------------

-- phone_reset_codes: stores OTP codes sent via SMS; server writes, verifies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'phone_reset_codes'
      AND policyname = 'server_only_no_direct_client_access'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY server_only_no_direct_client_access
        ON public.phone_reset_codes
        AS RESTRICTIVE
        TO authenticated
        USING (false)
    $pol$;
  END IF;
END $$;

-- teacher_phone_change_requests: stores phone-change OTPs; server only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'teacher_phone_change_requests'
      AND policyname = 'server_only_no_direct_client_access'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY server_only_no_direct_client_access
        ON public.teacher_phone_change_requests
        AS RESTRICTIVE
        TO authenticated
        USING (false)
    $pol$;
  END IF;
END $$;
